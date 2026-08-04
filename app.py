import streamlit as st
import cv2
import mediapipe as mp
import numpy as np
import os
import time
import textwrap
from groq_helper import process_text
import streamlit.components.v1 as components


# ---------- PAGE CONFIG ----------
st.set_page_config(page_title="S-Sparsh · ISL Translator", layout="wide", page_icon="🤟")

# ---------- THEME STATE ----------
if "dark_mode" not in st.session_state:
    st.session_state.dark_mode = True

# ---------- THEME PALETTES ----------
DARK = {
    "bg_base":        "#0a0514",
    "bg_surface":     "#110820",
    "bg_card":        "#17102e",
    "bg_card2":       "#1e1540",
    "border":         "rgba(139,92,246,0.12)",
    "border_accent":  "rgba(139,92,246,0.28)",
    "text_primary":   "#f0eaff",
    "text_secondary": "#a89dc8",
    "text_muted":     "#5a4e7a",
    "accent":         "#a855f7",
    "accent2":        "#e879f9",
    "accent3":        "#f59e0b",
    "accent4":        "#60a5fa",
    "status_good":    "#4ade80",
    "btn_glow":       "rgba(168,85,247,0.25)",
    "chip_bg":        "rgba(168,85,247,0.12)",
    "chip_border":    "rgba(168,85,247,0.30)",
    "scrollbar":      "#2a1d4a",
    "shadow":         "rgba(0,0,0,0.55)",
    "tag_en_bg":      "rgba(96,165,250,0.12)",
    "tag_en_col":     "#93c5fd",
    "tag_mr_bg":      "rgba(232,121,249,0.12)",
    "tag_mr_col":     "#f0abfc",
}
LIGHT = {
    "bg_base":        "#f3eeff",
    "bg_surface":     "#ece3fc",
    "bg_card":        "#ffffff",
    "bg_card2":       "#f7f2ff",
    "border":         "rgba(109,40,217,0.10)",
    "border_accent":  "rgba(109,40,217,0.22)",
    "text_primary":   "#1a0a3a",
    "text_secondary": "#5b3d8a",
    "text_muted":     "#9b82c0",
    "accent":         "#7c3aed",
    "accent2":        "#c026d3",
    "accent3":        "#b45309",
    "accent4":        "#2563eb",
    "status_good":    "#16a34a",
    "btn_glow":       "rgba(124,58,237,0.15)",
    "scrollbar":      "#d8c8f0",
    "chip_bg":        "rgba(124,58,237,0.08)",
    "chip_border":    "rgba(124,58,237,0.25)",
    "shadow":         "rgba(60,20,120,0.12)",
    "tag_en_bg":      "rgba(37,99,235,0.10)",
    "tag_en_col":     "#1d4ed8",
    "tag_mr_bg":      "rgba(192,38,211,0.10)",
    "tag_mr_col":     "#a21caf",
}

T = DARK if st.session_state.dark_mode else LIGHT

# ---------- CSS ----------
st.markdown(f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600&display=swap');

*, *::before, *::after {{ box-sizing: border-box; }}

html, body, [class*="css"] {{
    font-family: 'Outfit', sans-serif;
    background-color: {T["bg_base"]} !important;
    color: {T["text_primary"]} !important;
}}

#MainMenu, footer, header {{ visibility: hidden; }}
.block-container {{ padding: 0 !important; max-width: 100% !important; }}
section[data-testid="stSidebar"] > div:first-child {{
    background: {T["bg_surface"]} !important;
    border-right: 0.5px solid {T["border_accent"]};
    padding-top: 1.5rem;
}}
section[data-testid="stSidebar"] * {{ color: {T["text_primary"]} !important; }}

::-webkit-scrollbar {{ width: 4px; }}
::-webkit-scrollbar-track {{ background: transparent; }}
::-webkit-scrollbar-thumb {{ background: {T["scrollbar"]}; border-radius: 4px; }}

.s-header {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 28px;
    background: {T["bg_surface"]};
    border-bottom: 0.5px solid {T["border_accent"]};
    position: sticky; top: 0; z-index: 100;
}}
.s-brand {{ display: flex; align-items: center; gap: 12px; }}
.s-logo {{
    width: 36px; height: 36px; border-radius: 10px;
    background: {T["chip_bg"]};
    border: 0.5px solid {T["border_accent"]};
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
}}
.s-brand-text .title {{
    font-size: 35px; font-weight: 700;
    background: linear-gradient(90deg, {T["accent"]}, {T["accent2"]});
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: 0.03em;
}}
.s-brand-text .sub {{
    font-size: 11px; color: {T["text_muted"]};
    margin-top: 1px;
}}
.s-pills {{ display: flex; align-items: center; gap: 8px; }}
.pill {{
    font-size: 11px; padding: 4px 11px; border-radius: 20px;
    border: 0.5px solid; font-weight: 500; letter-spacing: 0.03em;
}}
.pill-live {{ color: {T["status_good"]}; border-color: {T["status_good"]}40; background: {T["status_good"]}10; }}
.pill-live .dot {{ display:inline-block; width:6px; height:6px; border-radius:50%; background:{T["status_good"]}; margin-right:5px; animation: blink 1.4s ease-in-out infinite; vertical-align:middle; }}
.pill-model {{ color: {T["accent"]}; border-color: {T["border_accent"]}; background: {T["chip_bg"]}; }}

