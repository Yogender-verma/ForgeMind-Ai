"""
ForgeMind AI — Scikit-Learn ML Engine and PostgreSQL Database Models Tests
"""

import pytest
import pandas as pd
import numpy as np

from scripts.forgemind.data_loader import ManufacturingDataset
from scripts.forgemind.ml_engine import compute_ml_feature_importance, detect_process_anomalies
from backend.models import SimulationRunRecord, EconomicPresetRecord, AnalysisSnapshotRecord


def test_scikit_learn_feature_importance_model_1():
    ds = ManufacturingDataset("Model_1")
    res = compute_ml_feature_importance(ds.df, "Model_1", target="throughput")
    
    assert res["algorithm"] == "Scikit-Learn RandomForestRegressor"
    assert res["target_type"] == "throughput"
    assert res["r2_score"] > 0.5
    assert len(res["ranked_features"]) > 0
    assert res["ranked_features"][0]["importance"] > 0
    assert res["ranked_features"][0]["evidence_tag"] == "[CALCULATED]"


def test_scikit_learn_feature_importance_model_2():
    ds = ManufacturingDataset("Model_2")
    res = compute_ml_feature_importance(ds.df, "Model_2", target="throughput")
    
    assert res["algorithm"] == "Scikit-Learn RandomForestRegressor"
    assert len(res["ranked_features"]) > 0


def test_scikit_learn_anomaly_detection():
    ds = ManufacturingDataset("Model_1")
    anom = detect_process_anomalies(ds.df, "Model_1", contamination=0.05)
    
    assert anom["algorithm"] == "Scikit-Learn IsolationForest"
    assert anom["total_samples"] == 3000
    assert anom["anomalies_detected"] > 0
    assert anom["anomaly_rate_pct"] == 5.0
    assert anom["evidence_tag"] == "[CALCULATED]"


def test_postgresql_models_schema():
    # Test SimulationRunRecord
    sim = SimulationRunRecord(
        model_key="Model_1",
        scenario_name="Test Capacity +10%",
        description="Test description",
        change_type="multiply",
        parameter_changes={"Drilling Util": 0.9},
        confidence=0.95,
        delta={"Assembly_utilization": {"current": 0.776, "simulated": 0.621}},
        assumptions=["Test assumption 1"],
    )
    sim_dict = sim.to_dict()
    assert sim_dict["model_key"] == "Model_1"
    assert sim_dict["confidence"] == 0.95
    assert "Assembly_utilization" in sim_dict["delta"]

    # Test EconomicPresetRecord
    preset = EconomicPresetRecord(
        name="High Margin Preset",
        unit_revenue=80.0,
        unit_cost=25.0,
        operating_cost_per_hour=180.0,
        downtime_cost_per_hour=600.0,
    )
    preset_dict = preset.to_dict()
    assert preset_dict["name"] == "High Margin Preset"
    assert preset_dict["unit_revenue"] == 80.0

    # Test AnalysisSnapshotRecord
    snapshot = AnalysisSnapshotRecord(
        model_key="Model_1",
        bottleneck_station="Assembly",
        bottleneck_score=1.0,
        estimated_profit=95712.51,
        evidence_summary={"primary_factor": "Queue Delay"},
    )
    snap_dict = snapshot.to_dict()
    assert snap_dict["bottleneck_station"] == "Assembly"
    assert snap_dict["bottleneck_score"] == 1.0
