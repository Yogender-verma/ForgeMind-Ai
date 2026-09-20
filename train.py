#!/usr/bin/env python
"""
ForgeMind AI — EfficientNet-B0 Defect Classification Training Pipeline
Trains a 5-class manufacturing visual defect classifier with transfer learning,
class-weighted CrossEntropyLoss, validation monitoring, and best-checkpoint saving.
"""

import os
import sys
import time
import json
import argparse
from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import precision_recall_fscore_support, accuracy_score

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.model import (
    create_model,
    get_transforms,
    save_model_artifacts,
    CLASS_NAMES,
    CLASS_TO_INDEX,
)


class ManufacturingImageDataset(Dataset):
    """PyTorch Dataset loading images from CSV split manifest."""

    def __init__(self, csv_file: str, transform=None, base_dir: str = PROJECT_ROOT):
        self.df = pd.read_csv(csv_file)
        self.transform = transform
        self.base_dir = base_dir

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = os.path.join(self.base_dir, row["filepath"])
        
        # Load image via PIL in RGB format
        image = Image.open(img_path).convert("RGB")
        label = int(row["label"])

        if self.transform:
            image = self.transform(image)

        return image, label


def compute_class_weights(df_train: pd.DataFrame, num_classes: int = 5) -> torch.Tensor:
    """Computes inverse-frequency class weights: w_c = N / (C * N_c)"""
    counts = np.zeros(num_classes, dtype=np.float32)
    for c_idx in range(num_classes):
        counts[c_idx] = (df_train["label"] == c_idx).sum()

    total_samples = len(df_train)
    weights = total_samples / (num_classes * counts)
    # Normalize weights so mean is 1.0
    weights = weights / np.mean(weights)
    return torch.tensor(weights, dtype=torch.float32)


def evaluate_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float, float, float, float]:
    """Runs evaluation over a dataset partition returning loss and macro metrics."""
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in dataloader:
            images = images.to(device)
            labels = labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    total_samples = len(all_labels)
    epoch_loss = running_loss / total_samples
    acc = accuracy_score(all_labels, all_preds)
    precision, recall, f1, _ = precision_recall_fscore_support(
        all_labels, all_preds, average="macro", zero_division=0
    )

    return epoch_loss, acc, precision, recall, f1


