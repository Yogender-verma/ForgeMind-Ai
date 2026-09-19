"""
ForgeMind AI — Bottleneck Engine
Transparent, explainable bottleneck scoring based on multiple evidence factors.
Does NOT simply label the highest-utilization station as the bottleneck.
"""

import logging
from dataclasses import dataclass, field

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.bottleneck")


@dataclass
class BottleneckResult:
    """Result of bottleneck analysis for a single station."""
    station: str
    score: float  # 0.0 - 1.0 composite score
    rank: int
    factors: list[dict] = field(default_factory=list)
    confidence: float = 0.0
    evidence_tag: str = "[CALCULATED]"  # ForgeMind honesty label

    def to_dict(self) -> dict:
        return {
            "station": self.station,
            "score": round(self.score, 4),
            "rank": self.rank,
            "factors": self.factors,
            "confidence": round(self.confidence, 4),
            "evidence_tag": self.evidence_tag,
        }


# ---------------------------------------------------------------------------
# Scoring weights (configurable)
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS = {
    "utilization": 0.30,       # High utilization → bottleneck signal
    "queue_time": 0.25,        # Queue accumulation upstream
    "utilization_p95": 0.15,   # Peak utilization matters
    "queue_p95": 0.15,         # Peak queue matters
    "variability": 0.15,       # High variability in utilization → instability
}


def compute_bottleneck_scores(
    station_metrics: list[dict],
    weights: dict | None = None,
) -> list[BottleneckResult]:
    """
    Compute a composite bottleneck score for each station.
    
    The score combines multiple evidence factors:
    1. Mean utilization (higher = more constrained)
    2. Queue time accumulation (higher = more starved downstream)
    3. Peak utilization (95th percentile)
    4. Peak queue time (95th percentile)
    5. Utilization variability (std dev — high variability = instability)
    
    Returns a list of BottleneckResult sorted by score (descending).
    """
    if not station_metrics:
        return []
    
    w = weights or DEFAULT_WEIGHTS
    
    # Normalize each factor to [0, 1] across stations
    metrics_df = pd.DataFrame(station_metrics)
    
    # Extract raw values
    factors = {
        "utilization": metrics_df["utilization_mean"].values,
        "queue_time": metrics_df["queue_time_mean"].values,
        "utilization_p95": metrics_df["utilization_p95"].values,
        "queue_p95": metrics_df["queue_time_p95"].values,
        "variability": metrics_df["utilization_std"].values,
    }
    
    # Min-max normalize each factor
    normalized = {}
    for key, vals in factors.items():
        vmin, vmax = vals.min(), vals.max()
        if vmax - vmin > 1e-10:
            normalized[key] = (vals - vmin) / (vmax - vmin)
        else:
            normalized[key] = np.zeros_like(vals)
    
    # Compute weighted composite score
    composite = np.zeros(len(station_metrics))
    for key, weight in w.items():
        if key in normalized:
            composite += weight * normalized[key]
    
    # Normalize composite to [0, 1]
    cmax = composite.max()
    if cmax > 0:
        composite = composite / cmax
    
    # Compute confidence based on evidence consistency
    # Higher confidence when multiple factors agree
    results = []
    for i, station in enumerate(station_metrics):
        factor_scores = {k: float(normalized[k][i]) for k in normalized}
        
        # Confidence: how many factors are above 0.5 (agreeing on bottleneck)
        above_threshold = sum(1 for v in factor_scores.values() if v > 0.5)
        confidence = above_threshold / len(factor_scores)
        
        # Build factor explanations
        factor_list = []
        for key, val in factor_scores.items():
            raw_val = factors[key][i]
            factor_list.append({
                "factor": key,
                "normalized_score": round(val, 4),
                "raw_value": round(float(raw_val), 4),
                "weight": w.get(key, 0),
                "contribution": round(val * w.get(key, 0), 4),
            })
        
        results.append(BottleneckResult(
            station=station["name"],
            score=float(composite[i]),
            rank=0,  # Set after sorting
            factors=sorted(factor_list, key=lambda x: x["contribution"], reverse=True),
            confidence=confidence,
        ))
    
    # Sort by score descending and assign ranks
    results.sort(key=lambda r: r.score, reverse=True)
    for rank, r in enumerate(results, 1):
        r.rank = rank
    
    return results


def identify_bottleneck(station_metrics: list[dict], weights: dict | None = None) -> dict:
    """
    High-level API: identify the primary bottleneck and return a structured result.
    """
    results = compute_bottleneck_scores(station_metrics, weights)
    
    if not results:
        return {"error": "No station metrics available"}
    
    primary = results[0]
    
    return {
        "primary_bottleneck": primary.to_dict(),
        "all_stations": [r.to_dict() for r in results],
        "scoring_weights": weights or DEFAULT_WEIGHTS,
        "methodology": (
            "Composite score from 5 factors: mean utilization (30%), "
            "queue time (25%), peak utilization P95 (15%), peak queue P95 (15%), "
            "utilization variability (15%). Confidence = fraction of factors "
            "with normalized score > 0.5."
        ),
        "evidence_tag": "[CALCULATED]",
        "disclaimer": (
            "Bottleneck identification is based on statistical analysis of "
            "simulation data. It represents an observed pattern, not a confirmed "
            "root cause. Scores are relative across stations in the same model."
        ),
    }
