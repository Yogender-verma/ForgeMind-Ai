#!/usr/bin/env python
"""
ForgeMind AI — Dataset Preparation & Stratified 70/15/15 Splitting
Creates leak-free train.csv, validation.csv, test.csv manifests with SEED=42.
"""

import os
import sys
import glob
import argparse
import pandas as pd
import numpy as np
from collections import defaultdict
from sklearn.model_selection import train_test_split

PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.dataset_inspector import compute_dhash, compute_md5
import cv2

CLASS_MAPPING = {
    "crack": 0,
    "normal": 1,
    "hole": 2,
    "scratch": 3,
    "rust": 4,
}


def prepare_splits(
    raw_dir: str = "dataset/raw",
    output_dir: str = "dataset/splits",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42,
) -> None:
    """
    Creates stratified, leak-free 70/15/15 splits with fixed random seed.
    """
    assert abs(train_ratio + val_ratio + test_ratio - 1.0) < 1e-5, "Ratios must sum to 1.0"
    os.makedirs(output_dir, exist_ok=True)

    print(f"Preparing dataset splits from: {raw_dir}")
    print(f"Target ratios: {train_ratio*100:.0f}% Train / {val_ratio*100:.0f}% Val / {test_ratio*100:.0f}% Test (Seed={seed})")

    records = []
    for cls_name, label_idx in CLASS_MAPPING.items():
        cls_path = os.path.join(raw_dir, cls_name)
        if not os.path.exists(cls_path):
            print(f"Warning: directory {cls_path} not found!")
            continue

        files = sorted(glob.glob(os.path.join(cls_path, "*.*")))
        for f in files:
            # Store relative path for portability
            rel_path = os.path.relpath(f, start=PROJECT_ROOT).replace("\\", "/")
            records.append({
                "filepath": rel_path,
                "class_name": cls_name,
                "label": label_idx,
                "filename": os.path.basename(f),
            })

    df = pd.DataFrame(records)
    total_count = len(df)
    print(f"Loaded {total_count} image records across {len(CLASS_MAPPING)} classes.")

    # Stratified split: Train (70%) vs Temp (30%)
    # Temp is then split 50/50 -> Validation (15%), Test (15%)
    temp_ratio = val_ratio + test_ratio  # 0.30
    df_train, df_temp = train_test_split(
        df,
        test_size=temp_ratio,
        random_state=seed,
        stratify=df["label"],
    )

    # Split Temp into Validation and Test (50% each of the 30% = 15% each)
    val_relative_ratio = val_ratio / temp_ratio  # 0.50
    df_val, df_test = train_test_split(
        df_temp,
        test_size=(1.0 - val_relative_ratio),
        random_state=seed,
        stratify=df_temp["label"],
    )

    # Sort manifests by filepath for determinism
    df_train = df_train.sort_values(by="filepath").reset_index(drop=True)
    df_val = df_val.sort_values(by="filepath").reset_index(drop=True)
    df_test = df_test.sort_values(by="filepath").reset_index(drop=True)

    train_path = os.path.join(output_dir, "train.csv")
    val_path = os.path.join(output_dir, "validation.csv")
    test_path = os.path.join(output_dir, "test.csv")

    df_train.to_csv(train_path, index=False)
    df_val.to_csv(val_path, index=False)
    df_test.to_csv(test_path, index=False)

    print("\n" + "=" * 55)
    print("Dataset Split Results:")
    print("-" * 55)
    print(f"{'Split':<12} {'Count':>8} {'Percentage':>12} {'File Destination'}")
    print("-" * 55)
    print(f"{'Train':<12} {len(df_train):>8,} {len(df_train)/total_count*100:>11.1f}%   {train_path}")
    print(f"{'Validation':<12} {len(df_val):>8,} {len(df_val)/total_count*100:>11.1f}%   {val_path}")
    print(f"{'Test':<12} {len(df_test):>8,} {len(df_test)/total_count*100:>11.1f}%   {test_path}")
    print("-" * 55)
    print(f"{'Total':<12} {total_count:>8,} {'100.0%':>12}")
    print("=" * 55)

    # Per-class distribution breakdown
    print("\nPer-Class Distribution Across Splits:")
    print(f"{'Class':<10} {'Train':>8} {'Val':>8} {'Test':>8} {'Total':>8}")
    print("-" * 45)
    for c_name, c_idx in CLASS_MAPPING.items():
        tr_c = (df_train["label"] == c_idx).sum()
        vl_c = (df_val["label"] == c_idx).sum()
        ts_c = (df_test["label"] == c_idx).sum()
        tot_c = tr_c + vl_c + ts_c
        print(f"{c_name.capitalize():<10} {tr_c:>8,} {vl_c:>8,} {ts_c:>8,} {tot_c:>8,}")
    print("-" * 45 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Generate stratified 70/15/15 dataset splits.")
    parser.add_argument("--raw-dir", type=str, default="dataset/raw", help="Path to raw dataset directory")
    parser.add_argument("--output-dir", type=str, default="dataset/splits", help="Path to save CSV split manifests")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()

    prepare_splits(
        raw_dir=args.raw_dir,
        output_dir=args.output_dir,
        seed=args.seed,
    )


if __name__ == "__main__":
    main()
