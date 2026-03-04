import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def generate_page_summary(current_path: str, active_tab: str | None, data_summary: str | None, model: str = "llama-3.1-8b-instant") -> str:
    """Generate a contextual summary of the current page for the user."""
    
    context_desc = f"The user is currently on the '{current_path}' page."
    if active_tab:
        context_desc += f" They are viewing the '{active_tab}' tab."
        
    if data_summary:
        context_desc += f"\n\nHere is a summary of the data currently visible on their screen:\n{data_summary}"
    else:
        context_desc += "\n\nNo specific data is currently displayed."

    prompt = f"""
    You are an AI assistant built into a data analysis platform called InsightAI.
    Your goal is to explain to the user what they are currently looking at and how they can use it.
    
    Context of the user's current screen:
    {context_desc}
    
    Write a brief, friendly, and helpful summary explaining this page to the user.
    If there is data present, provide a quick executive summary of what that data means in 1-2 bullet points.
    Keep it under 150 words. Use clear markdown formatting.
    """
    
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    
    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
    return raw
