S-स्पर्श — Indian Sign Language (ISL) Translator

S-स्पर्श (Sparsh) is a web-based Indian Sign Language (ISL) learning and translation platform. It uses a webcam to recognize hand signs, build words and sentences, and provide English and Marathi output.

The project combines a React + Vite frontend, FastAPI backend, MediaPipe hand-landmark detection, machine-learning classifiers, Groq LLM-based English grammar correction, and Marathi translation. It also includes learning, practice, competition, authentication, and sign-collection features.

✨ Features

Real-Time ISL Translation

Real-time hand tracking using MediaPipe

Recognition of A–Z alphabet signs

Recognition of commonly used ISL word signs

Special signs for SPACE, COMMA, and FULLSTOP

Live word and sentence construction

Confidence-based prediction and sign consensus

English sentence cleanup and grammatical reordering using Groq LLM

English-to-Marathi translation

Text-to-speech for English and Marathi output

📚 ISL Learning Platform

Structured learning levels

Alphabet sign learning

Sign cards with visual references

Camera-based practice

Progress tracking

Achievements and learning journey

Competition mode for practicing recognition

👤 User Accounts

Sign up and sign in

Username/email-based login

Password hashing using PBKDF2-HMAC-SHA256

Session-based authentication

Persistent learning experience for signed-in users

🎨 User Experience

Modern React interface

Light and dark themes

Responsive learning and translation screens

Camera status and recognition indicators

Separate conversation, learning, practice, and compete experiences

🧠 Technology Stack

Layer

Technologies

Frontend

React, Vite, JavaScript, CSS

Hand Tracking

MediaPipe Tasks Vision / Hand Landmarker

Browser ML

ONNX Runtime Web

Backend

Python, FastAPI, Uvicorn

Machine Learning

Scikit-learn, SVM, Random Forest

Dynamic Model

PyTorch LSTM

Data Processing

NumPy, Pandas

Model Storage

Joblib, ONNX, PyTorch

English Grammar

Groq API / LLM

Marathi Translation

Google Translator through deep-translator

Authentication

SQLite + PBKDF2-HMAC-SHA256

Camera / Legacy Testing

OpenCV

📁 Project Structure

isl-translator-final-main/
│
├── frontend/
│   ├── index.html
│   ├── collector.html
│   ├── dynamic-collector.html
│   ├── package.json
│   ├── vite.config.js
│   │
│   ├── public/
│   │   ├── models/
│   │   │   ├── static_sign.onnx
│   │   │   ├── static_sign.labels.json
│   │   │   ├── dynamic_sign.onnx
│   │   │   └── dynamic_sign.labels.json
│   │   └── signs/
│   │       └── sign reference images
│   │
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── ConversationMode.jsx
│       ├── LearnLetters.jsx
│       ├── Practice.jsx
│       ├── Compete.jsx
│       ├── LandingPage.jsx
│       ├── collector.js
│       ├── dynamicCollector.js
│       │
│       ├── components/
│       │   ├── learning/
│       │   └── shared/
│       │
│       ├── config/
│       │   └── signs.js
│       │
│       ├── hooks/
│       │   └── useRecognition.js
│       │
│       ├── lib/
│       │   ├── browserHandLandmarker.js
│       │   └── landmarks.js
│       │
│       ├── pages/
│       │   ├── AchievementsPage.jsx
│       │   ├── ConversationPage.jsx
│       │   ├── LandingPage.jsx
│       │   ├── LearnPage.jsx
│       │   ├── LearningPage.jsx
│       │   └── SignupPage.jsx
│       │
│       └── workers/
│           └── handLandmarker.worker.js
│
├── backend/
│   └── main.py
│
├── src/
│   ├── collect_data.py
│   ├── collect_static.py
│   ├── collect_dynamic.py
│   ├── train.py
│   ├── train_static.py
│   ├── train_browser_static.py
│   ├── train_dynamic.py
│   ├── export_static_onnx.py
│   ├── export_dynamic_onnx.py
│   └── predict.py
│
├── data/
│   ├── A.csv ... Z.csv
│   └── vocabulary/special-sign CSV files
│
├── dataset/
│   ├── static/
│   └── dynamic/
│
├── models/
│   └── trained Python models
│
├── app.py
├── groq_helper.py
├── requirements.txt
├── Dockerfile
├── .dockerignore
└── .gitignore

⚙️ Prerequisites

Install the following before running the project:

Python 3.10 or another supported Python 3.9–3.11 environment

Node.js and npm

A working webcam

Git, if cloning the repository

A Groq API key for English sentence correction

MediaPipe versions can be sensitive to Python versions, so a Python 3.10 virtual environment is recommended.

🚀 Installation

1. Clone the repository

git clone <repository-url>
cd isl-translator-final-main

2. Create and activate a Python virtual environment

Windows PowerShell

