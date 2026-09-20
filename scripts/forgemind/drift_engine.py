"""
ForgeMind AI — Batch-to-Batch Drift Detection Engine
Segments Arena production datasets into sequential windows (simulated batches)
and computes statistical drift metrics: KS-test, PSI, and CUSUM.

All outputs are advisory and labeled [SIMULATED] / [HYPOTHESIS_ONLY].
No hardware or machine control is performed.
"""

import logging
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
from scipy.stats import ks_2samp

log = logging.getLogger("forgemind.drift")

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

# Column sets to analyze per model
MODEL_DRIFT_COLUMNS = {
    "Model_1": [
        "Parts per hour",
        "VA Time",
        "Drilling Waiting Time",
        "Milling Waiting Time",
        "Assembly Waiting Time",
        "Drilling Util",
        "Milling Util",
        "Assembly Util",
    ],
    "Model_2": [
        "Entities Out",
        "Assembly Time",
        "Drilling Queue Time",
        "Milling Queue Time",
        "Assembly Queue Time",
        "Drilling Utilization",
        "Milling Utilization",
        "Assembly Utilization",
    ],
}

# Primary metric for CUSUM
PRIMARY_METRIC = {
    "Model_1": "Parts per hour",
    "Model_2": "Entities Out",
}


def _compute_psi(baseline: np.ndarray, comparison: np.ndarray, n_bins: int = 10) -> float:
    """
    Population Stability Index (PSI) between two distributions.
    Uses quantile-based binning from the baseline distribution.
    """
    eps = 1e-4
    # Define bin edges from baseline quantiles
    quantiles = np.linspace(0, 100, n_bins + 1)
    bin_edges = np.percentile(baseline, quantiles)
    # Ensure unique bin edges (handle constant columns)
    bin_edges = np.unique(bin_edges)
    if len(bin_edges) < 2:
        return 0.0

    baseline_counts = np.histogram(baseline, bins=bin_edges)[0].astype(float)
    comparison_counts = np.histogram(comparison, bins=bin_edges)[0].astype(float)

    # Normalize to proportions
    baseline_pct = baseline_counts / max(baseline_counts.sum(), 1) + eps
    comparison_pct = comparison_counts / max(comparison_counts.sum(), 1) + eps

    psi = float(np.sum((comparison_pct - baseline_pct) * np.log(comparison_pct / baseline_pct)))
    return round(max(psi, 0.0), 6)


def _compute_cusum(
    window_means: list[float],
    k_factor: float = 0.5,
    h_factor: float = 4.0,
) -> dict:
    """
    Two-sided CUSUM on per-window means of the primary metric.
    k = k_factor * sigma, h = h_factor * sigma.
    Returns the CUSUM traces and the first flagged window (if any).
    """
    if len(window_means) < 2:
        return {
            "cusum_pos": [],
            "cusum_neg": [],
            "flagged_window": None,
            "threshold_h": 0,
        }

    arr = np.array(window_means, dtype=float)
    mu = arr[0]  # baseline mean
    sigma = float(np.std(arr[1:], ddof=1)) if len(arr) > 2 else float(np.std(arr, ddof=0)) + 1e-6
    if sigma < 1e-8:
        sigma = 1e-6

    k = k_factor * sigma
    h = h_factor * sigma

    cusum_pos = [0.0]
    cusum_neg = [0.0]
    flagged_window = None

    for i in range(1, len(arr)):
        cp = max(0, cusum_pos[-1] + (arr[i] - mu) - k)
        cn = max(0, cusum_neg[-1] - (arr[i] - mu) - k)
        cusum_pos.append(round(cp, 4))
        cusum_neg.append(round(cn, 4))
        if flagged_window is None and (cp > h or cn > h):
            flagged_window = i

    return {
        "cusum_pos": cusum_pos,
        "cusum_neg": cusum_neg,
        "flagged_window": flagged_window,
        "threshold_h": round(h, 4),
        "baseline_mean": round(mu, 4),
        "sigma": round(sigma, 4),
    }


