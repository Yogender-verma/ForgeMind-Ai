"""
ForgeMind AI — What-If Simulation Engine
Allows controlled changes to process variables and estimates impact.
All results are explicitly labelled [SIMULATED].
"""

import logging
import copy
from dataclasses import dataclass, field

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.simulation")


@dataclass
class SimulationScenario:
    """A what-if scenario specification."""
    name: str
    description: str
    parameter_changes: dict[str, float]  # {column: multiplier or delta}
    change_type: str = "multiply"  # "multiply" or "add"


@dataclass
class SimulationResult:
    """Result of a what-if simulation."""
    scenario: str
    description: str
    current_state: dict
    simulated_state: dict
    delta: dict
    confidence: float
    assumptions: list[str]
    evidence_tag: str = "[SIMULATED]"

    def to_dict(self) -> dict:
        return {
            "scenario": self.scenario,
            "description": self.description,
            "current_state": self.current_state,
            "simulated_state": self.simulated_state,
            "delta": self.delta,
            "confidence": round(self.confidence, 4),
            "assumptions": self.assumptions,
            "evidence_tag": self.evidence_tag,
            "disclaimer": (
                "This is a SIMULATED result based on simplified assumptions. "
                "It is advisory only and should not be treated as a guaranteed "
                "real-world outcome."
            ),
        }


def get_available_parameters(df: pd.DataFrame, model_key: str) -> list[dict]:
    """
    Return the list of parameters that can be simulated.
    Only exposes parameters actually present in the dataset.
    """
    params = []
    
    # Utilization parameters
    util_cols = [c for c in df.columns if "util" in c.lower()
                 and not c.endswith("_outlier") and not c.endswith("_imputed")]
    for col in util_cols:
        params.append({
            "column": col,
            "type": "utilization",
            "description": f"Resource utilization at {col.replace('Utilization', '').replace('Util', '').strip()}",
            "current_mean": round(float(df[col].mean()), 4),
            "current_range": [round(float(df[col].min()), 4), round(float(df[col].max()), 4)],
            "simulation_note": "Adjusting utilization simulates capacity changes",
        })
    
    # Queue/waiting time parameters
    queue_cols = [c for c in df.columns
                  if any(k in c.lower() for k in ["queue", "waiting", "wait"])
                  and not c.endswith("_outlier") and not c.endswith("_imputed")]
    for col in queue_cols:
        params.append({
            "column": col,
            "type": "queue_time",
            "description": f"Queue/waiting time at {col}",
            "current_mean": round(float(df[col].mean()), 4),
            "current_range": [round(float(df[col].min()), 4), round(float(df[col].max()), 4)],
            "simulation_note": "Adjusting queue time simulates process improvements",
        })
    
    # Demand parameter
    if "Demand" in df.columns:
        params.append({
            "column": "Demand",
            "type": "demand",
            "description": "Inter-arrival demand rate",
            "current_mean": round(float(df["Demand"].mean()), 4),
            "current_range": [round(float(df["Demand"].min()), 4), round(float(df["Demand"].max()), 4)],
            "simulation_note": "Adjusting demand simulates market/order changes",
        })
    
    return params


