import os
import re
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def generate_suggested_questions(df: pd.DataFrame, schema: dict, model: str = "llama-3.1-8b-instant") -> list[str]:
    """Generate 4 highly relevant analytical questions based on the dataset schema."""
    
    schema_lines = "\n".join(
        f"- {col} ({info['dtype']})" for col, info in schema.items()
        if not col.startswith("_")
    )
    
    sample_data = df.head(3).to_string()
    
    prompt = (
        f"Dataset schema:\n{schema_lines}\n\n"
        f"Sample data records:\n{sample_data}\n\n"
        "You are an expert data analyst AI. Generate exactly 4 data analysis questions a user could ask their dataset.\n"
        "The questions must be answerable using SQL Group By, Orders, Sums, or Averages, based on the columns provided above.\n"
        "Return EXACTLY 4 lines. One question per line. No numbering. No bullets. No introduction or extra text."
    )
    
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
    
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    lines = [re.sub(r"^\d+[\.\)]\s*", "", l) for l in lines] # remove numbering just in case
    lines = [re.sub(r"^[•\-\*]\s*", "", l) for l in lines] # remove bullets just in case
    
    # Pad if model hallucinated fewer
    while len(lines) < 4:
        lines.append("Show an overview of the dataset")
        
    return lines[:4]