def detect_batch_drift(
    model_key: str = "Model_1",
    n_windows: int = 10,
    df: Optional[pd.DataFrame] = None,
) -> dict:
    """
    Segment the dataset into N sequential windows (simulated batches),
    use window 0 as baseline, and compute per-window drift metrics.

    Parameters
    ----------
    model_key : str
        'Model_1' or 'Model_2'.
    n_windows : int
        Number of sequential batch windows (default 10).
    df : pd.DataFrame, optional
        Pre-loaded dataframe. If None, loads from raw CSV.

    Returns
    -------
    dict with per-window results, flagged batches, top drifting columns,
    CUSUM results, and metadata labels.
    """
    # Normalize model key
    if model_key in ("1", "Model_1"):
        model_key = "Model_1"
    elif model_key in ("2", "Model_2"):
        model_key = "Model_2"
    else:
        model_key = "Model_1"

    # Load data
    if df is None:
        csv_path = RAW_DATA_DIR / model_key / f"{model_key}.csv"
        if not csv_path.exists():
            return {
                "error": f"Dataset not found: {csv_path}",
                "linkage": "SIMULATED",
                "causal_status": "HYPOTHESIS_ONLY",
            }
        df = pd.read_csv(csv_path)

    # Select columns to analyze
    candidate_cols = MODEL_DRIFT_COLUMNS.get(model_key, [])
    columns = [c for c in candidate_cols if c in df.columns]
    if not columns:
        return {
            "error": f"No analyzable columns found for {model_key}",
            "linkage": "SIMULATED",
            "causal_status": "HYPOTHESIS_ONLY",
        }

    # Split into sequential windows
    n_rows = len(df)
    window_size = n_rows // n_windows
    if window_size < 5:
        n_windows = max(2, n_rows // 5)
        window_size = n_rows // n_windows

    windows_data = []
    for i in range(n_windows):
        start = i * window_size
        end = start + window_size if i < n_windows - 1 else n_rows
        windows_data.append(df.iloc[start:end])

    baseline = windows_data[0]

    # Per-window, per-column analysis
    window_results = []
    col_drift_counts: dict[str, int] = {c: 0 for c in columns}

    for w_idx, w_df in enumerate(windows_data):
        w_result: dict = {
            "window": w_idx,
            "rows": len(w_df),
            "is_baseline": w_idx == 0,
            "columns": {},
            "overall_status": "BASELINE" if w_idx == 0 else "STABLE",
        }

        if w_idx == 0:
            for col in columns:
                w_result["columns"][col] = {
                    "status": "BASELINE",
                    "ks_stat": None,
                    "ks_pvalue": None,
                    "psi": None,
                }
            window_results.append(w_result)
            continue

        has_drift = False
        has_watch = False

        for col in columns:
            baseline_vals = baseline[col].dropna().values.astype(float)
            window_vals = w_df[col].dropna().values.astype(float)

            if len(baseline_vals) < 5 or len(window_vals) < 5:
                w_result["columns"][col] = {
                    "status": "INSUFFICIENT_DATA",
                    "ks_stat": None,
                    "ks_pvalue": None,
                    "psi": None,
                }
                continue

            ks_stat, ks_pvalue = ks_2samp(baseline_vals, window_vals)
            psi = _compute_psi(baseline_vals, window_vals)

            if ks_pvalue < 0.01 and psi > 0.2:
                status = "DRIFT"
                has_drift = True
                col_drift_counts[col] += 1
            elif 0.1 <= psi <= 0.2:
                status = "WATCH"
                has_watch = True
            else:
                status = "STABLE"

            w_result["columns"][col] = {
                "status": status,
                "ks_stat": round(float(ks_stat), 6),
                "ks_pvalue": round(float(ks_pvalue), 6),
                "psi": round(float(psi), 6),
            }

        if has_drift:
            w_result["overall_status"] = "DRIFT"
        elif has_watch:
            w_result["overall_status"] = "WATCH"
        else:
            w_result["overall_status"] = "STABLE"

        window_results.append(w_result)

    # Flagged batches
    flagged_batches = [
        {"window": w["window"], "status": w["overall_status"]}
        for w in window_results
        if w["overall_status"] in ("DRIFT", "WATCH")
    ]

    # Top drifting columns
    top_drifting = sorted(
        [{"column": col, "drift_count": cnt} for col, cnt in col_drift_counts.items() if cnt > 0],
        key=lambda x: x["drift_count"],
        reverse=True,
    )

    # CUSUM on primary metric
    primary = PRIMARY_METRIC.get(model_key, columns[0])
    if primary in df.columns:
        primary_means = [
            float(windows_data[i][primary].mean()) for i in range(n_windows)
        ]
        cusum = _compute_cusum(primary_means)
        cusum["metric"] = primary
    else:
        cusum = {"metric": primary, "error": "Column not found"}

    # Build advisory
    advisory_parts = []
    for fb in flagged_batches:
        w_idx = fb["window"]
        w_data = window_results[w_idx]
        drift_cols = [
            col for col, info in w_data["columns"].items()
            if info.get("status") == "DRIFT"
        ]
        if drift_cols:
            col_name = drift_cols[0]
            info = w_data["columns"][col_name]
            advisory_parts.append(
                f"Batch {w_idx} shows drift in {col_name} "
                f"(KS p={info['ks_pvalue']:.4f}, PSI {info['psi']:.2f}) "
                f"- review process settings [HYPOTHESIS]"
            )

    return {
        "model": model_key,
        "n_windows": n_windows,
        "window_size": window_size,
        "total_rows": n_rows,
        "columns_analyzed": columns,
        "windows": window_results,
        "flagged_batches": flagged_batches,
        "top_drifting_columns": top_drifting,
        "cusum": cusum,
        "advisory": advisory_parts if advisory_parts else ["No significant drift detected across batch windows."],
        "linkage": "SIMULATED",
        "causal_status": "HYPOTHESIS_ONLY",
        "disclosure": (
            "Drift metrics are computed on sequential windows of the Arena simulation dataset. "
            "These are simulated batch boundaries, not actual factory batch records. "
            "Statistical flags indicate distributional shift, not confirmed process failure."
        ),
    }
