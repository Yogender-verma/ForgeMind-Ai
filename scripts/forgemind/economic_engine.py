"""
ForgeMind AI — Economic Impact Engine
Configurable economic model with clearly labelled assumptions.
Does NOT invent real-world costs — uses configurable/demo parameters.
"""

import logging
from dataclasses import dataclass, field
from typing import Optional, Any

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


# ===========================================================================
# User-Selected Simulated Economic Impact Model (Hackathon MVP)
# The organizer dataset does NOT contain product costs, part values,
# rework/scrap rates, or image-to-production traceability.
# Zero monetary values (₹) are invented.
# Impact is an explicitly user-selected simulated demonstration level:
#   LOW    -> 5%  [SIMULATED]
#   MEDIUM -> 10% [SIMULATED]
#   HIGH   -> 20% [SIMULATED]
# ===========================================================================

SIMULATED_IMPACT_MAP = {
    "LOW": 5.0,
    "MEDIUM": 10.0,
    "HIGH": 20.0,
}

VALID_IMPACT_LEVELS = set(SIMULATED_IMPACT_MAP.keys())


def get_simulated_economic_impact(
    impact_level: Optional[str] = None,
    *,
    defect_type: Optional[str] = None,
    vision_confidence: Optional[float] = None,
    user_reason: Optional[str] = None,
    treatment_status: Optional[str] = "untreated",
    data: Optional[dict] = None,
    **kwargs,
) -> dict:
    """
    User-selected simulated economic impact score for an inspected unit.
    
    Models:
    - Before Treatment (Untreated Defect): Disruption/penalty loss (-5%, -10%, -20% [SIMULATED])
    - After Treatment (Defect Cured): Net value recovery / simulated profit (+4%, +8%, +16% [SIMULATED])
      Formula: Net Profit Recovery = Avoided Defect Loss - Simulated Treatment Overhead
    
    Zero monetary values: No ₹ amounts, manufacturing costs, rework costs,
    or downtime rates are fabricated.
    
    Model confidence (e.g. 85.7%) is kept completely independent and is
    never multiplied or used to determine impact level.
    """
    if data and isinstance(data, dict):
        impact_level = data.get("impact_level", impact_level)
        defect_type = data.get("defect_type", defect_type)
        vision_confidence = data.get("vision_confidence", vision_confidence)
        user_reason = data.get("user_reason", user_reason)
        treatment_status = data.get("treatment_status", treatment_status)

    t_status = str(treatment_status).strip().lower() if treatment_status else "untreated"
    if t_status not in {"untreated", "cured"}:
        t_status = "untreated"

    # Initial unassessed state
    if not impact_level:
        return {
            "status": "not_assessed",
            "impact_level": None,
            "simulated_impact_pct": None,
            "formatted_impact": "Not assessed",
            "evidence_tag": "[SIMULATED]",
            "defect_type": defect_type,
            "vision_confidence": vision_confidence,
            "user_reason": None,
            "reason_tag": None,
            "user_reason_tag": None,
            "treatment_status": t_status,
            "before_treatment_loss_pct": None,
            "formatted_before_treatment_loss": "Not assessed",
            "treatment_overhead_pct": None,
            "formatted_treatment_overhead": "Not assessed",
            "after_treatment_profit_pct": None,
            "formatted_after_treatment_profit": "Not assessed",
            "avoided_loss_pct": None,
            "net_profit_recovery_pct": None,
            "disclosure": (
                "Demo impact score only. The supplied dataset does not contain "
                "product cost, product criticality, disposition, or financial records. "
                "This value is not an actual monetary loss."
            ),
            "future_integration_note": "Future Factory Integration: Product + ERP/MES + Quality Data -> Verified Economic Impact",
        }

    lvl = str(impact_level).strip().upper()
    if lvl not in VALID_IMPACT_LEVELS:
        raise ValueError(f"Invalid impact level '{impact_level}'. Must be one of: LOW, MEDIUM, HIGH.")

    baseline_loss_pct = SIMULATED_IMPACT_MAP[lvl]
    reason_clean = str(user_reason).strip() if user_reason and str(user_reason).strip() else None

    # Deterministic simulation formulas for Cured vs Untreated states
    # LOW: 5% loss avoided, 1% treatment overhead -> +4% net profit recovery
    # MEDIUM: 10% loss avoided, 2% treatment overhead -> +8% net profit recovery
    # HIGH: 20% loss avoided, 4% treatment overhead -> +16% net profit recovery
    overhead_map = {"LOW": 1.0, "MEDIUM": 2.0, "HIGH": 4.0}
    overhead_pct = overhead_map[lvl]
    net_profit_pct = baseline_loss_pct - overhead_pct

    # Format based on current treatment state
    if t_status == "cured":
        formatted_impact = f"+{int(net_profit_pct)}%"
    else:
        formatted_impact = f"{int(baseline_loss_pct)}%"

    return {
        "status": "assessed",
        "impact_level": lvl,
        "simulated_impact_pct": baseline_loss_pct,
        "formatted_impact": formatted_impact,
        "evidence_tag": "[SIMULATED]",
        "defect_type": defect_type,
        "vision_confidence": vision_confidence,
        "user_reason": reason_clean,
        "reason_tag": "[USER INPUT]" if reason_clean else None,
        "user_reason_tag": "[USER INPUT]" if reason_clean else None,
        "treatment_status": t_status,
        "before_treatment_loss_pct": baseline_loss_pct,
        "formatted_before_treatment_loss": f"-{int(baseline_loss_pct)}%",
        "treatment_overhead_pct": overhead_pct,
        "formatted_treatment_overhead": f"-{int(overhead_pct)}%",
        "after_treatment_profit_pct": net_profit_pct,
        "formatted_after_treatment_profit": f"+{int(net_profit_pct)}%",
        "avoided_loss_pct": baseline_loss_pct,
        "net_profit_recovery_pct": net_profit_pct,
        "disclosure": (
            "Demo impact score only. The supplied dataset does not contain "
            "product cost, product criticality, disposition, or financial records. "
            "This value is not an actual monetary loss."
        ),
        "future_integration_note": "Future Factory Integration: Product + ERP/MES + Quality Data -> Verified Economic Impact",
    }


