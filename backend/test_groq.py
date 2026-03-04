import os
import duckdb
import pandas as pd
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

print("Testing Groq...")
try:
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": "Hello"}],
        temperature=0
    )
    print("Groq Response:", response.choices[0].message.content.strip())
except Exception as e:
    print("Groq Error:", str(e))
