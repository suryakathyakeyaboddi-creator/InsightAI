import os
import re
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def generate_insight(question: str, result_df: pd.DataFrame, model: str = "llama-3.1-8b-instant") -> str:
    if result_df.empty:
        return "No data returned for this query."
    sample_data = result_df.head(5).to_dict(orient="records")
    prompt = f"Question: {question}\nData sample: {sample_data}\n\nWrite a short, professional single-sentence insight summarizing this data. Be concise and direct."
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
    
    return raw

