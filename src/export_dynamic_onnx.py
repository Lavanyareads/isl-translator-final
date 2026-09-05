"""Export a trained dynamic LSTM checkpoint to a fixed-shape browser ONNX model."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import torch

from train_dynamic import DynamicLSTM, FEATURE_SIZE


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="models/dynamic_lstm.pt", type=Path)
    parser.add_argument("--output", default="frontend/public/models/dynamic_sign.onnx", type=Path)
    args = parser.parse_args()
    if not args.input.exists():
        raise FileNotFoundError(f"Dynamic checkpoint not found: {args.input}. Run train_dynamic.py first.")

    try:
        checkpoint = torch.load(args.input, map_location="cpu", weights_only=False)
    except TypeError:  # PyTorch before the weights_only argument
        checkpoint = torch.load(args.input, map_location="cpu")
    model = DynamicLSTM(len(checkpoint["classes"]), checkpoint.get("hidden_size", 128))
    model.load_state_dict(checkpoint["state_dict"])
    model.eval()
    frames = int(checkpoint["frames"])
    example = torch.zeros(1, frames, FEATURE_SIZE, dtype=torch.float32)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model, example, args.output,
        input_names=["landmark_sequence"], output_names=["logits"],
        dynamic_axes={"landmark_sequence": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )
    args.output.with_suffix(".labels.json").write_text(json.dumps(checkpoint["classes"]), encoding="utf-8")
    print(f"Exported dynamic ONNX model: {args.output}")
    print(f"Expected sequence shape: [batch, {frames}, {FEATURE_SIZE}]")


if __name__ == "__main__":
    main()
