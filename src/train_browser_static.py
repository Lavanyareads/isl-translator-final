"""Train a static sign classifier from browser MediaPipe landmark recordings.

Input files live in dataset/static/<LABEL>/*.json. Each frame has normalized
left/right 63-value vectors plus two presence masks. This is intentionally
separate from the future dataset/dynamic/<LABEL>/sequence_<ID>/ layout.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
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
    for path in sorted(data_dir.glob("*/*.json")):
        with path.open(encoding="utf-8") as handle:
            recording = json.load(handle)
        # The folder is the source of truth, avoiding accidental mislabeled
        # files and matching the documented static-dataset structure.
        label = path.parent.name.strip().upper()
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
    parser.add_argument("--data-dir", default="dataset/static", type=Path)
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
    # and would otherwise leak into both train and test sets. Select the test
    # recordings per label instead of using a generic group splitter, which can
    # accidentally hold out only A or only HELLO on a small two-class dataset.
    rng = np.random.default_rng(42)
    test_groups = []
    for label in classes:
        label_groups = np.unique(groups[y == label])
        count = max(1, round(len(label_groups) * 0.2))
        count = min(count, len(label_groups) - 1)
        test_groups.extend(rng.choice(label_groups, size=count, replace=False))
    test_mask = np.isin(groups, test_groups)
    train_index, test_index = np.flatnonzero(~test_mask), np.flatnonzero(test_mask)
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
