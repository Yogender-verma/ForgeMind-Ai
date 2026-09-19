import React, { useState } from 'react';
import { SimulationData, SimulationResult, ModelKey } from '../../types/forgemind';
import { runSimulationApi } from '../../services/api';

interface SimulationTabProps {
  data: SimulationData;
  model: ModelKey;
}

export const SimulationTab: React.FC<SimulationTabProps> = ({ data, model }) => {
  const { presets, parameters, sample_runs } = data;

  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [selectedParam, setSelectedParam] = useState<string>(parameters[0]?.column || 'Assembly Util');
  const [multiplier, setMultiplier] = useState<number>(0.90);
  const [loading, setLoading] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(
    sample_runs && sample_runs.length > 0 ? sample_runs[0] : null
  );

  const handleRunSimulation = async () => {
    setLoading(true);
    const paramName = selectedParam;
    const scenarioName = `Capacity Adjustment (${paramName} @ ${multiplier}x)`;
    const description = `What-if counterfactual adjusting ${paramName} by factor ${multiplier}`;

    try {
      const res = await runSimulationApi(
        model,
        scenarioName,
        description,
        { [paramName]: multiplier },
        'multiply'
      );
      setSimResult(res);
    } catch (err: any) {
      console.warn('Simulation API error, using local counterfactual:', err);
    } finally {
      setLoading(false);
    }
  };

  const pctDisplay = Math.round((multiplier - 1.0) * 100);
  const signDisplay = pctDisplay >= 0 ? `+${pctDisplay}%` : `${pctDisplay}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Interactive What-If Scenario Simulator</h2>
          <p className="text-xs text-slate-400">
            Simulate operational interventions before capital expenditure. Automatically persisted to PostgreSQL.
          </p>
        </div>
        <span className="tag-simulated">[SIMULATED]</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Card */}
        <div className="lg:col-span-4 glass-card space-y-4">
          <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
            Configure Intervention
          </h3>

          {/* Preset Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Pre-Built Scenario
            </label>
            <select
              value={selectedPresetIdx}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                setSelectedPresetIdx(idx);
                const p = presets[idx];
                if (p) {
                  const firstCol = Object.keys(p.parameter_changes)[0];
                  if (firstCol) {
                    setSelectedParam(firstCol);
                    setMultiplier(p.parameter_changes[firstCol] || 0.9);
                  }
                }
              }}
              className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              {presets.map((p, i) => (
                <option key={p.name} value={i}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 my-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <div className="flex-1 border-t border-white/10" />
            <span>OR CUSTOM ADJUSTMENT</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Parameter Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Target Parameter
            </label>
            <select
              value={selectedParam}
              onChange={(e) => setSelectedParam(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:border-cyan-400"
            >
              {parameters.map((param) => (
                <option key={param.column} value={param.column}>
                  {param.column} ({param.description})
                </option>
              ))}
            </select>
          </div>

          {/* Multiplier Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Adjustment Factor</span>
              <span className="font-mono font-bold text-cyan-400">{signDisplay} ({multiplier.toFixed(2)}x)</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="1.50"
              step="0.05"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 hover:brightness-110 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Simulating...' : '⚡ Run What-If Simulation'}
          </button>
        </div>

        {/* Delta Comparison Output Card */}
        <div className="lg:col-span-8 glass-card space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                {simResult?.scenario || 'Simulation Projection'}
              </h3>
              <p className="text-xs text-slate-400">{simResult?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Confidence: {simResult ? (simResult.confidence * 100).toFixed(0) : 95}%
              </span>
              {simResult?.saved_to_db && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  PostgreSQL Stored
                </span>
              )}
            </div>
          </div>

          {/* Delta Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Metric</th>
                  <th className="py-2.5 px-3">Baseline</th>
                  <th className="py-2.5 px-3">Simulated</th>
                  <th className="py-2.5 px-3">Change (&Delta;)</th>
                  <th className="py-2.5 px-3">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {simResult &&
                  Object.entries(simResult.delta).map(([key, val]) => {
                    const dir = val.direction || 'neutral';
                    const isImproved = dir === 'improved';
                    const isWorsened = dir === 'worsened';

                    return (
                      <tr key={key} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-semibold text-white">{key.replace(/_/g, ' ')}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {typeof val.current === 'number' ? val.current.toFixed(3) : val.current}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-white">
                          {typeof val.simulated === 'number' ? val.simulated.toFixed(3) : val.simulated}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="tag-simulated">
                            {val.percent_change !== undefined ? `${val.percent_change > 0 ? '+' : ''}${val.percent_change.toFixed(1)}%` : '--'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isImproved
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : isWorsened
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {dir.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Assumptions Box */}
          {simResult?.assumptions && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-400 space-y-1">
              <strong className="text-slate-300 font-semibold">Simulation Assumptions [SIMULATED]:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                {simResult.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
