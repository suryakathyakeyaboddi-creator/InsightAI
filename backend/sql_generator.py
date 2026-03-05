import os
import re
import duckdb
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def _clean_sql(sql: str) -> str:
    """Extract raw SQL, ignoring <think> blocks and markdown fences, and fix quoting."""
    
    # 1. Remove <think>...</think> blocks entirely (for Qwen/Deepseek models)
    sql = re.sub(r"<think>.*?</think>", "", sql, flags=re.IGNORECASE | re.DOTALL)
    
    # 2. Extract SQL from markdown block if it exists (e.g., ```sql ... ```)
    match = re.search(r"```(?:sql)?(.*?)```", sql, flags=re.IGNORECASE | re.DOTALL)
    if match:
        sql = match.group(1)
        
    sql = sql.strip()
    
    # 3. Replace backtick-quoted identifiers with double-quoted ones
    # DuckDB requires "math score" not `math score`
    sql = re.sub(r"`([^`]+)`", r'"\1"', sql)
    
    return sql.strip()


def generate_sql(question: str, schema_text: str, model: str = "llama-3.1-8b-instant") -> str:
    prompt = (
        f"Dataset schema (DuckDB, table name is 'dataset'):\n{schema_text}\n\n"
        f"Write a DuckDB SQL query to answer: {question}\n\n"
        "STRICT RULES:\n"
        "1. Table name: dataset (no quotes needed)\n"
        "2. Column names with spaces or special characters MUST be wrapped in double-quotes, e.g. \"math score\"\n"
        "3. NEVER use backticks (`) — DuckDB does not support MySQL-style backtick quoting\n"
        "4. Return ONLY the raw SQL — no markdown, no ```sql fences, no explanation\n"
        "5. Use standard DuckDB/PostgreSQL SQL syntax\n"
        "6. IMPORTANT - Date columns marked as [DATE STRING] are stored as VARCHAR. "
        "When using EXTRACT, date_part, or any date function on them, you MUST first cast them: "
        "TRY_CAST(\"DateCol\" AS DATE). Example: EXTRACT(YEAR FROM TRY_CAST(\"Date\" AS DATE))"
    )
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    return _clean_sql(response.choices[0].message.content)


def execute_with_retry(
    con: duckdb.DuckDBPyConnection,
    sql: str,
    question: str,
    schema_text: str,
    model: str = "llama-3.1-8b-instant",
    retries: int = 2,
) -> pd.DataFrame:
    last_error = None
    for attempt in range(retries + 1):
        try:
            return con.execute(sql).df()
        except Exception as e:
            last_error = e
            if attempt < retries:
                prompt = (
                    f"This DuckDB SQL query failed:\n{sql}\n\n"
                    f"Error: {e}\n\n"
                    f"Schema:\n{schema_text}\n\n"
                    f"Question: {question}\n\n"
                    "Fix the query. STRICT RULES:\n"
                    "1. Use double-quotes for column names with spaces, e.g. \"math score\"\n"
                    "2. NEVER use backticks (`)\n"
                    "3. Return ONLY the fixed SQL — no markdown, no explanation"
                )
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                )
                sql = _clean_sql(response.choices[0].message.content)
    raise ValueError(str(last_error))


def select_chart_type(question: str, result_df: pd.DataFrame, model: str = "llama-3.1-8b-instant") -> str:
    prompt = (
        f"User question: '{question}'\n"
        f"Result columns: {list(result_df.columns)}\n"
        f"Row count: {len(result_df)}\n"
        "Choose the best chart type. Options: 'bar', 'line', 'pie', 'scatter', 'table'\n"
        "Return ONLY the chart type string, nothing else."
    )
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )
    res = response.choices[0].message.content.strip().lower()
    for valid in ["bar", "line", "pie", "scatter", "table"]:
        if valid in res:
            return valid
    return "table"