def run_simulation(
    df: pd.DataFrame,
    model_key: str,
    scenario: SimulationScenario,
    bottleneck_fn=None,
    economic_fn=None,
    station_metrics_fn=None,
) -> SimulationResult:
    """
    Run a what-if simulation by modifying the dataset and re-computing metrics.
    
    Args:
        df: The cleaned dataset.
        model_key: Model identifier.
        scenario: The what-if scenario to simulate.
        bottleneck_fn: Function to compute bottleneck scores (from bottleneck_engine).
        economic_fn: Function to compute economic impact (from economic_engine).
        station_metrics_fn: Function to extract station metrics (from feature_engineering).
    """
    from scripts.forgemind.feature_engineering import get_station_metrics, compute_process_health
    from scripts.forgemind.bottleneck_engine import identify_bottleneck
    from scripts.forgemind.economic_engine import compute_economic_impact
    
    # --- Current state ---
    current_health = compute_process_health(df, model_key)
    current_station_metrics = get_station_metrics(df, model_key)
    current_bottleneck = identify_bottleneck(current_station_metrics)
    current_economics = compute_economic_impact(df, model_key, bottleneck_result=current_bottleneck)
    
    current_state = _summarize_state(df, model_key, current_bottleneck, current_economics)
    
    # --- Apply scenario changes ---
    df_sim = df.copy()
    assumptions = [
        f"Scenario: {scenario.name}",
        f"Change type: {scenario.change_type}",
    ]
    
    for col, change_val in scenario.parameter_changes.items():
        if col not in df_sim.columns:
            assumptions.append(f"WARNING: Column '{col}' not found — skipped")
            continue
        
        if scenario.change_type == "multiply":
            df_sim[col] = df_sim[col] * change_val
            assumptions.append(f"{col}: multiplied by {change_val}")
        elif scenario.change_type == "add":
            df_sim[col] = df_sim[col] + change_val
            assumptions.append(f"{col}: added {change_val}")
        
        # Clip utilization to [0, 1] range if applicable
        if "util" in col.lower():
            df_sim[col] = df_sim[col].clip(0, 1)
            assumptions.append(f"{col}: clipped to [0, 1] range")
    
    # --- Simulated state ---
    sim_health = compute_process_health(df_sim, model_key)
    sim_station_metrics = get_station_metrics(df_sim, model_key)
    sim_bottleneck = identify_bottleneck(sim_station_metrics)
    sim_economics = compute_economic_impact(df_sim, model_key, bottleneck_result=sim_bottleneck)
    
    simulated_state = _summarize_state(df_sim, model_key, sim_bottleneck, sim_economics)
    
    # --- Compute deltas ---
    delta = _compute_delta(current_state, simulated_state)
    
    # --- Confidence estimation ---
    # Lower confidence for larger parameter changes (more speculative)
    max_change = max(
        abs(v - 1.0) if scenario.change_type == "multiply" else abs(v)
        for v in scenario.parameter_changes.values()
    ) if scenario.parameter_changes else 0
    confidence = max(0.3, 1.0 - max_change * 0.5)  # Degrade confidence with larger changes
    
    assumptions.append(f"Confidence degrades with larger parameter changes (current: {confidence:.2f})")
    assumptions.append("Results are SIMULATED and advisory only — not real-world predictions")
    
    return SimulationResult(
        scenario=scenario.name,
        description=scenario.description,
        current_state=current_state,
        simulated_state=simulated_state,
        delta=delta,
        confidence=confidence,
        assumptions=assumptions,
    )


def _summarize_state(df: pd.DataFrame, model_key: str, bottleneck: dict, economics: dict) -> dict:
    """Summarize the current or simulated state into a flat dict."""
    state = {}
    
    # Utilization averages
    util_cols = [c for c in df.columns if "util" in c.lower()
                 and not c.endswith("_outlier") and not c.endswith("_imputed")]
    for col in util_cols:
        station = col.replace(" Util", "").replace(" Utilization", "").strip()
        state[f"{station}_utilization"] = round(float(df[col].mean()), 4)
    
    # Queue averages
    queue_cols = [c for c in df.columns
                  if any(k in c.lower() for k in ["queue", "waiting", "wait"])
                  and not c.endswith("_outlier") and not c.endswith("_imputed")]
    for col in queue_cols:
        state[f"{col}_mean"] = round(float(df[col].mean()), 4)
    
    # Throughput
    if model_key == "Model_1" and "Parts per hour" in df.columns:
        state["throughput_per_hour"] = round(float(df["Parts per hour"].mean()), 1)
    elif model_key == "Model_2" and "Entities Out" in df.columns:
        state["entities_out_mean"] = round(float(df["Entities Out"].mean()), 1)
    
    # Bottleneck
    if bottleneck and "primary_bottleneck" in bottleneck:
        bn = bottleneck["primary_bottleneck"]
        state["bottleneck_station"] = bn.get("station", "Unknown")
        state["bottleneck_score"] = bn.get("score", 0)
    
    # Economic summary
    if economics and "metrics" in economics:
        m = economics["metrics"]
        if "estimated_profit_per_run" in m:
            state["estimated_profit"] = m["estimated_profit_per_run"].get("value", 0)
        if "throughput" in m:
            tp = m["throughput"]
            if "mean_parts_per_run" in tp:
                state["mean_throughput"] = tp["mean_parts_per_run"]
            elif "mean_output_per_run" in tp:
                state["mean_throughput"] = tp["mean_output_per_run"]
    
    return state


