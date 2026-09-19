"""
ForgeMind AI — Economic Impact Engine
Configurable economic model with clearly labelled assumptions.
Does NOT invent real-world costs — uses configurable/demo parameters.
"""

import logging
from dataclasses import dataclass, field

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.economic")


@dataclass
class EconomicConfig:
    """
    Configurable economic parameters.
    All values are DEMO ASSUMPTIONS unless overridden with real data.
    """
    unit_revenue: float = 50.0           # Revenue per good unit produced
    unit_cost: float = 30.0              # Variable cost per unit
    scrap_cost_per_unit: float = 15.0    # Cost of scrapping a unit
    rework_cost_per_unit: float = 20.0   # Cost of reworking a unit
    downtime_cost_per_hour: float = 500.0  # Cost of one hour of downtime
    operating_cost_per_hour: float = 200.0  # General operating cost per hour
    simulation_hours: float = 24.0       # Duration of each simulation run
    
    # Labels
    source_label: str = "[CONFIGURABLE ASSUMPTION — not from dataset]"
    
    def to_dict(self) -> dict:
        return {
            "unit_revenue": self.unit_revenue,
            "unit_cost": self.unit_cost,
            "scrap_cost_per_unit": self.scrap_cost_per_unit,
            "rework_cost_per_unit": self.rework_cost_per_unit,
            "downtime_cost_per_hour": self.downtime_cost_per_hour,
            "operating_cost_per_hour": self.operating_cost_per_hour,
            "simulation_hours": self.simulation_hours,
            "source_label": self.source_label,
        }


def compute_economic_impact(
    df: pd.DataFrame,
    model_key: str,
    config: EconomicConfig | None = None,
    bottleneck_result: dict | None = None,
) -> dict:
    """
    Compute economic impact estimates from production data.
    
    All economic values are [ESTIMATED] based on configurable assumptions,
    except throughput/output which are [MEASURED] from the dataset.
    """
    config = config or EconomicConfig()
    
    result = {
        "model": model_key,
        "economic_config": config.to_dict(),
        "metrics": {},
        "evidence_tag": "[ESTIMATED]",
        "disclaimer": (
            "All economic figures are ESTIMATES based on configurable cost assumptions. "
            "No real-world cost data exists in this dataset. These figures are advisory "
            "and should not be used for actual financial decisions without validation."
        ),
    }
    
    if model_key == "Model_1":
        result["metrics"] = _compute_model1_economics(df, config)
    elif model_key == "Model_2":
        result["metrics"] = _compute_model2_economics(df, config)
    
    # Add bottleneck economic impact if available
    if bottleneck_result and "primary_bottleneck" in bottleneck_result:
        bn = bottleneck_result["primary_bottleneck"]
        result["bottleneck_economic_impact"] = _estimate_bottleneck_cost(
            df, model_key, bn, config
        )
    
    return result


def _compute_model1_economics(df: pd.DataFrame, config: EconomicConfig) -> dict:
    """Economic metrics for Model 1."""
    metrics = {}
    
    if "Total parts" in df.columns:
        total_parts = df["Total parts"]
        metrics["throughput"] = {
            "mean_parts_per_run": round(float(total_parts.mean()), 1),
            "total_parts_all_runs": int(total_parts.sum()),
            "evidence_tag": "[MEASURED]",
        }
        
        # Revenue estimate
        mean_parts = total_parts.mean()
        metrics["revenue_per_run"] = {
            "value": round(float(mean_parts * config.unit_revenue), 2),
            "evidence_tag": "[ESTIMATED]",
            "assumption": f"unit_revenue={config.unit_revenue}",
        }
        
        # Operating cost per run
        metrics["operating_cost_per_run"] = {
            "value": round(float(config.operating_cost_per_hour * config.simulation_hours), 2),
            "evidence_tag": "[ESTIMATED]",
            "assumption": f"operating_cost/hr={config.operating_cost_per_hour}, hours={config.simulation_hours}",
        }
        
        # Variable cost
        metrics["variable_cost_per_run"] = {
            "value": round(float(mean_parts * config.unit_cost), 2),
            "evidence_tag": "[ESTIMATED]",
            "assumption": f"unit_cost={config.unit_cost}",
        }
        
        # Profit estimate
        revenue = mean_parts * config.unit_revenue
        variable_cost = mean_parts * config.unit_cost
        operating_cost = config.operating_cost_per_hour * config.simulation_hours
        profit = revenue - variable_cost - operating_cost
        
        metrics["estimated_profit_per_run"] = {
            "value": round(float(profit), 2),
            "evidence_tag": "[ESTIMATED]",
            "formula": "revenue - variable_cost - operating_cost",
        }
        
        metrics["profit_margin_pct"] = {
            "value": round(float(profit / revenue * 100), 2) if revenue > 0 else 0,
            "evidence_tag": "[ESTIMATED]",
        }
    
    # Throughput variability cost
    if "Parts per hour" in df.columns:
        pph = df["Parts per hour"]
        throughput_loss = pph.max() - pph.mean()
        metrics["throughput_loss_vs_best"] = {
            "mean_pph": round(float(pph.mean()), 1),
            "max_pph": round(float(pph.max()), 1),
            "gap_pph": round(float(throughput_loss), 1),
            "lost_revenue_per_hour": round(float(throughput_loss * config.unit_revenue), 2),
            "evidence_tag": "[ESTIMATED]",
        }
    
    return metrics


