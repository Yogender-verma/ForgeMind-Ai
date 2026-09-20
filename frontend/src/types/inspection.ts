/**
 * ForgeMind AI — Inspection & Analysis Domain Types
 * Strictly enforces evidence-based knowledge taxonomy:
 * [MEASURED], [CALCULATED], [ESTIMATED], [SIMULATED], [HYPOTHESIS]
 */

export type DefectType = 'Crack' | 'Hole' | 'Normal' | 'Rust' | 'Scratch' | 'Scratches';

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SeverityInfo {
  level: SeverityLevel | null;
  score?: number;
  basis?: string;
  confidence?: number;
  evidence?: string[];
  status: 'measured' | 'calculated' | 'estimated' | 'simulated' | 'not_available';
}

export interface BoundingBox {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface PotentialCauseItem {
  cause: string;
  explanation: string;
  evidence_strength: 'low' | 'moderate' | 'strong';
  sources: string[];
}

export interface RecommendedActionItem {
  action: string;
  reason: string;
  sources: string[];
}

export interface DefectInvestigationData {
  defect: string;
  potential_causes: PotentialCauseItem[];
  recommended_actions: RecommendedActionItem[];
  factory_evidence: string[];
  limitations: string[];
  requires_engineer_review: boolean;
  insufficient_evidence?: boolean;
  status_message?: string | null;
}

export interface InspectionRecord {
  id: string; // e.g. "FM-7714"
  imageUrl: string;
  imageName: string;
  timestamp: string; // ISO string
  formattedDate: string;
  prediction: DefectType;
  confidence: number; // 0 to 100
  status: 'Defective' | 'Normal' | 'Uncertain';
  severity: SeverityInfo;
  box?: BoundingBox;
  defectSizeMm?: number;
  modelKey?: string; // Optional — visual images do NOT map to discrete-event simulation models
  stationOrigin?: string; // Deprecated — no visual-to-production mapping exists
  batchNumber?: string; // Deprecated — no visual-to-production mapping exists
  notes?: string;
  investigation?: DefectInvestigationData; // RAG + Gemini engineering knowledge reasoning
  hypotheses?: Array<{
    factor: string;
    probability: number;
    evidence: string;
  }>;
  economicLossEstimated?: {
    scrapCost: number;
    reworkCost: number;
    downtimeCost: number;
    productionLoss: number;
    total: number;
  };
  probabilities?: Record<string, number>;
  gradcamOverlayUrl?: string;
  qualityStatus?: string;
  qualityIssues?: string[];
  isLowConfidence?: boolean;
  aiModel?: string;
}

export interface DashboardKPIs {
  totalInspections: number;
  defectiveUnits: number;
  normalUnits: number;
  defectRatePct: number;
  averageConfidencePct: number;
  uncertainCases: number;
  hasData: boolean;
}

export interface DefectDistributionItem {
  defectClass: DefectType;
  count: number;
  percentage: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Simulated Visual <-> Production Linkage & Sensitivity Types
// Strictly labeled: [MEASURED], [SIMULATED], [CALCULATED], [SENSITIVITY], [HYPOTHESIS]
// ---------------------------------------------------------------------------
export interface SimulatedProductionLinkInfo {
  link_id: string;
  inspection_id: string;
  scenario_id: string;
  linkage_type: 'SIMULATED';
  linkage_method: string;
  created_at: string;
  causal_status: 'HYPOTHESIS_ONLY';
}

export interface SimulationScenarioContext {
  scenario_id: string;
  model: string;
  scenario_type: string;
  station: string | null;
  utilization: number | null;
  throughput: number | null;
  waiting_time: number | null;
  cycle_time: number | null;
  source_run_id: number;
  all_station_utilizations: Record<string, number>;
  all_station_wait_times: Record<string, number>;
}

export interface BaselineProductionContext {
  evidence_type: '[CALCULATED]';
  total_dataset_runs: number;
  mean_throughput: number | null;
  throughput_unit: string;
  mean_cycle_time: number | null;
  cycle_time_unit: string;
  mean_station_utilizations: Record<string, number>;
  mean_station_waits: Record<string, number>;
}

export interface ScenarioSensitivityData {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  evidence_type: '[SENSITIVITY]';
  bottleneck_station?: string | null;
  sensitivity_variable?: string | null;
  throughput_variable?: string | null;
  beta?: number | null;
  adjustment_percentage_points: number;
  delta_utilization: number;
  estimated_delta_throughput?: number | null;
  estimated_throughput?: number | null;
  baseline_throughput?: number | null;
  formula: string;
  disclosure: string;
  reason?: string | null;
}

export interface ProductionContextResponseData {
  inspection: {
    inspection_id: string;
    image_id?: string | null;
    image_path?: string | null;
    defect_class: string;
    confidence: number;
    gradcam_available: boolean;
  };
  linkage: SimulatedProductionLinkInfo;
  production_context: SimulationScenarioContext;
  baseline_context: BaselineProductionContext;
  sensitivity_analysis: ScenarioSensitivityData;
  evidence_status: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Simulated User-Selected Economic Impact Types
// ---------------------------------------------------------------------------
export type SimulatedImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | null;
export type DefectTreatmentStatus = 'untreated' | 'cured';

export interface SimulatedEconomicImpactResult {
  impact_level: SimulatedImpactLevel;
  simulated_impact_pct: number | null;
  formatted_impact: string;
  evidence_tag: string; // '[SIMULATED]'
  status: 'assessed' | 'not_assessed';
  defect_type?: string | null;
  vision_confidence?: number | null;
  user_reason?: string;
  reason_tag?: string | null; // '[USER INPUT]'
  treatment_status?: DefectTreatmentStatus;
  before_treatment_loss_pct?: number | null;
  formatted_before_treatment_loss?: string;
  treatment_overhead_pct?: number | null;
  formatted_treatment_overhead?: string;
  after_treatment_profit_pct?: number | null;
  formatted_after_treatment_profit?: string;
  avoided_loss_pct?: number | null;
  net_profit_recovery_pct?: number | null;
  disclosure: string;
  future_integration_note: string;
}

// Retain alias for component backwards-compatibility if needed
export type UnitEconomicResult = SimulatedEconomicImpactResult;

export interface RemediationPathway {
  pathway_id: string;
  name: string;
  category: string;
  description: string;
  is_recommended: boolean;
  badge: string;
  net_profit_recovery_pct: number;
  formatted_profit_recovery: string;
  avoided_loss_pct: number;
  treatment_overhead_pct: number;
  cycle_time_delta_min: number;
  formatted_cycle_time: string;
  feasibility: string;
  quality_risk: string;
  final_grade: string;
}

export interface WhyChooseReason {
  title: string;
  detail: string;
  metric: string;
}

export interface WhyChooseThisWay {
  recommended_pathway_id: string;
  recommended_pathway_name: string;
  summary: string;
  defect_type: string;
  key_reasons: WhyChooseReason[];
}

export interface SimulatedWhatIfScenario {
  scenario_id: string;
  name: string;
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH';
  simulated_impact_pct: number;
  formatted_impact: string;
  description: string;
}

export interface SimulatedWhatIfResult {
  evidence_tag: string;
  method?: string;
  notice?: string;
  disclosure?: string;
  defect_type?: string;
  total_ways_available?: number;
  pathways?: RemediationPathway[];
  recommended_pathway_id?: string;
  why_we_choose_this_way?: WhyChooseThisWay;
  scenarios: SimulatedWhatIfScenario[];
}

export type EconomicWhatIfResult = SimulatedWhatIfResult;

// ---------------------------------------------------------------------------
// Cure & Prevention Domain Types (Decision-Support & Historical Learning)
// ---------------------------------------------------------------------------
export type CaseWorkflowStatus =
  | 'NEW'
  | 'INVESTIGATING'
  | 'ACTION_RECOMMENDED'
  | 'ACTION_APPROVED'
  | 'ACTION_IN_PROGRESS'
  | 'RESOLVED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'DEFECT_RECURRED';

export interface EvidenceWhyRelevantItem {
  label: string;
  tag: string;
  detail?: string;
}

export interface CureActionData {
  previous_action_summary: string;
  evidence_tag: string;
  simulated_tag: string;
  recommended_review: string;
  advisory_tag: string;
  disclaimer: string;
}

export interface PreventionData {
  guidance: string;
  procedure: string;
  advisory_tag: string;
  effectiveness_notice: string;
}

export interface SimilarCaseData {
  case_id: string;
  defect: string;
  status: string;
  status_tag: string;
  similarity_pct: number;
  similarity_tag: string;
  previous_image_ref?: string;
  previous_investigation: string;
  previous_possible_cause: string;
  cause_tag: string;
  previous_recommended_action: string;
  action_tag: string;
  previous_human_decision: string;
  decision_tag: string;
  previous_outcome: string;
  outcome_tag: string;
  evidence_why_relevant: EvidenceWhyRelevantItem[];
  cure_action: CureActionData;
  prevention: PreventionData;
  similarity_disclaimer: string;
}

export interface CurrentDefectInfo {
  defect: string;
  vision_confidence: number;
  confidence_tag: string;
  confidence_note: string;
  inspection_id: string;
}

export interface CaseStatusState {
  inspection_id: string;
  status: CaseWorkflowStatus;
  status_tag: string;
  applied_action?: string | null;
  confirmed_by_user: boolean;
  verification_status: string;
  notes?: string;
}

export interface CurePreventionSearchResult {
  status: 'similar_found' | 'no_similar_case';
  title: string;
  message?: string;
  current_defect: CurrentDefectInfo;
  similar_case?: SimilarCaseData;
  active_case_status: CaseStatusState;
  evidence_tag: string;
  can_start_investigation?: boolean;
  learning_loop?: Array<{ step: string; desc: string }>;
}



