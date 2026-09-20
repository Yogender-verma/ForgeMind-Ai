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


# ---------------------------------------------------------------------------
# Simulated Economic Impact Schemas (Zero Fabricated Monetary Values)
# ---------------------------------------------------------------------------
class SimulatedEconomicImpactRequest(BaseModel):
    impact_level: Optional[str] = Field(None, description="User-selected impact level: 'LOW', 'MEDIUM', or 'HIGH'")
    defect_type: Optional[str] = Field(None, description="Predicted or confirmed defect type")
    vision_confidence: Optional[float] = Field(None, description="Vision model confidence (strictly decoupled from impact)")
    user_reason: Optional[str] = Field(None, description="Optional engineering rationale for selected impact level")
    treatment_status: Optional[str] = Field("untreated", description="Defect treatment state: 'untreated' or 'cured'")


# Backwards compatibility alias
UnitEconomicInputRequest = SimulatedEconomicImpactRequest
EconomicWhatIfRequest = BaseModel


# ---------------------------------------------------------------------------
# Cure & Prevention Schemas (Decision Support & Historical Learning)
# ---------------------------------------------------------------------------
class CurePreventionApplyActionRequest(BaseModel):
    inspection_id: str = Field(..., description="ID of current inspection specimen (e.g. FM-7714)")
    case_id: str = Field(..., description="ID of matched previous case (e.g. CASE-DEMO-018)")
    action_text: str = Field(..., description="Corrective procedure text to apply")
    user_note: Optional[str] = Field(None, description="Optional engineer notes on action application")


class CurePreventionStatusUpdateRequest(BaseModel):
    inspection_id: str = Field(..., description="ID of current inspection specimen")
    status: str = Field(..., description="Target workflow state")
    notes: Optional[str] = Field(None, description="Optional transition rationale")


class CurePreventionVerificationRequest(BaseModel):
    inspection_id: str = Field(..., description="ID of current inspection specimen")
    outcome: str = Field(..., description="'verified' or 'recurred'")
    defect_type: Optional[str] = Field(None, description="Defect type for historical learning storage")
    verification_notes: Optional[str] = Field(None, description="Quality engineer verification notes")


# ---------------------------------------------------------------------------
# Factory Assistant & Multi-Source RAG Schemas
# ---------------------------------------------------------------------------
class FactoryAssistantChatRequest(BaseModel):
    message: str = Field(..., description="User query or message")
    history: Optional[list[dict[str, str]]] = Field(default=None, description="Recent conversation turns")
    inspection_context: Optional[dict[str, Any]] = Field(default=None, description="Active inspection specimen metadata")


class FactoryAssistantChatResponse(BaseModel):
    reply: str
    evidence: str = ""
    sources: list[dict[str, Any]] = Field(default_factory=list)
    provenance_tags: list[str] = Field(default_factory=list)
    suggested_actions: list[str] = Field(default_factory=list)
    is_fallback: bool = False


# ---------------------------------------------------------------------------
# What-If Process Simulation Schemas (Current vs Alternative Process)
# ---------------------------------------------------------------------------
class WhatIfSimulationRequest(BaseModel):
    baseline_throughput: float = Field(200.0, description="Current baseline throughput in units/hr")
    alternative_throughput: float = Field(215.0, description="Alternative scenario throughput in units/hr")
    baseline_defect_rate: float = Field(4.5, description="Current defect rate in %")
    alternative_defect_rate: float = Field(1.2, description="Alternative defect rate in %")
    cycle_time_delta_sec: float = Field(-3.5, description="Cycle time change in seconds")
    scenario_name: Optional[str] = Field("Optimized Fixture & Coolant Delivery", description="Name of alternative scenario")


class WhatIfSimulationResponse(BaseModel):
    scenario_name: str
    baseline: dict[str, Any]
    alternative: dict[str, Any]
    throughput_change_units_hr: float
    throughput_change_pct: float
    defect_rate_change_pp: float
    cycle_time_delta_sec: float
    simulated_impact_level: str
    relative_capacity_gain_pct: float
    evidence_tag: str = "[SIMULATED]"
    disclaimer: str


# ---------------------------------------------------------------------------
# Historical Case & Knowledge Search Schemas
# ---------------------------------------------------------------------------
class HistoricalCasesListResponse(BaseModel):
    total_cases: int
    cases: list[dict[str, Any]]
    evidence_tag: str = "[HISTORICAL EVIDENCE]"


class KnowledgeSearchResponse(BaseModel):
    query: str
    defect_class: Optional[str] = None
    total_sources: int
    sources: list[dict[str, Any]]
