"""Launch a standalone browser-MediaPipe dynamic-sign sequence collector."""
from __future__ import annotations

import argparse
import os
import urllib.parse
import webbrowser


def main() -> None:
    parser = argparse.ArgumentParser(description="Collect one dynamic sign sequence.")
    parser.add_argument("label", help="Dynamic sign label, e.g. WAVE or COME")
    parser.add_argument("--frames", type=int, default=30, help="Frames in this sequence (default: 30)")
    parser.add_argument("--url", default=os.getenv("DYNAMIC_COLLECTOR_URL", "http://localhost:5173/dynamic-collector.html"))
    args = parser.parse_args()
    label = args.label.strip().upper()
    if not label.replace("_", "").isalnum():
        parser.error("label may contain only letters, numbers, and underscores")
    if not 2 <= args.frames <= 300:
        parser.error("--frames must be between 2 and 300")
    url = f"{args.url}?{urllib.parse.urlencode({'label': label, 'frames': args.frames})}"
    print(f"Opening dynamic collector for {label} ({args.frames} frames)…")
    print("Keep Vite and FastAPI running. Perform the whole motion once after pressing Start.")
    print(f"The sequence will be saved under dataset/dynamic/{label}/.")
    if not webbrowser.open(url):
        print(f"Could not open a browser automatically. Open this URL manually:\n{url}")


if __name__ == "__main__":
    main()
