from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def process_text(text: str) -> dict:
    """
    Takes raw ISL-translated text, corrects grammar, and translates to Marathi.
    Returns a dict with keys: 'cleaned' and 'marathi'.
    """
    if not text.strip():
        return {"cleaned": "", "marathi": ""}

    prompt = f"""
You are a strict translator.

Step 1: Correct the English sentence.
Step 2: Translate it into simple Marathi.

STRICT RULES:
- Only ONE Marathi sentence
- Keep Marathi natural and short
- No brackets, no explanations, no alternatives
- Do NOT add extra words

OUTPUT FORMAT (exactly):
Cleaned: <correct sentence>
Marathi: <simple Marathi sentence>

Sentence: {text}
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.choices[0].message.content.strip()

    cleaned = ""
    marathi = ""

    for line in raw.splitlines():
        if line.startswith("Cleaned:"):
            cleaned = line.replace("Cleaned:", "").strip()
        elif line.startswith("Marathi:"):
            marathi = line.replace("Marathi:", "").strip()

    return {"cleaned": cleaned, "marathi": marathi}