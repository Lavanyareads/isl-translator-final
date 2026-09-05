"""Train a static sign classifier from browser MediaPipe landmark recordings.

Input files are downloaded by the React Dataset Recorder to data/browser/.
Each frame has normalized left/right 63-value vectors plus two presence masks.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC

FEATURE_SIZE = 128  # 63 left + 63 right + leftPresent + rightPresent


def as_features(frame: dict) -> list[float]:
    left = frame.get("leftHand", [])
    right = frame.get("rightHand", [])
    if len(left) != 63 or len(right) != 63:
        raise ValueError("Each frame must contain two 63-value landmark arrays.")
    return [*left, *right, float(frame.get("leftPresent", False)), float(frame.get("rightPresent", False))]


def load_recordings(data_dir: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    features, labels, groups = [], [], []
    for path in sorted(data_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            recording = json.load(handle)
        label = str(recording.get("label", "")).strip().upper()
        if not label or recording.get("kind", "static") != "static":
            continue
        for frame in recording.get("frames", []):
            try:
                features.append(as_features(frame))
                labels.append(label)
                groups.append(path.stem)
            except ValueError as error:
                print(f"Skipping invalid frame in {path.name}: {error}")
    if not features:
        raise RuntimeError(f"No valid static recordings found in {data_dir}")
    return np.asarray(features, dtype=np.float32), np.asarray(labels), np.asarray(groups)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="data/browser", type=Path)
    parser.add_argument("--output", default="models/browser_static_model.pkl", type=Path)
    args = parser.parse_args()

    X, y, groups = load_recordings(args.data_dir)
    classes, counts = np.unique(y, return_counts=True)
    print(f"Loaded {len(X)} frames across {len(classes)} classes")
    print(dict(zip(classes, counts)))
    recording_counts = {label: len(set(groups[y == label])) for label in classes}
    if len(classes) < 2 or min(recording_counts.values()) < 2:
        raise RuntimeError("Collect at least two separate recordings for every class before training.")

    # Entire recordings stay together: adjacent frames are nearly identical
    # and would otherwise leak into both train and test sets.
    splitter = GroupShuffleSplit(n_splits=25, test_size=0.2, random_state=42)
    for train_index, test_index in splitter.split(X, y, groups):
        if set(y[train_index]) == set(classes) and set(y[test_index]) == set(classes):
            break
    else:
        raise RuntimeError("Could not create a group-separated test split; collect more recordings per class.")
    X_train, X_test = X[train_index], X[test_index]
    y_train, y_test = y[train_index], y[test_index]
    candidates = {
        "SVM": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", SVC(kernel="rbf", C=10, gamma="scale", probability=True)),
        ]),
        "Random Forest": RandomForestClassifier(n_estimators=300, random_state=42, n_jobs=-1),
    }
    best_name, best_model, best_accuracy = "", None, -1.0
    for name, model in candidates.items():
        model.fit(X_train, y_train)
        accuracy = model.score(X_test, y_test)
        print(f"{name}: {accuracy:.2%} held-out accuracy")
        if accuracy > best_accuracy:
            best_name, best_model, best_accuracy = name, model, accuracy

    args.output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_model, args.output)
    print(f"Saved {best_name} to {args.output} ({best_accuracy:.2%})")


if __name__ == "__main__":
    main()
