"""
ForgeMind AI — Tests for Deterministic Simulated Linkage & Scenario Sensitivity
Validates:
1. Deterministic SHA-256 mapping consistency (identical output across restarts)
2. Distinct inspection ID distribution
3. Arena work-center derivation (Drilling, Milling, Assembly — zero fabricated S1-S4)
4. Bottleneck station identification
5. Percentage-point sensitivity calculation: beta = Cov(X,Y)/Var(X), delta_Y = beta * delta_X
6. Zero-variance robustness
7. Evidence tagging and strict non-causal disclosures
8. FastAPI endpoint integration
"""

import pytest
import pandas as pd
import numpy as np
from fastapi.testclient import TestClient

from backend.server import app
from scripts.forgemind.simulated_linkage import (
    get_simulated_production_context,
    compute_work_center_sensitivity,
    WORK_CENTER_COLUMNS,
    NON_LINKAGE_DISCLOSURE,
    SENSITIVITY_DISCLOSURE,
)

client = TestClient(app)


def test_deterministic_hash_consistency():
    """Verify that identical inspection IDs produce identical scenario mappings every time."""
    context_1 = get_simulated_production_context("FM-7714", model_key="Model_1")
    context_2 = get_simulated_production_context("FM-7714", model_key="Model_1")

    assert context_1.linkage.scenario_id == context_2.linkage.scenario_id
    assert context_1.production_context.source_run_id == context_2.production_context.source_run_id
    assert context_1.production_context.scenario_id == "SCN-1167"
    assert context_1.production_context.source_run_id == 1167
    assert context_1.production_context.station == "Assembly"


def test_distinct_inspection_ids_mapping():
    """Verify that different inspection IDs map deterministically to different runs."""
    ctx_7714 = get_simulated_production_context("FM-7714", model_key="Model_1")
    ctx_1042 = get_simulated_production_context("FM-1042", model_key="Model_1")

    assert ctx_7714.linkage.scenario_id != ctx_1042.linkage.scenario_id
    assert ctx_7714.production_context.source_run_id == 1167
    assert ctx_1042.production_context.source_run_id == 1954
    assert ctx_1042.production_context.scenario_id == "SCN-1954"
    assert ctx_1042.production_context.station == "Drilling"


def test_arena_work_centers_only():
    """Verify work centers are strictly real Arena centers: Drilling, Milling, Assembly."""
    valid_stations = {"Drilling", "Milling", "Assembly"}
    for test_id in ["FM-7714", "FM-1042", "FM-0001", "FM-9999", "SPECIMEN-42"]:
        ctx = get_simulated_production_context(test_id, model_key="Model_1")
        assert ctx.production_context.station in valid_stations
        for st in ctx.production_context.all_station_utilizations.keys():
            assert st in valid_stations


def test_no_fabricated_station_names():
    """Ensure no fake station names (S1, S2, S3, S4) or Batch B17 exist in the response payload."""
    ctx = get_simulated_production_context("FM-7714", model_key="Model_1")
    serialized = ctx.model_dump_json()

    for forbidden in ["Station S1", "Station S2", "Station S3", "Station S4", "Batch B17", "Model_1_S3"]:
        assert forbidden not in serialized, f"Forbidden string '{forbidden}' found in simulated context!"


def test_bottleneck_station_is_max_utilization():
    """Verify that the primary constraint station is indeed the one with the maximum utilization in that run."""
    ctx = get_simulated_production_context("FM-7714", model_key="Model_1")
    utils = ctx.production_context.all_station_utilizations
    primary = ctx.production_context.station
    assert primary is not None
    assert utils[primary] == max(utils.values())


def test_percentage_point_sensitivity_calculation():
    """Verify sensitivity math: beta = Cov(X,Y)/Var(X), delta_X = adjustment_pp/100, delta_Y = beta * delta_X."""
    ctx = get_simulated_production_context("FM-7714", model_key="Model_1", sensitivity_delta_pp=-5.0)
    sens = ctx.sensitivity_analysis

    assert sens.status == "AVAILABLE"
    assert sens.evidence_type == "[SENSITIVITY]"
    assert sens.adjustment_percentage_points == -5.0
    assert sens.delta_utilization == -0.05
    assert sens.beta is not None
    assert sens.estimated_delta_throughput is not None

    # Check math: delta_Y = beta * delta_X
    expected_delta_y = round(sens.beta * -0.05, 2)
    assert abs(sens.estimated_delta_throughput - expected_delta_y) < 0.05
    assert sens.bottleneck_station == "Assembly"
    assert sens.sensitivity_variable == "Assembly Util"
    assert sens.throughput_variable == "Parts per hour"


def test_zero_variance_guard():
    """Verify that compute_work_center_sensitivity handles zero variance safely without dividing by zero."""
    # Create synthetic DataFrame where utilization is constant
    dummy_df = pd.DataFrame({
        "Assembly Util": [0.85] * 20,
        "Parts per hour": np.random.uniform(50, 100, size=20),
    })

    result = compute_work_center_sensitivity(
        df=dummy_df,
        model_key="Model_1",
        bottleneck_station="Assembly",
        adjustment_pp=-5.0,
    )

    assert result.status == "UNAVAILABLE"
    assert "Var=0" in (result.reason or "")
    assert result.evidence_type == "[SENSITIVITY]"


def test_model_2_column_mapping():
    """Verify Model_2 maps correctly to its respective column names (Entities Out, etc.)."""
    ctx = get_simulated_production_context("FM-7714", model_key="Model_2", sensitivity_delta_pp=-2.0)
    assert ctx.production_context.model == "Model_2"
    assert ctx.baseline_context["throughput_unit"] == "completed parts"
    assert ctx.sensitivity_analysis.throughput_variable == "Entities Out"


def test_strict_evidence_tagging_and_disclosures():
    """Verify all evidence keys and disclosures are explicitly set."""
    ctx = get_simulated_production_context("FM-7714", model_key="Model_1")
    tags = ctx.evidence_status

    assert "[MEASURED]" in tags["visual_classification"]
    assert "[SIMULATED]" in tags["production_context"]
    assert "[CALCULATED]" in tags["baseline_context"]
    assert "[SENSITIVITY]" in tags["sensitivity_analysis"]
    assert "[HYPOTHESIS]" in tags["causal_status"]
    assert "deterministic analytical mapping" in tags["disclosure"]
    assert "do not establish physical causation" in tags["disclosure"]


def test_fastapi_production_context_endpoint():
    """Verify GET /api/v1/inspection/{id}/production-context returns 200 with verified payload."""
    response = client.get("/api/v1/inspection/FM-7714/production-context?model=Model_1&defect=Crack&confidence=98.5&sensitivity_delta_pp=-5.0")
    assert response.status_code == 200
    data = response.json()

    assert data["inspection"]["inspection_id"] == "FM-7714"
    assert data["inspection"]["defect_class"] == "Crack"
    assert data["linkage"]["scenario_id"] == "SCN-1167"
    assert data["linkage"]["linkage_type"] == "SIMULATED"
    assert data["linkage"]["causal_status"] == "HYPOTHESIS_ONLY"
    assert data["production_context"]["station"] == "Assembly"
    assert data["sensitivity_analysis"]["status"] == "AVAILABLE"
    assert data["sensitivity_analysis"]["evidence_type"] == "[SENSITIVITY]"
