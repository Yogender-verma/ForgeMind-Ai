/// <reference types="vite/client" />
/**
 * ForgeMind AI — API Client Service
 * Connects React frontend to the FastAPI backend (with Vercel/Render env support).
 */

import { ModelKey, PipelineFullData, SimulationResult, EconomicConfig } from '../types/forgemind';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8000'
    : ''
);

export async function getSystemStatus(): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/status`);
  if (!res.ok) throw new Error(`Status check failed: ${res.statusText}`);
  return res.json();
}

export async function getPipelineData(model: ModelKey): Promise<PipelineFullData> {
  const res = await fetch(`${API_BASE_URL}/api/pipeline?model=${model}`);
  if (!res.ok) throw new Error(`Pipeline fetch failed: ${res.statusText}`);
  return res.json();
}

export async function runSimulationApi(
  model: ModelKey,
  scenarioName: string,
  description: string,
  parameterChanges: Record<string, number>,
  changeType: string = 'multiply'
): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE_URL}/api/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      scenario_name: scenarioName,
      description,
      parameter_changes: parameterChanges,
      change_type: changeType,
    }),
  });
  if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
  return res.json();
}

export async function saveEconomicPresetApi(config: EconomicConfig, name: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/economics/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      unit_revenue: config.unit_revenue,
      unit_cost: config.unit_cost,
      operating_cost_per_hour: config.operating_cost_per_hour,
      downtime_cost_per_hour: config.downtime_cost_per_hour,
    }),
  });
  if (!res.ok) throw new Error(`Preset save failed: ${res.statusText}`);
  return res.json();
}
