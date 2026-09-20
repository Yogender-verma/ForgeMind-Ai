"""
ForgeMind AI — FastAPI High-Performance Backend
Stack: Python + FastAPI + Scikit-Learn + PostgreSQL + Pydantic v2
"""

import math
import sys
import os
import logging
from typing import Optional, Any

# Ensure project root is in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import numpy as np
import pandas as pd

import starlette.formparsers as fp
import starlette.requests as req

# Monkey-patch Starlette's MultiPartParser default max_part_size from 1024KB to 15MB
# so that form inputs (like 5MB image base64 strings or files) can be parsed without Starlette error.
_orig_multipart_init = fp.MultiPartParser.__init__
def _patched_multipart_init(self, *args, **kwargs):
    if kwargs.get("max_part_size") == 1024 * 1024 or "max_part_size" not in kwargs:
        kwargs["max_part_size"] = 15 * 1024 * 1024  # 15 MB
    return _orig_multipart_init(self, *args, **kwargs)

fp.MultiPartParser.__init__ = _patched_multipart_init

from fastapi import FastAPI, Depends, Query, HTTPException, status, UploadFile, File, Form
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
    SimulatedEconomicImpactRequest,
    CurePreventionApplyActionRequest,
    CurePreventionStatusUpdateRequest,
    CurePreventionVerificationRequest,
)

from scripts.forgemind.cure_prevention_engine import (
    search_similar_cases,
    apply_previous_action,
    update_case_workflow_status,
    verify_case_prevention,
)

# ForgeMind Core Engines
from scripts.forgemind.data_loader import ManufacturingDataset
from scripts.forgemind.feature_engineering import compute_process_health, get_station_metrics
from scripts.forgemind.bottleneck_engine import identify_bottleneck
from scripts.forgemind.root_cause_engine import analyze_root_causes
from scripts.forgemind.ml_engine import compute_ml_feature_importance, detect_process_anomalies
from scripts.forgemind.economic_engine import (
    compute_economic_impact,
    EconomicConfig,
    get_simulated_economic_impact,
    get_simulated_what_if_scenarios,
)
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
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
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


# ---------------------------------------------------------------------------
# Simulated Economic Impact Endpoints (Zero Fabricated Costs)
# ---------------------------------------------------------------------------
@app.post("/api/v1/economic/unit-impact", tags=["Economic Engine"])
@app.get("/api/v1/economic/unit-impact", tags=["Economic Engine"])
def calculate_unit_economic_impact_endpoint(
    impact_level: Optional[str] = Query(None),
    defect: Optional[str] = Query(None),
    confidence: Optional[float] = Query(None),
    user_reason: Optional[str] = Query(None),
    treatment_status: Optional[str] = Query("untreated"),
    payload: Optional[SimulatedEconomicImpactRequest] = None,
):
    """
    Returns user-selected simulated economic impact score (LOW -> 5%, MEDIUM -> 10%, HIGH -> 20%).
    Supports Before Treatment (loss) vs After Treatment (cured net profit recovery).
    Zero monetary values fabricated. Model confidence is kept independent.
    """
    try:
        data = payload.model_dump() if payload else {}
        if impact_level and "impact_level" not in data:
            data["impact_level"] = impact_level
        if defect and "defect_type" not in data:
            data["defect_type"] = defect
        if confidence is not None and "vision_confidence" not in data:
            data["vision_confidence"] = confidence
        if user_reason and "user_reason" not in data:
            data["user_reason"] = user_reason
        if treatment_status and "treatment_status" not in data:
            data["treatment_status"] = treatment_status

        res = get_simulated_economic_impact(data=data)
        return sanitize_value(res)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@app.get("/api/v1/economic/what-if", tags=["Economic Engine"])
