"""Launch the standalone browser-MediaPipe collector from the terminal.

The collector is deliberately separate from the translator UI. Browser
MediaPipe performs detection and sends normalized landmark samples to the local
FastAPI server, which writes dataset/static/<LABEL>/recording_*.json.
"""
from __future__ import annotations

import argparse
import os
import urllib.parse
import webbrowser


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect static browser landmark samples.")
    parser.add_argument("label", help="Sign label, e.g. A, HELLO, THANKYOU")
    parser.add_argument("--samples", type=int, default=200, help="Landmark frames to capture (default: 200)")
    parser.add_argument("--url", default=os.getenv("STATIC_COLLECTOR_URL", "http://localhost:5173/collector.html"))
    args = parser.parse_args()

    label = args.label.strip().upper()
    if not label.replace("_", "").isalnum():
        parser.error("label may contain only letters, numbers, and underscores")
    if not 1 <= args.samples <= 2_000:
        parser.error("--samples must be between 1 and 2000")

    query = urllib.parse.urlencode({"label": label, "samples": args.samples})
    url = f"{args.url}?{query}"
    print(f"Opening standalone collector for {label} ({args.samples} samples)…")
    print("Keep both Vite and FastAPI running. Hold the sign steady in the page that opens.")
    print(f"Samples will be saved under dataset/static/{label}/.")
    if not webbrowser.open(url):
        print(f"Could not open a browser automatically. Open this URL manually:\n{url}")


if __name__ == "__main__":
    main()
