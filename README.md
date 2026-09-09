# S-स्पर्श — Indian Sign Language (ISL) Translator

A real-time ISL-to-text translator that reads hand signs through your webcam, converts them into English words/sentences, and translates them into Marathi using Groq's LLM API. The interface is built with **React**. MediaPipe Hand Landmarker runs locally in the browser (inside a Web Worker), while FastAPI retains the existing scikit-learn classifier and translation endpoints.

## Features

- Real-time hand landmark tracking via MediaPipe
- Custom-trained sign classifier (SVM / Random Forest, whichever performs best)
- Live sentence building with space, comma, and full-stop signs
- English cleanup + Marathi translation via Groq LLM
- Text-to-speech playback for both English and Marathi output
- Dark/light theme toggle, live confidence and hold-progress indicators

## Project Structure

```
.
├── frontend/           # React + Vite web app
├── backend/main.py     # FastAPI server for legacy classification and translation
├── frontend/src/lib/   # Browser landmark pipeline + normalization/buffer
├── frontend/src/workers/ # Worker-hosted MediaPipe Hand Landmarker
├── app.py              # Legacy Streamlit implementation (kept for reference)
├── groq_helper.py       # Groq API wrapper for cleanup + Marathi translation
├── collect_data.py      # Records hand-landmark samples for a sign into data/<sign>.csv
├── train.py              # Trains a classifier on data/*.csv and saves models/model.pkl
├── predict.py            # Standalone OpenCV window version (no Streamlit) for quick testing
├── test.py                # Sanity check that mediapipe is installed correctly
├── data/                  # CSVs of collected landmark samples (created by collect_data.py)
├── models/                # Trained model.pkl (created by train.py)
├── requirements.txt
└── .env                    # Holds your GROQ_API_KEY (you create this, not committed)
```

## 1. Prerequisites