@app.post("/api/v1/economic/what-if", tags=["Economic Engine"])
def calculate_economic_what_if_endpoint(
    defect: Optional[str] = Query(None),
    payload: Optional[dict] = None,
):
    """
    Enhanced What-If Simulator:
    - Benchmark sensitivity levels (Scenario A, B, C)
    - 4 alternative remediation pathways ('how many other ways there are')
    - Explicit engineering decision rationale ('why do we choose this way')
    Zero monetary values. Labeled [SIMULATED].
    """
    defect_type = defect
    if payload and isinstance(payload, dict):
        defect_type = payload.get("defect_type", payload.get("defect", defect_type))
    res = get_simulated_what_if_scenarios(defect_type=defect_type)
    return sanitize_value(res)


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


# ---------------------------------------------------------------------------
# Visual Defect Classification Endpoint (EfficientNet-B0 + Grad-CAM)
# ---------------------------------------------------------------------------
@app.post("/api/v1/classify-image")
async def classify_image_endpoint(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    threshold: float = Form(0.85),
    model_variant: str = Form("full_data"),
):
    """
    Classifies manufacturing defect image using trained EfficientNet-B0 model.
    Runs OpenCV quality gate, computes class probabilities (Crack, Normal, Hole, Scratch, Rust),
    and generates Grad-CAM attention heatmap overlay.
    """
    from scripts.ml.inference_service import get_inference_engine
    engine = get_inference_engine(model_variant=model_variant)

    if not engine.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI model unavailable. Please load/train the EfficientNet-B0 model.",
        )

    MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit

    img_data = None
    if file is not None:
        img_data = await file.read()
    elif image_base64:
        clean_b64 = image_base64
        if "," in clean_b64:
            clean_b64 = clean_b64.split(",")[1]
        import base64
        try:
            img_data = base64.b64decode(clean_b64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data encoding.")
    else:
        raise HTTPException(status_code=400, detail="No image file or image_base64 provided.")

    if len(img_data) > MAX_IMAGE_SIZE_BYTES:
        size_mb = len(img_data) / (1024 * 1024)
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds the maximum limit of 5MB (uploaded image is {size_mb:.2f}MB).",
        )

    result = engine.classify_image(
        image_input=img_data,
        include_gradcam=True,
        threshold_override=threshold,
    )

    if not result.get("is_valid", True):
        raise HTTPException(status_code=400, detail=result.get("error", "Image rejected by quality validation."))

    # Generate verified engineering RAG / Gemini investigation report
    try:
        from scripts.ml.gemini_reasoning import investigate_defect_causes
        investigation = investigate_defect_causes(
            defect_class=result["prediction"],
            confidence=result["confidence"] * 100.0,
        )
        result["investigation"] = investigation
    except Exception as e:
        log.warning("Investigation generation notice: %s", e)
        result["investigation"] = None

    return result


# ---------------------------------------------------------------------------
# Defect Engineering Investigation Endpoint (RAG + Gemini Reasoning)
# ---------------------------------------------------------------------------
from pydantic import BaseModel

class DefectInvestigationInput(BaseModel):
    defect: str
    confidence: float = 95.0
    factory_context: Optional[dict] = None


@app.post("/api/v1/investigate-defect", tags=["Quality Intelligence"])
def investigate_defect_endpoint(payload: DefectInvestigationInput):
    """
    RAG-grounded engineering defect cause investigation using retrieved FMEA & technical standards.
    Powered by Gemini LLM with verified deterministic engineering fallback.
    Explicitly enforces non-linkage to manufacturing simulation records unless evidence exists.
    """
    from scripts.ml.gemini_reasoning import investigate_defect_causes
    report = investigate_defect_causes(
        defect_class=payload.defect,
        confidence=payload.confidence,
        factory_context=payload.factory_context,
    )
    return sanitize_value(report)


# ---------------------------------------------------------------------------
# Production Intelligence Endpoint (Rockwell Arena Simulation Dataset)
# ---------------------------------------------------------------------------
@app.get("/api/v1/production-intelligence", tags=["Process Intelligence"])
def get_production_intelligence_endpoint(model: str = Query("Model_1")):
    """
    Calculates verified production metrics from the organizer-provided
    manufacturing simulation dataset (Mendeley DOI: 10.17632/3rw227zxt7.2).
    Includes:
    1. Production Overview
    2. Process Utilization
    3. Bottleneck Analysis
    4. Waiting Time & Queue Analysis
    5. Throughput
    6. Capacity Margins
    7. Production Flow
    8. What-If Scenario Analysis
    All values include data provenance. Zero fabricated numbers.
    """
    from scripts.forgemind.production_intelligence import get_production_intelligence
    return sanitize_value(get_production_intelligence(model_key=model))


