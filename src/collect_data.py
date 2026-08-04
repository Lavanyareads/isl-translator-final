import cv2
import mediapipe as mp
import pandas as pd
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--sign', required=True)
parser.add_argument('--samples', type=int, default=50)
args = parser.parse_args()

sign_name = args.sign
num_samples = args.samples

os.makedirs("data", exist_ok=True)
file_path = f"data/{sign_name}.csv"

mp_hands = mp.solutions.hands
hands = mp_hands.Hands()
mp_draw = mp.solutions.drawing_utils

cap = cv2.VideoCapture(0)

data = []
frame_count = 0

print(f"Auto collecting {num_samples} samples for '{sign_name}'")

while len(data) < num_samples:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    result = hands.process(rgb)

    if result.multi_hand_landmarks:
        for hand_landmarks in result.multi_hand_landmarks:
            landmarks = []
            for lm in hand_landmarks.landmark:
                landmarks.extend([lm.x, lm.y, lm.z])

            mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

            frame_count += 1

            # Capture every 5 frames (adjust speed here)
            if frame_count % 5 == 0:
                data.append(landmarks)
                print(f"Captured {len(data)}")

    cv2.putText(frame, f"Samples: {len(data)}", (10, 50),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0,255,0), 2)

    cv2.imshow("Auto Collect", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()

df = pd.DataFrame(data)
df['label'] = sign_name
df.to_csv(file_path, index=False)

print(f"Saved to {file_path}")