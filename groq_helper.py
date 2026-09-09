from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def process_text(text: str) -> dict:
    """
    Takes raw ISL gloss (signed word order, missing function words) and
    reorders it into natural English. Marathi translation is handled
    separately by Google Translate (see translate_to_marathi in app.py) —
    Groq's job here is just the grammar/reordering, which is what it's
    actually good at.
    Returns a dict with key 'cleaned' (and 'marathi' kept empty for
    backwards compatibility with older callers).
    """
    if not text.strip():
        return {"cleaned": "", "marathi": ""}

    prompt = f"""
You are an expert Indian Sign Language (ISL) interpreter.

The input below is raw ISL gloss — the words as they were signed, in ISL
word order. ISL grammar is NOT the same as English word order: signs are
often produced Object/Topic first, pronouns can come in a different position
than in English, and words like "to", "am", "is", "are", "a", "an", "the"
are usually dropped entirely because ISL doesn't sign them.

Reorder the words into natural, grammatically correct English word order,
and insert whatever missing pronouns, articles, or "to be"/"to" verbs ISL
grammar leaves out — so the result reads exactly the way a fluent English
speaker would actually say it. Do NOT add any new meaning, only fix grammar
and word order.
   Example: gloss "U MEET NICE" (signed as: You, Meet, Nice) becomes
   "Nice to meet you." — note both the reordering and the inserted word "to".

STRICT RULES:
- Output ONLY the corrected English sentence — no labels, no quotes, no
  explanation, no alternatives.
- Do NOT add extra information beyond what was signed — only reorder/insert
  grammar words.
- `SPARSH` is the name of the ISL application and may also be used as a
  person's proper name. Preserve it exactly as `SPARSH`; never translate it,
  replace it with "touching", or infer a different meaning from it.

ISL gloss input: {text}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}]
    )

    cleaned = response.choices[0].message.content.strip()
    # Strip stray quotes/labels if the model adds them despite instructions
    cleaned = cleaned.strip('"').strip()
    if cleaned.lower().startswith("cleaned:"):
        cleaned = cleaned.split(":", 1)[1].strip()

    return {"cleaned": cleaned, "marathi": ""}
