"""
ForgeMind AI — Comprehensive Test Suite
Tests all engines: data_loader, feature_engineering, bottleneck_engine,
root_cause_engine, economic_engine, simulation_engine, recommendation_engine.
"""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path

from scripts.forgemind.data_loader import ManufacturingDataset, COLUMN_MAPPINGS
from scripts.forgemind.feature_engineering import compute_process_health, get_station_metrics
from scripts.forgemind.bottleneck_engine import identify_bottleneck
from scripts.forgemind.root_cause_engine import analyze_root_causes
from scripts.forgemind.economic_engine import compute_economic_impact
from scripts.forgemind.simulation_engine import (
    SimulationScenario,
    get_preset_scenarios,
    get_available_parameters,
    run_simulation,
)
from scripts.forgemind.recommendation_engine import (
    generate_recommendations,
    format_recommendations_report,
)


# ---------------------------------------------------------------------------
# Tests: Data Loader
# ---------------------------------------------------------------------------

def test_data_loader_model_1():
    ds = ManufacturingDataset("Model_1")
    df = ds.df
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 3000
    assert "Demand" in df.columns
    assert "Drilling Util" in df.columns


def test_data_loader_model_2():
    ds = ManufacturingDataset("Model_2")
    df = ds.df
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 3000
    assert "Demand" in df.columns
    assert "Drilling Utilization" in df.columns


def test_data_loader_invalid():
    ds = ManufacturingDataset("NonExistentModel")
    with pytest.raises(FileNotFoundError):
        _ = ds.df


# ---------------------------------------------------------------------------
# Tests: Feature Engineering
# ---------------------------------------------------------------------------

def test_feature_engineering_model_1():
    ds = ManufacturingDataset("Model_1")
    df_health = compute_process_health(ds.df, "Model_1")
    assert "total_queue_pressure" in df_health.columns
    assert "utilization_imbalance" in df_health.columns
    assert "bottleneck_station" in df_health.columns
    assert len(df_health) == 3000

    metrics = get_station_metrics(ds.df, "Model_1")
    station_names = [m["name"] for m in metrics]
    assert "Drilling" in station_names
    assert "Milling" in station_names
    assert "Assembly" in station_names
    drilling = next(m for m in metrics if m["name"] == "Drilling")
    assert drilling["utilization_mean"] > 0


def test_feature_engineering_model_2():
    ds = ManufacturingDataset("Model_2")
    df_health = compute_process_health(ds.df, "Model_2")
    assert "total_queue_pressure" in df_health.columns
    assert "total_storage_time" in df_health.columns
    assert "total_wip" in df_health.columns
    assert len(df_health) == 3000

    metrics = get_station_metrics(ds.df, "Model_2")
    station_names = [m["name"] for m in metrics]
    assert "Drilling" in station_names
    assert "Milling" in station_names
    assert "Assembly" in station_names


# ---------------------------------------------------------------------------
# Tests: Bottleneck Engine
# ---------------------------------------------------------------------------

def test_bottleneck_engine_model_1():
    ds = ManufacturingDataset("Model_1")
    metrics = get_station_metrics(ds.df, "Model_1")
    result = identify_bottleneck(metrics)
    assert "primary_bottleneck" in result
    assert result["primary_bottleneck"]["station"] in ["Assembly", "Drilling", "Milling"]
    assert 0.0 <= result["primary_bottleneck"]["score"] <= 1.0
    assert len(result["all_stations"]) == 3
    # Check that score ranking is descending
    scores = [s["score"] for s in result["all_stations"]]
    assert scores == sorted(scores, reverse=True)


def test_bottleneck_engine_model_2():
    ds = ManufacturingDataset("Model_2")
    metrics = get_station_metrics(ds.df, "Model_2")
    result = identify_bottleneck(metrics)
    assert "primary_bottleneck" in result
    assert result["primary_bottleneck"]["score"] > 0.5


# ---------------------------------------------------------------------------
# Tests: Root Cause Engine
# ---------------------------------------------------------------------------

def test_root_cause_engine_model_1():
    ds = ManufacturingDataset("Model_1")
    rc = analyze_root_causes(ds.df, "Model_1")
    assert "correlation_evidence" in rc
    assert "demand_impact_evidence" in rc
    assert rc["total_evidence_links"] > 0
    assert len(rc["correlation_evidence"]) > 0
    # Every evidence link has required fields
    first = rc["correlation_evidence"][0]
    assert "source" in first
    assert "target" in first
    assert "strength" in first
    assert "evidence_tag" in first
    assert first["evidence_tag"] in ["[MEASURED]", "[CALCULATED]"]


# ---------------------------------------------------------------------------
# Tests: Economic Engine
# ---------------------------------------------------------------------------

def test_economic_engine_model_1():
    ds = ManufacturingDataset("Model_1")
    metrics = get_station_metrics(ds.df, "Model_1")
    bn = identify_bottleneck(metrics)
    econ = compute_economic_impact(ds.df, "Model_1", bottleneck_result=bn)
    
    assert "metrics" in econ
    assert "economic_config" in econ
    m = econ["metrics"]
    assert "revenue_per_run" in m
    assert "estimated_profit_per_run" in m
    assert m["revenue_per_run"]["evidence_tag"] == "[ESTIMATED]"
    assert m["estimated_profit_per_run"]["value"] > 0


# ---------------------------------------------------------------------------
# Tests: Simulation Engine
# ---------------------------------------------------------------------------

def test_simulation_engine_model_1():
    ds = ManufacturingDataset("Model_1")
    params = get_available_parameters(ds.df, "Model_1")
    assert len(params) > 0

    scenarios = get_preset_scenarios("Model_1")
    assert len(scenarios) > 0

    sim_res = run_simulation(ds.df, "Model_1", scenarios[0])
    assert sim_res.scenario == scenarios[0].name
    assert sim_res.evidence_tag == "[SIMULATED]"
    assert 0.0 <= sim_res.confidence <= 1.0
    assert isinstance(sim_res.delta, dict)


def test_simulation_engine_custom_scenario():
    ds = ManufacturingDataset("Model_1")
    custom = SimulationScenario(
        name="Custom 15% Reduction in Drilling Util",
        description="Test custom scenario",
        parameter_changes={"Drilling Util": 0.85},
        change_type="multiply",
    )
    sim_res = run_simulation(ds.df, "Model_1", custom)
    assert sim_res.evidence_tag == "[SIMULATED]"
    assert "Drilling_utilization" in sim_res.delta
    assert sim_res.delta["Drilling_utilization"]["percent_change"] == -15.0


# ---------------------------------------------------------------------------
# Tests: Recommendation Engine
# ---------------------------------------------------------------------------

def test_recommendation_engine_model_1():
    ds = ManufacturingDataset("Model_1")
    metrics = get_station_metrics(ds.df, "Model_1")
    bn = identify_bottleneck(metrics)
    rc = analyze_root_causes(ds.df, "Model_1")
    econ = compute_economic_impact(ds.df, "Model_1", bottleneck_result=bn)
    scenarios = get_preset_scenarios("Model_1")
    sim_res = run_simulation(ds.df, "Model_1", scenarios[0])

    recs = generate_recommendations(
        model_key="Model_1",
        bottleneck_result=bn,
        root_cause_result=rc,
        economic_result=econ,
        simulation_results=[sim_res],
    )
    assert len(recs) >= 1
    assert recs[0].priority == 1
    assert len(recs[0].evidence) > 0
    assert len(recs[0].limitations) > 0
    
    report_text = format_recommendations_report(recs)
    assert "ForgeMind AI" in report_text
    assert "Recommendations" in report_text
