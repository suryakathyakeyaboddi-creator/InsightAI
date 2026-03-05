import pandas as pd
import re

def _looks_like_date(series: pd.Series) -> bool:
    """Return True if a string column's values look like dates."""
    sample = series.dropna().head(20).astype(str)
    date_pattern = re.compile(
        r'^(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})$'
    )
    hits = sum(bool(date_pattern.match(v.strip())) for v in sample)
    return hits > len(sample) * 0.6  # >60% look like dates

def extract_schema(df: pd.DataFrame) -> dict:
    """Extracts schema information from a DataFrame."""
    schema = {}
    inferred_date_cols = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        schema[col] = {
            "dtype": dtype,
            "sample": df[col].dropna().head(3).tolist()
        }
        # Detect date-like string columns (e.g. Date stored as object/varchar)
        if dtype in ("object", "string") and _looks_like_date(df[col]):
            inferred_date_cols.append(col)

    # Metadata keys used by auto_insights and anomaly_detector
    explicit_date_cols = df.select_dtypes(include=["datetime"]).columns.tolist()
    schema["_numeric_cols"] = df.select_dtypes(include="number").columns.tolist()
    schema["_date_cols"] = list(set(explicit_date_cols + inferred_date_cols))
    schema["_row_count"] = len(df)
    schema["_col_count"] = len(df.columns)
    return schema

def schema_to_prompt_text(schema: dict) -> str:
    """Converts schema dictionary to a text prompt representation."""
    date_cols = schema.get("_date_cols", [])
    lines = []
    for col, info in schema.items():
        if col.startswith("_"):  # skip metadata keys
            continue
        note = " [DATE STRING - use TRY_CAST(\"" + col + "\" AS DATE) before date functions]" if col in date_cols and info["dtype"] in ("object", "string") else ""
        lines.append(f"- {col} ({info['dtype']}){note}: e.g., {info['sample']}")
    return "\n".join(lines)
