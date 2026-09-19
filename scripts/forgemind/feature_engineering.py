"""
ForgeMind AI — Feature Engineering
Derives process-health metrics from raw simulation data.
Only computes metrics that the available columns can support.
"""

import logging
from typing import Optional

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.features")


def compute_process_health(df: pd.DataFrame, model_key: str) -> pd.DataFrame:
    """
    Compute normalized process-health metrics from available columns.
    Returns a new DataFrame with the computed features appended.
    
    All derived values are tagged as [CALCULATED].
    """
    result = df.copy()
    
    if model_key == "Model_1":
        result = _engineer_model1(result)
    elif model_key == "Model_2":
        result = _engineer_model2(result)
    
    return result


def _engineer_model1(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering for Model 1 (10-feature simple manufacturing line)."""
    
    # --- Capacity pressure: how close each station is to 100% utilization ---
    util_cols = ["Drilling Util", "Milling Util", "Assembly Util"]
    for col in util_cols:
        if col in df.columns:
            station = col.replace(" Util", "").lower()
            # Capacity pressure: 0 = idle, 1 = at capacity
            df[f"{station}_capacity_pressure"] = df[col].clip(0, 1)
    
    # --- Total queue pressure: sum of all waiting times ---
    wait_cols = ["Drilling Waiting Time", "Milling Waiting Time", "Assembly Waiting Time"]
    existing_wait = [c for c in wait_cols if c in df.columns]
    if existing_wait:
        df["total_queue_pressure"] = df[existing_wait].sum(axis=1)
    
    # --- Bottleneck indicator: which station has highest utilization per row ---
    existing_util = [c for c in util_cols if c in df.columns]
    if existing_util:
        df["max_utilization"] = df[existing_util].max(axis=1)
        df["bottleneck_station"] = df[existing_util].idxmax(axis=1).map(
            lambda x: x.replace(" Util", "") if isinstance(x, str) else x
        )
    
    # --- Throughput efficiency: parts per hour relative to demand ---
    if "Parts per hour" in df.columns and "Demand" in df.columns:
        # Higher demand should produce more parts; efficiency = actual/expected ratio
        df["demand_fulfillment"] = np.where(
            df["Demand"] > 0,
            df["Parts per hour"] / df["Demand"],
            np.nan
        )
    
    # --- System utilization imbalance (std dev across stations) ---
    if len(existing_util) > 1:
        df["utilization_imbalance"] = df[existing_util].std(axis=1)
    
    # --- VA Time deviation from nominal ---
    if "VA Time" in df.columns:
        nominal_va = df["VA Time"].median()
        df["va_time_deviation"] = (df["VA Time"] - nominal_va).abs()
    
    return df


def _engineer_model2(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering for Model 2 (16-feature two-part manufacturing line)."""
    
    # --- Utilization metrics ---
    util_cols = ["Drilling Utilization", "Milling Utilization", "Assembly Utilization"]
    for col in util_cols:
        if col in df.columns:
            station = col.replace(" Utilization", "").lower()
            df[f"{station}_capacity_pressure"] = df[col].clip(0, 1)
    
    existing_util = [c for c in util_cols if c in df.columns]
    if existing_util:
        df["max_utilization"] = df[existing_util].max(axis=1)
        df["bottleneck_station"] = df[existing_util].idxmax(axis=1).map(
            lambda x: x.replace(" Utilization", "") if isinstance(x, str) else x
        )
        if len(existing_util) > 1:
            df["utilization_imbalance"] = df[existing_util].std(axis=1)
    
    # --- Queue pressure ---
    queue_cols = ["Drilling Queue Time", "Milling Queue Time", "Assembly Queue Time"]
    existing_queue = [c for c in queue_cols if c in df.columns]
    if existing_queue:
        df["total_queue_pressure"] = df[existing_queue].sum(axis=1)
    
    # --- Storage/WIP pressure ---
    storage_cols = ["Part 1 Storage Time", "Part 2 Storage Time"]
    existing_storage = [c for c in storage_cols if c in df.columns]
    if existing_storage:
        df["total_storage_time"] = df[existing_storage].sum(axis=1)
    
    stored_cols = ["Part 1 Stored", "Part 2 Stored"]
    existing_stored = [c for c in stored_cols if c in df.columns]
    if existing_stored:
        df["total_wip"] = df[existing_stored].sum(axis=1)
    
    # --- Throughput efficiency ---
    if "Entities Out" in df.columns and "Entities In Part 1" in df.columns:
        df["yield_ratio"] = np.where(
            df["Entities In Part 1"] > 0,
            df["Entities Out"] / df["Entities In Part 1"],
            np.nan
        )
    
    # --- Production loss (entities in - entities out) ---
    if "Entities In Part 1" in df.columns and "Entities Out" in df.columns:
        df["production_loss"] = df["Entities In Part 1"] - df["Entities Out"]
    
    return df


def get_station_metrics(df: pd.DataFrame, model_key: str) -> list[dict]:
    """
    Extract per-station process metrics for the bottleneck engine.
    Returns a list of dicts, one per station.
    """
    stations = []
    
    if model_key == "Model_1":
        station_defs = [
            {"name": "Drilling", "util_col": "Drilling Util", "wait_col": "Drilling Waiting Time"},
            {"name": "Milling", "util_col": "Milling Util", "wait_col": "Milling Waiting Time"},
            {"name": "Assembly", "util_col": "Assembly Util", "wait_col": "Assembly Waiting Time"},
        ]
    elif model_key == "Model_2":
        station_defs = [
            {"name": "Drilling", "util_col": "Drilling Utilization", "wait_col": "Drilling Queue Time"},
            {"name": "Milling", "util_col": "Milling Utilization", "wait_col": "Milling Queue Time"},
            {"name": "Assembly", "util_col": "Assembly Utilization", "wait_col": "Assembly Queue Time"},
        ]
    else:
        return []
    
    for sdef in station_defs:
        if sdef["util_col"] not in df.columns:
            continue
        
        util_series = df[sdef["util_col"]].dropna()
        wait_series = df[sdef["wait_col"]].dropna() if sdef["wait_col"] in df.columns else pd.Series(dtype=float)
        
        station = {
            "name": sdef["name"],
            "utilization_mean": round(float(util_series.mean()), 4),
            "utilization_median": round(float(util_series.median()), 4),
            "utilization_std": round(float(util_series.std()), 4),
            "utilization_max": round(float(util_series.max()), 4),
            "utilization_p95": round(float(util_series.quantile(0.95)), 4),
            "queue_time_mean": round(float(wait_series.mean()), 4) if len(wait_series) > 0 else 0.0,
            "queue_time_median": round(float(wait_series.median()), 4) if len(wait_series) > 0 else 0.0,
            "queue_time_max": round(float(wait_series.max()), 4) if len(wait_series) > 0 else 0.0,
            "queue_time_p95": round(float(wait_series.quantile(0.95)), 4) if len(wait_series) > 0 else 0.0,
        }
        stations.append(station)
    
    return stations
