#!/usr/bin/env python
"""
ForgeMind AI — External Test Set Generalization Evaluation
Evaluates arbitrary images from outside the organizer training dataset (e.g. external_test/).
If labels are available, computes metrics; otherwise generates predictions and clearly marks
'External inference — ground truth not provided.'
"""

import os
import sys
import glob
import argparse
import pandas as pd
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.inference_service import get_inference_engine
from scripts.ml.model import CLASS_NAMES, CLASS_TO_INDEX
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report


def evaluate_external(
    input_path: str = "external_test",
    labels_csv: str = None,
    output_csv: str = "reports/external_inference_results.csv",
    checkpoint: str = None,
) -> None:
    if checkpoint is None:
        if os.path.exists("models/efficientnet_b0_forgemind_full_data.pth"):
            checkpoint = "models/efficientnet_b0_forgemind_full_data.pth"
        else:
            checkpoint = "models/efficientnet_b0_forgemind_best.pth"

    engine = get_inference_engine()
    engine.checkpoint_path = checkpoint
    engine._load_model()

    if not engine.is_available():
        print("ERROR: AI model unavailable. Please train model first with train.py.")
        sys.exit(1)

    # Collect image files
    if os.path.isdir(input_path):
        patterns = [os.path.join(input_path, f"*.{ext}") for ext in ["png", "jpg", "jpeg", "bmp", "PNG", "JPG", "JPEG"]]
        image_files = []
        for p in patterns:
            image_files.extend(glob.glob(p))
        image_files = sorted(list(set(image_files)))
    elif os.path.isfile(input_path):
        image_files = [input_path]
    else:
        print(f"ERROR: Input path does not exist: {input_path}")
        sys.exit(1)

    if not image_files:
        print(f"No image files found at: {input_path}")
        return

    print(f"\n=======================================================")
    print(f"ForgeMind AI — External Generalization Test")
    print(f"Input path:  {input_path} ({len(image_files)} images)")
    print(f"Model:       {engine.checkpoint_path}")
    print(f"=======================================================\n")

    # Check if ground truth labels are provided
    ground_truth = {}
    has_ground_truth = False
    if labels_csv and os.path.exists(labels_csv):
        lbl_df = pd.read_csv(labels_csv)
        for _, row in lbl_df.iterrows():
            key = os.path.basename(str(row.get("filename", row.get("filepath", ""))))
            ground_truth[key] = str(row.get("label", row.get("class_name", ""))).lower().strip()
        has_ground_truth = True
        print(f"Loaded ground truth labels for {len(ground_truth)} images.")
    else:
        print("NOTE: Ground-truth labels not provided.")
        print("Running: External inference — ground truth not provided.\n")

    results = []
    y_true = []
    y_pred = []

    for img_path in image_files:
        fname = os.path.basename(img_path)
        res = engine.classify_image(img_path, include_gradcam=False)

        if "error" in res and not res.get("is_valid", True):
            print(f"  [{fname}] REJECTED: {res.get('error')}")
            continue

        pred = res["prediction"]
        conf = res["confidence"]
        probs = res["probabilities"]

        record = {
            "filename": fname,
            "filepath": img_path,
            "predicted_class": pred,
            "confidence": conf,
            "is_low_confidence": res.get("is_low_confidence", False),
            "prob_crack": probs.get("Crack", 0.0),
            "prob_normal": probs.get("Normal", 0.0),
            "prob_hole": probs.get("Hole", 0.0),
            "prob_scratch": probs.get("Scratch", 0.0),
            "prob_rust": probs.get("Rust", 0.0),
            "opencv_quality": res.get("quality", {}).get("status", "UNKNOWN"),
        }

        # Check ground truth
        if has_ground_truth and fname in ground_truth:
            gt_name = ground_truth[fname]
            record["actual_class"] = gt_name.capitalize()
            if gt_name in CLASS_TO_INDEX and pred.lower() in CLASS_TO_INDEX:
                y_true.append(CLASS_TO_INDEX[gt_name])
                y_pred.append(CLASS_TO_INDEX[pred.lower()])

        results.append(record)
        warn = " [!] Low Conf" if res.get("is_low_confidence") else ""
        print(f"  -> {fname:<24} | Pred: {pred:<8} | Conf: {conf*100:>6.2f}%{warn}")

    # Save results to CSV
    os.makedirs(os.path.dirname(output_csv) if os.path.dirname(output_csv) else ".", exist_ok=True)
    out_df = pd.DataFrame(results)
    out_df.to_csv(output_csv, index=False)
    print(f"\nInference results saved to: {output_csv}")

    # If ground truth was provided, calculate metrics
    if has_ground_truth and len(y_true) > 0:
        print("\n" + "=" * 50)
        print("VERIFIED EXTERNAL TEST ACCURACY METRICS")
        print("=" * 50)
        acc = accuracy_score(y_true, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
        print(f"Accuracy:        {acc * 100:.2f}%")
        print(f"Macro Precision: {prec * 100:.2f}%")
        print(f"Macro Recall:    {rec * 100:.2f}%")
        print(f"Macro F1-Score:  {f1 * 100:.2f}%")
        print("=" * 50 + "\n")
    else:
        print("\n" + "=" * 50)
        print("STATUS: External inference -- ground truth not provided.")
        print("Predictions and probability distributions recorded without unverified accuracy claims.")
        print("=" * 50 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Evaluate external unseen images with trained EfficientNet-B0.")
    parser.add_argument("--input", type=str, default="external_test", help="Directory containing external images")
    parser.add_argument("--labels", type=str, default=None, help="Optional CSV file with ground truth labels")
    parser.add_argument("--output", type=str, default="reports/external_inference_results.csv")
    parser.add_argument("--checkpoint", type=str, default="models/efficientnet_b0_forgemind_best.pth")
    args = parser.parse_args()

    evaluate_external(
        input_path=args.input,
        labels_csv=args.labels,
        output_csv=args.output,
        checkpoint=args.checkpoint,
    )


if __name__ == "__main__":
    main()