.s-main {{
    display: grid;
    grid-template-columns: 1fr 330px;
    height: calc(100vh - 61px);
    overflow: hidden;
}}
.s-feed {{
    padding: 18px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 14px;
    border-right: 0.5px solid {T["border"]};
}}
.s-panel {{
    background: {T["bg_surface"]};
    padding: 16px;
    overflow-y: auto;
    display: flex; flex-direction: column; gap: 13px;
}}

.cam-wrap {{
    position: relative;
    background: {T["bg_base"]};
    border-radius: 14px;
    border: 0.5px solid {T["border_accent"]};
    overflow: hidden;
}}
.cam-grid {{
    position: absolute; inset: 0;
    background-image:
        linear-gradient({T["accent"]}08 1px, transparent 1px),
        linear-gradient(90deg, {T["accent"]}08 1px, transparent 1px);
    background-size: 36px 36px;
    pointer-events: none;
}}
.cam-gradient {{
    position: absolute; inset: 0;
    background: radial-gradient(ellipse at 50% 110%, {T["accent"]}18 0%, transparent 65%);
    pointer-events: none;
}}
.cam-corner {{ position: absolute; width: 20px; height: 20px; border-color: {T["accent"]}; border-style: solid; opacity: 0.6; }}
.cam-tl {{ top:10px; left:10px; border-width:2px 0 0 2px; border-radius:4px 0 0 0; }}
.cam-tr {{ top:10px; right:10px; border-width:2px 2px 0 0; border-radius:0 4px 0 0; }}
.cam-bl {{ bottom:10px; left:10px; border-width:0 0 2px 2px; border-radius:0 0 0 4px; }}
.cam-br {{ bottom:10px; right:10px; border-width:0 2px 2px 0; border-radius:0 0 4px 0; }}
.cam-rec {{
    position: absolute; top:12px; left:12px; z-index:5;
    display: flex; align-items:center; gap:5px;
    background: {T["bg_base"]}cc; padding: 3px 9px; border-radius:20px;
}}
.rec-dot {{ width:7px; height:7px; border-radius:50%; background:#ef4444; animation: blink 1.4s ease-in-out infinite; }}
.rec-label {{ font-size:10px; color:#f87171; font-weight:600; letter-spacing:0.1em; }}
.cam-stopped-overlay {{
    position: absolute; inset:0; z-index:4;
    background: {T["bg_base"]}cc;
    display: flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
}}
.cam-stopped-icon {{ font-size:40px; opacity:0.3; }}
.cam-stopped-label {{ font-size:12px; color:{T["text_muted"]}; letter-spacing:0.08em; }}

@keyframes blink {{ 0%,100%{{opacity:1}} 50%{{opacity:0.25}} }}

.conf-row {{
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: {T["bg_card"]};
    border-radius: 10px; border: 0.5px solid {T["border"]};
}}
.conf-label {{ font-size:11px; color:{T["text_muted"]}; min-width:75px; }}
.conf-track {{ flex:1; height:3px; background:{T["accent"]}15; border-radius:2px; overflow:hidden; }}
.conf-fill {{ height:100%; border-radius:2px; background:linear-gradient(90deg,{T["accent"]},{T["accent2"]}); }}
.conf-pct {{ font-size:12px; font-weight:600; color:{T["accent2"]}; min-width:34px; text-align:right; }}

.hold-row {{
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    background: {T["bg_card"]};
    border-radius: 10px; border: 0.5px solid {T["border"]};
}}
.hold-letter {{
    font-size:32px; font-weight:700; min-width:38px;
    background: linear-gradient(135deg,{T["accent"]},{T["accent2"]});
    -webkit-background-clip:text; -webkit-text-fill-color:transparent;
}}
.hold-info {{ flex:1; }}
.hold-info .lbl {{ font-size:10px; color:{T["text_muted"]}; text-transform:uppercase; letter-spacing:0.08em; }}
.hold-track {{ height:4px; background:{T["accent"]}18; border-radius:2px; margin-top:5px; overflow:hidden; }}
.hold-fill {{ height:100%; border-radius:2px; transition: width 0.1s linear; background:linear-gradient(90deg,{T["accent"]},{T["accent3"]}); }}

.word-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }}
.mini-card {{
    background: {T["bg_card"]}; border-radius:10px;
    border: 0.5px solid {T["border"]}; padding:12px 14px;
}}
.mini-card .mc-lbl {{ font-size:10px; color:{T["text_muted"]}; text-transform:uppercase; letter-spacing:0.08em; }}
.mini-card .mc-val {{ font-size:20px; font-weight:600; color:{T["text_primary"]}; margin-top:3px; letter-spacing:0.04em; }}
.mc-val.violet {{ background:linear-gradient(90deg,{T["accent"]},{T["accent2"]}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }}

.sec-lbl {{
    font-size:10px; color:{T["text_muted"]};
    text-transform:uppercase; letter-spacing:0.12em;
    font-weight:500; margin-bottom:6px;
}}

.chip-stream {{ display:flex; flex-wrap:wrap; gap:5px; }}
.lchip {{
    width:30px; height:30px; border-radius:7px;
    background:{T["chip_bg"]}; border:0.5px solid {T["chip_border"]};
    display:flex; align-items:center; justify-content:center;
    font-size:13px; font-weight:600; color:{T["accent"]};
}}
.lchip.done {{ background:{T["chip_bg"]}55; border-color:{T["border"]}; color:{T["text_muted"]}; }}
.lchip.gap {{ width:14px; background:transparent; border-color:transparent; }}

.out-card {{
    background:{T["bg_card"]}; border-radius:12px;
    border:0.5px solid {T["border"]}; padding:14px;
    margin-bottom:8px;
}}
.out-lang-row {{ display:flex; align-items:center; gap:7px; margin-bottom:8px; }}
.lang-tag {{
    font-size:10px; padding:3px 9px; border-radius:10px;
    font-weight:600; letter-spacing:0.05em; border:0.5px solid;
}}
.tag-en {{ background:{T["tag_en_bg"]}; color:{T["tag_en_col"]}; border-color:{T["tag_en_col"]}40; }}
.tag-mr {{ background:{T["tag_mr_bg"]}; color:{T["tag_mr_col"]}; border-color:{T["tag_mr_col"]}40; font-family:'Noto Sans Devanagari',sans-serif; }}
.out-text {{
    font-size:14px; color:{T["text_secondary"]}; line-height:1.65; min-height:36px;
}}
.out-text .active {{ color:{T["text_primary"]}; font-weight:500; }}
.out-text .devanagari {{ font-family:'Noto Sans Devanagari',sans-serif; font-size:15px; }}

.stat-grid {{ display:grid; grid-template-columns:1fr 1fr; gap:8px; }}
.stat-card {{
    background:{T["bg_card2"]}; border-radius:9px;
    border:0.5px solid {T["border"]}; padding:10px 12px;
}}
.stat-val {{ font-size:22px; font-weight:700; color:{T["text_primary"]}; }}
.stat-sub {{ font-size:10px; color:{T["text_muted"]}; margin-top:2px; }}

.s-divider {{ border:none; border-top:0.5px solid {T["border"]}; margin:2px 0; }}

.ctrl-btn {{
    width:100%; padding:10px 14px; border-radius:9px;
    font-size:12px; font-weight:600; cursor:pointer;
    border:0.5px solid; text-align:left; display:flex; align-items:center; gap:9px;
    transition:background 0.15s, box-shadow 0.15s;
    font-family:'Outfit',sans-serif; letter-spacing:0.02em; margin-bottom:7px;
}}
.btn-violet {{
    background:{T["chip_bg"]}; border-color:{T["border_accent"]}; color:{T["accent"]};
}}
.btn-violet:hover {{ background:{T["accent"]}18; box-shadow:0 0 14px {T["btn_glow"]}; }}
.btn-magenta {{
    background:{T["accent2"]}10; border-color:{T["accent2"]}35; color:{T["accent2"]};
}}
.btn-magenta:hover {{ background:{T["accent2"]}1a; }}
.btn-danger {{
    background:#ef444408; border-color:#ef444428; color:#f87171;
}}
.btn-danger:hover {{ background:#ef444414; }}

div[data-testid="stButton"] > button {{
    background: {T["chip_bg"]} !important;
    border: 0.5px solid {T["border_accent"]} !important;
    color: {T["accent"]} !important;
    border-radius: 9px !important;
    font-family: 'Outfit', sans-serif !important;
    font-weight: 600 !important;
    font-size: 13px !important;
    padding: 8px 16px !important;
    width: 100%;
    transition: background 0.15s !important;
}}
div[data-testid="stButton"] > button:hover {{
    background: {T["accent"]}20 !important;
    box-shadow: 0 0 12px {T["btn_glow"]} !important;
}}

div[data-testid="stToggle"] label {{
    color: {T["text_secondary"]} !important;
    font-family: 'Outfit', sans-serif !important;
    font-size: 13px !important;
}}

.sidebar-section {{
    font-size:11px; color:{T["text_muted"]};
    text-transform:uppercase; letter-spacing:0.1em;
    font-weight:500; margin: 16px 0 8px;
}}
</style>
""", unsafe_allow_html=True)

# ---------- SESSION STATE ----------
defaults = {
    "sentence":     "",
    "current_word": "",
    "cleaned":      "",
    "marathi":      "",
    "prev_pred":    None,
    "count":        0,
    "last_added":   "",
    "signs_total":  0,
    "words_total":  0,
}
for k, v in defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# "mode" is intentionally NOT in `defaults` / the Clear-session reset list —
# switching modes shouldn't wipe the mode itself.
if "mode" not in st.session_state:
    st.session_state.mode = "learning"  # "learning" | "conversation"

# ---------- CONVERSATION MODE STATE ----------
conv_defaults = {
    "chat_history":         [],    # [{"sender": "isl"|"you", "text": str, "time": str}, ...]
    "conv_current_word":    "",
    "conv_sentence_buffer": "",
    "conv_prev_pred":       None,
    "conv_count":           0,
    "conv_last_added":      "",
    "conv_last_hand_time":  None,  # set lazily once the camera loop starts
    "conv_word_committed":  True,
    "conv_message_sent":    True,
}
for k, v in conv_defaults.items():
    if k not in st.session_state:
        st.session_state[k] = v

# ---------- GROQ HELPER (inline fallback) ----------
def process_text(raw_text: str) -> dict:
    """
    Calls Groq API to clean ISL letter sequence and translate to Marathi.
    Falls back gracefully if groq_helper module or API key is unavailable.
    """
    # Try importing groq_helper first (user-provided module)
    try:
        from groq_helper import process_text as _pt
        return _pt(raw_text)
    except ImportError:
        pass

    # Inline Groq implementation
    try:
        from groq import Groq

        api_key = os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            return {
                "cleaned": raw_text.strip(),
                "marathi": "⚠️ GROQ_API_KEY not set in environment.",
            }

        client = Groq(api_key=api_key)

        system_prompt = (
            "You are an Indian Sign Language (ISL) interpreter assistant. "
            "You will receive a raw string of detected sign letters (possibly with spaces and punctuation). "
            "Your tasks:\n"
            "1. Clean and correct the raw letter sequence into proper English words/sentences.\n"
            "2. Translate the cleaned English text into natural Marathi (Devanagari script).\n"
            "Respond ONLY in this exact JSON format with no extra text:\n"
            '{"cleaned": "<English text>", "marathi": "<Marathi text>"}'
        )

        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Raw ISL input: {raw_text}"},
            ],
            temperature=0.3,
            max_tokens=512,
        )

        import json
        content = response.choices[0].message.content.strip()
        # Strip markdown fences if present
        content = content.replace("```json", "").replace("```", "").strip()
        result = json.loads(content)
        return {
            "cleaned": result.get("cleaned", raw_text),
            "marathi": result.get("marathi", ""),
        }

    except Exception as e:
        return {
            "cleaned": raw_text.strip(),
            "marathi": f"⚠️ Translation error: {str(e)}",
        }

# ---------- PUNCTUATION RESTORATION (Hugging Face, for Conversation Mode) ----------
@st.cache_resource
def load_punctuation_model():
    """
    Loads a small multilingual punctuation-restoration model once per session.
    Returns None (never raises) if transformers/torch aren't installed or the
    model can't be downloaded, so the app degrades gracefully instead of
    crashing when offline.
    """
    try:
        from transformers import pipeline
        return pipeline(
            "token-classification",
            model="oliverguhr/fullstop-punctuation-multilang-large",
            aggregation_strategy="simple",
        )
    except Exception as e:
        st.sidebar.warning(f"⚠️ Punctuation model unavailable — using basic fallback ({e})")
        return None

_PUNCT_LABEL_MAP = {"0": "", ".": ".", ",": ",", "?": "?", ":": ":", "-": "-"}

def _basic_capitalize(text: str) -> str:
    """Fallback used when the HF model can't be loaded: capitalize + trailing period only."""
    text = text.strip().lower()
    if not text:
        return text
    text = text[0].upper() + text[1:]
    return text if text.endswith((".", "?", "!")) else text + "."

def restore_punctuation(raw_text: str) -> str:
    """
    Takes a raw, unpunctuated fingerspelled string (e.g. 'how are you')
    and returns a punctuated, capitalized sentence.
    """
    raw_text = raw_text.strip()
    if not raw_text:
        return raw_text

    model = load_punctuation_model()
    if model is None:
        return _basic_capitalize(raw_text)

    try:
        predictions = model(raw_text.lower())
        words = []
        capitalize_next = True
        for pred in predictions:
            word = pred.get("word", "").strip()
            if not word:
                continue
            if capitalize_next:
                word = word[0].upper() + word[1:]
                capitalize_next = False
            punct = _PUNCT_LABEL_MAP.get(pred.get("entity_group", "0"), "")
            words.append(word + punct)
            if punct in (".", "?", "!"):
                capitalize_next = True
        return " ".join(words) if words else _basic_capitalize(raw_text)
    except Exception:
        return _basic_capitalize(raw_text)

# ---------- HEADER ----------
theme_icon = "🌙" if st.session_state.dark_mode else "☀️"
mode_label = "🎓 Learning Mode" if st.session_state.mode == "learning" else "💬 Conversation Mode"
st.markdown(f"""
<div class="s-header">
  <div class="s-brand">
    <div class="s-logo">🤟</div>
    <div class="s-brand-text">
      <div class="title">S-स्पर्श</div>
      <div class="sub">Indian Sign Language · Real-time AI Translation</div>
    </div>
  </div>
  <div class="s-pills">
    <span class="pill pill-live"><span class="dot"></span>{mode_label}</span>
    <span class="pill pill-model">MediaPipe · Groq</span>
  </div>
</div>
""", unsafe_allow_html=True)

def speak_js(text: str, lang: str = "en-US"):
    if not text.strip():
        return
    # Escape quotes to avoid JS injection
    safe = text.replace("'", "\\'").replace("\n", " ")
    js = f"""
    <script>
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance('{safe}');
    u.lang  = '{lang}';
    u.rate  = 0.95;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
    </script>
    """
    components.html(js, height=0)
# ---------- LOAD MODEL (safe) — shared by both modes ----------
@st.cache_resource
def load_model():
    """Load the ISL classifier model. Returns None if not found."""
    try:
        import joblib
        model_path = "models/model.pkl"
        if not os.path.exists(model_path):
            st.sidebar.warning("⚠️ Model not found at models/model.pkl")
            return None
        return joblib.load(model_path)
    except Exception as e:
        st.sidebar.error(f"Model load error: {e}")
        return None


model = load_model()

# ---------- MEDIAPIPE SETUP — shared by both modes ----------
@st.cache_resource
def get_hands():
    mp_hands = mp.solutions.hands
    return mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ), mp_hands, mp.solutions.drawing_utils

hands, mp_hands, mp_draw = get_hands()

HOLD_THRESHOLD = 20  # consecutive stable-prediction frames needed to register a letter

# ---------- SIDEBAR ----------
with st.sidebar:
    st.markdown("<div class='sidebar-section'>Mode</div>", unsafe_allow_html=True)
    mode_choice = st.radio(
        "Mode",
        options=["learning", "conversation"],
        format_func=lambda m: "🎓 Learning Mode" if m == "learning" else "💬 Conversation Mode",
        index=0 if st.session_state.mode == "learning" else 1,
        key="mode_radio",
        label_visibility="collapsed",
    )
    if mode_choice != st.session_state.mode:
        st.session_state.mode = mode_choice
        # Switching modes stops the camera and clears in-progress capture
        # state so one mode's half-finished input doesn't leak into the
        # other. Chat history is intentionally kept.
        for key in ["sentence", "current_word", "cleaned", "marathi",
                    "prev_pred", "count", "last_added", "signs_total", "words_total"]:
            st.session_state[key] = defaults[key]
        for key in ["conv_current_word", "conv_sentence_buffer", "conv_prev_pred",
                    "conv_count", "conv_last_added", "conv_word_committed", "conv_message_sent"]:
            st.session_state[key] = conv_defaults[key]
        st.rerun()

    st.caption(
        "Learning Mode uses the SPACE / COMMA / FULLSTOP hand signs to build "
        "sentences letter by letter — good for practicing fingerspelling."
        if st.session_state.mode == "learning"
        else "Conversation Mode has no punctuation signs — pause between "
             "words and messages instead, and punctuation is predicted "
             "automatically."
    )

    st.markdown(f"<div class='sidebar-section'>Display</div>", unsafe_allow_html=True)
    dm = st.toggle(f"{theme_icon}  Dark mode", value=st.session_state.dark_mode, key="dm_toggle")
    if dm != st.session_state.dark_mode:
        st.session_state.dark_mode = dm
        st.rerun()

    if st.session_state.mode == "learning":
        st.markdown("<div class='sidebar-section'>Camera</div>", unsafe_allow_html=True)
        run = st.toggle("▶  Start camera", value=False)

        st.markdown("<div class='sidebar-section'>Actions</div>", unsafe_allow_html=True)

        if st.button("⚡  Translate with Groq"):
            full = st.session_state.sentence + st.session_state.current_word
            if full.strip():
                with st.spinner("Calling Groq…"):
                    result = process_text(full)
                st.session_state.cleaned = result.get("cleaned", "")
                st.session_state.marathi = result.get("marathi", "")
            else:
                st.warning("Nothing to translate yet.")
        st.markdown("<div class='sidebar-section'>Voice Output</div>", unsafe_allow_html=True)

        if st.button("🔊 Speak English"):
            speak_js(st.session_state.cleaned, "en-US")

        if st.button("🔊 मराठी ऐका"):
            speak_js(st.session_state.marathi, "mr-IN")

        if st.button("✕  Clear session"):
            for key in ["sentence", "current_word", "cleaned", "marathi",
                        "prev_pred", "count", "last_added", "signs_total", "words_total"]:
                st.session_state[key] = defaults[key]
            st.rerun()
    else:
        st.markdown("<div class='sidebar-section'>Camera</div>", unsafe_allow_html=True)
        run = st.toggle("▶  Start camera", value=False, key="conv_run_toggle")

        st.markdown("<div class='sidebar-section'>Timing</div>", unsafe_allow_html=True)
        word_pause_sec = st.slider(
            "Pause to end a word (sec)", min_value=0.5, max_value=3.0,
            value=1.5, step=0.1, key="word_pause_slider",
        )
        message_pause_sec = st.slider(
            "Pause to send message (sec)", min_value=3.0, max_value=10.0,
            value=6.0, step=0.5, key="message_pause_slider",
        )

        st.markdown("<div class='sidebar-section'>Chat</div>", unsafe_allow_html=True)
        if st.button("🗑️  Clear chat"):
            st.session_state.chat_history = []
            st.session_state.conv_current_word = ""
            st.session_state.conv_sentence_buffer = ""
            st.session_state.conv_word_committed = True
            st.session_state.conv_message_sent = True
            st.rerun()

if st.session_state.mode == "learning":
    # ---------- MAIN LAYOUT ----------
    col_feed, col_panel = st.columns([2, 1], gap="small")

    with col_feed:
        FRAME_WINDOW = st.empty()
        conf_box  = st.empty()
        hold_box  = st.empty()
        word_box  = st.empty()

    with col_panel:
        chip_box  = st.empty()
        out_box   = st.empty()
        stat_box  = st.empty()

    # ---------- UI RENDERER ----------
    def render_chips(sentence, current_word):
        chips = ""
        for ch in sentence:
            if ch == " ":
                chips += "<div class='lchip gap'></div>"
            else:
                chips += f"<div class='lchip done'>{ch}</div>"
        for ch in current_word:
            chips += f"<div class='lchip'>{ch}</div>"
        if not chips:
            chips = f"<span style='font-size:12px;color:{T['text_muted']};'>Waiting for input…</span>"
        return chips




    def update_ui(letter, hold_pct, conf_pct, running):
        # Confidence bar
        conf_box.markdown(f"""
        <div class="conf-row">
          <span class="conf-label">Confidence</span>
          <div class="conf-track"><div class="conf-fill" style="width:{conf_pct}%"></div></div>
          <span class="conf-pct">{conf_pct}%</span>
        </div>""", unsafe_allow_html=True)

        # Hold / current letter
        hold_box.markdown(f"""
        <div class="hold-row">
          <div class="hold-letter">{letter if letter not in ("—", "·") else "·"}</div>
          <div class="hold-info">
            <div class="lbl">Hold to register · {hold_pct}%</div>
            <div class="hold-track"><div class="hold-fill" style="width:{hold_pct}%"></div></div>
          </div>
        </div>""", unsafe_allow_html=True)

        # Current word + last added
        word_box.markdown(f"""
        <div class="word-grid">
          <div class="mini-card">
            <div class="mc-lbl">Current word</div>
            <div class="mc-val">{st.session_state.current_word or "…"}</div>
          </div>
          <div class="mini-card">
            <div class="mc-lbl">Last added word</div>
            <div class="mc-val violet">{st.session_state.last_added or "…"}</div>
          </div>
        </div>""", unsafe_allow_html=True)

        # Letter chips
        chips_html = render_chips(st.session_state.sentence, st.session_state.current_word)
        chip_box.markdown(f"""
        <div class="sec-lbl">Raw capture</div>
        <div style="background:{T['bg_card']};border-radius:12px;border:0.5px solid {T['border']};padding:13px;">
          <div class="chip-stream">{chips_html}</div>
        </div>""", unsafe_allow_html=True)

        # Output
        en_text  = st.session_state.cleaned or ""
        mr_text  = st.session_state.marathi or ""
        out_box.markdown(f"""
        <div class="sec-lbl" style="margin-top:4px">Translation output</div>
        <div class="out-card">
          <div class="out-lang-row"><span class="lang-tag tag-en">English</span></div>
          <div class="out-text">
            {'<span class="active">' + en_text + '</span>' if en_text else ('<span style="color:' + T["text_muted"] + ';font-size:12px">Translate via sidebar →</span>')}
          </div>
        </div>
        <div class="out-card">
          <div class="out-lang-row"><span class="lang-tag tag-mr">मराठी</span></div>
          <div class="out-text devanagari">
            {'<span class="active devanagari">' + mr_text + '</span>' if mr_text else ('<span style="color:' + T["text_muted"] + ';font-size:12px">मराठी भाषांतर येथे दिसेल</span>')}
          </div>
        </div>""", unsafe_allow_html=True)

        # Stats
        stat_box.markdown(f"""
        <hr class="s-divider">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-val">{st.session_state.signs_total}</div>
            <div class="stat-sub">Signs detected</div>
          </div>
          <div class="stat-card">
            <div class="stat-val">{st.session_state.words_total}</div>
            <div class="stat-sub">Words formed</div>
          </div>
        </div>""", unsafe_allow_html=True)


    SPECIAL_SIGNS = {
        "SPACE":    " ",
        "COMMA":    ",",
        "FULLSTOP": ".",
    }

    # ---------- CAMERA LOOP ----------
    if run:
        if model is None:
            st.error("Cannot start camera: model not loaded. Please place your model at models/model.pkl")
        else:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                st.error("❌ Camera not accessible. Please check your webcam connection.")
            else:
                # Show initial idle UI before first frame
                update_ui("·", 0, 0, running=True)

                while run:
                    ret, frame = cap.read()
                    if not ret:
                        st.error("Camera read failed.")
                        break

                    frame  = cv2.flip(frame, 1)
                    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = hands.process(rgb)

                    detected_letter = "·"
                    hold_pct = 0
                    conf = 0

                    if result.multi_hand_landmarks:
                        for hand_landmarks in result.multi_hand_landmarks:
                            try:
                                landmarks = []
                                for lm in hand_landmarks.landmark:
                                    landmarks.extend([lm.x, lm.y, lm.z])
                                landmarks  = np.array(landmarks).reshape(1, -1)
                                prediction = str(model.predict(landmarks)[0]).upper()

                                if prediction == st.session_state.prev_pred:
                                    st.session_state.count += 1
                                else:
                                    st.session_state.count     = 0
                                    st.session_state.prev_pred = prediction

                                hold_pct = min(100, int((st.session_state.count / HOLD_THRESHOLD) * 100))
                                conf     = hold_pct
                                detected_letter = prediction

                                if st.session_state.count > HOLD_THRESHOLD:
                                    if prediction != st.session_state.last_added:
                                        st.session_state.last_added  = prediction
                                        st.session_state.signs_total += 1

                                        if prediction in SPECIAL_SIGNS:
                                            char = SPECIAL_SIGNS[prediction]
                                            if char == " ":
                                                if st.session_state.current_word:
                                                    st.session_state.sentence    += st.session_state.current_word + " "
                                                    st.session_state.words_total += 1
                                                    st.session_state.current_word = ""
                                            else:
                                                if st.session_state.current_word:
                                                    st.session_state.sentence    += st.session_state.current_word
                                                    st.session_state.words_total += 1
                                                    st.session_state.current_word = ""
                                                st.session_state.sentence += char + " "
                                        else:
                                            st.session_state.current_word += prediction

                                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                            except Exception as e:
                                # Skip bad frame silently
                                pass
                    else:
                        st.session_state.count      = 0
                        st.session_state.prev_pred  = None
                        st.session_state.last_added = ""
                        hold_pct = 0

                    FRAME_WINDOW.image(frame, channels="BGR", use_container_width=True)
                    update_ui(detected_letter, hold_pct, conf, running=True)

                cap.release()

    else:
        # Static placeholder when camera is off
        FRAME_WINDOW.markdown(f"""
        <div class="cam-wrap" style="aspect-ratio:16/9;min-height:240px;">
          <div class="cam-grid"></div>
          <div class="cam-gradient"></div>
          <div class="cam-corner cam-tl"></div>
          <div class="cam-corner cam-tr"></div>
          <div class="cam-corner cam-bl"></div>
          <div class="cam-corner cam-br"></div>
          <div class="cam-stopped-overlay">
            <div class="cam-stopped-icon">🤟</div>
            <div class="cam-stopped-label">Toggle camera in sidebar to start</div>
          </div>
        </div>""", unsafe_allow_html=True)

        update_ui("·", 0, 0, running=False)

else:
    # ==================== CONVERSATION MODE ====================
    # No SPACE / COMMA / FULLSTOP signs here. Word and message boundaries
    # are detected purely from how long the camera goes without seeing a
    # hand: a short pause ends the current word, a longer pause finalizes
    # and sends the whole message (through HF punctuation restoration)
    # into the chat.

    def _html(container, raw):
        """
        st.markdown(unsafe_allow_html=True) renders HTML fine, but if the
        string has 4+ leading spaces on a line (easy to get by accident from
        Python indentation), Markdown treats it as a literal code block
        instead of parsing it as HTML. Dedenting before render avoids that.
        """
        container.markdown(textwrap.dedent(raw).strip(), unsafe_allow_html=True)

    if "last_you_message" not in st.session_state:
        st.session_state.last_you_message = ""

    conv_feed, conv_chat = st.columns([2, 1], gap="small")

    with conv_feed:
        CONV_FRAME     = st.empty()
        signer_display = st.empty()   # large text so you can flip the screen for the signer
        conv_status    = st.empty()

    with conv_chat:
        st.markdown("<div class='sec-lbl'>Conversation</div>", unsafe_allow_html=True)
        chat_box = st.empty()

        # Typing reply — a normal widget rendered once per script run, so it
        # keeps working the same way the sidebar buttons already do while
        # the camera loop below is running.
        with st.form(key="conv_reply_form", clear_on_submit=True):
            typed_msg = st.text_input(
                "Type a reply", key="conv_typed_input",
                label_visibility="collapsed", placeholder="Type your reply…",
            )
            send_clicked = st.form_submit_button("Send ➜")
        if send_clicked and typed_msg.strip():
            st.session_state.chat_history.append({
                "sender": "you",
                "text": typed_msg.strip(),
                "time": time.strftime("%H:%M"),
            })
            st.session_state.last_you_message = typed_msg.strip()

    def render_conv_chat():
        history = st.session_state.chat_history
        if not history:
            bubbles = (
                f"<span style='font-size:12px;color:{T['text_muted']};'>"
                f"Chat will appear here once someone signs a message…</span>"
            )
        else:
            bubbles = ""
            for msg in history:
                is_you = msg["sender"] == "you"
                align  = "flex-end" if is_you else "flex-start"
                bg     = T["accent"] if is_you else T["bg_card"]
                fg     = "#ffffff" if is_you else T["text_primary"]
                label  = "You" if is_you else "ISL"
                bubbles += (
                    f'<div style="display:flex;flex-direction:column;align-items:{align};margin-bottom:10px;">'
                    f'<div style="font-size:10px;color:{T["text_muted"]};margin-bottom:3px;">{label} · {msg["time"]}</div>'
                    f'<div style="background:{bg};color:{fg};padding:8px 13px;border-radius:12px;'
                    f'max-width:88%;font-size:13px;line-height:1.5;border:0.5px solid {T["border"]};">'
                    f'{msg["text"]}</div></div>'
                )
        _html(chat_box, f"""
            <div style="background:{T['bg_surface']};border-radius:12px;border:0.5px solid {T['border']};
                 padding:14px;height:340px;overflow-y:auto;display:flex;flex-direction:column;">
              {bubbles}
            </div>""")

    def render_signer_display():
        """Big, high-contrast panel for your typed reply — flip the phone/screen
        toward the ISL signer so they can read it directly."""
        msg = st.session_state.last_you_message
        if msg:
            _html(signer_display, f"""
                <div style="background:{T['accent']};border-radius:12px;padding:16px 20px;margin:10px 0;">
                  <div style="font-size:10px;color:#ffffffcc;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">
                    📱 Show this to the signer
                  </div>
                  <div style="font-size:22px;font-weight:600;color:#ffffff;line-height:1.35;">
                    {msg}
                  </div>
                </div>""")
        else:
            _html(signer_display, f"""
                <div style="border:1px dashed {T['border_accent']};border-radius:12px;padding:14px 20px;margin:10px 0;text-align:center;">
                  <span style="font-size:12px;color:{T['text_muted']};">
                    Your typed replies will appear here in large text — flip the screen to show the signer.
                  </span>
                </div>""")

    def render_conv_status(letter, pending_word, seconds_since_hand):
        _html(conv_status, f"""
            <div class="word-grid" style="margin-top:10px;">
              <div class="mini-card">
                <div class="mc-lbl">Detecting</div>
                <div class="mc-val">{letter if letter not in ("—", "·") else "·"}</div>
              </div>
              <div class="mini-card">
                <div class="mc-lbl">Building word</div>
                <div class="mc-val violet">{pending_word or "…"}</div>
              </div>
            </div>
            <div style="font-size:11px;color:{T['text_muted']};margin-top:8px;text-align:center;">
              No hand for {seconds_since_hand:.1f}s
              (word ends at {word_pause_sec:.1f}s · message sends at {message_pause_sec:.1f}s)
            </div>""")

    render_conv_chat()
    render_signer_display()

    # ---------- CAMERA LOOP (timing-based, no special signs) ----------
    if run:
        if model is None:
            st.error("Cannot start camera: model not loaded. Please place your model at models/model.pkl")
        else:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                st.error("❌ Camera not accessible. Please check your webcam connection.")
            else:
                if st.session_state.conv_last_hand_time is None:
                    st.session_state.conv_last_hand_time = time.time()

                render_conv_status("·", st.session_state.conv_current_word, 0.0)

                while run:
                    ret, frame = cap.read()
                    if not ret:
                        st.error("Camera read failed.")
                        break

                    frame  = cv2.flip(frame, 1)
                    rgb    = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    result = hands.process(rgb)

                    detected_letter = "·"
                    now = time.time()

                    if result.multi_hand_landmarks:
                        st.session_state.conv_last_hand_time = now
                        st.session_state.conv_word_committed  = False
                        st.session_state.conv_message_sent    = False

                        for hand_landmarks in result.multi_hand_landmarks:
                            try:
                                landmarks = []
                                for lm in hand_landmarks.landmark:
                                    landmarks.extend([lm.x, lm.y, lm.z])
                                landmarks  = np.array(landmarks).reshape(1, -1)
                                prediction = str(model.predict(landmarks)[0]).upper()

                                if prediction == st.session_state.conv_prev_pred:
                                    st.session_state.conv_count += 1
                                else:
                                    st.session_state.conv_count     = 0
                                    st.session_state.conv_prev_pred = prediction

                                detected_letter = prediction

                                if st.session_state.conv_count > HOLD_THRESHOLD:
                                    if prediction != st.session_state.conv_last_added:
                                        st.session_state.conv_last_added = prediction
                                        # Conversation mode has no special signs —
                                        # every registered letter just extends the
                                        # current word.
                                        st.session_state.conv_current_word += prediction

                                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

                            except Exception:
                                pass  # skip a bad frame silently

                        seconds_since_hand = 0.0
                    else:
                        st.session_state.conv_count      = 0
                        st.session_state.conv_prev_pred   = None
                        st.session_state.conv_last_added  = ""
                        seconds_since_hand = now - st.session_state.conv_last_hand_time

                        # Pause long enough -> end the current word.
                        if (seconds_since_hand >= word_pause_sec
                                and not st.session_state.conv_word_committed
                                and st.session_state.conv_current_word):
                            st.session_state.conv_sentence_buffer += st.session_state.conv_current_word + " "
                            st.session_state.conv_current_word = ""
                            st.session_state.conv_word_committed = True

                        # Pause long enough -> send the whole message.
                        if (seconds_since_hand >= message_pause_sec
                                and not st.session_state.conv_message_sent
                                and st.session_state.conv_sentence_buffer.strip()):
                            raw = st.session_state.conv_sentence_buffer.strip()
                            with st.spinner("Punctuating message…"):
                                punctuated = restore_punctuation(raw)
                            st.session_state.chat_history.append({
                                "sender": "isl",
                                "text": punctuated,
                                "time": time.strftime("%H:%M"),
                            })
                            st.session_state.conv_sentence_buffer = ""
                            st.session_state.conv_message_sent = True
                            render_conv_chat()

                    CONV_FRAME.image(frame, channels="BGR", use_container_width=True)
                    render_conv_status(detected_letter, st.session_state.conv_current_word, seconds_since_hand)

                cap.release()
    else:
        _html(CONV_FRAME, f"""
            <div class="cam-wrap" style="aspect-ratio:16/9;min-height:240px;">
              <div class="cam-grid"></div>
              <div class="cam-gradient"></div>
              <div class="cam-corner cam-tl"></div>
              <div class="cam-corner cam-tr"></div>
              <div class="cam-corner cam-bl"></div>
              <div class="cam-corner cam-br"></div>
              <div class="cam-stopped-overlay">
                <div class="cam-stopped-icon">💬</div>
                <div class="cam-stopped-label">Toggle camera in sidebar to start the conversation</div>
              </div>
            </div>""")
        render_conv_status("·", "", 0.0)