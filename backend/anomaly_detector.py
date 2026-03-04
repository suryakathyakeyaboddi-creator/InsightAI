import os
import pandas as pd
import numpy as np
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def auto_insights(df: pd.DataFrame, schema: dict, model: str = "llama-3.1-8b-instant") -> list[str]:
    """Generate exactly 3 high-level insight strings about the dataset using an LLM."""
    numeric_summary = df.describe().to_string()
    schema_lines = "\n".join(
        f"- {col} ({info['dtype']})" for col, info in schema.items()
        if not col.startswith("_")  # skip metadata keys (_numeric_cols etc.)
    )
    prompt = (
        f"Dataset schema:\n{schema_lines}\n\n"
        f"Numeric statistics:\n{numeric_summary}\n\n"
        "Generate exactly 3 concise, professional insight sentences about this dataset. "
        "Return ONLY 3 lines, one insight per line, no numbering, no bullets."
    )
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )

    raw = response.choices[0].message.content.strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    # Guarantee exactly 3 strings
    if len(lines) >= 3:
        return lines[:3]
    # Pad with a generic line if the model returned fewer
    while len(lines) < 3:
        lines.append("No additional insight available.")
    return lines


def compute_correlations(df: pd.DataFrame) -> pd.DataFrame:
    """Return a Pearson correlation matrix for all numeric columns."""
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.empty:
        return pd.DataFrame()
    return numeric_df.corr()


def detect_anomalies(df: pd.DataFrame, numeric_cols: list[str]) -> pd.DataFrame:
    """
    Flag rows as anomalies using the IQR method on the given numeric columns.
    Returns the full DataFrame with an added boolean column 'is_anomaly'.
    """
    result = df.copy()
    result["is_anomaly"] = False

    valid_cols = [c for c in numeric_cols if c in df.columns]
    if not valid_cols:
        return result

    for col in valid_cols:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        mask = (df[col] < lower) | (df[col] > upper)
        result.loc[mask, "is_anomaly"] = True

    return result


def get_anomaly_summary(result_df: pd.DataFrame) -> dict:
    """
    Compute summary stats from the output of detect_anomalies().
    Returns total_anomalies, percentage, anomaly_rows, full_data.
    """
    total = len(result_df)
    anomaly_df = result_df[result_df["is_anomaly"] == True]
    total_anomalies = len(anomaly_df)
    percentage = round((total_anomalies / total * 100) if total > 0 else 0.0, 2)

    return {
        "total_anomalies": total_anomalies,
        "percentage": percentage,
        "anomaly_rows": anomaly_df.drop(columns=["is_anomaly"]).to_dict(orient="records"),
        "full_data": result_df.to_dict(orient="records"),
    }