def get_simulated_what_if_scenarios(defect_type: Optional[str] = None) -> dict:
    """
    Enhanced What-If Simulator:
    1. Standard benchmark sensitivity scenarios (LOW 5%, MEDIUM 10%, HIGH 20%).
    2. Alternative remediation pathways ("how many other ways there are").
    3. Explicit engineering decision rationale ("why do we choose this way").
    Labeled [SIMULATED]. Zero fake currency symbols.
    """
    clean_defect = str(defect_type).strip().capitalize() if defect_type and str(defect_type).strip() else "Scratch"

    # Defect-tailored pathway names and rationale
    defect_actions = {
        "Scratch": {
            "way1_name": "Way 1: Precision Targeted Micro-Buffing & Recoat",
            "way1_desc": "Automated localized micro-abrasion buffing to smooth surface scratch, followed by protective seal coat.",
            "way2_name": "Way 2: Full Thermal Annealing & Passivation Re-dip",
            "way2_desc": "Batch furnace re-bake to re-flow grain structure, followed by full nitric acid passivation tank.",
            "way3_name": "Way 3: Commercial Concession (Sell as Grade-B)",
            "way3_desc": "Waive physical repair. Re-classify and sell unit to secondary industrial market at commercial price discount.",
            "way4_name": "Way 4: Direct Component Scrap (Destructive Disposal)",
            "way4_desc": "Immediate line rejection and component destruction for raw material salvage only.",
            "why_summary": f"For surface {clean_defect} defects, Way 1 provides maximum value recovery (+8.5%) with minimal cycle delay (+2.5 min), completely curing the surface blemish without oven queues or scrap penalties.",
            "defect_suitability": f"For {clean_defect}, the blemish is strictly surface-bounded. Micro-buffing removes the scratch within tolerance limits without altering core metallurgy.",
        },
        "Crack": {
            "way1_name": "Way 1: Ultrasonic Depth Check & Laser Cladding Micro-Weld",
            "way1_desc": "High-frequency ultrasonic validation followed by precision fiber-laser wire filler deposition.",
            "way2_name": "Way 2: Thermal Stress-Relief Soak & CNC Re-machining",
            "way2_desc": "4-hour oven soaking cycle followed by 5-axis CNC re-profiling to eliminate root crack notch.",
            "way3_name": "Way 3: Non-Critical Low-Load De-rating (Concession)",
            "way3_desc": "Re-label part for non-structural applications where dynamic fatigue stress is under 20% limit.",
            "way4_name": "Way 4: Immediate Scrap & Metallurgical Audit",
            "way4_desc": "Immediate destructive isolation to prevent propagation and audit casting mold integrity.",
            "why_summary": f"For {clean_defect} defects, Way 1 seals the fissure and restores structural endurance (+8.0% net recovery) without the 4-hour downtime of full CNC re-profiling.",
            "defect_suitability": f"Laser cladding isolates and bridges {clean_defect} stress concentrations without creating heat-affected zone distortion.",
        },
        "Rust": {
            "way1_name": "Way 1: Targeted Electrolytic De-oxidation & Protective Dip",
            "way1_desc": "Controlled cathodic electrolytic rust dissolution followed by immediate zinc phosphate corrosion inhibitor dip.",
            "way2_name": "Way 2: Aggressive Mechanical Abrasive Sandblasting",
            "way2_desc": "High-pressure aluminum oxide particle blasting stripping surface down to substrate metal.",
            "way3_name": "Way 3: Solvent Wipe & Rapid Secondary Market Sale",
            "way3_desc": "Light oil wipe and immediate disposition to low-humidity secondary storage buyer at discount.",
            "way4_name": "Way 4: Complete Component Scrap",
            "way4_desc": "Scrap unit to prevent cross-contamination of adjacent clean inventory lots.",
            "why_summary": f"For {clean_defect} conditions, Way 1 chemically dissolves oxidation while strictly preserving critical dimensional wall thickness.",
            "defect_suitability": f"Electrolytic de-oxidation neutralizes {clean_defect} chemically without the dimensional erosion caused by aggressive sandblasting.",
        },
        "Hole": {
            "way1_name": "Way 1: Precision TIG Micro-Fill & In-Line CNC Bore",
            "way1_desc": "Robotic micro-TIG filler deposition into the void followed by coordinate-guided re-boring.",
            "way2_name": "Way 2: Polymer Epoxy Sleeving & Mechanical Press-Fit",
            "way2_desc": "Insert structural interference sleeve with industrial anaerobic adhesive locking compound.",
            "way3_name": "Way 3: De-rated Hydraulic Concession",
            "way3_desc": "Downgrade part for low-pressure fluid return lines where pinhole tolerance is non-critical.",
            "way4_name": "Way 4: Direct Casting Scrap",
            "way4_desc": "Destructive recycle of porosity-flawed casting.",
            "why_summary": f"For {clean_defect} flaws, Way 1 seals the cavity metallurgically (+8.0% recovery) rather than relying on non-metallic sleeve inserts.",
            "defect_suitability": f"Micro-TIG fill metallurgically fuses the {clean_defect} void, restoring 100% pneumatic seal rating.",
        },
    }

    action = defect_actions.get(clean_defect, defect_actions["Scratch"])

    pathways = [
        {
            "pathway_id": "WAY-1",
            "name": action["way1_name"],
            "category": "In-Line Automated Treatment",
            "description": action["way1_desc"],
            "is_recommended": True,
            "badge": "[RECOMMENDED PATHWAY]",
            "net_profit_recovery_pct": 8.5,
            "formatted_profit_recovery": "+8.5% Net Profit",
            "avoided_loss_pct": 10.0,
            "treatment_overhead_pct": 1.5,
            "cycle_time_delta_min": 2.5,
            "formatted_cycle_time": "+2.5 min in-line buffer",
            "feasibility": "Immediate (In-line robotic station)",
            "quality_risk": "Very Low (0.8% recurrence risk)",
            "final_grade": "Grade-A (Full OEM Spec)",
        },
        {
            "pathway_id": "WAY-2",
            "name": action["way2_name"],
            "category": "Off-Line Batch Remediation",
            "description": action["way2_desc"],
            "is_recommended": False,
            "badge": "[OFF-LINE ALTERNATIVE]",
            "net_profit_recovery_pct": 3.5,
            "formatted_profit_recovery": "+3.5% Net Profit",
            "avoided_loss_pct": 10.0,
            "treatment_overhead_pct": 6.5,
            "cycle_time_delta_min": 48.0,
            "formatted_cycle_time": "+48.0 min batch oven queue",
            "feasibility": "Batch Queue (Requires off-line oven scheduling)",
            "quality_risk": "Low (1.2% recurrence risk)",
            "final_grade": "Grade-A (Thermal Normalized)",
        },
        {
            "pathway_id": "WAY-3",
            "name": action["way3_name"],
            "category": "Commercial Concession",
            "description": action["way3_desc"],
            "is_recommended": False,
            "badge": "[DOWNGRADE ALTERNATIVE]",
            "net_profit_recovery_pct": -40.0,
            "formatted_profit_recovery": "-40.0% Margin Haircut",
            "avoided_loss_pct": 0.0,
            "treatment_overhead_pct": 40.0,
            "cycle_time_delta_min": 0.0,
            "formatted_cycle_time": "0 min (Instant ERP transfer)",
            "feasibility": "Immediate (Commercial ERP transfer)",
            "quality_risk": "Zero (Customer accepts downgraded spec)",
            "final_grade": "Grade-B (Secondary Market)",
        },
        {
            "pathway_id": "WAY-4",
            "name": action["way4_name"],
            "category": "Destructive Rejection",
            "description": action["way4_desc"],
            "is_recommended": False,
            "badge": "[REJECT / SCRAP]",
            "net_profit_recovery_pct": -90.0,
            "formatted_profit_recovery": "-90.0% Unrecoverable Scrap Loss",
            "avoided_loss_pct": 0.0,
            "treatment_overhead_pct": 90.0,
            "cycle_time_delta_min": 12.0,
            "formatted_cycle_time": "+12.0 min line replacement penalty",
            "feasibility": "Immediate (Scrap chute)",
            "quality_risk": "Zero (Component destroyed)",
            "final_grade": "Scrap (Raw Material Salvage Only)",
        },
    ]

    why_we_choose_this_way = {
        "recommended_pathway_id": "WAY-1",
        "recommended_pathway_name": action["way1_name"],
        "summary": action["why_summary"],
        "defect_type": clean_defect,
        "key_reasons": [
            {
                "title": "Highest Net Profit Recovery",
                "detail": "Way 1 achieves +8.5% net profit recovery, outperforming Way 2 (+3.5%), Way 3 (-40% commercial markdown), and Way 4 (-90% unrecoverable scrap loss).",
                "metric": "+8.5% Net Profit",
            },
            {
                "title": "Minimal Throughput Disruption",
                "detail": "Requires only +2.5 minutes in-line robotic buffing, avoiding the severe +48-minute thermal oven queue bottleneck of Way 2.",
                "metric": "+2.5 min vs +48.0 min",
            },
            {
                "title": "Full Grade-A Specification Restored",
                "detail": "Restores 100% of original dimensional and cosmetic tolerances, protecting customer SLA commitments and eliminating Grade-B margin penalties.",
                "metric": "Grade-A OEM Spec",
            },
            {
                "title": "Targeted Physics Match",
                "detail": action["defect_suitability"],
                "metric": f"Optimized for {clean_defect}",
            },
        ],
    }

    return {
        "evidence_tag": "[SIMULATED]",
        "disclosure": "Demo scenario comparison — not actual factory financial loss. No currency symbols used.",
        "defect_type": clean_defect,
        "total_ways_available": len(pathways),
        "pathways": pathways,
        "recommended_pathway_id": "WAY-1",
        "why_we_choose_this_way": why_we_choose_this_way,
        # Maintain backwards compatibility for existing tests
        "scenarios": [
            {
                "scenario": "Scenario A",
                "impact_level": "LOW",
                "simulated_impact_pct": 5.0,
                "formatted_impact": "5%",
                "evidence_tag": "[SIMULATED]",
                "description": "Minor surface anomaly with minimal operational disturbance.",
            },
            {
                "scenario": "Scenario B",
                "impact_level": "MEDIUM",
                "simulated_impact_pct": 10.0,
                "formatted_impact": "10%",
                "evidence_tag": "[SIMULATED]",
                "description": "Moderate surface defect potentially requiring non-destructive verification.",
            },
            {
                "scenario": "Scenario C",
                "impact_level": "HIGH",
                "simulated_impact_pct": 20.0,
                "formatted_impact": "20%",
                "evidence_tag": "[SIMULATED]",
                "description": "Significant structural integrity risk requiring line intervention.",
            },
        ],
    }


# Backwards compatibility aliases
calculate_unit_economic_impact = get_simulated_economic_impact
calculate_economic_what_if = get_simulated_what_if_scenarios