def _compute_delta(current: dict, simulated: dict) -> dict:
    """Compute the difference between current and simulated states."""
    delta = {}
    all_keys = set(current.keys()) | set(simulated.keys())
    
    for key in all_keys:
        cv = current.get(key)
        sv = simulated.get(key)
        
        if isinstance(cv, (int, float, np.number)) and isinstance(sv, (int, float, np.number)):
            cv_f = float(cv)
            sv_f = float(sv)
            abs_change = sv_f - cv_f
            if cv_f != 0:
                pct_change = (abs_change / cv_f * 100)
            else:
                pct_change = 0.0 if abs_change == 0 else (100.0 if abs_change > 0 else -100.0)
            delta[key] = {
                "current": round(cv_f, 4),
                "simulated": round(sv_f, 4),
                "absolute_change": round(abs_change, 4),
                "percent_change": round(pct_change, 2),
                "direction": "improved" if _is_improvement(key, abs_change) else "worsened",
            }
        elif cv != sv:
            delta[key] = {
                "current": cv,
                "simulated": sv,
                "note": "Non-numeric change",
            }
    
    return delta


def _is_improvement(key: str, change: float) -> bool:
    """Determine if a change is an improvement based on the metric type."""
    # Lower is better for: utilization (closer to target), queue, bottleneck score
    lower_is_better = any(k in key.lower() for k in ["queue", "waiting", "wait", "bottleneck_score"])
    # Higher is better for: throughput, profit
    higher_is_better = any(k in key.lower() for k in ["throughput", "profit", "entities_out"])
    
    if lower_is_better:
        return change < 0
    elif higher_is_better:
        return change > 0
    else:
        return change < 0  # Default: lower utilization is generally better for bottleneck relief


# ---------------------------------------------------------------------------
# Pre-built scenarios
# ---------------------------------------------------------------------------

def get_preset_scenarios(model_key: str) -> list[SimulationScenario]:
    """Return a list of pre-built what-if scenarios for the model."""
    scenarios = []
    
    if model_key == "Model_1":
        util_cols = ["Drilling Util", "Milling Util", "Assembly Util"]
    elif model_key == "Model_2":
        util_cols = ["Drilling Utilization", "Milling Utilization", "Assembly Utilization"]
    else:
        return []
    
    # Scenario: 10% capacity increase at each station
    for col in util_cols:
        station = col.replace(" Utilization", "").replace(" Util", "").strip()
        scenarios.append(SimulationScenario(
            name=f"Capacity +10% at {station}",
            description=f"Simulate a 10% capacity increase at {station} (reduces utilization by ~10%)",
            parameter_changes={col: 0.90},
            change_type="multiply",
        ))
    
    # Scenario: 20% capacity increase at bottleneck (Assembly is typically the bottleneck)
    scenarios.append(SimulationScenario(
        name="Capacity +20% at Assembly",
        description="Simulate a 20% capacity increase at the Assembly station",
        parameter_changes={util_cols[-1]: 0.80},
        change_type="multiply",
    ))
    
    # Scenario: Demand reduction
    scenarios.append(SimulationScenario(
        name="Demand -20%",
        description="Simulate a 20% decrease in demand/arrival rate",
        parameter_changes={"Demand": 0.80},
        change_type="multiply",
    ))
    
    return scenarios