py -3.10 -m venv venv
.\venv\Scripts\Activate.ps1

macOS / Linux

python3 -m venv venv
source venv/bin/activate

3. Install Python dependencies

python -m pip install --upgrade pip
pip install -r requirements.txt

4. Install frontend dependencies

cd frontend
npm install
cd ..

🔑 Configure the Groq API

Create a .env file in the project root:

GROQ_API_KEY=your_groq_api_key_here

The key is loaded through python-dotenv.

Do not commit .env or expose your API key publicly.

Groq is used primarily to convert raw ISL-style word order into more natural English. Marathi translation is handled separately by the backend using deep-translator.

▶️ Run the Application

The application uses two servers during development.

Terminal 1 — Start FastAPI

From the project root:

uvicorn backend.main:app --reload --port 8000

The API runs at:

http://127.0.0.1:8000

Terminal 2 — Start React/Vite

cd frontend
npm run dev

Open the local URL displayed by Vite, normally:

http://localhost:5173

The Vite configuration proxies /api requests to the FastAPI server.

🔐 Authentication

S-स्पर्श includes account functionality through the FastAPI backend.

Sign Up

Users provide:

Username

Email

Password

Password confirmation

Username validation allows letters, numbers, and underscores. Passwords must contain at least 8 characters.

Sign In

Users can sign in using either:

Email address

Username

The backend creates a session token and stores the hashed session token in SQLite.

The authentication database is created automatically at:

instance/sparsh_auth.db

The database is generated locally and does not need to be manually created before starting the server.

🤟 Sign Recognition Pipeline

The main recognition pipeline works as follows:

Webcam
   ↓
MediaPipe Hand Landmarker
   ↓
Hand Landmark Extraction
   ↓
Landmark Normalization
   ↓
Browser / Python Classifier
   ↓
Recognized ISL Sign
   ↓
Word / Sentence Builder
   ↓
English Grammar Correction
   ↓
Marathi Translation
   ↓
Text + Speech Output

Browser Hand Tracking

MediaPipe Hand Landmarker runs in the browser using a dedicated Web Worker.

The browser extracts hand landmarks instead of continuously sending raw camera frames to the backend for the browser-landmark pipeline.

Each detected hand contains:

21 hand landmarks

X, Y and Z coordinates

63 values per hand

Left/right hand presence information

Normalized landmark coordinates

The application can represent both hands using a fixed 128-value feature vector:

63 left-hand values
+ 63 right-hand values
+ left-hand presence
+ right-hand presence
= 128 features

A temporal buffer is also maintained for dynamic-sign recognition experiments.

🤖 Machine-Learning Models

The project contains more than one recognition path.

1. Legacy Python Classifier

The legacy model is trained from CSV landmark data stored in:

data/

src/train.py compares:

SVM

Random Forest

The model with the better held-out test accuracy is saved as:

models/model.pkl

Run:

python src/train.py

2. Browser Static-Sign Model

Browser-collected static landmark recordings are stored under:

dataset/static/<SIGN>/

Each recording contains normalized left/right hand landmarks and presence information.

Train the browser static model:

python src/train_static.py

The default output is:

models/browser_static_model.pkl

The FastAPI backend can automatically load this model when it is available.

3. Dynamic LSTM Model

Dynamic signs are represented as temporal sequences:

dataset/dynamic/
└── SIGN_NAME/
    └── sequence_ID/
        └── landmarks.json

The dynamic model uses a PyTorch LSTM to learn movement across a sequence of frames.

Train it with:

python src/train_dynamic.py --frames 30 --epochs 40

The checkpoint is saved as:

models/dynamic_lstm.pt

The dynamic model is currently a separate training/validation pipeline and should not be described as the primary live translator unless the browser inference integration has been enabled.

📊 Dataset Collection

Legacy CSV Dataset

To collect a traditional hand-landmark dataset:

python src/collect_data.py --sign A --samples 50

Repeat for the required signs.

The samples are stored as:

data/A.csv
data/B.csv
...

The repository currently contains alphabet CSV files and additional vocabulary/special-sign data such as:

hello
thankyou
namaste
please
sorry
welcome
space
fullstop

Use the exact labels expected by the training and recognition configuration.

🖐️ Browser Static Dataset

Static browser recordings can be collected through the separate collector page.

Example:

python src/collect_static.py A --samples 200

The recordings are stored under:

dataset/static/A/

Repeat the process for each required sign.

The main translator interface is kept separate from the data-collection interface.

🔄 Dynamic Dataset Collection

Collect a motion-based sign sequence using:

python src/collect_dynamic.py WAVE --frames 30

The sequence is saved under:

dataset/dynamic/WAVE/

A dynamic sequence contains multiple landmark frames and is intended for LSTM-based recognition.

🌐 Browser-Ready ONNX Models

