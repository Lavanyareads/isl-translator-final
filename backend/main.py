"""API server for the React S-Sparsh client.

The browser owns the webcam; it posts sampled frames here so MediaPipe and the
existing scikit-learn model can continue to run in Python.
"""
from __future__ import annotations

import os
import base64
import hashlib
import hmac
import re
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
AUTH_DB_PATH = ROOT / "instance" / "sparsh_auth.db"
AUTH_DB_PATH.parent.mkdir(exist_ok=True)

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


class SignUpRequest(BaseModel):
    username: str
    email: str
    password: str


class SignInRequest(BaseModel):
    identifier: str
    password: str


def auth_db():
    connection = sqlite3.connect(AUTH_DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_auth_db():
    with auth_db() as connection:
        connection.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                email TEXT NOT NULL COLLATE NOCASE UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_text, digest_text = stored.split("$", 1)
        candidate = hash_password(password, base64.b64decode(salt_text)).split("$", 1)[1]
        return hmac.compare_digest(candidate, digest_text)
    except (ValueError, TypeError):
        return False


def public_user(row: sqlite3.Row) -> dict:
    return {"id": row["id"], "username": row["username"], "email": row["email"]}


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    with auth_db() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (hashlib.sha256(token.encode()).hexdigest(), user_id, expires_at),
        )
    return token


def authenticated_user(authorization: str | None) -> sqlite3.Row:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Please sign in to continue.")
    token_hash = hashlib.sha256(authorization.removeprefix("Bearer ").encode()).hexdigest()
    with auth_db() as connection:
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (datetime.now(timezone.utc).isoformat(),))
        user = connection.execute("""
            SELECT users.id, users.username, users.email FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
        """, (token_hash,)).fetchone()
    if user is None:
        raise HTTPException(401, "Your session has expired. Please sign in again.")
    return user


init_auth_db()


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


@app.post("/api/auth/signup", status_code=201)
def signup(payload: SignUpRequest):
    username = payload.username.strip()
    email = payload.email.strip().lower()
    if not re.fullmatch(r"[A-Za-z0-9_]{3,30}", username):
        raise HTTPException(422, "Username must be 3–30 letters, numbers, or underscores.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise HTTPException(422, "Enter a valid email address.")
    if len(payload.password) < 8:
        raise HTTPException(422, "Password must contain at least 8 characters.")
    try:
        with auth_db() as connection:
            cursor = connection.execute(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (username, email, hash_password(payload.password), datetime.now(timezone.utc).isoformat()),
            )
            user_id = cursor.lastrowid
            user = connection.execute("SELECT id, username, email FROM users WHERE id = ?", (user_id,)).fetchone()
    except sqlite3.IntegrityError as error:
        message = "That username is already taken." if "username" in str(error).lower() else "An account already uses that email address."
        raise HTTPException(409, message) from error
    return {"message": "Account created. Please sign in.", "user": public_user(user)}


@app.post("/api/auth/signin")
def signin(payload: SignInRequest):
    identifier = payload.identifier.strip()
    with auth_db() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE email = ? OR username = ?", (identifier.lower(), identifier)
        ).fetchone()
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(401, "Incorrect email/username or password.")
    return {"token": create_session(user["id"]), "user": public_user(user)}


@app.get("/api/auth/me")
def current_user(authorization: str | None = Header(default=None)):
    return {"user": public_user(authenticated_user(authorization))}


@app.post("/api/auth/signout")
def signout(authorization: str | None = Header(default=None)):
    if authorization and authorization.startswith("Bearer "):
        token_hash = hashlib.sha256(authorization.removeprefix("Bearer ").encode()).hexdigest()
        with auth_db() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
    return {"message": "Signed out."}


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


@app.post("/api/translate")
def translate(payload: TextRequest):
    cleaned = clean_isl_gloss(payload.text)
    return {"cleaned": cleaned, "marathi": translate_to_marathi(cleaned)}
