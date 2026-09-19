"""
ForgeMind AI — Root Cause Evidence Engine
Evidence-based association system between process conditions and production outcomes.
Explicitly distinguishes "observed association" from "confirmed cause".
"""

import logging
from dataclasses import dataclass, field

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.root_cause")


@dataclass
class EvidenceLink:
    """A single evidence link between two variables."""
    source_variable: str
    target_variable: str
    association_type: str  # "correlation", "grouped_stat", "threshold_pattern"
    strength: float  # 0-1 normalized
    direction: str  # "positive", "negative", "nonlinear"
    detail: str
    evidence_tag: str = "[CALCULATED]"
    causation_status: str = "Observed association — NOT confirmed cause"

    def to_dict(self) -> dict:
        return {
            "source": self.source_variable,
            "target": self.target_variable,
            "type": self.association_type,
            "strength": round(self.strength, 4),
            "direction": self.direction,
            "detail": self.detail,
            "evidence_tag": self.evidence_tag,
            "causation_status": self.causation_status,
        }


def compute_correlation_evidence(
    df: pd.DataFrame,
    target_cols: list[str] | None = None,
    threshold: float = 0.3,
) -> list[EvidenceLink]:
    """
    Compute pairwise correlations and return significant associations.
    
    Args:
        df: Cleaned dataframe with numeric columns.
        target_cols: If specified, only compute correlations against these targets.
        threshold: Minimum |correlation| to report.
    
    Returns:
        List of EvidenceLink objects for significant correlations.
    """
    # Select only numeric data columns (exclude companion columns)
    numeric_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                    if not c.endswith("_outlier") and not c.endswith("_imputed")]
    
    if len(numeric_cols) < 2:
        return []
    
    corr_matrix = df[numeric_cols].corr(method="spearman")
    
    evidence = []
    seen = set()
    
    for col1 in numeric_cols:
        cols_to_check = target_cols if target_cols else numeric_cols
        for col2 in cols_to_check:
            if col1 == col2:
                continue
            pair_key = tuple(sorted([col1, col2]))
            if pair_key in seen:
                continue
            seen.add(pair_key)
            
            if col2 not in corr_matrix.columns or col1 not in corr_matrix.index:
                continue
            
            r = corr_matrix.loc[col1, col2]
            if pd.isna(r) or abs(r) < threshold:
                continue
            
            direction = "positive" if r > 0 else "negative"
            strength = abs(r)
            
            evidence.append(EvidenceLink(
                source_variable=col1,
                target_variable=col2,
                association_type="spearman_correlation",
                strength=strength,
                direction=direction,
                detail=f"Spearman ρ = {r:.4f}",
            ))
    
    evidence.sort(key=lambda e: e.strength, reverse=True)
    return evidence


def compute_demand_impact_evidence(df: pd.DataFrame, model_key: str) -> list[EvidenceLink]:
    """
    Analyze how demand levels impact process conditions.
    Groups data by demand level and compares metrics.
    """
    demand_col = "Demand"
    if demand_col not in df.columns:
        return []
    
    evidence = []
    
    # Identify utilization and queue columns
    util_cols = [c for c in df.columns if "util" in c.lower() and not c.endswith("_outlier")]
    queue_cols = [c for c in df.columns
                  if any(k in c.lower() for k in ["queue", "waiting", "wait"])
                  and not c.endswith("_outlier") and not c.endswith("_imputed")]
    
    # Split into low/medium/high demand
    q33 = df[demand_col].quantile(0.33)
    q67 = df[demand_col].quantile(0.67)
    
    df_low = df[df[demand_col] <= q33]
    df_high = df[df[demand_col] >= q67]
    
    if len(df_low) == 0 or len(df_high) == 0:
        return []
    
    for col in util_cols + queue_cols:
        if col not in df.columns:
            continue
        
        low_mean = df_low[col].mean()
        high_mean = df_high[col].mean()
        
        if pd.isna(low_mean) or pd.isna(high_mean):
            continue
        
        # Effect size (Cohen's d approximation)
        pooled_std = df[col].std()
        if pooled_std > 1e-10:
            effect_size = abs(high_mean - low_mean) / pooled_std
        else:
            effect_size = 0
        
        if effect_size < 0.2:  # Skip trivial effects
            continue
        
        direction = "positive" if high_mean > low_mean else "negative"
        strength = min(effect_size / 2.0, 1.0)  # Normalize to 0-1
        
        evidence.append(EvidenceLink(
            source_variable=demand_col,
            target_variable=col,
            association_type="demand_impact_analysis",
            strength=strength,
            direction=direction,
            detail=(
                f"High-demand mean={high_mean:.4f} vs Low-demand mean={low_mean:.4f}, "
                f"Effect size (Cohen's d)={effect_size:.4f}"
            ),
        ))
    
    evidence.sort(key=lambda e: e.strength, reverse=True)
    return evidence


def analyze_root_causes(df: pd.DataFrame, model_key: str) -> dict:
    """
    High-level API: run all root-cause evidence analyses.
    
    Returns a structured result with evidence links, methodology,
    and explicit disclaimers about correlation vs causation.
    """
    # 1. Correlation-based evidence
    corr_evidence = compute_correlation_evidence(df, threshold=0.3)
    
    # 2. Demand-impact evidence
    demand_evidence = compute_demand_impact_evidence(df, model_key)
    
    # Combine and deduplicate
    all_evidence = corr_evidence + demand_evidence
    
    # Top findings
    top_correlations = [e.to_dict() for e in corr_evidence[:10]]
    top_demand_effects = [e.to_dict() for e in demand_evidence[:10]]
    
    return {
        "model": model_key,
        "total_evidence_links": len(all_evidence),
        "correlation_evidence": top_correlations,
        "demand_impact_evidence": top_demand_effects,
        "all_evidence": [e.to_dict() for e in all_evidence],
        "methodology": {
            "correlation": "Spearman rank correlation (robust to non-linearity). Threshold ≥ 0.3.",
            "demand_impact": "Grouped comparison: low vs high demand tertiles. Effect size via Cohen's d.",
        },
        "evidence_tag": "[CALCULATED]",
        "disclaimer": (
            "All findings are OBSERVED ASSOCIATIONS, not confirmed causes. "
            "This dataset is synthetic simulation data. Process-defect links "
            "require joining with inspection/quality data (not yet available). "
            "The root-cause engine is currently analyzing process/flow anomalies "
            "rather than visual defects."
        ),
    }