The project includes ONNX export scripts for browser deployment.

Static model

python src/export_static_onnx.py

Dynamic model

python src/export_dynamic_onnx.py

Browser-ready artifacts are placed under:

frontend/public/models/

The frontend uses ONNX Runtime Web for browser-side model execution where configured.

📖 Learning Modes

The React application is more than a translator. It provides separate learning experiences.

Learn

The learning journey contains progressive levels, including:

Basic alphabet signs

More alphabet signs

Everyday vocabulary

Useful communication signs

Sign Cards

Users can view sign references and learn the corresponding ISL signs.

Practice

Practice mode uses the camera to help users test their sign recognition and improve their accuracy.

Compete

Competition mode provides a more game-like way to test sign-recognition skills.

Conversation

Conversation mode focuses on using recognized signs to form meaningful communication.

🗣️ English and Marathi Processing

The text-processing pipeline separates recognition from language correction.

Example:

Raw ISL gloss
      ↓
Recognized words
      ↓
Groq LLM
      ↓
Natural English sentence
      ↓
Marathi translation

groq_helper.py sends the recognized ISL-style text to the Groq API and asks the model to correct word order and insert only necessary grammatical words.

The backend then uses deep-translator for English-to-Marathi translation.

If the Groq service is unavailable, the backend has a simple fallback for producing a readable English sentence.

🔊 Text-to-Speech

The frontend uses the browser's speech-synthesis functionality to read recognized output aloud.

Both English and Marathi output can be spoken when a compatible browser voice is available.

🔌 Important API Endpoints

The FastAPI backend provides endpoints for authentication, recognition, translation, and dataset operations.

Important routes include:

GET  /api/health

POST /api/auth/signup
POST /api/auth/signin
GET  /api/auth/me
POST /api/auth/signout

POST /api/predict
POST /api/classify-landmarks
POST /api/classify-browser-static

POST /api/datasets/static

The exact request and response structures are defined in:

backend/main.py

🧪 Testing and Debugging

Check MediaPipe

python src/predict.py

The standalone OpenCV prediction script can be used for quick recognition testing without relying on the React interface.

Check the API

With FastAPI running, open:

http://127.0.0.1:8000/api/health

A successful response reports whether the primary model is available.

🛠️ Troubleshooting

Model is unavailable

Make sure the required trained model exists:

models/model.pkl

If it does not exist, train the model:

python src/train.py

MediaPipe installation problems

Use a compatible Python version, preferably Python 3.10 for this project.

Then recreate the virtual environment and reinstall:

pip install -r requirements.txt

Camera does not start

Check that:

Your browser has camera permission.

No other application is using the webcam.

You are accessing the application through the Vite development server.

The correct camera is selected if multiple cameras are available.

Groq translation/correction does not work

Check that .env contains:

GROQ_API_KEY=your_groq_api_key_here

Then restart the FastAPI server.

Frontend dependencies are missing

Run:

cd frontend
npm install
npm run dev

🔒 Security Notes

Never commit .env.

Never publish your Groq API key.

User passwords are stored as PBKDF2-HMAC-SHA256 hashes rather than plain text.

Session tokens are stored in hashed form in the SQLite database.

The development CORS configuration is limited to the local Vite development addresses.

For production deployment, configure HTTPS, secure cookies/tokens, CORS, database storage, and secret management appropriately.

📦 Main Dependencies

Python

opencv-python
mediapipe
numpy
pandas
scikit-learn
joblib
groq
python-dotenv
transformers
torch
deep-translator
fastapi
uvicorn
python-multipart
onnx
skl2onnx

Frontend

react
react-dom
vite
@vitejs/plugin-react
@mediapipe/tasks-vision
onnxruntime-web

🚧 Project Status

S-स्पर्श currently combines a working React learning/translation interface with Python/FastAPI recognition services and separate static/dynamic model-development pipelines.

The static sign-recognition pipeline is intended for reliable sign classification, while the dynamic LSTM pipeline is maintained as a separate experimental/model-validation path until its browser inference integration is completed.

🎯 Future Scope

Possible future improvements include:

Expanding the ISL vocabulary

Improving recognition accuracy with larger and more diverse datasets

Adding more dynamic signs

Integrating validated LSTM/ONNX dynamic recognition directly into the live translator

Improving sentence-level context handling

Supporting additional Indian languages

Adding richer progress analytics

Improving accessibility and mobile support

Deploying the application for public use

👩‍💻 Development

Frontend:

cd frontend
npm run dev

Production frontend build:

npm run build

Preview the production build:

npm run preview

Backend:

uvicorn backend.main:app --reload --port 8000

📄 License

Add the project's chosen license here before publishing the repository publicly.

❤️ About S-स्पर्श

S-स्पर्श is designed around the idea that technology can make communication and ISL learning more accessible.

Learn. Practise. Sign. Connect.
