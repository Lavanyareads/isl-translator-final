"""Train an LSTM on browser-MediaPipe dynamic sign sequences.

This creates a PyTorch checkpoint only. Browser ONNX export/inference is a
later integration step, intentionally separate from validating the dataset and
model architecture.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

FEATURE_SIZE = 128


def as_features(frame: dict) -> np.ndarray:
    left, right = frame.get("leftHand", []), frame.get("rightHand", [])
    if len(left) != 63 or len(right) != 63:
        raise ValueError("Each frame must contain two 63-value hand vectors.")
    return np.asarray([*left, *right, float(frame.get("leftPresent", False)), float(frame.get("rightPresent", False))], dtype=np.float32)


def resample(frames: list[dict], frame_count: int) -> np.ndarray:
    source = np.stack([as_features(frame) for frame in frames])
    indices = np.linspace(0, len(source) - 1, frame_count).round().astype(int)
    return source[indices]


def load_sequences(data_dir: Path, frame_count: int):
    sequences, labels, groups = [], [], []
    for path in sorted(data_dir.glob("*/*/landmarks.json")):
        with path.open(encoding="utf-8") as handle:
            sequence = json.load(handle)
        if sequence.get("kind") != "dynamic":
            continue
        label = path.parent.parent.name.upper()
        try:
            sequences.append(resample(sequence.get("frames", []), frame_count))
            labels.append(label)
            groups.append(path.parent.name)
        except (ValueError, IndexError) as error:
            print(f"Skipping {path}: {error}")
    if not sequences:
        raise RuntimeError(f"No valid dynamic sequences found in {data_dir}")
    return np.stack(sequences), np.asarray(labels), np.asarray(groups)


class DynamicLSTM(nn.Module):
    def __init__(self, classes: int, hidden_size: int = 128):
        super().__init__()
        self.lstm = nn.LSTM(FEATURE_SIZE, hidden_size, num_layers=2, batch_first=True, dropout=0.2)
        self.classifier = nn.Sequential(nn.Dropout(0.25), nn.Linear(hidden_size, classes))

    def forward(self, sequence):
        output, _ = self.lstm(sequence)
        return self.classifier(output[:, -1])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", default="dataset/dynamic", type=Path)
    parser.add_argument("--frames", default=30, type=int)
    parser.add_argument("--epochs", default=40, type=int)
    parser.add_argument("--batch-size", default=32, type=int)
    parser.add_argument("--output", default="models/dynamic_lstm.pt", type=Path)
    args = parser.parse_args()
    if args.frames < 2:
        parser.error("--frames must be at least 2")

    X, labels, groups = load_sequences(args.data_dir, args.frames)
    classes = sorted(set(labels))
    counts = {label: int(np.sum(labels == label)) for label in classes}
    print(f"Loaded {len(X)} sequences across {len(classes)} classes: {counts}")
    if len(classes) < 2 or min(counts.values()) < 2:
        raise RuntimeError("Collect at least two sequences for every dynamic label before training.")

    # Hold out whole sequences for each class, never individual frames.
    rng = np.random.default_rng(42)
    test_groups = []
    for label in classes:
        candidates = np.unique(groups[labels == label])
        holdout = max(1, round(len(candidates) * 0.2))
        holdout = min(holdout, len(candidates) - 1)
        test_groups.extend(rng.choice(candidates, holdout, replace=False))
    test_mask = np.isin(groups, test_groups)
    label_to_index = {label: index for index, label in enumerate(classes)}
    y = np.asarray([label_to_index[label] for label in labels], dtype=np.int64)

    train_data = TensorDataset(torch.from_numpy(X[~test_mask]), torch.from_numpy(y[~test_mask]))
    test_x, test_y = torch.from_numpy(X[test_mask]), torch.from_numpy(y[test_mask])
    loader = DataLoader(train_data, batch_size=args.batch_size, shuffle=True)
    model = DynamicLSTM(len(classes))
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    loss_function = nn.CrossEntropyLoss()

    for epoch in range(1, args.epochs + 1):
        model.train()
        for inputs, targets in loader:
            optimizer.zero_grad()
            loss = loss_function(model(inputs), targets)
            loss.backward()
            optimizer.step()
        if epoch == 1 or epoch % 10 == 0 or epoch == args.epochs:
            model.eval()
            with torch.no_grad():
                accuracy = (model(test_x).argmax(1) == test_y).float().mean().item()
            print(f"Epoch {epoch:>3}/{args.epochs}: validation accuracy {accuracy:.2%}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": model.state_dict(), "classes": classes,
        "feature_size": FEATURE_SIZE, "frames": args.frames, "hidden_size": 128,
    }, args.output)
    print(f"Saved LSTM checkpoint to {args.output}")


if __name__ == "__main__":
    main()
