# S-स्पर्श — Indian Sign Language (ISL) Translator

A real-time ISL-to-text translator that reads hand signs through your webcam, converts them into English words/sentences, and translates them into Marathi using Groq's LLM API. Built with **MediaPipe** (hand landmark detection), **scikit-learn** (sign classification), and **Streamlit** (web UI).

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
├── app.py              # Streamlit web app (main entry point)
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

## 6. Run the app

### Streamlit web app (recommended)

```bash
streamlit run app.py
```

This opens the app in your browser (usually `http://localhost:8501`). Use the sidebar to:
- Toggle dark/light mode
- Start/stop the camera
- Translate the captured sentence via Groq
- Hear the English/Marathi output spoken aloud
- Clear the session

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