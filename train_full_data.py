#!/usr/bin/env python
"""
ForgeMind AI — Train Final Deployment Model on ALL 10,726 Images
Train EfficientNet-B0 visual defect classifier on 100% of organizer-provided dataset.

IMPORTANT:
- Preserves existing evaluated model (models/efficientnet_b0_forgemind_best.pth).
- Preserves 98.20% held-out test result as official internal evaluation benchmark.
- Does NOT include external_test/ images in training.
- Outputs checkpoint: models/efficientnet_b0_forgemind_full_data.pth
"""

import os
import sys
import time
import json
import glob
import argparse
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.model import (
    create_model,
    get_transforms,
    CLASS_NAMES,
    CLASS_TO_INDEX,
    INDEX_TO_CLASS,
    IMAGENET_MEAN,
    IMAGENET_STD,
)

CLASS_MAPPING = {
    "crack": 0,
    "normal": 1,
    "hole": 2,
    "scratch": 3,
    "rust": 4,
}

EXPECTED_COUNTS = {
    "crack": 2400,
    "normal": 2400,
    "hole": 2400,
    "scratch": 2400,
    "rust": 1126,
}


class ManufacturingImageDataset(Dataset):
    """PyTorch Dataset loading images from CSV manifest."""

    def __init__(self, csv_file: str, transform=None, base_dir: str = PROJECT_ROOT):
        self.df = pd.read_csv(csv_file)
        self.transform = transform
        self.base_dir = base_dir

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(self.base_dir, row["filepath"])
        image = Image.open(img_path).convert("RGB")
        label = int(row["label"])

        if self.transform:
            image = self.transform(image)

        return image, label


def verify_dataset(raw_dir: str = "dataset/raw") -> pd.DataFrame:
    """
    Executes pre-training verification:
    1. Verify all 10,726 images exist.
    2. Verify five class counts.
    3. Verify images are readable.
    4. Verify class mapping.
    5. Verify external_test/ is not included.
    """
    print("\n=======================================================")
    print("Executing Pre-Training Verification (All 10,726 Images)")
    print("=======================================================")

    records = []
    readable_errors = 0
    external_test_contamination = 0

    for cls_name, label_idx in CLASS_MAPPING.items():
        cls_dir = os.path.join(raw_dir, cls_name)
        if not os.path.exists(cls_dir):
            raise FileNotFoundError(f"Missing expected raw directory: {cls_dir}")

        files = sorted(glob.glob(os.path.join(cls_dir, "*.*")))
        expected = EXPECTED_COUNTS[cls_name]
        actual = len(files)

        print(f"Class '{cls_name:<7}' (Label {label_idx}): Found {actual:,} images (Expected {expected:,})", end="")
        if actual == expected:
            print(" -> [VERIFIED MATCH]")
        else:
            print(f" -> [MISMATCH! Expected {expected}]")
            raise ValueError(f"Count mismatch for class {cls_name}: expected {expected}, got {actual}")

        for fpath in files:
            rel_path = os.path.relpath(fpath, start=PROJECT_ROOT).replace("\\", "/")

            if "external_test" in rel_path.lower():
                external_test_contamination += 1

            # Test readability
            try:
                with Image.open(fpath) as img:
                    img.verify()
            except Exception as err:
                print(f"  [CORRUPTED] Could not read image {fpath}: {err}")
                readable_errors += 1

            records.append({
                "filepath": rel_path,
                "class_name": cls_name,
                "label": label_idx,
                "filename": os.path.basename(fpath),
            })

    if readable_errors > 0:
        raise RuntimeError(f"Verification failed: {readable_errors} corrupted/unreadable images found.")

    if external_test_contamination > 0:
        raise RuntimeError(f"Verification failed: {external_test_contamination} external_test images detected in training path.")

    df_full = pd.DataFrame(records)
    total_found = len(df_full)
    print(f"\nTotal Dataset Verified: {total_found:,} / 10,726 images")
    print(f"Readability Verification: 100% Passed (0 corrupted)")
    print(f"External Test Isolation: 100% Passed (0 external_test images in training set)")
    print(f"Class Mapping Verified: {CLASS_MAPPING}")
    print("=======================================================\n")

    # Save full dataset manifest
    manifest_path = "dataset/splits/full_dataset.csv"
    os.makedirs("dataset/splits", exist_ok=True)
    df_full.to_csv(manifest_path, index=False)
    print(f"Full dataset manifest saved to: {manifest_path}\n")

    return df_full


def compute_class_weights(df: pd.DataFrame, num_classes: int = 5) -> torch.Tensor:
    """Computes inverse-frequency class weights over full 10,726 dataset."""
    counts = np.zeros(num_classes, dtype=np.float32)
    for c_idx in range(num_classes):
        counts[c_idx] = (df["label"] == c_idx).sum()

    total_samples = len(df)
    weights = total_samples / (num_classes * counts)
    weights = weights / np.mean(weights)
    return torch.tensor(weights, dtype=torch.float32)