@app.get("/api/v1/inspection/{inspection_id}/production-context", tags=["Process Intelligence"])
def get_inspection_production_context_endpoint(
    inspection_id: str,
    model: str = Query("Model_1"),
    defect: Optional[str] = None,
    confidence: Optional[float] = None,
    sensitivity_delta_pp: float = Query(-5.0),
):
    """
    Returns the deterministic simulated production context and scenario sensitivity
    for an inspection specimen, mapped deterministically via SHA-256 to Rockwell Arena simulation runs.
    All data is clearly tagged with evidence status: [MEASURED], [SIMULATED], [CALCULATED], [SENSITIVITY], [HYPOTHESIS].
    """
    from scripts.forgemind.simulated_linkage import get_simulated_production_context
    resp = get_simulated_production_context(
        inspection_id=inspection_id,
        model_key=model,
        defect_class=defect,
        confidence=confidence,
        sensitivity_delta_pp=sensitivity_delta_pp,
    )
    return sanitize_value(resp.model_dump())


# ---------------------------------------------------------------------------
# Cure & Prevention Endpoints (Decision-Support & Historical Learning)
# ---------------------------------------------------------------------------
@app.get("/api/v1/cure-prevention/search", tags=["Cure & Prevention"])
def search_cure_prevention_cases_endpoint(
    defect: Optional[str] = Query(None),
    confidence: Optional[float] = Query(None),
    inspection_id: Optional[str] = Query(None),
):
    """
    Searches historical defect case library for visually/semantically similar cases.
    Confidence is kept independent. Tags include [SIMILARITY], [HYPOTHESIS], [ADVISORY], [SIMULATED].
    """
    res = search_similar_cases(
        defect_type=defect,
        vision_confidence=confidence,
        inspection_id=inspection_id,
    )
    return sanitize_value(res)


@app.post("/api/v1/cure-prevention/apply-action", tags=["Cure & Prevention"])
def apply_cure_prevention_action_endpoint(payload: CurePreventionApplyActionRequest):
    """
    Human-in-the-loop one-click confirmation to use previous corrective action as guidance.
    Transitions status to ACTION_APPROVED [USER CONFIRMED]. Does NOT claim automated repair.
    """
    res = apply_previous_action(
        inspection_id=payload.inspection_id,
        case_id=payload.case_id,
        action_text=payload.action_text,
        user_note=payload.user_note,
    )
    return sanitize_value(res)


@app.post("/api/v1/cure-prevention/status", tags=["Cure & Prevention"])
def update_cure_prevention_status_endpoint(payload: CurePreventionStatusUpdateRequest):
    """
    Transitions case workflow status through valid life-cycle states:
    NEW -> INVESTIGATING -> ACTION_RECOMMENDED -> ACTION_APPROVED -> ACTION_IN_PROGRESS -> RESOLVED -> VERIFICATION_PENDING -> VERIFIED / DEFECT_RECURRED.
    """
    try:
        res = update_case_workflow_status(
            inspection_id=payload.inspection_id,
            new_status=payload.status,
            notes=payload.notes,
        )
        return sanitize_value(res)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@app.post("/api/v1/cure-prevention/verify", tags=["Cure & Prevention"])
def verify_cure_prevention_endpoint(payload: CurePreventionVerificationRequest):
    """
    Records human verification of prevention effectiveness.
    Learns from verified cases by registering them into the historical library.
    """
    try:
        res = verify_case_prevention(
            inspection_id=payload.inspection_id,
            outcome=payload.outcome,
            defect_type=payload.defect_type,
            verification_notes=payload.verification_notes,
        )
        return sanitize_value(res)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.server:app", host=settings.HOST, port=settings.PORT, reload=True)
