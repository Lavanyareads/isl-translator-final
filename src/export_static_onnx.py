"""Export the browser static sklearn classifier to ONNX for browser inference."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="models/browser_static_model.pkl", type=Path)
    parser.add_argument("--output", default="frontend/public/models/static_sign.onnx", type=Path)
    args = parser.parse_args()
    if not args.input.exists():
        raise FileNotFoundError(f"Static model not found: {args.input}. Run train_static.py first.")

    model = joblib.load(args.input)
    classifier = getattr(model, "named_steps", {}).get("classifier", model)
    onnx = convert_sklearn(
        model,
        initial_types=[("landmarks", FloatTensorType([None, 128]))],
        options={id(classifier): {"zipmap": False}},
        target_opset=17,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(onnx.SerializeToString())
    labels = [str(label) for label in model.classes_]
    args.output.with_suffix(".labels.json").write_text(json.dumps(labels), encoding="utf-8")
    print(f"Exported static ONNX model: {args.output}")
    print(f"Labels: {labels}")


if __name__ == "__main__":
    main()
