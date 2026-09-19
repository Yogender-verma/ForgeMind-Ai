"""
ForgeMind AI — Recommendation Engine
Generates actionable recommendations from bottleneck, root-cause, 
economic, and simulation analyses.
"""

import logging
from dataclasses import dataclass, field

import pandas as pd
import numpy as np

log = logging.getLogger("forgemind.recommendation")


@dataclass
class Recommendation:
    """A single actionable recommendation."""
    id: str
    priority: int  # 1 = highest
    problem: str
    evidence: list[str]
    intervention: str
    simulated_effect: str
    economic_impact: str
    confidence: float
    limitations: list[str]
    evidence_tag: str = "[ESTIMATED]"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "priority": self.priority,
            "problem": self.problem,
            "evidence": self.evidence,
            "intervention": self.intervention,
            "simulated_effect": self.simulated_effect,
            "economic_impact": self.economic_impact,
            "confidence": round(self.confidence, 4),
            "limitations": self.limitations,
            "evidence_tag": self.evidence_tag,
        }


def generate_recommendations(
    model_key: str,
    bottleneck_result: dict,
    root_cause_result: dict,
    economic_result: dict,
    simulation_results: list | None = None,
) -> list[Recommendation]:
    """
    Generate prioritized recommendations from all analysis results.
    
    Each recommendation includes:
    1. Problem statement
    2. Supporting evidence
    3. Suggested intervention
    4. Expected simulated effect
    5. Economic impact estimate
    6. Confidence level
    7. Assumptions and limitations
    """
    recommendations = []
    rec_id = 0
    
    # --- Recommendation 1: Address primary bottleneck ---
    if bottleneck_result and "primary_bottleneck" in bottleneck_result:
        bn = bottleneck_result["primary_bottleneck"]
        station = bn.get("station", "Unknown")
        score = bn.get("score", 0)
        
        if score > 0.5:  # Only recommend if bottleneck is significant
            rec_id += 1
            
            # Build evidence list from factors
            evidence = []
            for factor in bn.get("factors", [])[:3]:
                evidence.append(
                    f"{factor['factor']}: normalized={factor['normalized_score']:.2f}, "
                    f"raw={factor['raw_value']:.4f} (weight={factor['weight']})"
                )
            
            # Check if we have a simulation for this station
            sim_effect = "Not yet simulated"
            econ_impact = "Not yet estimated"
            sim_confidence = bn.get("confidence", 0.5)
            
            if simulation_results:
                for sr in simulation_results:
                    if isinstance(sr, dict):
                        sr_data = sr
                    else:
                        sr_data = sr.to_dict() if hasattr(sr, "to_dict") else {}
                    
                    if station.lower() in sr_data.get("scenario", "").lower():
                        delta = sr_data.get("delta", {})
                        improvements = []
                        for k, v in delta.items():
                            if isinstance(v, dict) and v.get("direction") == "improved":
                                improvements.append(
                                    f"{k}: {v['percent_change']:+.1f}%"
                                )
                        if improvements:
                            sim_effect = "; ".join(improvements[:3])
                        sim_confidence = sr_data.get("confidence", sim_confidence)
                        break
            
            # Economic impact from bottleneck analysis
            if economic_result and "bottleneck_economic_impact" in economic_result:
                bei = economic_result["bottleneck_economic_impact"]
                cost = bei.get("estimated_cost_impact", 0)
                econ_impact = f"Estimated throughput-related cost impact: ${cost:,.2f} per run"
            
            recommendations.append(Recommendation(
                id=f"REC-{rec_id:03d}",
                priority=1,
                problem=f"High bottleneck pressure at {station} station (score: {score:.2f})",
                evidence=evidence,
                intervention=f"Increase capacity at {station} by 10-20% (add parallel resource, reduce cycle time, or optimize changeover)",
                simulated_effect=sim_effect,
                economic_impact=econ_impact,
                confidence=sim_confidence,
                limitations=[
                    "Simulation result — not a guaranteed real-world outcome",
                    "Based on synthetic DES data, not live production measurements",
                    "Capacity increase cost not included in impact estimate",
                    "Interaction effects with other stations not fully modelled",
                ],
            ))
    
    # --- Recommendation 2: Address utilization imbalance ---
    if bottleneck_result and "all_stations" in bottleneck_result:
        all_stations = bottleneck_result["all_stations"]
        if len(all_stations) >= 2:
            utils = [(s["station"], s["score"]) for s in all_stations]
            max_score = max(u[1] for u in utils)
            min_score = min(u[1] for u in utils)
            
            if max_score - min_score > 0.3:  # Significant imbalance
                rec_id += 1
                recommendations.append(Recommendation(
                    id=f"REC-{rec_id:03d}",
                    priority=2,
                    problem="Significant utilization imbalance across stations",
                    evidence=[
                        f"{s[0]}: bottleneck score = {s[1]:.2f}" for s in utils
                    ],
                    intervention="Rebalance workload: shift capacity from underutilized to overutilized stations",
                    simulated_effect="Expected to reduce queue pressure and improve throughput uniformity",
                    economic_impact="Reduced WIP holding costs and improved throughput",
                    confidence=0.65,
                    limitations=[
                        "Workload rebalancing may require process redesign",
                        "Assumes stations can share or transfer capacity",
                    ],
                ))
    
    # --- Recommendation 3: Root-cause based ---
    if root_cause_result:
        demand_evidence = root_cause_result.get("demand_impact_evidence", [])
        if demand_evidence:
            # Find the strongest demand-driven effect
            strongest = demand_evidence[0] if demand_evidence else None
            if strongest and strongest.get("strength", 0) > 0.5:
                rec_id += 1
                recommendations.append(Recommendation(
                    id=f"REC-{rec_id:03d}",
                    priority=3,
                    problem=f"Strong demand sensitivity detected on {strongest['target']}",
                    evidence=[
                        f"Association: {strongest['source']} → {strongest['target']}",
                        f"Strength: {strongest['strength']:.4f} ({strongest['direction']})",
                        f"Detail: {strongest['detail']}",
                        strongest.get("causation_status", "Observed association"),
                    ],
                    intervention="Implement demand smoothing or buffer capacity for high-demand periods",
                    simulated_effect="Reduced peak-demand stress on constrained resources",
                    economic_impact="Lower variability in throughput and quality outcomes",
                    confidence=0.60,
                    limitations=[
                        "Demand management may be outside factory control",
                        "Association, not confirmed causation",
                        "Effect quantified from simulation data only",
                    ],
                ))
    
    # --- Recommendation 4: WIP management (Model 2 only) ---
    if economic_result and "metrics" in economic_result:
        metrics = economic_result["metrics"]
        if "wip_holding" in metrics:
            wip = metrics["wip_holding"]
            if wip.get("mean_wip", 0) > 100:
                rec_id += 1
                recommendations.append(Recommendation(
                    id=f"REC-{rec_id:03d}",
                    priority=3,
                    problem=f"High WIP inventory (mean={wip['mean_wip']:.0f}, max={wip['max_wip']:.0f})",
                    evidence=[
                        f"Mean WIP across runs: {wip['mean_wip']:.0f} units [MEASURED]",
                        f"Peak WIP: {wip['max_wip']:.0f} units [MEASURED]",
                    ],
                    intervention="Implement pull-based production control (e.g., Kanban limits) to cap WIP",
                    simulated_effect="Reduced storage costs and faster flow-through time",
                    economic_impact="Lower inventory holding costs and reduced risk of obsolescence",
                    confidence=0.70,
                    limitations=[
                        "WIP limits may reduce throughput if set too low",
                        "Requires coordination across production stages",
                    ],
                ))
    
    # Sort by priority
    recommendations.sort(key=lambda r: r.priority)
    return recommendations


