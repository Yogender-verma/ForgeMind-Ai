"""
ForgeMind AI — Scikit-Learn Machine Learning Engine
Provides non-linear feature importance ranking, process bottleneck impact modeling,
and multi-variate anomaly detection using Scikit-Learn.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.inspection import permutation_importance
from sklearn.preprocessing import StandardScaler

log = logging.getLogger("forgemind.ml_engine")


def get_feature_and_target_columns(df: pd.DataFrame, model_key: str, target: str = "throughput"):
    """Extract numeric feature matrix and target series, excluding companion columns."""
    clean_cols = [
        c for c in df.select_dtypes(include=[np.number]).columns
        if not c.endswith("_outlier") and not c.endswith("_imputed")
    ]

    target_col = None
    if target == "throughput":
        if model_key == "Model_1":
            target_col = "Parts per hour" if "Parts per hour" in clean_cols else "Total parts"
        elif model_key == "Model_2":
            target_col = "Entities Out" if "Entities Out" in clean_cols else clean_cols[-1]
    elif target == "queue":
        if "total_queue_pressure" in df.columns:
            target_col = "total_queue_pressure"
        else:
            queue_cols = [c for c in clean_cols if any(k in c.lower() for k in ["queue", "wait"])]
            target_col = queue_cols[0] if queue_cols else clean_cols[-1]

    if not target_col or target_col not in df.columns:
        target_col = clean_cols[-1]

    feature_cols = [c for c in clean_cols if c != target_col]
    return feature_cols, target_col


def compute_ml_feature_importance(
    df: pd.DataFrame,
    model_key: str,
    target: str = "throughput",
    n_estimators: int = 50,
    random_state: int = 42,
) -> dict:
    """
    Train a Scikit-Learn RandomForestRegressor to discover non-linear feature importances
    influencing line throughput or queue delay.
    """
    feature_cols, target_col = get_feature_and_target_columns(df, model_key, target)
    if not feature_cols:
        return {"error": "No valid numeric features found for ML modeling."}

    X = df[feature_cols].fillna(df[feature_cols].median())
    y = df[target_col].fillna(df[target_col].median())

    # Fit Random Forest Regressor
    rf = RandomForestRegressor(
        n_estimators=n_estimators,
        max_depth=6,
        random_state=random_state,
        n_jobs=-1,
    )
    rf.fit(X, y)

    r2_score = float(rf.score(X, y))
    importances = rf.feature_importances_

    ranked_features = []
    for col, imp in sorted(zip(feature_cols, importances), key=lambda x: x[1], reverse=True):
        ranked_features.append({
            "feature": col,
            "importance": round(float(imp), 4),
            "importance_pct": round(float(imp * 100), 2),
            "evidence_tag": "[CALCULATED]",
        })

    return {
        "model": model_key,
        "algorithm": "Scikit-Learn RandomForestRegressor",
        "target_variable": target_col,
        "target_type": target,
        "r2_score": round(r2_score, 4),
        "total_features": len(feature_cols),
        "ranked_features": ranked_features,
        "evidence_tag": "[CALCULATED]",
        "summary": (
            f"Trained Random Forest (R²={r2_score:.3f}) identifying '{ranked_features[0]['feature']}' "
            f"as top non-linear driver ({ranked_features[0]['importance_pct']}% relative importance)."
        ),
    }


def detect_process_anomalies(
    df: pd.DataFrame,
    model_key: str,
    contamination: float = 0.05,
    random_state: int = 42,
) -> dict:
    """
    Detect multi-variate process anomalies using Scikit-Learn IsolationForest.
    """
    numeric_cols = [
        c for c in df.select_dtypes(include=[np.number]).columns
        if not c.endswith("_outlier") and not c.endswith("_imputed")
    ]

    X = df[numeric_cols].fillna(df[numeric_cols].median())
    iso = IsolationForest(contamination=contamination, random_state=random_state, n_jobs=-1)
    preds = iso.fit_predict(X)
    scores = iso.decision_function(X)

    anomaly_indices = np.where(preds == -1)[0].tolist()

    return {
        "model": model_key,
        "algorithm": "Scikit-Learn IsolationForest",
        "total_samples": len(df),
        "anomalies_detected": len(anomaly_indices),
        "anomaly_rate_pct": round(len(anomaly_indices) / len(df) * 100, 2),
        "sample_anomaly_indices": anomaly_indices[:10],
        "mean_anomaly_score": round(float(scores.mean()), 4),
        "evidence_tag": "[CALCULATED]",
    }