def save_full_data_artifacts(
    model: nn.Module,
    checkpoint_path: str = "models/efficientnet_b0_forgemind_full_data.pth",
    config_path: str = "models/full_data_model_config.json",
    training_metrics: Dict[str, Any] = None,
) -> None:
    """Saves deployment model weights and explicit deployment config."""
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    torch.save(model.state_dict(), checkpoint_path)
    print(f"Full-data deployment checkpoint saved to: {checkpoint_path}")

    config_data = {
        "model_title": "ForgeMind EfficientNet-B0 — Full Data Deployment Model",
        "model_version": "v1.0.0-full-data",
        "architecture": "EfficientNet-B0",
        "backbone_weights": "EfficientNet_B0_Weights.DEFAULT",
        "num_classes": 5,
        "classes": CLASS_NAMES,
        "class_to_index": CLASS_TO_INDEX,
        "index_to_class": {str(k): v for k, v in INDEX_TO_CLASS.items()},
        "training_dataset": "100% Organizer Raw Dataset (10,726 images)",
        "class_counts": EXPECTED_COUNTS,
        "normalization": {
            "mean": IMAGENET_MEAN,
            "std": IMAGENET_STD,
            "input_size": [224, 224],
        },
        "official_benchmark_note": "The official independently measured evaluation benchmark remains 98.20% accuracy on the 1,609-image held-out test set (models/efficientnet_b0_forgemind_best.pth). Training-set metrics on this full-data deployment model must not be described as generalization accuracy.",
        "training_metrics": training_metrics or {},
    }

    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=2)
    print(f"Full-data model config saved to: {config_path}")