def format_recommendations_report(recommendations: list[Recommendation]) -> str:
    """Format recommendations as a readable text report."""
    lines = []
    lines.append("=" * 70)
    lines.append("ForgeMind AI — Recommendations")
    lines.append("=" * 70)
    
    for rec in recommendations:
        lines.append(f"\n{'─' * 60}")
        lines.append(f"  [{rec.id}] Priority: {rec.priority}")
        lines.append(f"  PROBLEM: {rec.problem}")
        lines.append(f"  EVIDENCE:")
        for e in rec.evidence:
            lines.append(f"    • {e}")
        lines.append(f"  INTERVENTION: {rec.intervention}")
        lines.append(f"  SIMULATED EFFECT: {rec.simulated_effect}")
        lines.append(f"  ECONOMIC IMPACT: {rec.economic_impact}")
        lines.append(f"  CONFIDENCE: {rec.confidence:.0%}")
        lines.append(f"  LIMITATIONS:")
        for lim in rec.limitations:
            lines.append(f"    ⚠ {lim}")
        lines.append(f"  TAG: {rec.evidence_tag}")
    
    lines.append(f"\n{'=' * 70}")
    lines.append("All recommendations are advisory. See individual limitations.")
    lines.append("=" * 70)
    
    return "\n".join(lines)
