"""API server for the React S-Sparsh client.

The browser owns the webcam; it posts sampled frames here so MediaPipe and the
existing scikit-learn model can continue to run in Python.
"""
from __future__ import annotations

import os
import json
import re
import time
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

BROWSER_STATIC_MODEL_PATH = ROOT / "models" / "browser_static_model.pkl"
browser_static_model = None
browser_static_model_mtime = None

hands = mp.solutions.hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5,
)


class TextRequest(BaseModel):
    text: str


class LandmarkRequest(BaseModel):
    """One 21-point hand flattened as x/y/z values from browser MediaPipe."""
    landmarks: list[float]


class BrowserFeatureRequest(BaseModel):
    """Two normalized hand vectors plus left/right presence masks."""
    features: list[float]


class StaticRecordingRequest(BaseModel):
    label: str
    frames: list[dict]


class DynamicSequenceRequest(BaseModel):
    label: str
    frames: list[dict]


def get_browser_static_model():
    """Reload after retraining without requiring an API-server restart."""
    global browser_static_model, browser_static_model_mtime
    if not BROWSER_STATIC_MODEL_PATH.exists():
        return None
    mtime = BROWSER_STATIC_MODEL_PATH.stat().st_mtime
    if browser_static_model is None or browser_static_model_mtime != mtime:
        browser_static_model = joblib.load(BROWSER_STATIC_MODEL_PATH)
        browser_static_model_mtime = mtime
    return browser_static_model


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


@app.post("/api/classify-landmarks")
def classify_landmarks(payload: LandmarkRequest):
    """Compatibility bridge for the existing classifier; no camera frame leaves the browser."""
    if model is None:
        raise HTTPException(503, f"Model is unavailable: {model_error}")
    if len(payload.landmarks) != 63:
        raise HTTPException(422, "Expected exactly 63 landmark values.")
    features = np.asarray(payload.landmarks, dtype=np.float32).reshape(1, -1)
    prediction = str(model.predict(features)[0]).upper()
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        confidence = float(np.max(model.predict_proba(features)[0]))
    return {"prediction": prediction, "confidence": round(confidence * 100)}


@app.post("/api/classify-browser-static")
def classify_browser_static(payload: BrowserFeatureRequest):
    if len(payload.features) != 128:
        raise HTTPException(422, "Expected 128 normalized browser-landmark features.")
    classifier = get_browser_static_model()
    if classifier is None:
        raise HTTPException(503, "Browser static model not trained yet.")
    features = np.asarray(payload.features, dtype=np.float32).reshape(1, -1)
    prediction = str(classifier.predict(features)[0]).upper()
    confidence = 0.0
    if hasattr(classifier, "predict_proba"):
        confidence = float(np.max(classifier.predict_proba(features)[0]))
    return {"prediction": prediction, "confidence": round(confidence * 100), "source": "browser-static"}


@app.post("/api/datasets/static")
def save_static_recording(payload: StaticRecordingRequest):
    """Persists a browser-landmark recording from the standalone collector."""
    label = payload.label.strip().upper()
    if not re.fullmatch(r"[A-Z0-9_]+", label):
        raise HTTPException(422, "Label may contain only A-Z, 0-9, and underscores.")
    if not 1 <= len(payload.frames) <= 2_000:
        raise HTTPException(422, "A static recording must contain 1 to 2,000 frames.")
    for frame in payload.frames:
        if len(frame.get("leftHand", [])) != 63 or len(frame.get("rightHand", [])) != 63:
            raise HTTPException(422, "Every frame must contain two 63-value hand vectors.")

    destination = ROOT / "dataset" / "static" / label
    destination.mkdir(parents=True, exist_ok=True)
    filename = destination / f"recording_{time.time_ns()}.json"
    filename.write_text(json.dumps({
        "schemaVersion": 1,
        "kind": "static",
        "label": label,
        "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "frames": payload.frames,
    }), encoding="utf-8")
    return {"saved": len(payload.frames), "path": str(filename.relative_to(ROOT))}


@app.post("/api/datasets/dynamic")
def save_dynamic_sequence(payload: DynamicSequenceRequest):
    """Persists one browser-landmark sequence for later LSTM training."""
    label = payload.label.strip().upper()
    if not re.fullmatch(r"[A-Z0-9_]+", label):
        raise HTTPException(422, "Label may contain only A-Z, 0-9, and underscores.")
    if not 2 <= len(payload.frames) <= 300:
        raise HTTPException(422, "A dynamic sequence must contain 2 to 300 frames.")
    for frame in payload.frames:
        if len(frame.get("leftHand", [])) != 63 or len(frame.get("rightHand", [])) != 63:
            raise HTTPException(422, "Every frame must contain two 63-value hand vectors.")

    sequence = ROOT / "dataset" / "dynamic" / label / f"sequence_{time.time_ns()}"
    sequence.mkdir(parents=True, exist_ok=False)
    filename = sequence / "landmarks.json"
    filename.write_text(json.dumps({
        "schemaVersion": 1,
        "kind": "dynamic",
        "label": label,
        "capturedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "frames": payload.frames,
    }), encoding="utf-8")
    return {"saved": len(payload.frames), "path": str(filename.relative_to(ROOT))}


@app.post("/api/translate")
def translate(payload: TextRequest):
    cleaned = clean_isl_gloss(payload.text)
    return {"cleaned": cleaned, "marathi": translate_to_marathi(cleaned)}