def _compute_model2_economics(df: pd.DataFrame, config: EconomicConfig) -> dict:
    """Economic metrics for Model 2."""
    metrics = {}
    
    if "Entities Out" in df.columns:
        entities_out = df["Entities Out"]
        metrics["throughput"] = {
            "mean_output_per_run": round(float(entities_out.mean()), 1),
            "total_output_all_runs": int(entities_out.sum()),
            "evidence_tag": "[MEASURED]",
        }
    
    # Production loss (input - output)
    if "Entities In Part 1" in df.columns and "Entities Out" in df.columns:
        loss = df["Entities In Part 1"] - df["Entities Out"]
        metrics["production_loss"] = {
            "mean_loss_per_run": round(float(loss.mean()), 1),
            "total_loss_all_runs": int(loss.sum()),
            "loss_cost_per_run": round(float(loss.mean() * config.scrap_cost_per_unit), 2),
            "evidence_tag": "[ESTIMATED]",
            "assumption": f"scrap_cost={config.scrap_cost_per_unit}",
            "note": "Production loss = entities_in - entities_out. May include WIP, not just scrap.",
        }
    
    # WIP holding cost
    stored_cols = ["Part 1 Stored", "Part 2 Stored"]
    existing = [c for c in stored_cols if c in df.columns]
    if existing:
        total_wip = df[existing].sum(axis=1)
        metrics["wip_holding"] = {
            "mean_wip": round(float(total_wip.mean()), 1),
            "max_wip": round(float(total_wip.max()), 1),
            "evidence_tag": "[MEASURED]",
        }
    
    # Revenue and profit (same structure as Model 1)
    if "Entities Out" in df.columns:
        mean_output = entities_out.mean()
        revenue = mean_output * config.unit_revenue
        variable_cost = mean_output * config.unit_cost
        operating_cost = config.operating_cost_per_hour * config.simulation_hours
        profit = revenue - variable_cost - operating_cost
        
        metrics["revenue_per_run"] = {
            "value": round(float(revenue), 2),
            "evidence_tag": "[ESTIMATED]",
        }
        metrics["estimated_profit_per_run"] = {
            "value": round(float(profit), 2),
            "evidence_tag": "[ESTIMATED]",
        }
    
    return metrics


def _estimate_bottleneck_cost(
    df: pd.DataFrame,
    model_key: str,
    bottleneck: dict,
    config: EconomicConfig,
) -> dict:
    """Estimate the economic cost of the identified bottleneck."""
    station = bottleneck.get("station", "Unknown")
    score = bottleneck.get("score", 0)
    
    # Estimate throughput loss attributable to the bottleneck
    # Using a simple model: bottleneck_score × max_possible_throughput_gap
    if model_key == "Model_1" and "Parts per hour" in df.columns:
        pph = df["Parts per hour"]
        gap = pph.max() - pph.mean()
        bottleneck_loss = gap * score
        cost = bottleneck_loss * config.unit_revenue
    elif model_key == "Model_2" and "Entities Out" in df.columns:
        eo = df["Entities Out"]
        gap = eo.max() - eo.mean()
        bottleneck_loss = gap * score
        cost = bottleneck_loss * (config.unit_revenue - config.unit_cost)
    else:
        bottleneck_loss = 0
        cost = 0
    
    return {
        "bottleneck_station": station,
        "bottleneck_score": round(score, 4),
        "estimated_throughput_loss": round(float(bottleneck_loss), 1),
        "estimated_cost_impact": round(float(cost), 2),
        "evidence_tag": "[ESTIMATED]",
        "methodology": (
            "Throughput loss estimated as: bottleneck_score × (max_throughput - mean_throughput). "
            "Cost = throughput_loss × unit_margin. This is a simplified estimate."
        ),
    }
