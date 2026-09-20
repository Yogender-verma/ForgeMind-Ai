"""
ForgeMind AI — Deterministic Simulated Linkage & Scenario Sensitivity Engine
Connects visual inspection specimens to Rockwell Arena discrete-event simulation runs
via a reproducible cryptographic hash (SHA-256).

STRICT DATA INTEGRITY & SCIENTIFIC PRINCIPLES:
1. ZERO FABRICATION: No physical linkage exists between images and simulation runs.
2. DETERMINISTIC MAPPING: SHA-256(inspection_id) % len(df) ensures identical results across restarts.
3. EXPLICIT EVIDENCE TAGGING:
   - [MEASURED] = Visual inspection classifier outputs
   - [CALCULATED] = Empirical dataset baseline across all runs
   - [SIMULATED] = Specific linked Arena run row (SCN-XXXX)
   - [SENSITIVITY] = Regression-based throughput sensitivity estimate (NOT an Arena re-simulation)
   - [HYPOTHESIS] = Analytical failure mode interpretations
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import hashlib
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

from scripts.forgemind.data_loader import ManufacturingDataset

DATASET_NAME = "Manufacturing Data Shared Facility - Discrete-Event Simulation (Rockwell Arena)"
DATASET_SOURCE_URL = "https://data.mendeley.com/datasets/3rw227zxt7/2"
DATASET_VERSION = 2

NON_LINKAGE_DISCLOSURE = (
    "This inspection is associated with simulated production scenario {scenario_id} "
    "through a deterministic analytical mapping. The scenario does not represent the "
    "actual manufacturing history of this image, and the supplied datasets do not "
    "establish physical causation."
)

SENSITIVITY_DISCLOSURE = (
    "This is a regression-based sensitivity estimate derived from the supplied Arena "
    "run data. It is not a re-run of the Arena simulation and does not predict guaranteed "
    "factory performance."
)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class VisualInspectionRecord(BaseModel):
    inspection_id: str
    image_id: Optional[str] = None
    image_path: Optional[str] = None
    defect_class: str
    confidence: float
    gradcam_available: bool = True


class SimulationScenario(BaseModel):
    scenario_id: str
    model: str
    scenario_type: str = "ARENA_DISCRETE_EVENT_RUN"
    station: Optional[str] = None
    utilization: Optional[float] = None
    throughput: Optional[float] = None
    waiting_time: Optional[float] = None
    cycle_time: Optional[float] = None
    source_run_id: int
    all_station_utilizations: Dict[str, float] = Field(default_factory=dict)
    all_station_wait_times: Dict[str, float] = Field(default_factory=dict)


class SimulatedProductionLink(BaseModel):
    link_id: str
    inspection_id: str
    scenario_id: str
    linkage_type: str = "SIMULATED"
    linkage_method: str
    created_at: str
    causal_status: str = "HYPOTHESIS_ONLY"


class ScenarioSensitivityResult(BaseModel):
    status: str  # "AVAILABLE" | "UNAVAILABLE"
    evidence_type: str = "[SENSITIVITY]"
    bottleneck_station: Optional[str] = None
    sensitivity_variable: Optional[str] = None
    throughput_variable: Optional[str] = None
    beta: Optional[float] = None
    adjustment_percentage_points: float
    delta_utilization: float
    estimated_delta_throughput: Optional[float] = None
    estimated_throughput: Optional[float] = None
    baseline_throughput: Optional[float] = None
    formula: str
    disclosure: str
    reason: Optional[str] = None


class ProductionContextResponse(BaseModel):
    inspection: VisualInspectionRecord
    linkage: SimulatedProductionLink
    production_context: SimulationScenario
    baseline_context: Dict[str, Any]
    sensitivity_analysis: ScenarioSensitivityResult
    evidence_status: Dict[str, str]


# ---------------------------------------------------------------------------
# Column & Station Definitions
# ---------------------------------------------------------------------------
WORK_CENTER_COLUMNS = {
    "Model_1": {
        "utilization": {
            "Drilling": "Drilling Util",
            "Milling": "Milling Util",
            "Assembly": "Assembly Util",
        },
        "waiting_time": {
            "Drilling": "Drilling Waiting Time",
            "Milling": "Milling Waiting Time",
            "Assembly": "Assembly Waiting Time",
        },
        "throughput": "Parts per hour",
        "cycle_time": "VA Time",
        "demand": "Demand",
        "throughput_unit": "parts/hour",
        "time_unit": "minutes",
    },
    "Model_2": {
        "utilization": {
            "Drilling": "Drilling Utilization",
            "Milling": "Milling Utilization",
            "Assembly": "Assembly Utilization",
        },
        "waiting_time": {
            "Drilling": "Drilling Queue Time",
            "Milling": "Milling Queue Time",
            "Assembly": "Assembly Queue Time",
        },
        "throughput": "Entities Out",
        "cycle_time": "Assembly Time",
        "demand": "Demand",
        "throughput_unit": "completed parts",
        "time_unit": "minutes",
    },
}


# ---------------------------------------------------------------------------
# Deterministic Linkage & Sensitivity Implementation
# ---------------------------------------------------------------------------
def compute_work_center_sensitivity(
    df: pd.DataFrame,
    model_key: str,
    bottleneck_station: Optional[str],
    adjustment_pp: float = -5.0,
) -> ScenarioSensitivityResult:
    """
    Calculates regression-based sensitivity:
    beta = Cov(X, Y) / Var(X)
    where:
    X = selected bottleneck work-center utilization
    Y = line throughput metric
    delta_X = adjustment_pp / 100.0 (percentage-point change)
    estimated_delta_throughput = beta * delta_X
    estimated_throughput = baseline_throughput + estimated_delta_throughput
    """
    col_config = WORK_CENTER_COLUMNS.get(model_key, WORK_CENTER_COLUMNS["Model_1"])
    formula_desc = "β = Cov(Utilization, Throughput) / Var(Utilization); Estimated ΔThroughput = β × ΔUtilization"

    if not bottleneck_station or bottleneck_station not in col_config["utilization"]:
        return ScenarioSensitivityResult(
            status="UNAVAILABLE",
            adjustment_percentage_points=adjustment_pp,
            delta_utilization=adjustment_pp / 100.0,
            formula=formula_desc,
            disclosure=SENSITIVITY_DISCLOSURE,
            reason="Bottleneck work center not identifiable in dataset columns.",
        )

    util_col = col_config["utilization"][bottleneck_station]
    throughput_col = col_config["throughput"]

    if util_col not in df.columns or throughput_col not in df.columns:
        return ScenarioSensitivityResult(
            status="UNAVAILABLE",
            adjustment_percentage_points=adjustment_pp,
            delta_utilization=adjustment_pp / 100.0,
            formula=formula_desc,
            disclosure=SENSITIVITY_DISCLOSURE,
            reason=f"Required columns '{util_col}' or '{throughput_col}' missing from simulation data.",
        )

    series_x = df[util_col].dropna()
    series_y = df[throughput_col].dropna()

    # Align indexes
    common_idx = series_x.index.intersection(series_y.index)
    if len(common_idx) < 10:
        return ScenarioSensitivityResult(
            status="UNAVAILABLE",
            adjustment_percentage_points=adjustment_pp,
            delta_utilization=adjustment_pp / 100.0,
            formula=formula_desc,
            disclosure=SENSITIVITY_DISCLOSURE,
            reason="Insufficient valid observations for sensitivity estimation.",
        )

    x = series_x.loc[common_idx]
    y = series_y.loc[common_idx]

    var_x = float(x.var())
    if var_x == 0.0 or np.isnan(var_x):
        return ScenarioSensitivityResult(
            status="UNAVAILABLE",
            bottleneck_station=bottleneck_station,
            sensitivity_variable=util_col,
            throughput_variable=throughput_col,
            adjustment_percentage_points=adjustment_pp,
            delta_utilization=adjustment_pp / 100.0,
            formula=formula_desc,
            disclosure=SENSITIVITY_DISCLOSURE,
            reason="Insufficient variation in the selected utilization variable for sensitivity estimation (Var=0).",
        )

    cov_xy = float(x.cov(y))
    beta = cov_xy / var_x

    delta_x = adjustment_pp / 100.0
    estimated_delta = float(beta * delta_x)
    baseline_y = float(y.mean())
    estimated_y = float(baseline_y + estimated_delta)

    return ScenarioSensitivityResult(
        status="AVAILABLE",
        evidence_type="[SENSITIVITY]",
        bottleneck_station=bottleneck_station,
        sensitivity_variable=util_col,
        throughput_variable=throughput_col,
        beta=round(beta, 4),
        adjustment_percentage_points=round(adjustment_pp, 2),
        delta_utilization=round(delta_x, 4),
        estimated_delta_throughput=round(estimated_delta, 2),
        estimated_throughput=round(estimated_y, 2),
        baseline_throughput=round(baseline_y, 2),
        formula=formula_desc,
        disclosure=SENSITIVITY_DISCLOSURE,
    )


def get_simulated_production_context(
    inspection_id: str,
    model_key: str = "Model_1",
    defect_class: Optional[str] = None,
    confidence: Optional[float] = None,
    sensitivity_delta_pp: float = -5.0,
) -> ProductionContextResponse:
    """
    Deterministic Linkage Pipeline:
    1. Validates model selection (Model_1 or Model_2).
    2. Loads actual dataset dynamically and queries len(df).
    3. Computes stable SHA-256 hash integer modulo len(df) to select source_run_id.
    4. Extracts exact row from Arena simulation records.
    5. Evaluates work-center utilizations to identify primary constraint station.
    6. Computes baseline ([CALCULATED]) and sensitivity analysis ([SENSITIVITY]).
    7. Formulates strictly validated, non-causal production context payload.
    """
    valid_models = ["Model_1", "Model_2"]
    if model_key not in valid_models:
        model_key = "Model_1"

    ds = ManufacturingDataset(model_key=model_key, use_cleaned=False)
    df = ds.raw_df
    num_runs = len(df)

    if num_runs == 0:
        raise ValueError(f"No usable rows found in dataset for {model_key}")

    # Step 1: Deterministic SHA-256 Hash Mapping
    clean_id = (inspection_id or "UNKNOWN").strip()
    sha256_hash = hashlib.sha256(clean_id.encode("utf-8")).hexdigest()
    hash_int = int(sha256_hash, 16)
    source_run_id = hash_int % num_runs
    scenario_id = f"SCN-{source_run_id:04d}"

    row = df.iloc[source_run_id]
    col_config = WORK_CENTER_COLUMNS[model_key]

    # Step 2: Extract Actual Station Utilizations from the linked run
    station_utils = {}
    for st_name, u_col in col_config["utilization"].items():
        if u_col in row and not pd.isna(row[u_col]):
            val = float(row[u_col])
            station_utils[st_name] = round(val * 100.0, 2)

    # Station Wait Times
    station_waits = {}
    for st_name, w_col in col_config["waiting_time"].items():
        if w_col in row and not pd.isna(row[w_col]):
            station_waits[st_name] = round(float(row[w_col]), 2)

    # Step 3: Determine primary constraint station in this run
    if station_utils:
        sorted_stations = sorted(station_utils.items(), key=lambda item: item[1], reverse=True)
        primary_station = sorted_stations[0][0]
        primary_util = sorted_stations[0][1]
    else:
        primary_station = None
        primary_util = None

    # Step 4: Extract Throughput & Cycle Time
    tp_col = col_config["throughput"]
    ct_col = col_config["cycle_time"]

    throughput_val = round(float(row[tp_col]), 2) if tp_col in row and not pd.isna(row[tp_col]) else None
    cycle_time_val = round(float(row[ct_col]), 2) if ct_col in row and not pd.isna(row[ct_col]) else None
    primary_wait_val = station_waits.get(primary_station) if primary_station else None

    # Step 5: Calculate Baseline [CALCULATED]
    baseline_tp = round(float(df[tp_col].mean()), 2) if tp_col in df.columns else None
    baseline_ct = round(float(df[ct_col].mean()), 2) if ct_col in df.columns else None
    baseline_utils = {
        st_name: round(float(df[u_col].mean()) * 100.0, 2)
        for st_name, u_col in col_config["utilization"].items()
        if u_col in df.columns
    }
    baseline_waits = {
        st_name: round(float(df[w_col].mean()), 2)
        for st_name, w_col in col_config["waiting_time"].items()
        if w_col in df.columns
    }

    baseline_context = {
        "evidence_type": "[CALCULATED]",
        "total_dataset_runs": num_runs,
        "mean_throughput": baseline_tp,
        "throughput_unit": col_config["throughput_unit"],
        "mean_cycle_time": baseline_ct,
        "cycle_time_unit": col_config["time_unit"],
        "mean_station_utilizations": baseline_utils,
        "mean_station_waits": baseline_waits,
    }

    # Step 6: Regression-Based Sensitivity Analysis [SENSITIVITY]
    sensitivity_res = compute_work_center_sensitivity(
        df=df,
        model_key=model_key,
        bottleneck_station=primary_station,
        adjustment_pp=sensitivity_delta_pp,
    )

    # Step 7: Assembly of Pydantic Response
    linkage_record = SimulatedProductionLink(
        link_id=f"LNK-{clean_id}-{scenario_id}",
        inspection_id=clean_id,
        scenario_id=scenario_id,
        linkage_type="SIMULATED",
        linkage_method=(
            f"Deterministic SHA-256 hash indexing over {num_runs} Rockwell Arena "
            f"simulation runs (Run index {source_run_id})"
        ),
        created_at=datetime.utcnow().isoformat() + "Z",
        causal_status="HYPOTHESIS_ONLY",
    )

    scenario_record = SimulationScenario(
        scenario_id=scenario_id,
        model=model_key,
        scenario_type="ARENA_DISCRETE_EVENT_RUN",
        station=primary_station,
        utilization=primary_util,
        throughput=throughput_val,
        waiting_time=primary_wait_val,
        cycle_time=cycle_time_val,
        source_run_id=source_run_id,
        all_station_utilizations=station_utils,
        all_station_wait_times=station_waits,
    )

    inspection_record = VisualInspectionRecord(
        inspection_id=clean_id,
        defect_class=defect_class or "Unspecified",
        confidence=confidence if confidence is not None else 95.0,
        gradcam_available=True,
    )

    evidence_status = {
        "visual_classification": "[MEASURED] Observed from specimen image via EfficientNet-B0",
        "production_context": "[SIMULATED] Linked Rockwell Arena simulation run",
        "baseline_context": "[CALCULATED] Empirical mean across all available Arena runs",
        "sensitivity_analysis": "[SENSITIVITY] Regression-based throughput sensitivity estimate",
        "causal_status": "[HYPOTHESIS] Physical causation is NOT established from supplied data",
        "disclosure": NON_LINKAGE_DISCLOSURE.format(scenario_id=scenario_id),
    }

    return ProductionContextResponse(
        inspection=inspection_record,
        linkage=linkage_record,
        production_context=scenario_record,
        baseline_context=baseline_context,
        sensitivity_analysis=sensitivity_res,
        evidence_status=evidence_status,
    )
