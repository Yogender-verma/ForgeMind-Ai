"""
ForgeMind AI — Data Profiling Script
Profiles all downloaded tabular datasets and generates a comprehensive report.
Only reports what can be established from the data and documentation.
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
DATA_DIR = PROJECT_ROOT / "data"
REPORT_PATH = DATA_DIR / "data_profiling_report.md"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  [%(levelname)s]  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("forgemind.profiling")

# ---------------------------------------------------------------------------
# Known semantic mappings from the dataset README
# ---------------------------------------------------------------------------
# These are ONLY derived from the dataset's own Readme.txt:
#   Model 1: 10 features
#   Model 2: 16 features (including metadata)
#   Model 3: 77 features — utilization (resource usage), queue (parts waiting),
#            part counters (counters by SKU type at assembly cells + total after QC)
#
# Column-level meanings are inferred from column names where clear;
# otherwise marked "Unknown / requires validation".

MODEL_DESCRIPTIONS = {
    "Model_1": {
        "source": "Arena Discrete-Event Simulation — Model 1",
        "doc_features": "10 features",
        "domain": "Production/Process Data",
        "doc_notes": "Simplest model. Feature names suggest simulation counters/metrics.",
    },
    "Model_2": {
        "source": "Arena Discrete-Event Simulation — Model 2",
        "doc_features": "16 features including metadata",
        "domain": "Production/Process Data",
        "doc_notes": "Medium complexity. Includes metadata columns alongside process metrics.",
    },
}


def _infer_column_meaning(col_name: str, model_key: str) -> str:
    """
    Infer manufacturing meaning from column name patterns.
    Returns the inferred meaning or 'Unknown / requires validation'.
    """
    col_lower = col_name.lower().strip()

    # Common Arena simulation output patterns
    patterns = {
        "utilization": "Resource utilization — fraction of time the resource is busy [MEASURED from simulation]",
        "util": "Resource utilization metric [MEASURED from simulation]",
        "queue": "Queue length — number of entities waiting at a station [MEASURED from simulation]",
        "number waiting": "Number of entities waiting in queue [MEASURED from simulation]",
        "waiting": "Waiting time or count [MEASURED from simulation]",
        "wait time": "Average wait time in queue [MEASURED from simulation]",
        "wip": "Work-in-Process — entities currently in the system [MEASURED from simulation]",
        "throughput": "Throughput — number of entities completed [MEASURED from simulation]",
        "cycle time": "Total time from entry to exit [MEASURED from simulation]",
        "total time": "Total time in system [MEASURED from simulation]",
        "va time": "Value-added time [MEASURED from simulation]",
        "nva time": "Non-value-added time [MEASURED from simulation]",
        "transfer time": "Time spent transferring between stations [MEASURED from simulation]",
        "number in": "Count of entities entering a station/process [MEASURED from simulation]",
        "number out": "Count of entities leaving a station/process [MEASURED from simulation]",
        "count": "Counter — entity count at a point [MEASURED from simulation]",
        "counter": "Counter — entity count [MEASURED from simulation]",
        "replication": "Simulation replication/run number [METADATA]",
        "entity": "Entity/part identifier [METADATA]",
        "resource": "Resource/station identifier [METADATA]",
        "station": "Station/workstation identifier [METADATA]",
        "time": "Time-related metric [MEASURED from simulation]",
        "cost": "Cost metric [CALCULATED in simulation]",
        "sku": "Stock Keeping Unit / product variant identifier [METADATA]",
        "assembly": "Assembly cell metric [MEASURED from simulation]",
        "quality": "Quality check metric [MEASURED from simulation]",
    }

    for pattern, meaning in patterns.items():
        if pattern in col_lower:
            return meaning

    return "Unknown / requires validation"


# ---------------------------------------------------------------------------
# Profiling functions
# ---------------------------------------------------------------------------

def profile_csv(filepath: Path, model_key: str) -> dict:
    """Profile a CSV file and return a structured report dict."""
    log.info("Profiling: %s", filepath.name)

    df = pd.read_csv(filepath)
    info = MODEL_DESCRIPTIONS.get(model_key, {})

    profile = {
        "filename": filepath.name,
        "model_key": model_key,
        "source": info.get("source", "Unknown"),
        "domain": info.get("domain", "Unknown"),
        "doc_features": info.get("doc_features", "Unknown"),
        "doc_notes": info.get("doc_notes", ""),
        "file_size_bytes": filepath.stat().st_size,
        "row_count": len(df),
        "column_count": len(df.columns),
        "duplicate_row_count": df.duplicated().sum(),
        "columns": [],
    }

    for col in df.columns:
        col_info = {
            "name": col,
            "dtype": str(df[col].dtype),
            "missing_count": int(df[col].isna().sum()),
            "missing_pct": round(df[col].isna().mean() * 100, 2),
            "unique_count": int(df[col].nunique()),
            "inferred_meaning": _infer_column_meaning(col, model_key),
        }

        if pd.api.types.is_numeric_dtype(df[col]):
            desc = df[col].describe()
            col_info["min"] = round(float(desc["min"]), 6) if not pd.isna(desc["min"]) else None
            col_info["max"] = round(float(desc["max"]), 6) if not pd.isna(desc["max"]) else None
            col_info["mean"] = round(float(desc["mean"]), 6) if not pd.isna(desc["mean"]) else None
            col_info["median"] = round(float(df[col].median()), 6) if not df[col].isna().all() else None
            col_info["std"] = round(float(desc["std"]), 6) if not pd.isna(desc.get("std", float("nan"))) else None

            # Suspicious value detection
            suspicious = []
            if col_info["min"] is not None and col_info["min"] < 0:
                if "utilization" in col.lower() or "count" in col.lower() or "number" in col.lower():
                    suspicious.append(f"Negative values found (min={col_info['min']}) — unexpected for this metric type")
            if col_info["max"] is not None and "utilization" in col.lower() and col_info["max"] > 1.0:
                suspicious.append(f"Utilization > 1.0 (max={col_info['max']}) — may indicate percentage vs fraction inconsistency")
            if col_info["missing_pct"] > 50:
                suspicious.append(f"Over 50% missing values ({col_info['missing_pct']}%)")
            col_info["suspicious"] = suspicious
        else:
            # Categorical
            top_values = df[col].value_counts().head(10).to_dict()
            col_info["top_values"] = {str(k): int(v) for k, v in top_values.items()}
            col_info["suspicious"] = []

        profile["columns"].append(col_info)

    return profile


def profile_xls(filepath: Path) -> dict | None:
    """Profile an Excel file if it exists."""
    if not filepath.exists():
        log.info("Skipping %s — not downloaded yet (deferred)", filepath.name)
        return None

    log.info("Profiling: %s", filepath.name)
    try:
        df = pd.read_excel(filepath)
    except Exception as exc:
        log.warning("Could not read %s: %s", filepath.name, exc)
        return None

    profile = {
        "filename": filepath.name,
        "source": "Arena Simulation Parameters",
        "domain": "Batch Metadata / Process Configuration",
        "file_size_bytes": filepath.stat().st_size,
        "row_count": len(df),
        "column_count": len(df.columns),
        "columns": [],
    }

    for col in df.columns:
        col_info = {
            "name": str(col),
            "dtype": str(df[col].dtype),
            "missing_count": int(df[col].isna().sum()),
            "unique_count": int(df[col].nunique()),
            "sample_values": [str(v) for v in df[col].dropna().head(5).tolist()],
        }
        profile["columns"].append(col_info)

    return profile


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def _format_size(size_bytes: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def generate_report(profiles: list[dict], output_path: Path):
    """Generate a Markdown profiling report."""
    lines = []
    lines.append("# ForgeMind AI — Data Profiling Report")
    lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"**Raw data directory:** `{RAW_DATA_DIR}`\n")

    lines.append("---\n")
    lines.append("## Dataset Overview\n")
    lines.append("| File | Domain | Rows | Columns | Duplicates | Size |")
    lines.append("|------|--------|------|---------|------------|------|")
    for p in profiles:
        lines.append(
            f"| {p['filename']} | {p.get('domain', 'N/A')} | "
            f"{p.get('row_count', 'N/A'):,} | {p.get('column_count', 'N/A')} | "
            f"{p.get('duplicate_row_count', 'N/A')} | {_format_size(p.get('file_size_bytes', 0))} |"
        )

    for p in profiles:
        lines.append(f"\n---\n")
        lines.append(f"## {p['filename']}\n")
        lines.append(f"- **Source:** {p.get('source', 'N/A')}")
        lines.append(f"- **Domain mapping:** {p.get('domain', 'N/A')}")
        lines.append(f"- **Documentation says:** {p.get('doc_features', 'N/A')}")
        if p.get("doc_notes"):
            lines.append(f"- **Notes:** {p['doc_notes']}")
        lines.append(f"- **Rows:** {p.get('row_count', 'N/A'):,}")
        lines.append(f"- **Columns:** {p.get('column_count', 'N/A')}")
        lines.append(f"- **Duplicate rows:** {p.get('duplicate_row_count', 'N/A')}")
        lines.append(f"- **File size:** {_format_size(p.get('file_size_bytes', 0))}")
        lines.append("")

        lines.append("### Column Details\n")
        lines.append("| # | Column | Type | Missing | Missing % | Unique | Min | Max | Mean | Median | Inferred Meaning |")
        lines.append("|---|--------|------|---------|-----------|--------|-----|-----|------|--------|------------------|")

        for i, col in enumerate(p.get("columns", []), 1):
            name = col["name"]
            dtype = col["dtype"]
            missing = col.get("missing_count", "—")
            missing_pct = col.get("missing_pct", "—")
            unique = col.get("unique_count", "—")
            cmin = col.get("min", "—")
            cmax = col.get("max", "—")
            cmean = col.get("mean", "—")
            cmedian = col.get("median", "—")
            meaning = col.get("inferred_meaning", "Unknown / requires validation")

            if cmin is None:
                cmin = "—"
            if cmax is None:
                cmax = "—"
            if cmean is None:
                cmean = "—"
            if cmedian is None:
                cmedian = "—"

            lines.append(
                f"| {i} | `{name}` | {dtype} | {missing} | {missing_pct}% | {unique} | "
                f"{cmin} | {cmax} | {cmean} | {cmedian} | {meaning} |"
            )

        # Suspicious values
        suspicious_cols = [c for c in p.get("columns", []) if c.get("suspicious")]
        if suspicious_cols:
            lines.append("\n### ⚠ Suspicious Values\n")
            for col in suspicious_cols:
                for s in col["suspicious"]:
                    lines.append(f"- **`{col['name']}`**: {s}")

        # Top categorical values
        cat_cols = [c for c in p.get("columns", []) if c.get("top_values")]
        if cat_cols:
            lines.append("\n### Categorical Value Distribution\n")
            for col in cat_cols:
                lines.append(f"**`{col['name']}`** ({col['unique_count']} unique values):")
                for val, count in list(col["top_values"].items())[:10]:
                    lines.append(f"  - `{val}`: {count}")
                lines.append("")

    # Final notes
    lines.append("\n---\n")
    lines.append("## Domain Mapping Summary\n")
    lines.append("> **Important:** This dataset is synthetic Arena discrete-event simulation data.")
    lines.append("> It contains production/process metrics — NOT visual inspection or defect image data.")
    lines.append("> Column meanings are inferred from naming patterns; columns that cannot be")
    lines.append("> confidently mapped are marked `Unknown / requires validation`.\n")
    lines.append("| Domain | Files | Status |")
    lines.append("|--------|-------|--------|")
    lines.append("| Production/Process Data | Model_1.csv, Model_2.csv | ✅ Available |")
    lines.append("| Batch Metadata / Config | ParametersFile.xls (Model 3) | ⏳ Deferred |")
    lines.append("| Inspection/Quality Data | Not present in this dataset | ❌ Not available |")
    lines.append("| Economic/Cost Data | Not present in this dataset | ❌ Not available (will use configurable assumptions) |")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text("\n".join(lines), encoding="utf-8")
    log.info("Profiling report written to: %s", output_path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run_profiling():
    """Run profiling on all available datasets."""
    log.info("=" * 60)
    log.info("ForgeMind AI — Data Profiling")
    log.info("=" * 60)

    profiles = []

    # Profile CSV files
    csv_files = [
        (RAW_DATA_DIR / "Model_1" / "Model_1.csv", "Model_1"),
        (RAW_DATA_DIR / "Model_2" / "Model_2.csv", "Model_2"),
    ]

    for csv_path, model_key in csv_files:
        if csv_path.exists():
            p = profile_csv(csv_path, model_key)
            profiles.append(p)
        else:
            log.warning("File not found: %s — run download_dataset.py first", csv_path)

    # Profile XLS if available
    xls_path = RAW_DATA_DIR / "Model_3" / "ParametersFile.xls"
    xls_profile = profile_xls(xls_path)
    if xls_profile:
        profiles.append(xls_profile)

    if not profiles:
        log.error("No data files found to profile. Run download_dataset.py first.")
        return False

    generate_report(profiles, REPORT_PATH)
    log.info("Profiling complete. %d files profiled.", len(profiles))
    return True


if __name__ == "__main__":
    success = run_profiling()
    sys.exit(0 if success else 1)
