import os
import re
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


def chat_with_data(
    messages: list[dict],
    schema_text: str,
    df: pd.DataFrame,
    model: str = "llama-3.1-8b-instant",
) -> str:
    """
    Answer a user question conversationally using the dataset as context.
    Sends the schema + a sample of the actual rows so the LLM can reason over real data.
    """
    # Build a compact data context (max 20 rows to stay under free-tier TPM limits)
    sample_df = df.head(20)
    # Only include short/medium columns (drop very long free-text cols)
    trimmed_cols = [
        col for col in sample_df.columns
        if sample_df[col].astype(str).str.len().mean() < 80
    ]
    data_sample = sample_df[trimmed_cols].to_dict(orient="records")

    system_prompt = (
        "You are an expert data analyst AI assistant embedded in InsightAI — "
        "a business intelligence platform. You have been given the user's uploaded dataset. "
        "Answer questions naturally and conversationally, "
        "referencing specific numbers and values from the data when relevant. "
        "Be concise, friendly, and insightful. If the user asks for analysis, trends, "
        "comparisons, or summaries, draw from the data provided below.\n\n"
        f"Dataset Schema:\n{schema_text}\n\n"
        f"Sample Data (first {len(data_sample)} rows):\n{data_sample}\n\n"
        "Guidelines:\n"
        "- Answer naturally, not like a SQL query result\n"
        "- Be specific with numbers and column values when helpful\n"
        "- If you are unsure about something, say so honestly\n"
        "- Format lists and comparisons clearly\n"
        "- Do NOT show SQL or code in your response unless the user explicitly asks for it"
    )

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    response = client.chat.completions.create(
        model=model,
        messages=full_messages,
        temperature=0.4,
    )

    raw = response.choices[0].message.content.strip()
    # Remove any <think>...</think> blocks (Qwen/DeepSeek models)
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
    return raw
