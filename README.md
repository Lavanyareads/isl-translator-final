# S-स्पर्श (SPARSH)

### AI-Powered Indian Sign Language Recognition, Learning and Communication Platform

Bridging communication through technology.

SPARSH is an AI-powered platform designed to support Indian Sign Language (ISL) recognition, learning, and accessible communication. It combines computer vision, machine learning, and language processing to recognize static and dynamic signs, build sentences, and translate messages into English and Marathi.

---

## Overview

Communication can be challenging when people do not share a common language. Many Deaf and Hard-of-Hearing individuals use Indian Sign Language (ISL), while much of the hearing population may not understand it.

SPARSH aims to reduce this communication gap through an interactive platform that supports sign recognition, sentence formation, translation, and ISL learning.

The platform provides two primary modes:

- Learning Mode: Explore ISL signs, practise recognition, and engage with interactive activities.
- Conversation Mode: Recognize supported signs through a camera, build messages, and support English and Marathi communication.

## Problem Statement

Deaf and Hard-of-Hearing individuals in India face communication barriers because many people are unfamiliar with Indian Sign Language. Limited access to interpreters and accessible tools creates challenges in education, public services, workplaces, and daily interactions. SPARSH aims to provide an accessible technology-based approach to sign recognition, translation, and learning.

## Our Solution

SPARSH combines browser-based computer vision with machine learning models and language-processing services to support ISL communication.

The system detects hand landmarks from a camera feed, processes the extracted features, and identifies static or dynamic signs. Recognized signs are used to build messages. The backend processes finalized messages into grammatical English using Groq LLM, followed by Marathi translation using Google Translate.

The platform also offers interactive learning features to encourage ISL awareness and practice.

## Key Features

### 1. Real-Time Sign Recognition

- Camera-based hand tracking using MediaPipe.
- Static sign recognition using SVM and Random Forest models.
- Dynamic sign recognition using temporal sequences and PyTorch LSTM.
- Browser-based inference using ONNX models.

### 2. Conversation Mode

- Recognition of supported static and dynamic signs.
- Word and sentence formation from recognized signs.
- English message generation through Groq LLM.
- Marathi translation through Google Translate.
- English-first conversation interface with Marathi output.

### 3. Learning Mode

- Interactive ISL sign cards.
- Sign learning and practice activities.
- Learning progression and challenges.
- Practice and competition features.

### 4. Accessible Communication

- Camera-based sign recognition.
- Sentence-building support.
- English and Marathi communication output.
- Browser-based access through compatible devices.

### 5. Authentication

- Login and signup interface.
- JWT-based session handling, as represented in the system architecture.

---

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Browser-based camera access

### Computer Vision
- MediaPipe Hand Landmarker
- Hand landmark extraction
- Landmark normalization
- Temporal landmark buffering

### Machine Learning
- Scikit-learn
- Support Vector Machine (SVM)
- Random Forest
- PyTorch LSTM
- ONNX Runtime for browser-based inference

### Backend
- Python
- FastAPI
- JWT-based authentication sessions

### Language Processing and Translation
- Groq LLM for converting ISL gloss sequences into grammatical English
- Google Translate for English-to-Marathi translation

### Model Training and Export
- Python training scripts
- Static model training and ONNX export
- Dynamic model training and ONNX export

---

## System Architecture

SPARSH consists of three major workflows: real-time sign recognition, message translation, and offline model training.

### Real-Time Recognition Pipeline

```text
User / Camera
      |
      v
React + Vite Frontend
      |
      v
Video Frame Scheduling
      |
      v
MediaPipe Hand Landmark Detection
      |
      v
Landmark Normalization
      |
      +--------------------------+
      |                          |
      v                          v
Static ONNX Model       Temporal Landmark Buffer
                                 |
                                 v
                         Dynamic ONNX Model
      |                          |
      +-------------+------------+
                    |
                    v
          Static / Dynamic Arbitration
                    |
                    v
            Conversation Engine
                    |
                    v
           Conversation Interface
```

### Translation Pipeline

```text
Finalized ISL Message
          |
          v
     FastAPI Backend
          |
          v
       Groq LLM
(ISL gloss to grammatical English)
          |
          v
   Google Translate
    (English to Marathi)
          |
          v
    English + Marathi Output
```

