import pandas as pd

def extract_schema(df: pd.DataFrame) -> dict:
    """Extracts schema information from a DataFrame."""
    schema = {}
    for col in df.columns:
        schema[col] = {
            "dtype": str(df[col].dtype),
            "sample": df[col].dropna().head(3).tolist()
        }
    # Metadata keys used by auto_insights and anomaly_detector
    schema["_numeric_cols"] = df.select_dtypes(include="number").columns.tolist()
    schema["_date_cols"] = df.select_dtypes(include=["datetime"]).columns.tolist()
    schema["_row_count"] = len(df)
    schema["_col_count"] = len(df.columns)
    return schema

def schema_to_prompt_text(schema: dict) -> str:
    """Converts schema dictionary to a text prompt representation."""
    lines = []
    for col, info in schema.items():
        if col.startswith("_"):  # skip metadata keys
            continue
        lines.append(f"- {col} ({info['dtype']}): e.g., {info['sample']}")
    return "\n".join(lines)

