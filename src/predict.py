import cv2
import mediapipe as mp
import joblib
import numpy as np

# Load model
model = joblib.load("models/model.pkl")

mp_hands = mp.solutions.hands
hands = mp_hands.Hands()
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

prev_pred = None
count = 0

sentence = ""
current_word = ""
last_added = ""       # Tracks last confirmed letter/action added (prevents repeats)
hold_threshold = 20   # Frames to hold a sign before confirming (~1.5 sec at 15fps)

# Special sign labels — make sure your CSV files are named exactly:
#   space.csv, fullstop.csv, comma.csv
SPECIAL_SIGNS = {
    "space":     " ",
    "fullstop":  ".",
    "comma":     ","
}

def draw_ui(frame, display_text, current_word, sentence):
    h, w, _ = frame.shape

    # Semi-transparent bottom bar
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, h - 160), (w, h), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.5, frame, 0.5, 0, frame)

    # Current predicted sign (large, top area)
    cv2.putText(frame, display_text, (50, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 2.5, (0, 255, 0), 4)

    # Current word being formed
    cv2.putText(frame, f"Word : {current_word}", (10, h - 110),
                cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 0), 2)

    # Full sentence so far
    # Wrap sentence if too long
    display_sentence = sentence[-60:] if len(sentence) > 60 else sentence
    cv2.putText(frame, f"Sent : {display_sentence}", (10, h - 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2)

    # Controls hint
    cv2.putText(frame, "ESC: quit  |  B: backspace  |  C: clear",
                (10, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (150, 150, 150), 1)

    return frame


while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    result = hands.process(rgb)

    display_text = "..."

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            landmarks = []
            for lm in hand_landmarks.landmark:
                landmarks.extend([lm.x, lm.y, lm.z])

            landmarks = np.array(landmarks).reshape(1, -1)
            prediction = model.predict(landmarks)[0]

            # Hold logic — confirm only after holding consistently
            if prediction == prev_pred:
                count += 1
            else:
                count = 0
                prev_pred = prediction

            if count > hold_threshold:
                display_text = prediction

                # Only act when a NEW sign is confirmed (no repeat spam)
                if prediction != last_added:
                    last_added = prediction

                    if prediction in SPECIAL_SIGNS:
                        char = SPECIAL_SIGNS[prediction]

                        if char == " ":
                            # Commit current word to sentence
                            if current_word:
                                sentence += current_word + " "
                                current_word = ""

                        elif char in (".", ","):
                            # Attach punctuation to sentence directly
                            if current_word:
                                sentence += current_word
                                current_word = ""
                            sentence += char + " "

                    else:
                        # Regular alphabet — append to current word
                        current_word += prediction.upper()

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

    else:
        # No hand detected — reset hold counter but keep sentence
        count = 0
        prev_pred = None
        last_added = ""   # Allow re-adding same sign after hand is removed

    frame = draw_ui(frame, display_text, current_word, sentence)
    cv2.imshow("ISL Prediction", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == 27:       # ESC — quit
        break

    elif key == ord('b') or key == ord('B'):    # Backspace
        if current_word:
            current_word = current_word[:-1]
        elif sentence:
            sentence = sentence.rstrip()
            # Remove last word or punctuation
            parts = sentence.rsplit(" ", 1)
            sentence = parts[0] + " " if len(parts) > 1 else ""

    elif key == ord('c') or key == ord('C'):    # Clear everything
        sentence = ""
        current_word = ""
        last_added = ""

cap.release()
cv2.destroyAllWindows()

# Print final sentence to terminal
print("\n--- Final Sentence ---")
print((sentence + current_word).strip())