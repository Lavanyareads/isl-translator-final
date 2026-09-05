"""API server for the React S-Sparsh client.

The browser owns the webcam; it posts sampled frames here so MediaPipe and the
existing scikit-learn model can continue to run in Python.
"""
from __future__ import annotations

import os
from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

app = FastAPI(title="S-Sparsh API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
model_error = ""
try:
    model = joblib.load(ROOT / "models" / "model.pkl")
except Exception as exc:  # The UI can still start and explain the issue.
    model_error = str(exc)

hands = mp.solutions.hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


class TextRequest(BaseModel):
    text: str


def translate_to_marathi(text: str) -> str:
    if not text.strip():
        return ""
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source="en", target="mr").translate(text)
    except Exception:
        return ""


def clean_isl_gloss(text: str) -> str:
    """Use the existing Groq helper, retaining a useful offline fallback."""
    text = text.strip()
    if not text:
        return ""
    try:
        from groq_helper import process_text
        result = process_text(text)
        candidate = (result or {}).get("cleaned", "").strip()
        if candidate:
            return candidate
    except Exception:
        pass
    return text[0].upper() + text[1:].lower() + ("" if text.endswith((".", "?", "!")) else ".")


@app.get("/api/health")
def health():
    return {"modelReady": model is not None, "modelError": model_error}


@app.post("/api/predict")
async def predict(frame: UploadFile = File(...)):
    if model is None:
        raise HTTPException(503, f"Model is unavailable: {model_error}")
    raw = await frame.read()
    image = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(400, "The uploaded frame could not be decoded.")
    result = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
    if not result.multi_hand_landmarks:
        return {"handDetected": False, "prediction": None, "confidence": 0}
    landmarks = []
    for point in result.multi_hand_landmarks[0].landmark:
        landmarks.extend([point.x, point.y, point.z])
    features = np.asarray(landmarks).reshape(1, -1)
    prediction = str(model.predict(features)[0]).upper()
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        confidence = float(np.max(model.predict_proba(features)[0]))
    return {"handDetected": True, "prediction": prediction, "confidence": round(confidence * 100)}


@app.post("/api/translate")
def translate(payload: TextRequest):
    cleaned = clean_isl_gloss(payload.text)
    return {"cleaned": cleaned, "marathi": translate_to_marathi(cleaned)}
