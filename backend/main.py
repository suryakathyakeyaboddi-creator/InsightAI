import uuid
import os
import duckdb
from typing import Any
from pydantic import BaseModel
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler

from data_processor import load_and_clean
from schema_extractor import extract_schema, schema_to_prompt_text
from sql_generator import generate_sql, execute_with_retry, select_chart_type
from insight_generator import generate_insight
from summarize_generator import generate_page_summary
from suggested_questions import generate_suggested_questions
from chat_context_generator import chat_with_context
from chat_data_generator import chat_with_data
from anomaly_detector import auto_insights, compute_correlations, detect_anomalies, get_anomaly_summary
import forum_store

# ---------------------------------------------------------------------------
# Persistent DuckDB
# ---------------------------------------------------------------------------
DB_PATH = os.getenv("DUCKDB_PATH", "storage/insightai.duckdb")
os.makedirs("storage", exist_ok=True)


def _get_db() -> duckdb.DuckDBPyConnection:
    """Open a new connection to the persistent DuckDB database."""
    return duckdb.connect(database=DB_PATH)

# ---------------------------------------------------------------------------
# In-memory session store  {session_id -> session dict}
# ---------------------------------------------------------------------------
sessions: dict = {}

SESSION_TTL_HOURS = 2


def _purge_expired_sessions():
    """Remove sessions older than SESSION_TTL_HOURS. Runs every 30 minutes."""
    now = datetime.now(tz=timezone.utc)
    expired = [
        sid
        for sid, s in sessions.items()
        if (now - s["created_at"]).total_seconds() > SESSION_TTL_HOURS * 3600
    ]
    for sid in expired:
        del sessions[sid]
    if expired:
        print(f"[scheduler] Purged {len(expired)} expired session(s).")


# ---------------------------------------------------------------------------
# Lifespan: start / stop APScheduler
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(_purge_expired_sessions, "interval", minutes=30)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="InsightAI API",
    version="1.0",
    description="AI-powered business intelligence backend.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    session_id: str
    question: str
    model: str = "llama-3.1-8b-instant"



class AnomalyRequest(BaseModel):
    session_id: str


class PageContextRequest(BaseModel):
    session_id: str | None = None
    current_path: str
    active_tab: str | None = None
    data_summary: str | None = None
    model: str = "llama-3.1-8b-instant"


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------
class UploadResponse(BaseModel):
    session_id: str
    row_count: int
    col_count: int
    columns: list[str]
    dtypes: dict[str, str]
    sample: list[dict[str, Any]]
    auto_insights: list[str]


class QueryResponse(BaseModel):
    sql: str
    chart_type: str
    data: list[dict[str, Any]]
    columns: list[str]
    insight: str
    row_count: int


class CorrelationMatrix(BaseModel):
    columns: list[str]
    data: list[list[float]]


class AutoInsightsResponse(BaseModel):
    insights: list[str]
    correlation: CorrelationMatrix


class AnomalyResponse(BaseModel):
    total_anomalies: int
    percentage: float
    anomaly_rows: list[dict[str, Any]]
    full_data: list[dict[str, Any]]


class SummaryResponse(BaseModel):
    summary: str


class SuggestedQuestionsResponse(BaseModel):
    questions: list[str]


class ContextChatMessage(BaseModel):
    role: str
    content: str


class ContextChatRequest(BaseModel):
    messages: list[ContextChatMessage]
    current_path: str
    session_id: str | None = None
    active_tab: str | None = None
    data_summary: str | None = None
    model: str = "llama-3.1-8b-instant"


class ContextChatResponse(BaseModel):
    response: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_session(session_id: str) -> dict:
    """Retrieve session from memory or hydrate from DuckDB if missing."""
    if session_id in sessions:
        return sessions[session_id]

    # Persistent recovery: check if table exists in DuckDB
    table_name = "ds_" + session_id.replace("-", "_")
    con = _get_db()
    try:
        tables = con.execute("SHOW TABLES").fetchall()
        table_exists = any(t[0] == table_name for t in tables)
        
        if table_exists:
            # Re-extract required metadata
            df = con.execute(f"SELECT * FROM {table_name}").df()
            from schema_extractor import extract_schema, schema_to_prompt_text
            schema = extract_schema(df)
            schema_text = schema_to_prompt_text(schema)
            
            sessions[session_id] = {
                "df": df,
                "schema": schema,
                "schema_text": schema_text,
                "con": con,
                "table_name": table_name,
                "created_at": datetime.now(tz=timezone.utc),
            }
            print(f"[session] Hydrated session {session_id} from persistent storage.")
            return sessions[session_id]
    except Exception as e:
        print(f"[session] Failed to hydrate session {session_id}: {e}")

    raise HTTPException(status_code=410, detail="Session expired or not found. Please re-upload your data.")



# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "version": "1.0"}


@app.get("/")
def read_root():
    return {"message": "InsightAI API running"}


@app.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx', '.pdf')):
        raise HTTPException(status_code=400, detail="Only CSV, XLSX, and PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Request Entity Too Large: file exceeds 50 MB limit")

    session_id = str(uuid.uuid4())
    try:
        df = load_and_clean(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")


    schema = extract_schema(df)
    schema_text = schema_to_prompt_text(schema)

    # Register df as a persistent table
    table_name = "ds_" + session_id.replace("-", "_")
    con = _get_db()
    con.execute(f"DROP TABLE IF EXISTS {table_name}")
    con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")

    sessions[session_id] = {
        "df": df,
        "schema": schema,
        "schema_text": schema_text,
        "con": con,
        "table_name": table_name,
        "created_at": datetime.now(tz=timezone.utc),
    }

    return UploadResponse(
        session_id=session_id,
        row_count=len(df),
        col_count=len(df.columns),
        columns=list(df.columns),
        dtypes={col: str(dtype) for col, dtype in df.dtypes.items()},
        sample=df.head(3).to_dict(orient="records"),
        auto_insights=[],
    )


@app.post("/api/query", response_model=QueryResponse)
async def query_data(req: QueryRequest):
    session = _get_session(req.session_id)

    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Bad Request: question cannot be empty")

    schema_text = session["schema_text"]
    table_name = session["table_name"]
    # Build a schema_text that references the correct table name
    con = _get_db()

    try:
        # Generate SQL with the real table name and specified model
        raw_sql = generate_sql(question, schema_text, model=req.model)
        # Replace 'dataset' placeholder from LLM with per-session table
        sql = raw_sql.replace("dataset", table_name)
        result_df = execute_with_retry(con, sql, question, schema_text, model=req.model)
        
        # If no rows returned, skip expensive LLM chart_type call
        if result_df.empty or len(result_df) == 0:
            return QueryResponse(
                sql=raw_sql,
                chart_type="table",
                data=[],
                columns=list(result_df.columns),
                insight="The query ran successfully but returned no results. Try adjusting your filters or rephrasing the question.",
                row_count=0,
            )

        chart_type = select_chart_type(question, result_df, model=req.model)
        insight = generate_insight(question, result_df, model=req.model)

        return QueryResponse(
            sql=raw_sql,  # return clean SQL for display
            chart_type=chart_type,
            data=result_df.to_dict(orient="records"),
            columns=list(result_df.columns),
            insight=insight,
            row_count=len(result_df),
        )
    except ValueError as e:
        # SQL parse/execution errors - give a helpful message
        raise HTTPException(
            status_code=422,
            detail={"error": f"Could not generate a valid query for that question. Try rephrasing it or simplify the question.", "suggestion": str(e)},
        )
    except Exception as e:
        err_msg = str(e)
        # Shorten known DuckDB errors to something user-friendly
        if "Binder Error" in err_msg or "Parser Error" in err_msg:
            err_msg = "The AI generated an invalid SQL query for that question. Please try rephrasing it."
        elif "does not exist" in err_msg:
            err_msg = "The AI referenced a column that doesn't exist. Make sure you're asking about columns shown in the Data Schema on the left."
        raise HTTPException(
            status_code=422,
            detail={"error": err_msg, "suggestion": "Try rephrasing your question"},
        )


@app.get("/api/auto-insights", response_model=AutoInsightsResponse)
async def auto_insights_endpoint(session_id: str = Query(...), model: str = "llama-3.1-8b-instant"):
    session = _get_session(session_id)
    df = session["df"]
    schema = session["schema"]

    try:
        insights = auto_insights(df, schema, model=model)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed. Please try again or switch back to Llama 3.1: {str(e)}")

    corr_df = compute_correlations(df)

    if corr_df.empty:
        correlation = CorrelationMatrix(columns=[], data=[])
    else:
        correlation = CorrelationMatrix(
            columns=list(corr_df.columns),
            data=corr_df.fillna(0).values.tolist(),
        )

    return AutoInsightsResponse(insights=insights, correlation=correlation)


@app.post("/api/anomalies", response_model=AnomalyResponse)
async def anomalies_endpoint(req: AnomalyRequest):
    session = _get_session(req.session_id)
    df = session["df"]
    schema = session["schema"]

    # Use the pre-computed _numeric_cols metadata key
    numeric_cols = schema.get("_numeric_cols", [
        col for col, info in schema.items()
        if not col.startswith("_") and ("int" in info.get("dtype", "") or "float" in info.get("dtype", ""))
    ])

    result_df = detect_anomalies(df, numeric_cols)
    summary = get_anomaly_summary(result_df)

    return AnomalyResponse(**summary)


@app.post("/api/summarize-context", response_model=SummaryResponse)
async def summarize_context(req: PageContextRequest):
    try:
        data_summary = req.data_summary
        
        # If we have a session but no explicit data summary strings passed from frontend,
        # we could inject schema information here. But relying on the frontend 
        # to pass what's on screen (like row counts, top insights) is better.
        if req.session_id and not data_summary:
            session = _get_session(req.session_id)
            schema = session["schema"]
            row_count = len(session["df"])
            data_summary = f"Dataset: {schema.get('filename', 'Unknown')}\nRows: {row_count}\nColumns: {list(schema.keys())}"

        summary = generate_page_summary(
            current_path=req.current_path,
            active_tab=req.active_tab,
            data_summary=data_summary,
            model=req.model
        )
        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/preview")
async def preview_data(session_id: str = Query(...), limit: int = Query(100, ge=1, le=1000)):
    session = _get_session(session_id)
    table_name = session["table_name"]
    total_rows = session["schema"].get("_row_count", 0)

    con = _get_db()
    result = con.execute(f"SELECT * FROM {table_name} LIMIT {limit}").df()

    return {
        "columns": list(result.columns),
        "rows": result.to_dict(orient="records"),
        "total_rows": total_rows,
    }


class SessionRequest(BaseModel):
    session_id: str
    model: str = "llama-3.1-8b-instant"

@app.post("/api/suggested-questions", response_model=SuggestedQuestionsResponse)
async def suggested_questions_endpoint(req: SessionRequest):
    session = _get_session(req.session_id)
    df = session["df"]
    schema = session["schema"]
    
    try:
        questions = generate_suggested_questions(df, schema, model=req.model)
        return SuggestedQuestionsResponse(questions=questions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/chat-context", response_model=ContextChatResponse)
async def chat_context_endpoint(req: ContextChatRequest):
    try:
        data_summary = req.data_summary
        
        if req.session_id and not data_summary:
            session = _get_session(req.session_id)
            schema = session["schema"]
            row_count = len(session["df"])
            data_summary = f"Dataset: {schema.get('filename', 'Unknown')}\nRows: {row_count}\nColumns: {list(schema.keys())}"

        response_text = chat_with_context(
            messages=[msg.model_dump() for msg in req.messages],
            current_path=req.current_path,
            active_tab=req.active_tab,
            data_summary=data_summary,
            model=req.model
        )
        return ContextChatResponse(response=response_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Chat-with-data (conversational LLM with data context)
# ---------------------------------------------------------------------------

class ChatDataMessage(BaseModel):
    role: str
    content: str


class ChatDataRequest(BaseModel):
    session_id: str
    messages: list[ChatDataMessage]
    model: str = "llama-3.1-8b-instant"


class ChatDataResponse(BaseModel):
    response: str


@app.post("/api/chat-data", response_model=ChatDataResponse)
async def chat_data_endpoint(req: ChatDataRequest):
    session = _get_session(req.session_id)
    df = session["df"]
    schema_text = session["schema_text"]

    try:
        messages = [{"role": m.role, "content": m.content} for m in req.messages]
        answer = chat_with_data(
            messages=messages,
            schema_text=schema_text,
            df=df,
            model=req.model,
        )
        return ChatDataResponse(response=answer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ---------------------------------------------------------------------------
# Visualize — compute chart data for all columns
# ---------------------------------------------------------------------------

@app.get("/api/visualize")
async def visualize_endpoint(session_id: str = Query(...)):
    session = _get_session(session_id)
    df = session["df"]
    schema = session["schema"]

    charts = []

    numeric_cols = schema.get("_numeric_cols", [])
    date_cols = schema.get("_date_cols", [])
    all_cols = [c for c in df.columns if c not in ["_numeric_cols", "_date_cols"]]
    categorical_cols = [c for c in all_cols if c not in numeric_cols and c not in date_cols]

    # ── Numeric: distribution histogram (binned) ──────────────────────────────
    for col in numeric_cols[:6]:  # max 6 numeric charts
        series = df[col].dropna()
        if len(series) < 2:
            continue
        try:
            counts, bin_edges = __import__("numpy").histogram(series, bins=12)
            bars = [
                {"range": f"{bin_edges[i]:.1f}–{bin_edges[i+1]:.1f}", "count": int(counts[i])}
                for i in range(len(counts)) if counts[i] > 0
            ]
            if bars:
                charts.append({
                    "id": f"num_{col}",
                    "title": col.replace("_", " ").title(),
                    "subtitle": "Distribution",
                    "type": "bar",
                    "xKey": "range",
                    "valueKey": "count",
                    "data": bars,
                    "color": "#6366F1",
                })
        except Exception:
            pass

    # ── Categorical: top 10 value counts ─────────────────────────────────────
    for col in categorical_cols[:5]:  # max 5 categorical charts
        series = df[col].dropna().astype(str)
        if series.nunique() > 80 or series.nunique() < 2:
            continue
        top = series.value_counts().head(10)
        bars = [{"label": str(k), "count": int(v)} for k, v in top.items()]
        if bars:
            charts.append({
                "id": f"cat_{col}",
                "title": col.replace("_", " ").title(),
                "subtitle": f"Top {len(bars)} values",
                "type": "bar",
                "xKey": "label",
                "valueKey": "count",
                "data": bars,
                "color": "#06B6D4",
            })

    # ── Date + numeric: time series for first numeric col ────────────────────
    if date_cols and numeric_cols:
        date_col = date_cols[0]
        val_col = numeric_cols[0]
        try:
            ts_df = df[[date_col, val_col]].dropna().copy()
            ts_df[date_col] = __import__("pandas").to_datetime(ts_df[date_col], errors="coerce")
            ts_df = ts_df.dropna().sort_values(date_col)
            # Resample to max 60 points
            if len(ts_df) > 60:
                step = max(1, len(ts_df) // 60)
                ts_df = ts_df.iloc[::step]
            ts_data = [
                {"date": str(row[date_col].date()), "value": round(float(row[val_col]), 2)}
                for _, row in ts_df.iterrows()
            ]
            if ts_data:
                charts.append({
                    "id": f"ts_{date_col}_{val_col}",
                    "title": f"{val_col.replace('_',' ').title()} Over Time",
                    "subtitle": f"by {date_col}",
                    "type": "line",
                    "xKey": "date",
                    "valueKey": "value",
                    "data": ts_data,
                    "color": "#10B981",
                })
        except Exception:
            pass

    # ── Summary stats card ────────────────────────────────────────────────────
    stats = []
    for col in numeric_cols[:5]:
        s = df[col].dropna()
        if len(s) > 0:
            stats.append({
                "col": col.replace("_", " ").title(),
                "min": round(float(s.min()), 2),
                "max": round(float(s.max()), 2),
                "mean": round(float(s.mean()), 2),
                "median": round(float(s.median()), 2),
            })

    return {"charts": charts, "stats": stats, "row_count": len(df), "col_count": len(df.columns)}


# ---------------------------------------------------------------------------
# Business Tip — single powerful AI-driven recommendation from data
# ---------------------------------------------------------------------------

class BusinessTipRequest(BaseModel):
    session_id: str
    model: str = "llama-3.1-8b-instant"


@app.post("/api/business-tip")
async def business_tip_endpoint(req: BusinessTipRequest):
    import re as _re
    from groq import Groq as _Groq
    session = _get_session(req.session_id)
    df = session["df"]
    schema_text = session["schema_text"]
    schema = session["schema"]

    # Build a compact data digest for the LLM  (keep small to stay under free-tier TPM limits)
    numeric_cols = schema.get("_numeric_cols", [])
    sample = df.head(15).to_dict(orient="records")  # 15 rows max

    # Compute quick aggregate stats per numeric col
    agg_lines = []
    for col in numeric_cols[:6]:
        s = df[col].dropna()
        if len(s) > 0:
            agg_lines.append(
                f"  {col}: min={s.min():.2f}, max={s.max():.2f}, "
                f"mean={s.mean():.2f}, total={s.sum():.2f}"
            )
    agg_text = "\n".join(agg_lines) if agg_lines else "No numeric columns available."

    prompt = (
        "You are a world-class business strategist and data analyst. "
        "A user has uploaded the following dataset and wants your single most powerful, "
        "actionable business recommendation based on what the data actually shows.\n\n"
        f"Dataset Schema:\n{schema_text}\n\n"
        f"Key Numeric Statistics:\n{agg_text}\n\n"
        f"Sample Data (first 40 rows):\n{sample}\n\n"
        "Give EXACTLY ONE powerful, specific business tip. Requirements:\n"
        "- It MUST reference real numbers or patterns from this data\n"
        "- It must be immediately actionable (something they can act on today)\n"
        "- Quantify the potential business impact where possible\n"
        "- Be direct, confident, and specific — not generic\n"
        "- Start with a bold one-line headline, then 2-3 sentences of detail\n"
        "- Do NOT use markdown asterisks — use plain text only\n"
        "- Maximum 4 sentences total"
    )

    client = _Groq(api_key=os.environ.get("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model=req.model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )
    tip = response.choices[0].message.content.strip()
    # Clean any leftover markdown asterisks
    tip = _re.sub(r"\*{1,3}(.*?)\*{1,3}", r"\1", tip)
    tip = _re.sub(r"<think>.*?</think>", "", tip, flags=_re.IGNORECASE | _re.DOTALL).strip()

    return {"tip": tip}


# ---------------------------------------------------------------------------
# Forum — community discussion board
# ---------------------------------------------------------------------------

class CreatePostRequest(BaseModel):
    author: str
    title: str
    content: str
    tag: str = "General"


class ReplyRequest(BaseModel):
    author: str
    content: str


class LikeRequest(BaseModel):
    user_token: str   # client-generated UUID stored in localStorage


FORUM_TAGS = ["General", "Insights", "Strategy", "Data Quality", "Analytics", "Question", "Announcement"]


@app.get("/api/forum/posts")
async def forum_get_posts():
    posts = forum_store.get_posts()
    clean = []
    for p in posts:
        # Exclude liked_by but keep replies so the thread view works
        cp = {k: v for k, v in p.items() if k != "liked_by"}
        cp["reply_count"] = len(p.get("replies", []))
        clean.append(cp)
    return {"posts": clean, "tags": FORUM_TAGS}


@app.get("/api/forum/posts/{post_id}")
async def forum_get_single_post(post_id: str):
    posts = forum_store.get_posts()
    for p in posts:
        if p["id"] == post_id:
            cp = {k: v for k, v in p.items() if k != "liked_by"}
            cp["reply_count"] = len(p.get("replies", []))
            return cp
    raise HTTPException(status_code=404, detail="Post not found.")


@app.post("/api/forum/posts", status_code=201)
async def forum_create_post(req: CreatePostRequest):
    if not req.title.strip() or not req.content.strip():
        raise HTTPException(status_code=400, detail="Title and content are required.")
    if req.tag not in FORUM_TAGS:
        raise HTTPException(status_code=400, detail=f"Invalid tag. Choose from: {FORUM_TAGS}")
    post = forum_store.create_post(req.author, req.title, req.content, req.tag)
    return post


@app.post("/api/forum/posts/{post_id}/reply", status_code=201)
async def forum_add_reply(post_id: str, req: ReplyRequest):
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Reply content is required.")
    reply = forum_store.add_reply(post_id, req.author, req.content)
    if reply is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    return reply


@app.post("/api/forum/posts/{post_id}/like")
async def forum_toggle_like(post_id: str, req: LikeRequest):
    result = forum_store.toggle_like(post_id, req.user_token)
    if result is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    return result
