"""
ForgeMind AI — Production Intelligence Engine
Calculates verified production metrics from the organizer-provided
Manufacturing Simulation Dataset (Mendeley DOI: 10.17632/3rw227zxt7.2).

NO HARDCODED VALUES.
NO FABRICATED IMAGE-TO-PRODUCTION RELATIONSHIPS.
EVERY METRIC INCLUDES FULL DATA PROVENANCE.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from scripts.forgemind.data_loader import ManufacturingDataset

DATASET_NAME = "Manufacturing Data Shared Facility - Discrete-Event Simulation (Arena Simulation)"
DATASET_SOURCE_URL = "https://data.mendeley.com/datasets/3rw227zxt7/2"
DATASET_VERSION = 2

UNSUPPORTED_FINANCIAL_MSG = (
    "Financial impact cannot currently be calculated because cost/revenue data is not available."
)
NO_IMAGE_LINKAGE_MSG = (
    "Visual-to-production record linkage is not available in the supplied datasets."
)


def get_production_intelligence(model_key: str = "Model_1") -> Dict[str, Any]:
    """
    Computes all supported production intelligence metrics directly from the simulation dataset.
    Attaches complete provenance and evidence classification to every section.
    """
    ds = ManufacturingDataset(model_key=model_key, use_cleaned=False)
    df = ds.raw_df
    total_records = len(df)
    source_file = f"data/raw/{model_key}/{model_key}.csv"

    # Common provenance helper
    def make_provenance(evidence_type: str, field: str, calculation: str) -> Dict[str, Any]:
        return {
            "evidence_type": evidence_type,
            "source_dataset": DATASET_NAME,
            "source_version": DATASET_VERSION,
            "source_file": source_file,
            "source_field": field,
            "calculation_method": calculation,
        }

    # -------------------------------------------------------------------------
    # 1. Production Overview
    # -------------------------------------------------------------------------
    if model_key == "Model_1":
        mean_demand = float(df["Demand"].mean())
        mean_parts = float(df["Total parts"].mean())
        mean_rate = float(df["Parts per hour"].mean())
        mean_va = float(df["VA Time"].mean())

        overview = {
            "model_identifier": "Model_1 (3-Station Sequential Line)",
            "total_records": total_records,
            "mean_demand": {
                "value": round(mean_demand, 2),
                "unit": "units/order",
                "provenance": make_provenance("[CALCULATED]", "Demand", "mean(df['Demand'])"),
            },
            "mean_total_parts": {
                "value": round(mean_parts, 2),
                "unit": "parts",
                "provenance": make_provenance("[CALCULATED]", "Total parts", "mean(df['Total parts'])"),
            },
            "mean_throughput_rate": {
                "value": round(mean_rate, 2),
                "unit": "parts/hour",
                "provenance": make_provenance("[CALCULATED]", "Parts per hour", "mean(df['Parts per hour'])"),
            },
            "mean_va_time": {
                "value": round(mean_va, 2),
                "unit": "minutes/unit",
                "provenance": make_provenance("[CALCULATED]", "VA Time", "mean(df['VA Time'])"),
            },
        }
    else:  # Model_2
        mean_demand = float(df["Demand"].mean())
        mean_in_p1 = float(df["Entities In Part 1"].mean())
        mean_in_p2 = float(df["Entities In Part 2"].mean())
        mean_out = float(df["Entities Out"].mean())

        overview = {
            "model_identifier": "Model_2 (Dual-Stream Convergent Line)",
            "total_records": total_records,
            "mean_demand": {
                "value": round(mean_demand, 2),
                "unit": "units/order",
                "provenance": make_provenance("[CALCULATED]", "Demand", "mean(df['Demand'])"),
            },
            "mean_entities_in_p1": {
                "value": round(mean_in_p1, 2),
                "unit": "parts",
                "provenance": make_provenance("[CALCULATED]", "Entities In Part 1", "mean(df['Entities In Part 1'])"),
            },
            "mean_entities_in_p2": {
                "value": round(mean_in_p2, 2),
                "unit": "parts",
                "provenance": make_provenance("[CALCULATED]", "Entities In Part 2", "mean(df['Entities In Part 2'])"),
            },
            "mean_entities_out": {
                "value": round(mean_out, 2),
                "unit": "assembled units",
                "provenance": make_provenance("[CALCULATED]", "Entities Out", "mean(df['Entities Out'])"),
            },
        }

    # -------------------------------------------------------------------------
    # 2. Process Utilization
    # -------------------------------------------------------------------------
    if model_key == "Model_1":
        stations = [
            ("Drilling", "Drilling Util"),
            ("Milling", "Milling Util"),
            ("Assembly", "Assembly Util"),
        ]
    else:
        stations = [
            ("Drilling", "Drilling Utilization"),
            ("Milling", "Milling Utilization"),
            ("Assembly", "Assembly Utilization"),
        ]

    utilization_metrics = {}
    for st_name, col in stations:
        series = df[col]
        utilization_metrics[st_name] = {
            "mean_utilization": round(float(series.mean()), 4),
            "mean_utilization_pct": round(float(series.mean()) * 100, 2),
            "min_utilization": round(float(series.min()), 4),
            "max_utilization": round(float(series.max()), 4),
            "std_utilization": round(float(series.std()), 4),
            "provenance": make_provenance(
                "[CALCULATED]",
                col,
                f"mean, min, max, std of df['{col}']"
            ),
        }

    # System-level utilization balance
    util_means = [utilization_metrics[st]["mean_utilization"] for st, _ in stations]
    util_imbalance = float(np.std(util_means))

    # -------------------------------------------------------------------------
    # 3. Bottleneck Analysis
    # -------------------------------------------------------------------------
    # Highest mean utilization is the primary constraint
    sorted_stations = sorted(
        utilization_metrics.items(),
        key=lambda x: x[1]["mean_utilization"],
        reverse=True,
    )
    primary_bn_name = sorted_stations[0][0]
    primary_bn_util = sorted_stations[0][1]["mean_utilization_pct"]
    secondary_bn_name = sorted_stations[1][0]
    secondary_bn_util = sorted_stations[1][1]["mean_utilization_pct"]

    bottleneck_section = {
        "primary_bottleneck": primary_bn_name,
        "primary_bottleneck_utilization_pct": primary_bn_util,
        "secondary_bottleneck": secondary_bn_name,
        "secondary_bottleneck_utilization_pct": secondary_bn_util,
        "system_utilization_imbalance_std": round(util_imbalance, 4),
        "explanation": (
            f"{primary_bn_name} operates at the highest average capacity ({primary_bn_util}%), "
            f"representing the primary line constraint restricting overall line throughput."
        ),
        "provenance": make_provenance(
            "[CALCULATED]",
            ", ".join([c for _, c in stations]),
            "argmax_station(mean(utilization)) across all work centers"
        ),
    }

    # -------------------------------------------------------------------------
    # 4. Waiting Time & Queue Analysis
    # -------------------------------------------------------------------------
    if model_key == "Model_1":
        wait_stations = [
            ("Drilling", "Drilling Waiting Time"),
            ("Milling", "Milling Waiting Time"),
            ("Assembly", "Assembly Waiting Time"),
        ]
    else:
        wait_stations = [
            ("Drilling", "Drilling Queue Time"),
            ("Milling", "Milling Queue Time"),
            ("Assembly", "Assembly Queue Time"),
        ]

    waiting_metrics = {}
    for st_name, col in wait_stations:
        series = df[col]
        waiting_metrics[st_name] = {
            "mean_waiting_time": round(float(series.mean()), 2),
            "max_waiting_time": round(float(series.max()), 2),
            "std_waiting_time": round(float(series.std()), 2),
            "unit": "minutes",
            "provenance": make_provenance(
                "[CALCULATED]",
                col,
                f"mean, max, std of df['{col}']"
            ),
        }

    # -------------------------------------------------------------------------
    # 5. Throughput & Production Flow
    # -------------------------------------------------------------------------
    if model_key == "Model_1":
        throughput_section = {
            "metric": "Parts per hour",
            "mean_throughput": round(float(df["Parts per hour"].mean()), 2),
            "min_throughput": round(float(df["Parts per hour"].min()), 2),
            "max_throughput": round(float(df["Parts per hour"].max()), 2),
            "std_throughput": round(float(df["Parts per hour"].std()), 2),
            "unit": "parts/hour",
            "flow_pattern": "Sequential: Drilling -> Milling -> Assembly",
            "provenance": make_provenance("[CALCULATED]", "Parts per hour", "distribution of df['Parts per hour']"),
        }
    else:
        throughput_section = {
            "metric": "Entities Out (Completed Assemblies)",
            "mean_throughput": round(float(df["Entities Out"].mean()), 2),
            "min_throughput": round(float(df["Entities Out"].min()), 2),
            "max_throughput": round(float(df["Entities Out"].max()), 2),
            "std_throughput": round(float(df["Entities Out"].std()), 2),
            "unit": "completed parts",
            "flow_pattern": "Dual Convergent: Stream 1 (Drilling) + Stream 2 (Milling) -> Assembly",
            "provenance": make_provenance("[CALCULATED]", "Entities Out", "distribution of df['Entities Out']"),
        }

    # -------------------------------------------------------------------------
    # 6. Capacity Margin Analysis
    # -------------------------------------------------------------------------
    capacity_margins = {}
    for st_name, data in utilization_metrics.items():
        margin = round(100.0 - data["mean_utilization_pct"], 2)
        capacity_margins[st_name] = {
            "headroom_pct": margin,
            "status": "Severely Constrained" if margin < 10 else ("Moderately Loaded" if margin < 25 else "Adequate Buffer"),
            "provenance": make_provenance(
                "[CALCULATED]",
                "Utilization",
                f"100.0 - mean_utilization_pct({st_name})"
            ),
        }

    # -------------------------------------------------------------------------
    # 7. Scenario Analysis (What-If based on Empirical Arena Simulation Data)
    # -------------------------------------------------------------------------
    # Empirical regression / quantile shift based strictly on observed dataset rows
    # When primary bottleneck utilization decreases by 10%, what is the empirical throughput correlation?
    if model_key == "Model_1":
        # Spearman / Pearson empirical slope
        cov = df["Assembly Util"].cov(df["Parts per hour"])
        var = df["Assembly Util"].var()
        slope = cov / var if var > 0 else 0.0

        scenario_baseline = float(df["Parts per hour"].mean())
        scenario_delta = -0.10  # 10% reduction in bottleneck load
        scenario_projected = scenario_baseline + (slope * scenario_delta)

        scenario_analysis = {
            "capability_label": "Scenario analysis based on available simulation data",
            "evidence_type": "[SIMULATED]",
            "parameter_adjusted": "Assembly Work Center Capacity / Utilization",
            "baseline_value": round(scenario_baseline, 2),
            "baseline_unit": "parts/hour",
            "scenario_adjustment": "-10% bottleneck utilization shift",
            "projected_throughput": round(scenario_projected, 2),
            "difference": round(scenario_projected - scenario_baseline, 2),
            "provenance": make_provenance(
                "[SIMULATED]",
                "Assembly Util, Parts per hour",
                "Empirical regression slope projection: cov(Assembly Util, Parts per hour) / var(Assembly Util)"
            ),
        }
    else:
        cov = df["Assembly Utilization"].cov(df["Entities Out"])
        var = df["Assembly Utilization"].var()
        slope = cov / var if var > 0 else 0.0

        scenario_baseline = float(df["Entities Out"].mean())
        scenario_delta = -0.10
        scenario_projected = scenario_baseline + (slope * scenario_delta)

        scenario_analysis = {
            "capability_label": "Scenario analysis based on available simulation data",
            "evidence_type": "[SIMULATED]",
            "parameter_adjusted": "Assembly Work Center Queue / Capacity",
            "baseline_value": round(scenario_baseline, 2),
            "baseline_unit": "completed parts",
            "scenario_adjustment": "-10% bottleneck utilization shift",
            "projected_throughput": round(scenario_projected, 2),
            "difference": round(scenario_projected - scenario_baseline, 2),
            "provenance": make_provenance(
                "[SIMULATED]",
                "Assembly Utilization, Entities Out",
                "Empirical regression slope projection: cov(Assembly Utilization, Entities Out) / var(Assembly Utilization)"
            ),
        }

    # -------------------------------------------------------------------------
    # 8. Unambiguous Limitations & Non-linkage Disclaimers
    # -------------------------------------------------------------------------
    return {
        "source_dataset": DATASET_NAME,
        "source_url": DATASET_SOURCE_URL,
        "dataset_version": DATASET_VERSION,
        "model_key": model_key,
        "image_to_production_linkage": {
            "status": "NOT_AVAILABLE",
            "evidence_type": "[MEASURED]",
            "notice": NO_IMAGE_LINKAGE_MSG,
        },
        "economic_impact": {
            "status": "UNSUPPORTED",
            "evidence_type": "[MEASURED]",
            "notice": UNSUPPORTED_FINANCIAL_MSG,
        },
        "production_overview": overview,
        "process_utilization": utilization_metrics,
        "bottleneck_analysis": bottleneck_section,
        "waiting_time_analysis": waiting_metrics,
        "throughput_analysis": throughput_section,
        "capacity_margin_analysis": capacity_margins,
        "what_if_scenario": scenario_analysis,
    }
