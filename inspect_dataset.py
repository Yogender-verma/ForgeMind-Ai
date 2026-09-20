#!/usr/bin/env python
"""
ForgeMind AI — Dataset Inspection CLI
Usage: python inspect_dataset.py [--raw-dir dataset/raw]
"""

import sys
import os
import argparse

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from scripts.ml.dataset_inspector import audit_dataset, generate_dataset_report_markdown


def main():
    parser = argparse.ArgumentParser(description="Audit organizer manufacturing dataset for visual defect classification.")
    parser.add_argument("--raw-dir", type=str, default="dataset/raw", help="Path to raw dataset folder")
    parser.add_argument("--output-report", type=str, default="DATASET_REPORT.md", help="Path to output markdown report")
    args = parser.parse_args()

    stats = audit_dataset(raw_dir=args.raw_dir)
    report_md = generate_dataset_report_markdown(stats)

    # Save to root DATASET_REPORT.md
    with open(args.output_report, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"Report written to: {args.output_report}")

    # Also save to dataset/reports/DATASET_REPORT.md
    alt_report_path = os.path.join("dataset", "reports", "DATASET_REPORT.md")
    os.makedirs(os.path.dirname(alt_report_path), exist_ok=True)
    with open(alt_report_path, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"Report copy written to: {alt_report_path}")

    # Print summary table to console
    print("\n" + "=" * 40)
    print("Class Distribution Summary:")
    print("-" * 40)
    print(f"{'Class':<12} {'Count':>10}")
    print("-" * 40)
    for c_name in ["crack", "normal", "hole", "scratch", "rust"]:
        c_count = stats["classes"].get(c_name, {}).get("count", 0)
        print(f"{c_name.capitalize():<12} {c_count:>10,}")
    print("-" * 40)
    print(f"{'Total':<12} {stats['total_images']:>10,}")
    print("=" * 40 + "\n")


if __name__ == "__main__":
    main()
