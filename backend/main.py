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
from anomaly_detector import auto_insights, compute_correlations, detect_anomalies, get_anomaly_summary

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


class AnomalyRequest(BaseModel):
    session_id: str


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_session(session_id: str) -> dict:
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]


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
    if not file.filename.endswith((".csv", ".xlsx")):
        raise HTTPException(status_code=415, detail="Unsupported Media Type: only .csv and .xlsx are accepted")

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
        # Generate SQL with the real table name
        raw_sql = generate_sql(question, schema_text)
        # Replace 'dataset' placeholder from LLM with per-session table
        sql = raw_sql.replace("dataset", table_name)
        result_df = execute_with_retry(con, sql, question, schema_text)
        chart_type = select_chart_type(question, result_df)
        insight = generate_insight(question, result_df)

        return QueryResponse(
            sql=raw_sql,  # return clean SQL for display
            chart_type=chart_type,
            data=result_df.to_dict(orient="records"),
            columns=list(result_df.columns),
            insight=insight,
            row_count=len(result_df),
        )
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail={"error": str(e), "suggestion": "Try rephrasing your question"},
        )


@app.get("/api/auto-insights", response_model=AutoInsightsResponse)
async def auto_insights_endpoint(session_id: str = Query(...)):
    session = _get_session(session_id)
    df = session["df"]
    schema = session["schema"]

    # Return cached insights if available, else compute
    insights = session.get("auto_insights") or auto_insights(df, schema)
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