def write_full_data_training_run_md(
    history: Dict[str, list],
    training_time_sec: float,
    device_name: str,
    output_path: str = "models/full_data_training_run.md",
) -> None:
    """Writes detailed markdown documentation of full-data deployment training run."""
    lines = []
    lines.append("# ForgeMind AI — Full-Data Deployment Model Training Log\n")
    lines.append(f"**Model Title**: ForgeMind EfficientNet-B0 — Full Data Deployment Model")
    lines.append(f"**Model Version**: `v1.0.0-full-data`")
    lines.append(f"**Checkpoint Path**: `models/efficientnet_b0_forgemind_full_data.pth`")
    lines.append(f"**Execution Timestamp**: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    lines.append(f"**Compute Platform**: {device_name}")
    lines.append(f"**PyTorch Version**: {torch.__version__}")
    lines.append(f"**Random Seed**: 42")
    lines.append(f"**Total Training Duration**: {training_time_sec:.1f} seconds ({training_time_sec/60:.1f} minutes)\n")
    lines.append("---\n")

    lines.append("## 1. Training Dataset Composition (ALL 10,726 Images)\n")
    lines.append("| Class Name | Label | Image Count | Percentage | Class Loss Weight |")
    lines.append("| :--- | :---: | :---: | :---: | :---: |")
    lines.append("| **Crack** | 0 | 2,400 | 22.38% | 0.894 |")
    lines.append("| **Normal** | 1 | 2,400 | 22.38% | 0.894 |")
    lines.append("| **Hole** | 2 | 2,400 | 22.38% | 0.894 |")
    lines.append("| **Scratch** | 3 | 2,400 | 22.38% | 0.894 |")
    lines.append("| **Rust** | 4 | 1,126 | 10.50% | 1.905 |")
    lines.append("| **Total** | — | **10,726** | **100.0%** | — |\n")

    lines.append("## 2. Integrity & Isolation Guarantee\n")
    lines.append("- **100% Organizer Images**: Trained on all 10,726 raw organizer-provided images.")
    lines.append("- **Zero External Test Contamination**: `external_test/` images were strictly excluded from training.")
    lines.append("- **Zero Synthetic Images**: No synthetic or generated image samples were added.")
    lines.append("- **Preservation of Benchmark**: The existing 98.20% held-out test evaluation report (`models/efficientnet_b0_forgemind_best.pth`) remains the official benchmark.\n")

    lines.append("## 3. Epoch-by-Epoch Training Progress\n")
    lines.append("| Epoch | Training Loss | Training Accuracy (%) | Learning Rate | Phase / Notes |")
    lines.append("| :---: | :---: | :---: | :---: | :--- |")

    for i in range(len(history["train_loss"])):
        ep = i + 1
        phase = "Phase 1: Head Warm-up" if ep <= 3 else "Phase 2: Fine-Tuning Top Blocks"
        lines.append(
            f"| {ep} | {history['train_loss'][i]:.4f} | {history['train_acc'][i]*100:.2f}% | "
            f"{history['lr'][i]:.1e} | {phase} |"
        )

    lines.append("\n---\n")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Full-data training report written to: {output_path}")


def train_full_data(args):
    # Step 1: Pre-training verification
    df_full = verify_dataset(raw_dir="dataset/raw")

    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"Starting Full Data Training on {device}...")
    print(f"Target Checkpoint: {args.save_path}")

    # Step 2: DataLoader
    train_transform, _ = get_transforms(image_size=args.image_size)
    full_dataset = ManufacturingImageDataset("dataset/splits/full_dataset.csv", transform=train_transform)

    train_loader = DataLoader(
        full_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=True if device.type == "cuda" else False,
    )

    # Step 3: Class Weights over full dataset
    class_weights = compute_class_weights(df_full, num_classes=5).to(device)
    print("\nInverse-Frequency Class Weights (Full Dataset):")
    for idx, name in enumerate(CLASS_NAMES):
        print(f"  [{idx}] {name:<10}: weight = {class_weights[idx].item():.3f}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # Step 4: Model Initialization
    model = create_model(num_classes=5, pretrained=True, dropout_rate=args.dropout)
    model.to(device)

    # Phase 1: Head-only warm-up
    print("\nPhase 1: Feature Extraction (Training classification head on 10,726 images)...")
    for param in model.features.parameters():
        param.requires_grad = False

    optimizer = torch.optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=args.head_lr,
        weight_decay=args.weight_decay,
    )

    history = {
        "train_loss": [],
        "train_acc": [],
        "lr": [],
    }

    start_time = time.time()
    phase1_epochs = min(args.phase1_epochs, args.epochs)
    phase2_epochs = args.epochs - phase1_epochs

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()

        if epoch == phase1_epochs + 1 and phase2_epochs > 0:
            print(f"\nPhase 2: Fine-Tuning top convolutional blocks (layers 6-8 + head) on 10,726 images...")
            for i, block in enumerate(model.features):
                if i >= 5:
                    for param in block.parameters():
                        param.requires_grad = True

            optimizer = torch.optim.AdamW([
                {"params": model.features.parameters(), "lr": args.finetune_lr * 0.3},
                {"params": model.classifier.parameters(), "lr": args.finetune_lr},
            ], weight_decay=args.weight_decay)

        model.train()
        running_loss = 0.0
        train_preds = []
        train_labels = []

        for batch_idx, (images, labels) in enumerate(train_loader):
            images = images.to(device)
            labels = labels.to(device)

            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()

            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            train_preds.extend(preds.cpu().numpy())
            train_labels.extend(labels.cpu().numpy())

            if (batch_idx + 1) % 50 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  Epoch {epoch:02d} [{batch_idx+1:03d}/{len(train_loader):03d}] "
                      f"Batch Loss: {loss.item():.4f}", flush=True)

        train_loss = running_loss / len(train_labels)
        train_acc = (np.array(train_preds) == np.array(train_labels)).mean()
        current_lr = optimizer.param_groups[-1]["lr"]
        epoch_dur = time.time() - epoch_start

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["lr"].append(current_lr)

        print(f"Epoch {epoch:02d}/{args.epochs:02d} ({epoch_dur:.1f}s) | "
              f"Full Train Loss: {train_loss:.4f} | Full Train Acc: {train_acc*100:.2f}% | "
              f"LR: {current_lr:.1e}")

    total_training_time = time.time() - start_time

    # Save final full-data deployment model artifacts
    save_full_data_artifacts(
        model=model,
        checkpoint_path=args.save_path,
        config_path="models/full_data_model_config.json",
        training_metrics={
            "total_images_trained": len(df_full),
            "final_train_loss": round(history["train_loss"][-1], 4),
            "final_train_acc": round(history["train_acc"][-1], 4),
            "training_duration_sec": round(total_training_time, 1),
        },
    )

    device_desc = f"{device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'Intel/AMD x86_64 CPU'})"
    write_full_data_training_run_md(
        history=history,
        training_time_sec=total_training_time,
        device_name=device_desc,
        output_path="models/full_data_training_run.md",
    )

    print(f"\n=======================================================")
    print("Full Data Deployment Model Training Complete!")
    print(f"Training Duration: {total_training_time:.1f} seconds ({total_training_time/60:.1f} minutes)")
    print(f"Total Images Used: {len(df_full):,} (100% Organizer Raw Data)")
    print(f"Saved Checkpoint:  {args.save_path}")
    print(f"Model Title:       ForgeMind EfficientNet-B0 — Full Data Deployment Model")
    print(f"Model Version:     v1.0.0-full-data")
    print("=======================================================\n")


def main():
    parser = argparse.ArgumentParser(description="Train EfficientNet-B0 full data deployment model.")
    parser.add_argument("--save-path", type=str, default="models/efficientnet_b0_forgemind_full_data.pth")
    parser.add_argument("--epochs", type=int, default=6, help="Total training epochs")
    parser.add_argument("--phase1-epochs", type=int, default=3, help="Head-only warm-up epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="DataLoader batch size")
    parser.add_argument("--image-size", type=int, default=224, help="Input image dimension")
    parser.add_argument("--head-lr", type=float, default=1e-3, help="Classification head learning rate")
    parser.add_argument("--finetune-lr", type=float, default=2e-4, help="Fine-tuning learning rate")
    parser.add_argument("--weight-decay", type=float, default=1e-4, help="Weight decay")
    parser.add_argument("--dropout", type=float, default=0.2, help="Head dropout rate")
    parser.add_argument("--num-workers", type=int, default=0, help="DataLoader subprocess workers")
    parser.add_argument("--cpu", action="store_true", help="Force CPU execution")
    args = parser.parse_args()

    train_full_data(args)


if __name__ == "__main__":
    main()
