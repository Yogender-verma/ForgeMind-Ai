"""
ForgeMind AI — Pydantic Validation Schemas
Strongly typed models for FastAPI endpoints and JSON serialization.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field


class StatusResponse(BaseModel):
    status: str
    system: str
    version: str
    supported_models: list[str]
    model_3_status: str
    evidence_taxonomy: list[str]
    dataset_type: str
    defect_data_notice: str
    database: str


class ModelInfo(BaseModel):
    id: str
    name: str
    stations: list[str]
    features_count: int
    rows_count: Any
    complexity: str
    description: str
    status: str


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


class StationMetric(BaseModel):
    name: str
    utilization_mean: float
    utilization_median: float
    utilization_std: float
    utilization_max: float
    utilization_p95: Optional[float] = None
    queue_time_mean: Optional[float] = None
    queue_time_median: Optional[float] = None
    queue_time_max: Optional[float] = None
    queue_time_p95: Optional[float] = None


class ProcessHealthResponse(BaseModel):
    summary: dict[str, Any]
    station_metrics: list[StationMetric]
    sample_preview: list[dict[str, Any]]


class BottleneckFactor(BaseModel):
    factor: str
    raw_value: float
    normalized_score: float
    weight: float
    contribution: float


class StationConstraint(BaseModel):
    station: str
    score: float
    confidence: float
    factors: list[BottleneckFactor]
    explanation: Optional[str] = None
    rank: Optional[int] = None
    evidence_tag: Optional[str] = "[CALCULATED]"


class BottleneckResponse(BaseModel):
    primary_bottleneck: StationConstraint
    secondary_bottlenecks: Optional[list[StationConstraint]] = []
    all_stations: list[StationConstraint]
    scoring_weights: dict[str, float]
    methodology: Optional[str] = None
    evidence_tag: str
    disclaimer: str


class EvidenceLinkItem(BaseModel):
    source: str
    target: str
    type: str
    strength: float
    direction: str
    detail: str
    evidence_tag: str
    causation_status: str


class RootCauseResponse(BaseModel):
    model: str
    total_evidence_links: int
    correlation_evidence: list[EvidenceLinkItem]
    demand_impact_evidence: list[EvidenceLinkItem]
    methodology: dict[str, str]
    evidence_tag: str
    disclaimer: str


class MLFeatureItem(BaseModel):
    feature: str
    importance: float
    importance_pct: float
    evidence_tag: str


class MLFeatureImportanceResponse(BaseModel):
    model: str
    algorithm: str
    target_variable: str
    target_type: str
    r2_score: float
    total_features: int
    ranked_features: list[MLFeatureItem]
    evidence_tag: str
    summary: str


class EconomicConfigInput(BaseModel):
    name: Optional[str] = "Default"
    unit_revenue: float = 50.0
    unit_cost: float = 30.0
    scrap_cost_per_unit: float = 15.0
    rework_cost_per_unit: float = 20.0
    downtime_cost_per_hour: float = 500.0
    operating_cost_per_hour: float = 200.0
    simulation_hours: float = 24.0


class EconomicImpactResponse(BaseModel):
    model: str
    economic_config: dict[str, Any]
    metrics: dict[str, Any]
    bottleneck_economic_impact: Optional[dict[str, Any]] = None
    evidence_tag: str
    disclaimer: str


class SimulationRequest(BaseModel):
    model: str = "Model_1"
    scenario_name: str = "Custom Scenario"
    description: str = "User defined adjustments"
    parameter_changes: dict[str, float]
    change_type: str = "multiply"


class SimulationResponse(BaseModel):
    scenario: str
    description: str
    current_state: dict[str, Any]
    simulated_state: dict[str, Any]
    delta: dict[str, Any]
    confidence: float
    assumptions: list[str]
    evidence_tag: str
    disclaimer: str
    saved_to_db: bool = False


class RecommendationItem(BaseModel):
    id: str
    priority: int
    problem: str
    evidence: list[str]
    intervention: str
    simulated_effect: str
    economic_impact: str
    confidence: float
    limitations: list[str]
    evidence_tag: str


class RecommendationsResponse(BaseModel):
    model: str
    total_recommendations: int
    recommendations: list[RecommendationItem]
    report_markdown: str


class PipelineResponse(BaseModel):
    model: str
    process_health: dict[str, Any]
    bottleneck: dict[str, Any]
    root_cause: dict[str, Any]
    ml_feature_importance: dict[str, Any]
    economics: dict[str, Any]
    simulation: dict[str, Any]
    recommendations: list[dict[str, Any]]