### Offline Training and Model Export

Static sign recognition:

```text
Static Sign Samples
        |
        v
  train_static.py
        |
        v
 Scikit-learn Model
        |
        v
export_static_onnx.py
        |
        v
  static_sign.onnx
```

Dynamic sign recognition:

```text
Dynamic Sign Sequences
        |
        v
  train_dynamic.py
        |
        v
  PyTorch LSTM Model
        |
        v
export_dynamic_onnx.py
        |
        v
  dynamic_sign.onnx
```

The exported models are designed for use in the browser-based inference pipeline.

### Architecture Diagram

Upload your architecture image to the repository and display it here:

```markdown
![SPARSH System Architecture](docs/images/sparsh-architecture.png)
```

Replace the path with the actual image location in your repository.

---

## How It Works

1. Capture: The user presents a supported sign to the device camera.
2. Detect: MediaPipe identifies hand landmarks from video frames.
3. Normalize: Landmark coordinates are transformed into normalized features.
4. Recognize: The static model classifies handshapes, while the dynamic model processes temporal sequences.
5. Arbitrate: Recognition results are evaluated using confidence and temporal-stability logic.
6. Build: The conversation engine combines recognized signs into words and sentences.
7. Translate: Finalized messages are processed by the backend, Groq LLM, and Google Translate.
8. Display: The interface presents the English message and Marathi translation.

Recognition depends on the supported sign vocabulary and the quality of the camera input.

---

## Project Structure

The following is a suggested structure. Keep the actual filenames and directories used in your repository.

```text
SPARSH/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.jsx
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── main.py
│   ├── routes/
│   └── requirements.txt
│
├── training/
│   ├── train_static.py
│   ├── train_dynamic.py
│   ├── export_static_onnx.py
│   └── export_dynamic_onnx.py
│
├── models/
│   ├── static_sign.onnx
│   ├── dynamic_sign.onnx
│   └── labels/
│
├── sample_data/
│   ├── static/
│   └── dynamic/
│
├── test_cases/
│   └── test_cases.md
│
├── docs/
│   └── architecture.md
│
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

---

## Installation and Setup

### Prerequisites

Install the following:

- Git
- Node.js and npm
- A Python version compatible with the backend dependencies
- A modern browser with camera access
- API credentials for the language-processing and translation services, if required

### 1. Clone the Repository

```bash
git clone https://github.com/Lavanyareads/isl-translator-final.git
cd isl-translator-final
```

### 2. Install Frontend Dependencies

Navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal. In a standard Vite setup, this is commonly `http://localhost:5173`.

### 3. Set Up the Backend

Open another terminal and navigate to the backend directory used by the project.

Create a virtual environment:

```bash
python -m venv .venv
```

On Windows:

