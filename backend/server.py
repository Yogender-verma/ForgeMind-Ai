"""
ForgeMind AI — FastAPI High-Performance Backend
Stack: Python + FastAPI + Scikit-Learn + PostgreSQL + Pydantic v2
"""

import math
import logging
from typing import Optional, Any
import numpy as np
import pandas as pd

from fastapi import FastAPI, Depends, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Configuration & PostgreSQL Database
from backend.config import settings
from backend.database import get_db, init_db, is_database_connected
from backend.models import SimulationRunRecord, EconomicPresetRecord, AnalysisSnapshotRecord
from backend.schemas import (
    StatusResponse,
    ModelsResponse,
    ProcessHealthResponse,
    BottleneckResponse,
    RootCauseResponse,
    MLFeatureImportanceResponse,
    EconomicConfigInput,
    EconomicImpactResponse,
    SimulationRequest,
    SimulationResponse,
    RecommendationsResponse,
    PipelineResponse,
)

# ForgeMind Core Engines
from scripts.forgemind.data_loader import ManufacturingDataset
from scripts.forgemind.feature_engineering import compute_process_health, get_station_metrics
from scripts.forgemind.bottleneck_engine import identify_bottleneck
from scripts.forgemind.root_cause_engine import analyze_root_causes
from scripts.forgemind.ml_engine import compute_ml_feature_importance, detect_process_anomalies
from scripts.forgemind.economic_engine import compute_economic_impact, EconomicConfig
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

