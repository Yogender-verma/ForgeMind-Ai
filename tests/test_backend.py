"""
ForgeMind AI — FastAPI Endpoints Test Suite
Validates all REST endpoints, Pydantic schemas, Scikit-Learn ML outputs, and PostgreSQL hooks.
"""

import pytest
from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)


def test_api_status():
    res = client.get("/api/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "supported_models" in data
    assert "PostgreSQL" in data["database"]


def test_api_models():
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    assert len(data["models"]) >= 2
    model_ids = [m["id"] for m in data["models"]]
    assert "Model_1" in model_ids
    assert "Model_2" in model_ids


def test_api_process_health():
    res = client.get("/api/process-health?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert data["summary"]["model"] == "Model_1"
    assert len(data["station_metrics"]) == 3
    station_names = [s["name"] for s in data["station_metrics"]]
    assert "Drilling" in station_names
    assert "Milling" in station_names
    assert "Assembly" in station_names


def test_api_bottlenecks():
    res = client.get("/api/bottlenecks?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert "primary_bottleneck" in data
    assert data["primary_bottleneck"]["station"] in ["Assembly", "Drilling", "Milling"]
    assert data["evidence_tag"] == "[CALCULATED]"


def test_api_root_causes():
    res = client.get("/api/root-causes?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert "correlation_evidence" in data
    assert "demand_impact_evidence" in data
    assert len(data["correlation_evidence"]) > 0


def test_api_ml_feature_importance():
    res = client.get("/api/ml/feature-importance?model=Model_1&target=throughput")
    assert res.status_code == 200
    data = res.json()
    assert "Scikit-Learn" in data["algorithm"]
    assert "ranked_features" in data
    assert len(data["ranked_features"]) > 0
    assert data["ranked_features"][0]["evidence_tag"] == "[CALCULATED]"


def test_api_ml_anomalies():
    res = client.get("/api/ml/anomalies?model=Model_1&contamination=0.05")
    assert res.status_code == 200
    data = res.json()
    assert "IsolationForest" in data["algorithm"]
    assert data["total_samples"] == 3000
    assert data["anomalies_detected"] > 0


def test_api_economics():
    res = client.get("/api/economics?model=Model_1&unit_revenue=60.0&unit_cost=35.0")
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    assert data["metrics"]["revenue_per_run"]["value"] > 0
    assert data["evidence_tag"] == "[ESTIMATED]"


def test_api_simulation_scenarios():
    res = client.get("/api/simulation/scenarios?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert len(data["preset_scenarios"]) > 0
    assert len(data["available_parameters"]) > 0


def test_api_simulation_run():
    payload = {
        "model": "Model_1",
        "scenario_name": "Test Simulation Run",
        "description": "Adjusting Assembly Util by 0.85x",
        "parameter_changes": {"Assembly Util": 0.85},
        "change_type": "multiply",
    }
    res = client.post("/api/simulation/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["evidence_tag"] == "[SIMULATED]"
    assert "delta" in data
    assert "Assembly_utilization" in data["delta"]


def test_api_recommendations():
    res = client.get("/api/recommendations?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert len(data["recommendations"]) > 0
    assert data["recommendations"][0]["priority"] == 1


def test_api_pipeline():
    res = client.get("/api/pipeline?model=Model_1")
    assert res.status_code == 200
    data = res.json()
    assert "process_health" in data
    assert "bottleneck" in data
    assert "root_cause" in data
    assert "ml_feature_importance" in data
    assert "economics" in data
    assert "simulation" in data
    assert "recommendations" in data


def test_api_economics_save():
    payload = {
        "name": "Audit Test Preset",
        "unit_revenue": 55.0,
        "unit_cost": 28.0,
        "operating_cost_per_hour": 180.0,
        "downtime_cost_per_hour": 450.0,
    }
    res = client.post("/api/economics/save", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data


def test_api_simulation_history():
    res = client.get("/api/simulation/history?model=Model_1&limit=5")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data


def test_api_pipeline_model_2():
    res = client.get("/api/pipeline?model=Model_2")
    assert res.status_code == 200
    data = res.json()
    assert data["model"] == "Model_2"
    assert "bottleneck" in data
    assert len(data["process_health"]["station_metrics"]) == 3