```bash
.venv\Scripts\activate
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

Install the backend dependencies using the repository's requirements file:

```bash
pip install -r requirements.txt
```

Configure the required environment variables and start the backend using the actual FastAPI entry point.

For example, if the entry point is `main.py` and the application object is named `app`:

```bash
uvicorn main:app --reload
```

Adjust the command if the entry point or application object has a different name.

### 4. Run and Verify

- Open the frontend in your browser.
- Sign in or create an account if authentication is enabled.
- Allow camera access when prompted.
- Present a sign supported by the model.
- Check the recognized output.
- Finalize a message and test English and Marathi translation.

---

## Environment Variables

Create a `.env` file in the location expected by the backend. Never commit actual API keys or secrets to GitHub.

Example template:

```env
GROQ_API_KEY=your_groq_api_key
GOOGLE_TRANSLATE_API_KEY=your_translation_api_key
JWT_SECRET_KEY=replace_with_a_secure_secret
```

These names are examples. Use the exact variable names expected by your code. The Google Translate configuration depends on the service or library used.

Add `.env` to `.gitignore`. Commit an `.env.example` file containing placeholder values instead of credentials.

---

## API Documentation

The project architecture includes a FastAPI backend for health checks, landmark classification, and finalized-message translation. Confirm the current route definitions and request schemas in the source code.

- `GET /api/health` — Check backend health.
- `POST /api/classify-browser-static` — Static classification through the browser-oriented flow.
- `POST /api/classify-landmarks` — Classification using landmark data.
- `POST /api/translate` — Process a finalized message through the translation pipeline.

The real-time ONNX inference pipeline is designed to run in the browser, so not every recognition step necessarily requires a backend request.

If interactive API documentation is enabled, it is commonly available at `/docs` on the running FastAPI server.

---

## Sample Data

Sample data demonstrates the kinds of inputs supported by the recognition pipeline.

Include the following where available:

- Static sign images or landmark samples with correct labels.
- Dynamic sign sequences containing frame or landmark data.
- A label mapping file linking sample identifiers to expected signs.
- Instructions explaining the sample format.

Example CSV:

```csv
sample_id,sign_type,label
S001,static,A
S002,static,B
D001,dynamic,HELLO
D002,dynamic,THANK_YOU
```

These are illustrative examples. Replace them with actual labels supported by the trained models.

Do not upload private, restricted, or unlicensed training data.

---

## Test Cases

The following test cases can be used to evaluate the main workflows.

### TC01 — Static Sign Recognition
Input: A supported static sign.

Expected result: The model returns the expected sign label.

### TC02 — Dynamic Sign Recognition
Input: A supported motion-based sign.

Expected result: The dynamic model identifies the supported sign.

### TC03 — No Hand Detected
Input: Camera feed without a detectable hand.

Expected result: The system avoids reporting an unsupported sign as a confident prediction.

### TC04 — Sentence Formation
Input: A sequence of supported signs.

Expected result: The conversation engine updates the message appropriately.

### TC05 — English Message Generation
Input: A finalized ISL gloss sequence.

Expected result: The translation pipeline attempts to generate grammatical English.

### TC06 — Marathi Translation
Input: An English message.

Expected result: Marathi translation is displayed when the translation service succeeds.

### TC07 — Camera Permission
Input: Camera access is denied.

Expected result: The application handles the unavailable camera appropriately.

### TC08 — Translation Service Failure
Input: Translation service unavailable or returns an error.

Expected result: The application handles the error without crashing.

Record actual outcomes when these tests are executed. Do not mark a test as passed without verifying it.

---

## Evaluation Metrics

SPARSH can be evaluated using the following key performance indicators:

- Recognition accuracy: Percentage of evaluated signs classified correctly.
- Response time: Time taken to recognize and display a result.
- Translation quality: Whether the translated message preserves the intended meaning.
- Recognition stability: Whether the system avoids excessive duplicate or fluctuating predictions.
- User engagement: Participation in learning and practice activities.

Actual metrics should be measured and reported using recorded test results.

---

## Future Scope

Potential improvements include:

- Expanding the supported ISL vocabulary.
- Improving recognition under varied lighting and camera conditions.
- Enhancing continuous signing and sentence-level translation.
- Exploring voice-to-sign communication.
- Adding personalized learning progress and feedback.
- Evaluating usability with Deaf and Hard-of-Hearing users.
- Extending accessibility support to educational institutions and public services.

These are future possibilities rather than claims about existing functionality.

---

## Impact and SDG Alignment

SPARSH aims to promote accessible and inclusive communication.

- SDG 10 — Reduced Inequalities: Supports efforts to reduce communication barriers and promote inclusion.
- SDG 4 — Quality Education: Encourages accessible Indian Sign Language learning and practice.
- SDG 9 — Industry, Innovation and Infrastructure: Applies AI and machine learning to assistive technology.

The intended impact is to improve ISL awareness, support accessible learning, and help bridge communication gaps between ISL users and people unfamiliar with the language.

---

## Contributors

Developed by Team Charlie's Engineers

- Anagha Kadam
- Shalmalee Deshmukh
- Lavanya Nimbalkar

Institution: Bharati Vidyapeeth's College of Engineering for Women, Pune, India.

---

## Acknowledgements

SPARSH uses open-source technologies including React, Vite, MediaPipe, scikit-learn, PyTorch, ONNX, and FastAPI, alongside the language-processing and translation services configured for the project.

---

S-स्पर्श (SPARSH) — Making communication more accessible, one sign at a time.
