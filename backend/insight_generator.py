import os
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
# Initialize Groq client
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def generate_insight(question: str, result_df: pd.DataFrame) -> str:
    if result_df.empty:
        return "No data returned for this query."
    sample_data = result_df.head(5).to_dict(orient="records")
    prompt = f"Question: {question}\nData sample: {sample_data}\n\nWrite a short, professional single-sentence insight summarizing this data. Be concise and direct."
    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    return response.choices[0].message.content.strip()