- Python 3.9–3.11 (MediaPipe does not yet support the newest Python releases — 3.9/3.10/3.11 is the safest range)
- A working webcam
- A free [Groq API key](https://console.groq.com/keys)

## 2. Installation

Clone/open the project folder, then create a virtual environment and install dependencies:

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
```

`requirements.txt`:
```
streamlit
opencv-python
mediapipe
numpy
pandas
scikit-learn
joblib
groq
python-dotenv
```

## 3. Set up your Groq API key

Create a `.env` file in the project root (same folder as `app.py`):

```
GROQ_API_KEY=your_groq_api_key_here
```

`groq_helper.py` loads this automatically via `python-dotenv`. Without it, translation will fail gracefully and show a warning in the app instead of crashing.

## 4. Build your sign dataset

Before you can predict anything, you need labeled hand-landmark data for each sign (letters A–Z plus your special signs: `space`, `comma`, `fullstop`).

Run this once per sign, holding the sign steady in front of your webcam:

```bash
python collect_data.py --sign A --samples 50
python collect_data.py --sign B --samples 50
...
python collect_data.py --sign space --samples 50
python collect_data.py --sign comma --samples 50
python collect_data.py --sign fullstop --samples 50
```

- `--sign` — the label name (must match the filename Streamlit/predict.py expects, e.g. `SPACE`, `COMMA`, `FULLSTOP` are the special sign names used in `app.py`)
- `--samples` — how many samples to capture (default 50)

This saves each sign's landmarks to `data/<sign>.csv`. Press `ESC` to stop early.

## 5. Train the classifier

Once you have CSVs for all the signs you want to recognize:

```bash
python train.py
```

This loads every CSV in `data/`, trains an SVM and a Random Forest, keeps whichever performs better on a held-out test split, and saves it to `models/model.pkl`.

## 6. Run the React app

Install the Python dependencies, then start the API in one terminal:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

In a second terminal, install the frontend dependencies and run Vite:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The React app provides:
- Toggle dark/light mode
- Start/stop the camera
- Translate the captured sentence via Groq
- Hear the English/Marathi output spoken aloud
- Clear the session

The Vite development server forwards `/api` requests to `http://127.0.0.1:8000`. For production, build the frontend with `npm run build` and serve `frontend/dist` from your preferred static-file host; configure it to forward `/api` to FastAPI.

## Browser landmark pipeline

Camera frames stay in the browser. A dedicated Web Worker samples at 20 FPS (maximum 640px on either side) and runs MediaPipe Hand Landmarker locally. Each output has fixed-size `leftHand` and `rightHand` vectors of 63 normalized values; absent hands are zero-filled, with `leftPresent` / `rightPresent` masks and MediaPipe handedness metadata. Coordinates are wrist-relative and scale-normalized using the wrist-to-middle-finger-MCP distance. A 30-frame temporal buffer is kept separately from React state for a future LSTM.

The legacy classifier remains available. It receives only one selected hand's 63 landmark values through `/api/classify-landmarks`; raw camera frames are no longer sent to the backend for MediaPipe detection.

### Static and dynamic datasets

Keep the two dataset types separate:

```text
dataset/
├── static/
│   ├── A/
│   │   ├── recording_001.json
│   │   └── recording_002.json
│   ├── HELLO/
│   └── ...
└── dynamic/
    ├── SIGN_1/
    │   ├── sequence_001/
    │   └── sequence_002/
    └── ...
```

Each static JSON recording contains browser-normalized `leftHand` / `rightHand` vectors and presence masks. The main translator UI has no data-collection controls. Dynamic sequences are reserved for the LSTM phase and are not trained yet.

Start a standalone, browser-compatible static collection session from the VS Code terminal (with Vite and FastAPI already running):

```bash
python src/collect_static.py A --samples 200
```

This opens a separate collection page and saves its result directly to `dataset/static/A/`. Repeat it as separate sessions for each sign and condition. `--samples` captures landmark frames; it is not a model-training option.

Train the static browser-landmark model from the VS Code terminal with:

```bash
python src/train_static.py
```

The model is saved to `models/browser_static_model.pkl`. The API detects that file automatically and uses it before falling back to the legacy model. Static word signs listed in `frontend/src/config/signs.js` commit to the sentence builder after a short consensus; letters continue building a fingerspelled word.

### Dynamic LSTM prototype

Collect one motion sequence at a time with the separate dynamic collector:

```bash
python src/collect_dynamic.py WAVE --frames 30
```

Each run saves `dataset/dynamic/WAVE/sequence_<ID>/landmarks.json`. Train the LSTM checkpoint after collecting at least two labels and two sequences per label:

```bash
python src/train_dynamic.py --frames 30 --epochs 40
```

This produces `models/dynamic_lstm.pt` for dataset and model validation. It is not connected to the live application yet; export to ONNX and browser-worker inference follow after validating the larger Monday dataset.

Export trained models to browser-ready ONNX artifacts with:

```bash
python src/export_static_onnx.py
python src/export_dynamic_onnx.py
```

The commands write models and their label lists under `frontend/public/models/`. Install the exporter dependencies once with `python -m pip install -r requirements.txt` before exporting.

### Standalone OpenCV version (no browser, for quick debugging)

```bash
python predict.py
```

Controls inside the OpenCV window:
- `B` — backspace
- `C` — clear everything
- `ESC` — quit and print the final sentence to the terminal

### Sanity check MediaPipe install

```bash
python test.py
```

## Troubleshooting

- **"Model not found at models/model.pkl"** — you haven't run `train.py` yet, or it's not in the same working directory you launched `streamlit run` from.
- **Camera not accessible** — close other apps using the webcam, or check `cv2.VideoCapture(0)` — try `1` if you have multiple cameras.
- **MediaPipe install fails** — MediaPipe wheels lag behind the newest Python versions; use Python 3.9–3.11 in your virtual environment.
- **Marathi output shows a warning icon** — your `GROQ_API_KEY` isn't set or is invalid; check your `.env` file.

## Notes

- `app.py` has an inline fallback `process_text()` in case `groq_helper.py` isn't importable, so the app won't crash even if that file is missing — but you'll only get real translations once `groq_helper.py` (or a valid `GROQ_API_KEY`) is in place.
- The special sign labels in `app.py` are uppercase (`SPACE`, `COMMA`, `FULLSTOP`), while `predict.py` uses lowercase (`space`, `fullstop`, `comma`) — keep this in mind when naming your CSVs during data collection so the labels match what each script expects.
