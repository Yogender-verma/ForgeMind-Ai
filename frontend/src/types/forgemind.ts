/**
 * ForgeMind AI — TypeScript Domain Definitions
 * Mirrors the FastAPI Pydantic v2 schemas for end-to-end type safety.
 */

export type ModelKey = 'Model_1' | 'Model_2';

export interface StationMetric {
  name: string;
  utilization_mean: number;
  utilization_median: number;
  utilization_std: number;
  utilization_min: number;
  utilization_max: number;
  waiting_time_mean?: number;
  waiting_time_median?: number;
  waiting_time_max?: number;
}

export interface ProcessHealthSummary {
  model: string;
  total_runs: number;
  total_columns: number;
  mean_demand?: number;
  mean_throughput_per_hour?: number;
  mean_total_parts?: number;
  mean_entities_out?: number;
  mean_wip?: number;
  mean_queue_pressure?: number;
  mean_utilization_imbalance?: number;
  evidence_tag: string;
}

export interface ProcessHealthData {
  summary: ProcessHealthSummary;
  station_metrics: StationMetric[];
  sample_preview: Record<string, any>[];
}

export interface BottleneckFactor {
  factor: string;
  raw_value: number;
  normalized_score: number;
  weight: number;
  weighted_score: number;
}

export interface StationConstraint {
  station: string;
  score: number;
  confidence: number;
  factors: BottleneckFactor[];
  explanation: string;
}

export interface BottleneckData {
  primary_bottleneck: StationConstraint;
  secondary_bottlenecks: StationConstraint[];
  all_stations: StationConstraint[];
  scoring_weights: Record<string, number>;
  evidence_tag: string;
  disclaimer: string;
}

export interface EvidenceLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  direction: string;
  detail: string;
  evidence_tag: string;
  causation_status: string;
}

export interface RootCauseData {
  model: string;
  total_evidence_links: number;
  correlation_evidence: EvidenceLink[];
  demand_impact_evidence: EvidenceLink[];
  methodology: Record<string, string>;
  evidence_tag: string;
  disclaimer: string;
}

export interface MLFeatureItem {
  feature: string;
  importance: number;
  importance_pct: number;
  evidence_tag: string;
}

export interface MLFeatureData {
  model: string;
  algorithm: string;
  target_variable: string;
  target_type: string;
  r2_score: number;
  total_features: number;
  ranked_features: MLFeatureItem[];
  evidence_tag: string;
  summary: string;
}

export interface EconomicConfig {
  unit_revenue: number;
  unit_cost: number;
  operating_cost_per_hour: number;
  downtime_cost_per_hour: number;
  scrap_cost_per_unit?: number;
  rework_cost_per_unit?: number;
  simulation_hours?: number;
}

export interface EconomicData {
  model: string;
  economic_config: EconomicConfig;
  metrics: {
    throughput?: { mean_parts_per_run: number; total_parts_all_runs?: number; evidence_tag: string };
    revenue_per_run?: { value: number; evidence_tag: string };
    operating_cost_per_run?: { value: number; evidence_tag: string };
    variable_cost_per_run?: { value: number; evidence_tag: string };
    estimated_profit_per_run?: { value: number; evidence_tag: string };
    profit_margin_pct?: { value: number; evidence_tag: string };
    wip_holding?: { mean_wip: number; max_wip: number };
  };
  bottleneck_economic_impact?: {
    total_bottleneck_cost: number;
    delay_cost?: number;
    lost_throughput_value?: number;
  };
  evidence_tag: string;
  disclaimer: string;
}

export interface SimulationDeltaItem {
  current: number | string;
  simulated: number | string;
  absolute_change?: number;
  percent_change?: number;
  direction?: 'improved' | 'worsened' | 'neutral';
}

export interface SimulationResult {
  scenario: string;
  description: string;
  current_state: Record<string, any>;
  simulated_state: Record<string, any>;
  delta: Record<string, SimulationDeltaItem>;
  confidence: number;
  assumptions: string[];
  evidence_tag: string;
  disclaimer: string;
  saved_to_db?: boolean;
}

export interface PresetScenario {
  name: string;
  description: string;
  parameter_changes: Record<string, number>;
  change_type: string;
}

export interface SimulationParam {
  column: string;
  type: string;
  description: string;
  current_mean?: number;
  current_range?: [number, number];
}

export interface SimulationData {
  presets: PresetScenario[];
  parameters: SimulationParam[];
  sample_runs?: SimulationResult[];
}

export interface Recommendation {
  id: string;
  priority: number;
  problem: string;
  evidence: string[];
  intervention: string;
  simulated_effect: string;
  economic_impact: string;
  confidence: number;
  limitations: string[];
  evidence_tag: string;
}

export interface PipelineFullData {
  model: ModelKey;
  process_health: ProcessHealthData;
  bottleneck: BottleneckData;
  root_cause: RootCauseData;
  ml_feature_importance: MLFeatureData;
  economics: EconomicData;
  simulation: SimulationData;
  recommendations: Recommendation[];
}