log = logging.getLogger("forgemind.fastapi")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Attempt PostgreSQL table initialization on startup."""
    init_db()
    yield

# Initialize FastAPI Application
app = FastAPI(
    title="ForgeMind AI — Process Intelligence API",
    description="Autonomous Manufacturing Decision-Support System: Bottleneck Intelligence, Scikit-learn Feature Modeling, Economic Impact, and What-If Simulation.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dataset cache
DATA_CACHE: dict[str, ManufacturingDataset] = {}


def get_dataset(model_key: str) -> ManufacturingDataset:
    valid_keys = ["Model_1", "Model_2"]
    if model_key not in valid_keys:
        model_key = "Model_1"
    if model_key not in DATA_CACHE:
        DATA_CACHE[model_key] = ManufacturingDataset(model_key)
    return DATA_CACHE[model_key]


def sanitize_value(v: Any) -> Any:
    """Recursively clean numpy datatypes and non-finite floats for JSON compliance."""
    if isinstance(v, (np.integer, int)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        if math.isnan(v):
            return None
        if math.isinf(v):
            return 999999.0 if v > 0 else -999999.0
        return float(v)
    if isinstance(v, np.ndarray):
        return [sanitize_value(x) for x in v.tolist()]
    if isinstance(v, dict):
        return {k: sanitize_value(val) for k, val in v.items()}
    if isinstance(v, (list, tuple)):
        return [sanitize_value(val) for val in v]
    return v



# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/status", response_model=StatusResponse, tags=["System"])
def get_system_status():
    """System capabilities and health check."""
    return {
        "status": "healthy",
        "system": "ForgeMind AI — Autonomous Manufacturing Decision-Support",
        "version": "1.0.0-production",
        "supported_models": ["Model_1", "Model_2"],
        "model_3_status": "planned_extension_tabular_only",
        "evidence_taxonomy": ["[MEASURED]", "[CALCULATED]", "[ESTIMATED]", "[SIMULATED]"],
        "dataset_type": "Tabular Discrete-Event Simulation (Mendeley DOI: 10.17632/3rw227zxt7.2)",
        "defect_data_notice": "Tabular process & flow data only. No visual defect image data.",
        "database": "PostgreSQL (SQLAlchemy)" if is_database_connected() else "PostgreSQL (Offline/Standby)",
    }


@app.get("/api/models", response_model=ModelsResponse, tags=["Process Intelligence"])
def list_models():
    """List available models with architecture metadata."""
    return {
        "models": [
            {
                "id": "Model_1",
                "name": "Model 1: 3-Station Manufacturing Line",
                "stations": ["Drilling", "Milling", "Assembly"],
                "features_count": 10,
                "rows_count": 3000,
                "complexity": "Sequential Linear Flow",
                "description": "Sequential single-part line with arrival demand, 3 work centers, and value-added cycle times.",
                "status": "active",
            },
            {
                "id": "Model_2",
                "name": "Model 2: Dual-Part Assembly Line",
                "stations": ["Drilling", "Milling", "Assembly"],
                "features_count": 16,
                "rows_count": 3000,
                "complexity": "Multi-Part Convergent Flow",
                "description": "Two component streams (Part 1 & 2) with storage buffers, independent queues, and convergent assembly.",
                "status": "active",
            },
            {
                "id": "Model_3",
                "name": "Model 3: Enterprise Facility Simulation",
                "stations": ["Multiple work centers", "Queues", "Resource pools"],
                "features_count": 77,
                "rows_count": "Large (311MB)",
                "complexity": "Plant-Scale Simulation",
                "description": "Comprehensive plant model. Preserved in architecture for future extension.",
                "status": "future_ready",
            },
        ]
    }


@app.get("/api/process-health", response_model=ProcessHealthResponse, tags=["Process Intelligence"])
def get_process_health(model: str = Query("Model_1", description="Model identifier (Model_1 or Model_2)")):
    """Compute process-health features and work-center capacity metrics."""
    ds = get_dataset(model)
    df = ds.df

    df_health = compute_process_health(df, model)
    station_metrics = get_station_metrics(df, model)

    summary = {
        "model": model,
        "total_runs": len(df),
        "total_columns": len(df.columns),
        "evidence_tag": "[CALCULATED]",
    }

    if model == "Model_1":
        summary["mean_demand"] = round(float(df["Demand"].mean()), 2)
        summary["mean_throughput_per_hour"] = round(float(df["Parts per hour"].mean()), 2)
        summary["mean_total_parts"] = round(float(df["Total parts"].mean()), 1)
        summary["mean_queue_pressure"] = round(float(df_health["total_queue_pressure"].mean()), 2)
        summary["mean_utilization_imbalance"] = round(float(df_health["utilization_imbalance"].mean()), 3)
    elif model == "Model_2":
        summary["mean_demand"] = round(float(df["Demand"].mean()), 2)
        summary["mean_entities_out"] = round(float(df["Entities Out"].mean()), 1)
        summary["mean_wip"] = round(float(df_health["total_wip"].mean()), 1)
        summary["mean_queue_pressure"] = round(float(df_health["total_queue_pressure"].mean()), 2)
        summary["mean_utilization_imbalance"] = round(float(df_health["utilization_imbalance"].mean()), 3)

    return sanitize_value({
        "summary": summary,
        "station_metrics": station_metrics,
        "sample_preview": df.head(10).to_dict(orient="records"),
    })


@app.get("/api/bottlenecks", response_model=BottleneckResponse, tags=["Bottleneck Engine"])
def get_bottlenecks(model: str = Query("Model_1")):
    """Multi-factor bottleneck identification combining utilization, queues, and variance."""
    ds = get_dataset(model)
    station_metrics = get_station_metrics(ds.df, model)
    res = identify_bottleneck(station_metrics)
    return sanitize_value(res)


@app.get("/api/root-causes", response_model=RootCauseResponse, tags=["Root-Cause Evidence"])
def get_root_causes(model: str = Query("Model_1")):
    """Spearman correlations and grouped demand sensitivity analysis with evidence tags."""
    ds = get_dataset(model)
    res = analyze_root_causes(ds.df, model)
    return sanitize_value(res)


@app.get("/api/ml/feature-importance", response_model=MLFeatureImportanceResponse, tags=["Machine Learning"])
def get_ml_feature_importance(
    model: str = Query("Model_1"),
    target: str = Query("throughput", description="Target variable to predict: 'throughput' or 'queue'"),
):
    """Scikit-Learn RandomForest feature importance identifying non-linear bottleneck drivers."""
    ds = get_dataset(model)
    res = compute_ml_feature_importance(ds.df, model, target=target)
    return sanitize_value(res)


@app.get("/api/ml/anomalies", tags=["Machine Learning"])
def get_ml_anomalies(model: str = Query("Model_1"), contamination: float = Query(0.05)):
    """Scikit-Learn IsolationForest multi-variate process anomaly detection."""
    ds = get_dataset(model)
    res = detect_process_anomalies(ds.df, model, contamination=contamination)
    return sanitize_value(res)


@app.get("/api/economics", response_model=EconomicImpactResponse, tags=["Economic Engine"])
def get_economics(
    model: str = Query("Model_1"),
    unit_revenue: float = Query(50.0),
    unit_cost: float = Query(30.0),
    operating_cost_per_hour: float = Query(200.0),
    downtime_cost_per_hour: float = Query(500.0),
):
    """Configurable financial model estimating line revenue, costs, margins, and bottleneck loss."""
    ds = get_dataset(model)
    config = EconomicConfig(
        unit_revenue=unit_revenue,
        unit_cost=unit_cost,
        operating_cost_per_hour=operating_cost_per_hour,
        downtime_cost_per_hour=downtime_cost_per_hour,
    )
    station_metrics = get_station_metrics(ds.df, model)
    bn = identify_bottleneck(station_metrics)
    res = compute_economic_impact(ds.df, model, config=config, bottleneck_result=bn)
    return sanitize_value(res)


@app.post("/api/economics/save", tags=["Economic Engine"])
def save_economic_preset(
    payload: EconomicConfigInput,
    db: Optional[Session] = Depends(get_db),
):
    """Save an economic assumption preset to PostgreSQL."""
    if db:
        record = EconomicPresetRecord(
            name=payload.name or "Custom Preset",
            unit_revenue=payload.unit_revenue,
            unit_cost=payload.unit_cost,
            operating_cost_per_hour=payload.operating_cost_per_hour,
            downtime_cost_per_hour=payload.downtime_cost_per_hour,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return {"status": "saved", "preset_id": record.id, "database": "PostgreSQL"}
    return {"status": "in_memory_only", "notice": "PostgreSQL offline; preset applied in-session"}


@app.get("/api/simulation/scenarios", tags=["What-If Simulation"])
def get_simulation_scenarios(model: str = Query("Model_1")):
    """Available parameter limits and pre-built operational scenarios."""
    ds = get_dataset(model)
    params = get_available_parameters(ds.df, model)
    presets = get_preset_scenarios(model)
    return sanitize_value({
        "model": model,
        "available_parameters": params,
        "preset_scenarios": [
            {
                "name": p.name,
                "description": p.description,
                "parameter_changes": p.parameter_changes,
                "change_type": p.change_type,
            }
            for p in presets
        ],
    })


@app.post("/api/simulation/run", response_model=SimulationResponse, tags=["What-If Simulation"])
def run_what_if_simulation(
    payload: SimulationRequest,
    db: Optional[Session] = Depends(get_db),
):
    """Execute a what-if simulation scenario and record results in PostgreSQL."""
    ds = get_dataset(payload.model)
    scenario = SimulationScenario(
        name=payload.scenario_name,
        description=payload.description,
        parameter_changes=payload.parameter_changes,
        change_type=payload.change_type,
    )
    result = run_simulation(ds.df, payload.model, scenario)
    res_dict = result.to_dict()

    # Save to PostgreSQL if database connection is available
    saved_to_db = False
    if db:
        try:
            sim_record = SimulationRunRecord(
                model_key=payload.model,
                scenario_name=payload.scenario_name,
                description=payload.description,
                change_type=payload.change_type,
                parameter_changes=payload.parameter_changes,
                confidence=result.confidence,
                delta=result.delta,
                assumptions=result.assumptions,
            )
            db.add(sim_record)
            db.commit()
            saved_to_db = True
        except Exception as e:
            log.warning("Could not persist simulation to PostgreSQL: %s", e)
            db.rollback()

    res_dict["saved_to_db"] = saved_to_db
    return sanitize_value(res_dict)


@app.get("/api/simulation/history", tags=["What-If Simulation"])
def get_simulation_history(
    model: str = Query("Model_1"),
    limit: int = Query(10),
    db: Optional[Session] = Depends(get_db),
):
    """Retrieve historical what-if simulations from PostgreSQL."""
    if db:
        runs = (
            db.query(SimulationRunRecord)
            .filter(SimulationRunRecord.model_key == model)
            .order_by(SimulationRunRecord.id.desc())
            .limit(limit)
            .all()
        )
        return sanitize_value({"history": [r.to_dict() for r in runs]})
    return {"history": [], "notice": "PostgreSQL database offline"}


@app.get("/api/recommendations", response_model=RecommendationsResponse, tags=["Recommendations"])
def get_recommendations(model: str = Query("Model_1")):
    """Synthesize pipeline outputs into prioritized actionable recommendations."""
    ds = get_dataset(model)
    df = ds.df
    station_metrics = get_station_metrics(df, model)
    bn = identify_bottleneck(station_metrics)
    rc = analyze_root_causes(df, model)
    econ = compute_economic_impact(df, model, bottleneck_result=bn)
    presets = get_preset_scenarios(model)
    sim_res = [run_simulation(df, model, presets[0])] if presets else None

    recs = generate_recommendations(
        model_key=model,
        bottleneck_result=bn,
        root_cause_result=rc,
        economic_result=econ,
        simulation_results=sim_res,
    )

    return sanitize_value({
        "model": model,
        "total_recommendations": len(recs),
        "recommendations": [r.to_dict() for r in recs],
        "report_markdown": format_recommendations_report(recs),
    })


@app.get("/api/pipeline", response_model=PipelineResponse, tags=["Process Intelligence"])
def get_full_pipeline(model: str = Query("Model_1")):
    """Unified payload running the full ForgeMind pipeline for fast frontend rendering."""
    ds = get_dataset(model)
    df = ds.df

    # 1. Process Health
    station_metrics = get_station_metrics(df, model)

    # 2. Bottleneck Engine
    bn = identify_bottleneck(station_metrics)

    # 3. Root Causes
    rc = analyze_root_causes(df, model)

    # 4. ML Feature Importance (Scikit-learn)
    ml_fi = compute_ml_feature_importance(df, model, target="throughput")

    # 5. Economic Engine
    econ = compute_economic_impact(df, model, bottleneck_result=bn)

    # 6. Presets & Default Simulation
    presets = get_preset_scenarios(model)
    sim_results = [run_simulation(df, model, p).to_dict() for p in presets[:2]]

    # 7. Recommendations
    sim_obj = [run_simulation(df, model, presets[0])] if presets else None
    recs = generate_recommendations(
        model_key=model,
        bottleneck_result=bn,
        root_cause_result=rc,
        economic_result=econ,
        simulation_results=sim_obj,
    )

    params = get_available_parameters(df, model)

    return sanitize_value({
        "model": model,
        "process_health": {
            "station_metrics": station_metrics,
            "total_runs": len(df),
            "evidence_tag": "[CALCULATED]",
        },
        "bottleneck": bn,
        "root_cause": rc,
        "ml_feature_importance": ml_fi,
        "economics": econ,
        "simulation": {
            "presets": [
                {
                    "name": p.name,
                    "description": p.description,
                    "parameter_changes": p.parameter_changes,
                    "change_type": p.change_type,
                }
                for p in presets
            ],
            "parameters": params,
            "sample_runs": sim_results,
        },
        "recommendations": [r.to_dict() for r in recs],
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host=settings.HOST, port=settings.PORT, reload=True)