def plot_training_curves(history: Dict[str, list], output_path: str = "reports/training_curves.png") -> None:
    """Generates and saves visual curves for loss and accuracy."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    epochs = range(1, len(history["train_loss"]) + 1)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    # Loss plot
    ax1.plot(epochs, history["train_loss"], "o-", label="Train Loss", color="#00e5ff", linewidth=2)
    ax1.plot(epochs, history["val_loss"], "s--", label="Val Loss", color="#f43f5e", linewidth=2)
    ax1.set_title("Training vs Validation Loss", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epoch")
    ax1.set_ylabel("CrossEntropy Loss")
    ax1.grid(True, linestyle=":", alpha=0.6)
    ax1.legend()

    # Accuracy plot
    ax1_acc = ax2
    ax1_acc.plot(epochs, [a * 100 for a in history["train_acc"]], "o-", label="Train Acc", color="#10b981", linewidth=2)
    ax1_acc.plot(epochs, [a * 100 for a in history["val_acc"]], "s--", label="Val Acc", color="#6366f1", linewidth=2)
    ax1_acc.set_title("Training vs Validation Accuracy (%)", fontsize=12, fontweight="bold")
    ax1_acc.set_xlabel("Epoch")
    ax1_acc.set_ylabel("Accuracy (%)")
    ax1_acc.grid(True, linestyle=":", alpha=0.6)
    ax1_acc.legend()

    plt.tight_layout()
    plt.savefig(output_path, dpi=150)
    plt.close()
    print(f"Training curves saved to: {output_path}")


def write_training_run_md(
    history: Dict[str, list],
    best_epoch: int,
    best_f1: float,
    training_time_sec: float,
    device_name: str,
    output_path: str = "TRAINING_RUN.md",
) -> None:
    """Writes detailed reproducible documentation of the training run."""
    lines = []
    lines.append("# ForgeMind AI — EfficientNet-B0 Model Training Run Log\n")
    lines.append(f"**Execution Timestamp**: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}")
    lines.append(f"**Compute Platform**: {device_name}")
    lines.append(f"**PyTorch Version**: {torch.__version__}")
    lines.append(f"**Random Seed**: 42")
    lines.append(f"**Total Training Duration**: {training_time_sec:.1f} seconds ({training_time_sec/60:.1f} minutes)\n")
    lines.append("---\n")

    lines.append("## 1. Hyperparameters & Architecture\n")
    lines.append("- **Backbone Model**: `EfficientNet-B0` (ImageNet-pretrained `EfficientNet_B0_Weights.DEFAULT`)")
    lines.append("- **Classification Head**: `Linear(1280, 5)` preceded by `Dropout(p=0.2)`")
    lines.append("- **Classes**: `0: Crack, 1: Normal, 2: Hole, 3: Scratch, 4: Rust`")
    lines.append("- **Loss Function**: `CrossEntropyLoss` with inverse-frequency class weighting (Rust balancing)")
    lines.append("- **Optimizer**: `AdamW(weight_decay=1e-4)`")
    lines.append("- **Input Resolution**: 224x224 RGB (ImageNet mean & std normalization)")
    lines.append("- **Primary Selection Metric**: Validation Macro F1 Score\n")

    lines.append("## 2. Epoch-by-Epoch Progress\n")
    lines.append("| Epoch | Train Loss | Train Acc | Val Loss | Val Acc | Val Macro F1 | LR | Notes |")
    lines.append("| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |")

    for i in range(len(history["train_loss"])):
        ep = i + 1
        note = "[*] Best Checkpoint Saved" if ep == best_epoch else ""
        lines.append(
            f"| {ep} | {history['train_loss'][i]:.4f} | {history['train_acc'][i]*100:.2f}% | "
            f"{history['val_loss'][i]:.4f} | {history['val_acc'][i]*100:.2f}% | "
            f"{history['val_f1'][i]*100:.2f}% | {history['lr'][i]:.1e} | {note} |"
        )

    lines.append(f"\n**Best Model Achieved at Epoch {best_epoch} with Validation Macro F1 = {best_f1*100:.2f}%**\n")
    lines.append("---\n")

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Training run report written to: {output_path}")


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() and not args.cpu else "cpu")
    print(f"\n=======================================================")
    print(f"ForgeMind AI — Real Defect Classification Training")
    print(f"Device: {device} | Pretrained: EfficientNet-B0 | Classes: 5")
    print(f"Train manifest: {args.train_csv}")
    print(f"Val manifest:   {args.val_csv}")
    print(f"=======================================================\n")

    # 1. Transforms
    train_transform, eval_transform = get_transforms(image_size=args.image_size)

    # 2. Datasets & Loaders
    train_dataset = ManufacturingImageDataset(args.train_csv, transform=train_transform)
    val_dataset = ManufacturingImageDataset(args.val_csv, transform=eval_transform)

    train_loader = DataLoader(
        train_dataset,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=True if device.type == "cuda" else False,
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=args.num_workers,
    )

    print(f"Dataset partitions loaded: {len(train_dataset):,} train samples, {len(val_dataset):,} val samples.")

    # 3. Compute Class Weights for Imbalance (Rust class ~10.5%)
    class_weights = compute_class_weights(train_dataset.df, num_classes=5).to(device)
    print("Computed Inverse-Frequency Class Weights:")
    for idx, name in enumerate(CLASS_NAMES):
        print(f"  [{idx}] {name:<10}: weight = {class_weights[idx].item():.3f}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)

    # 4. Model Initialization
    model = create_model(num_classes=5, pretrained=True, dropout_rate=args.dropout)
    model.to(device)

    # Phase 1: Freeze backbone features and train classification head
    print("\nPhase 1: Feature Extraction (Training classification head)...")
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
        "val_loss": [],
        "val_acc": [],
        "val_precision": [],
        "val_recall": [],
        "val_f1": [],
        "lr": [],
    }

    best_val_f1 = -1.0
    best_epoch = 0
    start_time = time.time()

    # Determine split of epochs between head-only (Phase 1) and fine-tuning (Phase 2)
    phase1_epochs = min(args.phase1_epochs, args.epochs)
    phase2_epochs = args.epochs - phase1_epochs

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()

        # Switch to Phase 2 (Fine-tuning upper blocks)
        if epoch == phase1_epochs + 1 and phase2_epochs > 0:
            print(f"\nPhase 2: Fine-Tuning top convolutional blocks (layers 6-8 + head) at lr={args.finetune_lr}...")
            # Unfreeze top feature layers
            for i, block in enumerate(model.features):
                if i >= 5:  # Unfreeze layers 5, 6, 7, 8
                    for param in block.parameters():
                        param.requires_grad = True

            optimizer = torch.optim.AdamW([
                {"params": model.features.parameters(), "lr": args.finetune_lr * 0.3},
                {"params": model.classifier.parameters(), "lr": args.finetune_lr},
            ], weight_decay=args.weight_decay)

        # Training Pass
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

            # Gradient clipping for stability
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=2.0)
            optimizer.step()

            running_loss += loss.item() * images.size(0)
            preds = torch.argmax(outputs, dim=1)
            train_preds.extend(preds.cpu().numpy())
            train_labels.extend(labels.cpu().numpy())

            if (batch_idx + 1) % 25 == 0 or (batch_idx + 1) == len(train_loader):
                print(f"  Epoch {epoch:02d} [{batch_idx+1:03d}/{len(train_loader):03d}] "
                      f"Batch Loss: {loss.item():.4f}", flush=True)

        train_loss = running_loss / len(train_labels)
        train_acc = accuracy_score(train_labels, train_preds)

        # Validation Pass
        val_loss, val_acc, val_prec, val_rec, val_f1 = evaluate_epoch(
            model, val_loader, criterion, device
        )

        current_lr = optimizer.param_groups[-1]["lr"]
        epoch_dur = time.time() - epoch_start

        history["train_loss"].append(train_loss)
        history["train_acc"].append(train_acc)
        history["val_loss"].append(val_loss)
        history["val_acc"].append(val_acc)
        history["val_precision"].append(val_prec)
        history["val_recall"].append(val_rec)
        history["val_f1"].append(val_f1)
        history["lr"].append(current_lr)

        print(f"\nEpoch {epoch:02d}/{args.epochs:02d} ({epoch_dur:.1f}s) | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.2f}% | "
              f"Val Loss: {val_loss:.4f} Acc: {val_acc*100:.2f}% F1: {val_f1*100:.2f}% | "
              f"LR: {current_lr:.1e}", end="", flush=True)

        # Check for best model based on validation Macro F1
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_epoch = epoch
            print(" -> [*] BEST CHECKPOINT", flush=True)
            save_model_artifacts(
                model=model,
                checkpoint_path=args.save_path,
                config_dir="models",
                training_metrics={
                    "best_epoch": best_epoch,
                    "val_macro_f1": round(best_val_f1, 4),
                    "val_accuracy": round(val_acc, 4),
                    "val_loss": round(val_loss, 4),
                    "epochs_trained": epoch,
                },
            )
        else:
            print("")

    total_training_time = time.time() - start_time
    print(f"\nTraining Complete in {total_training_time:.1f} seconds!")
    print(f"Best Checkpoint: Epoch {best_epoch} with Val Macro F1 = {best_val_f1*100:.2f}%")

    # Plot and save curves
    plot_training_curves(history, output_path="reports/training_curves.png")

    # Write training run markdown documentation
    device_desc = f"{device} ({torch.cuda.get_device_name(0) if device.type == 'cuda' else 'Intel/AMD x86_64 CPU'})"
    write_training_run_md(
        history=history,
        best_epoch=best_epoch,
        best_f1=best_val_f1,
        training_time_sec=total_training_time,
        device_name=device_desc,
        output_path="TRAINING_RUN.md",
    )


def main():
    parser = argparse.ArgumentParser(description="Train EfficientNet-B0 defect classification model.")
    parser.add_argument("--train-csv", type=str, default="dataset/splits/train.csv")
    parser.add_argument("--val-csv", type=str, default="dataset/splits/validation.csv")
    parser.add_argument("--save-path", type=str, default="models/efficientnet_b0_forgemind_best.pth")
    parser.add_argument("--epochs", type=int, default=6, help="Total training epochs")
    parser.add_argument("--phase1-epochs", type=int, default=3, help="Head-only warm-up epochs")
    parser.add_argument("--batch-size", type=int, default=32, help="DataLoader batch size")
    parser.add_argument("--image-size", type=int, default=224, help="Input image dimension")
    parser.add_argument("--head-lr", type=float, default=1e-3, help="Classification head learning rate")
    parser.add_argument("--finetune-lr", type=float, default=2e-4, help="Fine-tuning learning rate")
    parser.add_argument("--weight-decay", type=float, default=1e-4, help="Weight decay")
    parser.add_argument("--dropout", type=float, default=0.2, help="Head dropout rate")
    parser.add_argument("--num-workers", type=int, default=0, help="DataLoader subprocess workers (0 for Windows compatibility)")
    parser.add_argument("--cpu", action="store_true", help="Force CPU execution")
    args = parser.parse_args()

    train(args)


if __name__ == "__main__":
    main()
