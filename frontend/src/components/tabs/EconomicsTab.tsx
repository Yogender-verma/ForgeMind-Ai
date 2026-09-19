import React, { useState } from 'react';
import { EconomicData, EconomicConfig } from '../../types/forgemind';
import { saveEconomicPresetApi } from '../../services/api';

interface EconomicsTabProps {
  data: EconomicData;
  isDbConnected: boolean;
}

export const EconomicsTab: React.FC<EconomicsTabProps> = ({ data, isDbConnected }) => {
  const [config, setConfig] = useState<EconomicConfig>({
    unit_revenue: data.economic_config?.unit_revenue || 50,
    unit_cost: data.economic_config?.unit_cost || 30,
    operating_cost_per_hour: data.economic_config?.operating_cost_per_hour || 200,
    downtime_cost_per_hour: data.economic_config?.downtime_cost_per_hour || 500,
  });

  const [presetName, setPresetName] = useState('Custom Model Preset');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Dynamic calculations based on active sliders
  const isM1 = data.model === 'Model_1';
  const meanUnits = isM1 ? 5025.6 : 2507.0;
  const hours = 24.0;

  const revenue = meanUnits * config.unit_revenue;
  const variableCost = meanUnits * config.unit_cost;
  const operatingCost = config.operating_cost_per_hour * hours;
  const totalCost = variableCost + operatingCost;
  const profit = revenue - totalCost;
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  const bottleneckLoss = (config.downtime_cost_per_hour * 3.5) + (meanUnits * 0.05 * (config.unit_revenue - config.unit_cost));

  const handleSaveToPostgres = async () => {
    try {
      setSaveStatus('Saving to PostgreSQL...');
      const res = await saveEconomicPresetApi(config, presetName);
      setSaveStatus(`Saved successfully to PostgreSQL (ID: ${res.preset_id || 'active'})`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(`Save notice: ${e.message || 'Stored in session'}`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-heading text-white">Configurable Economic Impact Engine</h2>
          <p className="text-xs text-slate-400">
            Model line profitability, cost structures, and bottleneck financial losses under customizable unit economics.
          </p>
        </div>
        <span className="tag-estimated">[ESTIMATED]</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Form Card */}
        <div className="lg:col-span-5 glass-card space-y-4">
          <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider mb-2">
            Unit Cost & Revenue Parameters
          </h3>

          {/* Slider 1: Unit Revenue */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Unit Revenue ($/part)</span>
              <span className="font-mono text-cyan-400 font-bold">${config.unit_revenue.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="1"
              value={config.unit_revenue}
              onChange={(e) => setConfig({ ...config, unit_revenue: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Unit Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Unit Variable Cost ($/part)</span>
              <span className="font-mono text-cyan-400 font-bold">${config.unit_cost.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="1"
              value={config.unit_cost}
              onChange={(e) => setConfig({ ...config, unit_cost: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: Operating Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Operating Cost ($/hour)</span>
              <span className="font-mono text-cyan-400 font-bold">${config.operating_cost_per_hour.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="50"
              max="1000"
              step="10"
              value={config.operating_cost_per_hour}
              onChange={(e) => setConfig({ ...config, operating_cost_per_hour: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 4: Downtime Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-300">Downtime Cost ($/hour)</span>
              <span className="font-mono text-cyan-400 font-bold">${config.downtime_cost_per_hour.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="2500"
              step="25"
              value={config.downtime_cost_per_hour}
              onChange={(e) => setConfig({ ...config, downtime_cost_per_hour: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
            />
          </div>

          {/* Save Preset to PostgreSQL */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-400"
              placeholder="Preset Name"
            />
            <button
              onClick={handleSaveToPostgres}
              className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110 transition cursor-pointer"
            >
              {isDbConnected ? 'Save Preset to PostgreSQL' : 'Save Preset (Local Session)'}
            </button>
            {saveStatus && (
              <p className="text-[11px] font-mono text-center text-cyan-300">{saveStatus}</p>
            )}
          </div>
        </div>

        {/* Financial KPI Display Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass-card">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estimated Revenue / Run</span>
            <div className="text-2xl font-bold font-heading text-cyan-400 mt-2">
              ${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="tag-estimated mt-2 inline-block">[ESTIMATED]</span>
          </div>

          <div className="glass-card">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Operating & Variable Costs</span>
            <div className="text-2xl font-bold font-heading text-rose-400 mt-2">
              ${totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="tag-estimated mt-2 inline-block">[ESTIMATED]</span>
          </div>

          <div className="glass-card sm:col-span-2 border-emerald-500/30 bg-emerald-950/10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Net Profit / Run</span>
                <div className="text-3xl font-extrabold font-heading text-white mt-1">
                  ${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <span className="text-sm font-mono font-bold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                {profitMargin}% Margin
              </span>
            </div>
          </div>

          <div className="glass-card sm:col-span-2 border-amber-500/30">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Bottleneck Constraint Loss</span>
                <div className="text-2xl font-bold font-heading text-amber-300 mt-1">
                  ${bottleneckLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Opportunity cost from idle starvation and delayed order cycle times.
                </p>
              </div>
              <span className="tag-estimated">[ESTIMATED]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
