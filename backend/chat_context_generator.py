import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

def chat_with_context(messages: list[dict[str, str]], current_path: str, active_tab: str | None, data_summary: str | None, model: str = "llama-3.1-8b-instant") -> str:
    """Continue a conversation with the user regarding the current page context."""
    
    context_desc = f"The user is currently on the '{current_path}' page."
    if active_tab:
        context_desc += f" They are viewing the '{active_tab}' tab."
        
    if data_summary:
        context_desc += f"\n\nHere is a summary of the data currently visible on their screen:\n{data_summary}"
    else:
        context_desc += "\n\nNo specific data is currently displayed."

    system_prompt = f"""
    You are an AI assistant built into a data analysis platform called InsightAI.
    Your goal is to help the user understand the context of their current screen and answer their follow-up questions about it.
    
    Context of the user's current screen:
    {context_desc}
    
    The most recent messages represent the active conversation thread. 
    Always prioritize brevity and helpfulness. Use markdown formatting to make your answers clear.
    """
    
    # We prepend the system context to the message history so the LLM knows what to talk about
    formatted_messages = [{"role": "system", "content": system_prompt}] + messages
    
    response = client.chat.completions.create(
        model=model,
        messages=formatted_messages,
        temperature=0.3
    )
    
    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"<think>.*?</think>", "", raw, flags=re.IGNORECASE | re.DOTALL).strip()
    return raw
