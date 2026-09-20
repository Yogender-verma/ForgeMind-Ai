#!/usr/bin/env python
"""
ForgeMind AI — Single Image Prediction CLI with Grad-CAM
Usage: python predict.py --image path/to/image.png [--output-overlay reports/pred_overlay.jpg]
"""

import os
import sys
import argparse
import json
import cv2
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.inference_service import get_inference_engine


def main():
    parser = argparse.ArgumentParser(description="Predict visual defect class using trained EfficientNet-B0.")
    parser.add_argument("--image", type=str, required=True, help="Path to input manufacturing image")
    parser.add_argument("--checkpoint", type=str, default="models/efficientnet_b0_forgemind_best.pth")
    parser.add_argument("--threshold", type=float, default=0.85, help="Confidence alert threshold")
    parser.add_argument("--output-overlay", type=str, default=None, help="Save path for Grad-CAM overlay image")
    args = parser.parse_args()

    engine = get_inference_engine()
    engine.checkpoint_path = args.checkpoint
    engine.confidence_threshold = args.threshold
    engine._load_model()

    if not engine.is_available():
        print("ERROR: AI model unavailable. Please train the model with train.py first.")
        sys.exit(1)

    print(f"Running inference on: {args.image} ...")
    res = engine.classify_image(args.image, include_gradcam=True)

    if "error" in res and not res.get("is_valid", True):
        print(f"FAILED: {res['error']}")
        sys.exit(1)

    # Display results
    print("\n" + "=" * 50)
    print("FORGEMIND AI -- DEFECT CLASSIFICATION RESULT")
    print("=" * 50)
    print(f"Prediction:       {res['prediction'].upper()}")
    print(f"Confidence:       {res['confidence'] * 100:.2f}%")
    print(f"Defect Status:    {'DEFECTIVE' if res['is_defective'] else 'NORMAL / PASS'}")
    print("-" * 50)
    print("Class Probabilities:")
    for c_name, prob in res["probabilities"].items():
        bar_len = int(prob * 30)
        bar = "#" * bar_len + "-" * (30 - bar_len)
        print(f"  {c_name:<10}: {prob * 100:>6.2f}% |{bar}|")
    print("-" * 50)

    # Quality status
    q = res.get("quality", {})
    print(f"OpenCV Quality:   {q.get('status')} (Blur: {q.get('blur_score', 0):.1f}, Brightness: {q.get('mean_brightness', 0):.1f})")
    if q.get("issues"):
        print(f"  Quality notes:  {'; '.join(q['issues'])}")

    # Low confidence alert
    if res.get("is_low_confidence"):
        print("\n[!] WARNING: Low-confidence prediction (< 85%). Human review recommended.")

    # Save Grad-CAM overlay if requested
    if args.output_overlay and res.get("gradcam") and res["gradcam"].get("overlay_base64"):
        b64_str = res["gradcam"]["overlay_base64"].split(",")[1]
        import base64
        img_bytes = base64.b64decode(b64_str)
        os.makedirs(os.path.dirname(args.output_overlay) if os.path.dirname(args.output_overlay) else ".", exist_ok=True)
        with open(args.output_overlay, "wb") as f:
            f.write(img_bytes)
        print(f"\nGrad-CAM attention overlay saved to: {args.output_overlay}")

    print("=" * 50 + "\n")


if __name__ == "__main__":
    main()
