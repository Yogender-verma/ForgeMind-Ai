#!/usr/bin/env python
"""
ForgeMind AI — Internal Evaluation Pipeline on Held-Out Test Set
Evaluates trained EfficientNet-B0 once against dataset/splits/test.csv (15% held-out).
Generates confusion matrix, per-class metrics, classification report, and error analysis.
"""

import os
import sys
import json
import argparse
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report,
)

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.model import (
    load_trained_model,
    get_transforms,
    CLASS_NAMES,
    INDEX_TO_CLASS,
)
from train import ManufacturingImageDataset


def plot_confusion_matrix(
    cm: np.ndarray,
    classes: list,
    output_path: str = "reports/confusion_matrix.png",
    normalize: bool = False,
) -> None:
    """Renders high-contrast, publication-quality confusion matrix."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if normalize:
        cm_display = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]
        fmt = ".2f"
        title = "Normalized Confusion Matrix (Held-Out Test Set)"
    else:
        cm_display = cm
        fmt = "d"
        title = "Confusion Matrix (Held-Out Test Set)"

    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(cm_display, interpolation="nearest", cmap=plt.cm.Blues)
    ax.figure.colorbar(im, ax=ax)

    ax.set(
        xticks=np.arange(cm.shape[1]),
        yticks=np.arange(cm.shape[0]),
        xticklabels=classes,
        yticklabels=classes,
        title=title,
        ylabel="Actual True Class",
        xlabel="Model Predicted Class",
    )

    # Rotate the tick labels and set their alignment.
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right", rotation_mode="anchor")

    # Loop over data dimensions and create text annotations.
    thresh = cm_display.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val_str = f"{cm_display[i, j]:{fmt}}"
            ax.text(
                j,
                i,
                val_str,
                ha="center",
                va="center",
                color="white" if cm_display[i, j] > thresh else "black",
                fontweight="bold",
                fontsize=11,
            )

    fig.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"Confusion matrix plot saved to: {output_path}")


def evaluate_model(
    checkpoint_path: str = "models/efficientnet_b0_forgemind_best.pth",
    test_csv: str = "dataset/splits/test.csv",
    reports_dir: str = "reports",
    batch_size: int = 32,
    device_name: str = None,
) -> dict:
    """Runs complete evaluation on the held-out test set."""
    os.makedirs(reports_dir, exist_ok=True)
    device = torch.device(device_name or ("cuda" if torch.cuda.is_available() else "cpu"))

    print(f"Loading checkpoint: {checkpoint_path} on {device}...")
    model, config = load_trained_model(checkpoint_path=checkpoint_path, device=device)

    _, eval_transform = get_transforms(image_size=224)
    test_dataset = ManufacturingImageDataset(test_csv, transform=eval_transform)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    print(f"Evaluating {len(test_dataset):,} held-out test samples...")

    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for images, labels in test_loader:
            images = images.to(device)
            outputs = model(images)
            probs = F.softmax(outputs, dim=1)

            preds = torch.argmax(probs, dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.numpy())
            all_probs.extend(probs.cpu().numpy())

    all_preds = np.array(all_preds)
    all_labels = np.array(all_labels)
    all_probs = np.array(all_probs)

    # 1. Overall Metrics
    acc = accuracy_score(all_labels, all_preds)
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average="macro", zero_division=0
    )

    # 2. Per-Class Metrics
    prec_per_class, rec_per_class, f1_per_class, support_per_class = precision_recall_fscore_support(
        all_labels, all_preds, average=None, zero_division=0
    )

    # 3. Confusion Matrix
    cm = confusion_matrix(all_labels, all_preds, labels=range(len(CLASS_NAMES)))

    # Save Confusion Matrix as PNG, CSV, JSON
    plot_confusion_matrix(cm, CLASS_NAMES, output_path=os.path.join(reports_dir, "confusion_matrix.png"))

    cm_df = pd.DataFrame(cm, index=[f"Actual_{c}" for c in CLASS_NAMES], columns=[f"Pred_{c}" for c in CLASS_NAMES])
    cm_csv_path = os.path.join(reports_dir, "confusion_matrix.csv")
    cm_df.to_csv(cm_csv_path)

    cm_json_path = os.path.join(reports_dir, "confusion_matrix.json")
    with open(cm_json_path, "w") as f:
        json.dump(cm.tolist(), f, indent=2)

    # 4. Classification Report Text & CSV
    clf_report_str = classification_report(all_labels, all_preds, target_names=CLASS_NAMES, digits=4, zero_division=0)
    report_txt_path = os.path.join(reports_dir, "classification_report.txt")
    with open(report_txt_path, "w", encoding="utf-8") as f:
        f.write(clf_report_str)

    report_dict = classification_report(all_labels, all_preds, target_names=CLASS_NAMES, output_dict=True, zero_division=0)
    report_df = pd.DataFrame(report_dict).transpose()
    report_csv_path = os.path.join(reports_dir, "classification_report.csv")
    report_df.to_csv(report_csv_path)

    # 5. Error Analysis: Misclassified Samples
    test_df = pd.read_csv(test_csv)
    errors = []
    for idx in range(len(test_df)):
        true_lbl = all_labels[idx]
        pred_lbl = all_preds[idx]
        if true_lbl != pred_lbl:
            row = test_df.iloc[idx]
            conf = float(all_probs[idx][pred_lbl])
            errors.append({
                "filepath": row["filepath"],
                "filename": row["filename"],
                "actual_class": CLASS_NAMES[true_lbl],
                "predicted_class": CLASS_NAMES[pred_lbl],
                "confidence": round(conf, 4),
                "prob_crack": round(float(all_probs[idx][0]), 4),
                "prob_normal": round(float(all_probs[idx][1]), 4),
                "prob_hole": round(float(all_probs[idx][2]), 4),
                "prob_scratch": round(float(all_probs[idx][3]), 4),
                "prob_rust": round(float(all_probs[idx][4]), 4),
            })

    errors_df = pd.DataFrame(errors)
    error_csv_path = os.path.join(reports_dir, "error_analysis.csv")
    errors_df.to_csv(error_csv_path, index=False)

    # Print summary results to console
    print("\n" + "=" * 60)
    print("HELD-OUT TEST SET EVALUATION RESULTS (15% UNSEEN SAMPLES)")
    print("=" * 60)
    print(f"Overall Accuracy:       {acc * 100:.2f}%")
    print(f"Macro Precision:        {macro_prec * 100:.2f}%")
    print(f"Macro Recall:           {macro_rec * 100:.2f}%")
    print(f"Macro F1-Score:         {macro_f1 * 100:.2f}%")
    print("-" * 60)
    print("Per-Class Performance Breakdown:")
    print(f"{'Class':<10} {'Precision':>10} {'Recall':>10} {'F1-Score':>10} {'Support':>10}")
    print("-" * 60)
    for i, c_name in enumerate(CLASS_NAMES):
        print(f"{c_name:<10} {prec_per_class[i]*100:>9.2f}% {rec_per_class[i]*100:>9.2f}% {f1_per_class[i]*100:>9.2f}% {support_per_class[i]:>10d}")
    print("-" * 60)
    print(f"Total Test Samples:     {len(all_labels):,}")
    print(f"Total Misclassifications: {len(errors):,} ({len(errors)/len(all_labels)*100:.2f}%)")
    print("=" * 60 + "\n")

    return {
        "accuracy": acc,
        "macro_precision": macro_prec,
        "macro_recall": macro_rec,
        "macro_f1": macro_f1,
        "per_class": {
            c_name: {
                "precision": float(prec_per_class[i]),
                "recall": float(rec_per_class[i]),
                "f1": float(f1_per_class[i]),
                "support": int(support_per_class[i]),
            }
            for i, c_name in enumerate(CLASS_NAMES)
        },
        "confusion_matrix": cm.tolist(),
        "misclassifications_count": len(errors),
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate defect classification model on held-out test set.")
    parser.add_argument("--checkpoint", type=str, default="models/efficientnet_b0_forgemind_best.pth")
    parser.add_argument("--test-csv", type=str, default="dataset/splits/test.csv")
    parser.add_argument("--reports-dir", type=str, default="reports")
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    evaluate_model(
        checkpoint_path=args.checkpoint,
        test_csv=args.test_csv,
        reports_dir=args.reports_dir,
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()
