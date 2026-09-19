"""
ForgeMind AI — Data Cleaning Script
Applies conservative, fully traceable cleaning to profiled datasets.
Every transformation is logged. Imputed/flagged values get companion columns.
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
DATA_DIR = PROJECT_ROOT / "data"
REPORT_PATH = DATA_DIR / "data_cleaning_report.md"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("forgemind.cleaning")

# ---------------------------------------------------------------------------
# Cleaning log — tracks every transformation
# ---------------------------------------------------------------------------

cleaning_log: list[dict] = []


def _log_transform(file: str, column: str, action: str, detail: str, count: int = 0):
    entry = {
        "file": file,
        "column": column,
        "action": action,
        "detail": detail,
        "affected_rows": count,
        "timestamp": datetime.now().isoformat(),
    }
    cleaning_log.append(entry)
    log.info("  [%s] %s — %s: %s (rows=%d)", file, column, action, detail, count)


# ---------------------------------------------------------------------------
# Cleaning functions
# ---------------------------------------------------------------------------

def remove_exact_duplicates(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    """Remove exact duplicate rows and log the transformation."""
    dup_count = df.duplicated().sum()
    if dup_count > 0:
        df = df.drop_duplicates().reset_index(drop=True)
        _log_transform(filename, "*all*", "REMOVE_DUPLICATES",
                       f"Removed {dup_count} exact duplicate rows", dup_count)
    else:
        _log_transform(filename, "*all*", "REMOVE_DUPLICATES",
                       "No exact duplicates found", 0)
    return df


def standardize_column_names(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    """Standardize column names: strip whitespace, consistent casing."""
    old_cols = list(df.columns)
    new_cols = [col.strip() for col in df.columns]
    
    renamed = {o: n for o, n in zip(old_cols, new_cols) if o != n}
    if renamed:
        df.columns = new_cols
        _log_transform(filename, "*columns*", "RENAME_COLUMNS",
                       f"Stripped whitespace from column names: {renamed}", len(renamed))
    return df


def fix_numeric_types(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    """Convert columns that should be numeric but are stored as strings."""
    for col in df.columns:
        if df[col].dtype == object:
            # Try to convert to numeric
            converted = pd.to_numeric(df[col], errors="coerce")
            non_null_original = df[col].notna().sum()
            non_null_converted = converted.notna().sum()
            
            # Only convert if most values successfully convert
            if non_null_original > 0 and non_null_converted / non_null_original > 0.9:
                lost = non_null_original - non_null_converted
                df[col] = converted
                _log_transform(filename, col, "TYPE_CONVERSION",
                               f"Converted from object to {converted.dtype} ({lost} values became NaN)", lost)
    return df


def detect_outliers_iqr(df: pd.DataFrame, filename: str, factor: float = 1.5) -> pd.DataFrame:
    """
    Detect outliers using IQR method. Adds _outlier flag columns.
    Does NOT remove outliers — only flags them.
    """
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    for col in numeric_cols:
        if df[col].isna().all():
            continue
            
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        
        if iqr == 0:
            # No spread — skip outlier detection
            continue
        
        lower = q1 - factor * iqr
        upper = q3 + factor * iqr
        
        outlier_mask = (df[col] < lower) | (df[col] > upper)
        outlier_count = outlier_mask.sum()
        
        if outlier_count > 0:
            flag_col = f"{col}_outlier"
            df[flag_col] = outlier_mask
            _log_transform(filename, col, "FLAG_OUTLIERS",
                           f"Flagged {outlier_count} outliers (IQR×{factor}: [{lower:.4f}, {upper:.4f}])",
                           outlier_count)
    
    return df


def impute_missing_values(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    """
    Conservative imputation:
    - Numeric columns: median imputation (robust to outliers)
    - Categorical columns: NO imputation (leave as-is for this dataset)
    - Adds _imputed flag columns for traceability
    """
    for col in df.columns:
        if col.endswith("_outlier") or col.endswith("_imputed"):
            continue  # Skip companion columns
            
        missing_count = df[col].isna().sum()
        if missing_count == 0:
            continue
        
        if pd.api.types.is_numeric_dtype(df[col]):
            median_val = df[col].median()
            if pd.notna(median_val):
                flag_col = f"{col}_imputed"
                df[flag_col] = df[col].isna()
                df[col] = df[col].fillna(median_val)
                _log_transform(filename, col, "IMPUTE_MEDIAN",
                               f"Imputed {missing_count} missing values with median={median_val:.6f}",
                               missing_count)
            else:
                _log_transform(filename, col, "SKIP_IMPUTATION",
                               f"All values missing — cannot impute", missing_count)
        else:
            _log_transform(filename, col, "SKIP_IMPUTATION",
                           f"{missing_count} missing categorical values — left as-is (conservative policy)",
                           missing_count)
    
    return df


def standardize_categoricals(df: pd.DataFrame, filename: str) -> pd.DataFrame:
    """
    Standardize categorical values only when there's clear evidence 
    of inconsistent casing/spacing for the same entity.
    """
    object_cols = df.select_dtypes(include=["object"]).columns.tolist()
    
    for col in object_cols:
        if col.endswith("_outlier") or col.endswith("_imputed"):
            continue
            
        unique_vals = df[col].dropna().unique()
        
        # Check for whitespace-only differences
        stripped = {v: v.strip() for v in unique_vals if isinstance(v, str) and v != v.strip()}
        if stripped:
            df[col] = df[col].str.strip()
            _log_transform(filename, col, "STRIP_WHITESPACE",
                           f"Stripped leading/trailing whitespace from {len(stripped)} value variants",
                           df[col].isin(list(stripped.values())).sum())
        
        # Check for case-only differences
        unique_after = df[col].dropna().unique()
        lower_map = {}
        for v in unique_after:
            if isinstance(v, str):
                key = v.lower()
                if key not in lower_map:
                    lower_map[key] = v
                elif lower_map[key] != v:
                    # Found case inconsistency — standardize to first-seen form
                    old_val = v
                    new_val = lower_map[key]
                    count = (df[col] == old_val).sum()
                    df.loc[df[col] == old_val, col] = new_val
                    _log_transform(filename, col, "STANDARDIZE_CASE",
                                   f"Merged '{old_val}' → '{new_val}' (case normalization)",
                                   count)
    
    return df


# ---------------------------------------------------------------------------
# Main cleaning pipeline
# ---------------------------------------------------------------------------

def clean_csv(filepath: Path, filename: str) -> tuple[pd.DataFrame, dict]:
    """
    Apply the full cleaning pipeline to a CSV file.
    Returns (cleaned_df, before_after_stats).
    """
    log.info("Cleaning: %s", filepath.name)
    
    df_raw = pd.read_csv(filepath)
    before = {
        "row_count": len(df_raw),
        "column_count": len(df_raw.columns),
        "missing_total": int(df_raw.isna().sum().sum()),
        "missing_per_column": {col: int(df_raw[col].isna().sum()) for col in df_raw.columns},
        "duplicate_count": int(df_raw.duplicated().sum()),
    }
    
    df = df_raw.copy()
    
    # Step 1: Standardize column names
    df = standardize_column_names(df, filename)
    
    # Step 2: Fix numeric types
    df = fix_numeric_types(df, filename)
    
    # Step 3: Remove exact duplicates
    df = remove_exact_duplicates(df, filename)
    
    # Step 4: Standardize categorical values
    df = standardize_categoricals(df, filename)
    
    # Step 5: Detect and flag outliers (do NOT remove)
    df = detect_outliers_iqr(df, filename)
    
    # Step 6: Impute missing values (with traceability flags)
    df = impute_missing_values(df, filename)
    
    # Compute 'after' stats (excluding companion columns)
    data_cols = [c for c in df.columns if not c.endswith("_outlier") and not c.endswith("_imputed")]
    after = {
        "row_count": len(df),
        "column_count": len(df.columns),
        "data_column_count": len(data_cols),
        "companion_columns": len(df.columns) - len(data_cols),
        "missing_total": int(df[data_cols].isna().sum().sum()),
        "missing_per_column": {col: int(df[col].isna().sum()) for col in data_cols},
    }
    
    return df, {"before": before, "after": after}


def generate_cleaning_report(file_stats: dict, output_path: Path):
    """Generate the cleaning report markdown file."""
    lines = []
    lines.append("# ForgeMind AI — Data Cleaning Report")
    lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Output directory:** `{PROCESSED_DIR}`\n")
    
    lines.append("---\n")
    lines.append("## Summary\n")
    lines.append("| File | Rows Before | Rows After | Removed | Missing Before | Missing After | Outliers Flagged | Imputed | Companion Cols Added |")
    lines.append("|------|-------------|------------|---------|----------------|---------------|------------------|---------|---------------------|")
    
    for fname, stats in file_stats.items():
        b = stats["before"]
        a = stats["after"]
        removed = b["row_count"] - a["row_count"]
        
        # Count transformations for this file
        outlier_count = sum(1 for e in cleaning_log if e["file"] == fname and e["action"] == "FLAG_OUTLIERS")
        impute_count = sum(e["affected_rows"] for e in cleaning_log if e["file"] == fname and e["action"] == "IMPUTE_MEDIAN")
        
        lines.append(
            f"| {fname} | {b['row_count']:,} | {a['row_count']:,} | {removed} | "
            f"{b['missing_total']} | {a['missing_total']} | "
            f"{outlier_count} cols | {impute_count} values | {a['companion_columns']} |"
        )
    
    # Detailed transformation log
    lines.append("\n---\n")
    lines.append("## Detailed Transformation Log\n")
    
    current_file = None
    for entry in cleaning_log:
        if entry["file"] != current_file:
            current_file = entry["file"]
            lines.append(f"\n### {current_file}\n")
            lines.append("| Column | Action | Detail | Affected Rows |")
            lines.append("|--------|--------|--------|---------------|")
        
        lines.append(
            f"| `{entry['column']}` | {entry['action']} | {entry['detail']} | {entry['affected_rows']} |"
        )
    
    # Before/After per column
    lines.append("\n---\n")
    lines.append("## Before / After Missing Values Per Column\n")
    
    for fname, stats in file_stats.items():
        lines.append(f"\n### {fname}\n")
        lines.append("| Column | Missing Before | Missing After | Change |")
        lines.append("|--------|----------------|---------------|--------|")
        
        for col in stats["before"]["missing_per_column"]:
            bm = stats["before"]["missing_per_column"][col]
            am = stats["after"]["missing_per_column"].get(col, 0)
            change = am - bm
            change_str = f"{change:+d}" if change != 0 else "—"
            lines.append(f"| `{col}` | {bm} | {am} | {change_str} |")
    
    # Assumptions and warnings
    lines.append("\n---\n")
    lines.append("## Assumptions & Warnings\n")
    lines.append("1. **Outlier detection** uses IQR × 1.5 method. Outliers are **flagged, not removed**.")
    lines.append("2. **Numeric imputation** uses **median** (robust to outliers). Every imputed value has a `_imputed` companion column set to `True`.")
    lines.append("3. **Categorical values** are NOT imputed — left as-is (conservative policy).")
    lines.append("4. **Exact duplicate** rows are removed. Near-duplicates are not auto-removed.")
    lines.append("5. **Raw data** in `data/raw/` is never modified.")
    lines.append("6. All cleaning decisions are traceable via the companion flag columns and this report.")
    lines.append("\n> **ForgeMind AI Honesty Principle:** Every imputed or estimated value remains")
    lines.append("> distinguishable from measured values via the `_imputed` flag columns.")
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Cleaning report written to: %s", output_path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_cleaning():
    """Run the full cleaning pipeline."""
    log.info("=" * 60)
    log.info("ForgeMind AI — Data Cleaning")
    log.info("=" * 60)
    
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    csv_files = [
        (RAW_DATA_DIR / "Model_1" / "Model_1.csv", "Model_1"),
        (RAW_DATA_DIR / "Model_2" / "Model_2.csv", "Model_2"),
    ]
    
    file_stats = {}
    
    for csv_path, model_key in csv_files:
        if not csv_path.exists():
            log.warning("File not found: %s — skipping", csv_path)
            continue
        
        df_clean, stats = clean_csv(csv_path, model_key)
        
        # Save cleaned data
        output_path = PROCESSED_DIR / f"{model_key}_cleaned.csv"
        df_clean.to_csv(output_path, index=False)
        log.info("Saved cleaned data: %s (%d rows, %d columns)",
                 output_path.name, len(df_clean), len(df_clean.columns))
        
        file_stats[model_key] = stats
    
    if not file_stats:
        log.error("No files cleaned. Run download_dataset.py first.")
        return False
    
    generate_cleaning_report(file_stats, REPORT_PATH)
    log.info("Cleaning complete. %d files cleaned.", len(file_stats))
    return True


if __name__ == "__main__":
    success = run_cleaning()
    sys.exit(0 if success else 1)
