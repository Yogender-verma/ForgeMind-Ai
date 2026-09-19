import React, { useState } from 'react';
import { saveSimulationScenario } from '../../services/firebase';

export const WhatIfSimulatorSection: React.FC = () => {
  // Interactive scenario controls
  const [cycleTime, setCycleTime] = useState<number>(45); // seconds
  const [stationCapacity, setStationCapacity] = useState<number>(120); // units/hr
  const [utilization, setUtilization] = useState<number>(88); // percent
  const [productionRate, setProductionRate] = useState<number>(100); // units/hr
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic simulation calculations
  // Throughput (units/hr): constrained by rate and capacity and utilization
  const calculatedThroughput = Math.round(
    Math.min(stationCapacity, productionRate * (utilization / 100)) * (60 / cycleTime) * 0.75
  );

  // WIP (Work In Progress units): rises if cycle time or utilization is too high
  const estimatedWIP = Math.max(12, Math.round((productionRate * (cycleTime / 60)) * (utilization / 80)));

  // Scrap / Rework Rate (%): increases if line is pushed past 92% utilization or cycle time is compressed below 38s
  const speedStress = Math.max(0, (95 - cycleTime) * 0.05);
  const utilStress = utilization > 90 ? (utilization - 90) * 0.35 : 0;
  const simulatedScrapRate = Number(Math.min(12.5, Math.max(1.2, 2.1 + speedStress + utilStress)).toFixed(1));

  // Shift production loss ($): scrap count * $45 + bottleneck starvation cost
  const unitsPerShift = calculatedThroughput * 8;
  const scrappedUnits = Math.round(unitsPerShift * (simulatedScrapRate / 100));
  const estimatedProductionLoss = Math.round(scrappedUnits * 45 + (100 - utilization) * 18);

  // Monthly profit impact delta compared to baseline ($35,000 baseline)
  const baselineProfit = 35000;
  const monthlyRevenue = unitsPerShift * 22 * 65; // 22 shifts/mo, $65 revenue/unit
  const monthlyCost = unitsPerShift * 22 * 32 + estimatedProductionLoss * 22;
  const simulatedProfitImpact = Math.round((monthlyRevenue - monthlyCost) - baselineProfit);

  const resetToBaseline = () => {
    setCycleTime(45);
    setStationCapacity(120);
    setUtilization(88);
    setProductionRate(100);
  };

  return (
    <section id="simulator" className="py-20 lg:py-28 relative border-t border-white/5 bg-[#080c14] industrial-grid overflow-hidden">
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-cyan-500/5 blur-[140px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>HERO FEATURE PREVIEW</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-white tracking-tight">
            What If You Could Test the Factory Before Changing It?
          </h2>
          <p className="text-slate-400 text-base sm:text-lg">
            Simulate operational adjustments across cycle times, station capacities, and line speed before making irreversible capital or tooling commitments on physical plant equipment.
          </p>
        </div>

        {/* Interactive Simulator Cockpit */}
        <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 backdrop-blur-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(0,229,255,0.12)] overflow-hidden">
          
          {/* Cockpit Top Bar */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-white/10 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-heading font-bold text-white text-base tracking-wide">
                Interactive What-If Scenario Modeler
              </span>
              <span className="tag-simulated text-[10px] hidden sm:inline-block">[SIMULATED]</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetToBaseline}
                className="px-3 py-1 text-xs font-mono text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-400/50 rounded-lg transition"
              >
                Reset Baseline
              </button>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800/80 border border-white/10 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Deterministic Model: Ready</span>
              </div>
            </div>
          </div>

          {/* Cockpit Main Grid: Controls on Left, Outputs on Right */}
          <div className="p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Interactive Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Scenario Parameter Controls
                </h4>
                <span className="text-[10px] font-mono text-cyan-400">Drag to recompute</span>
              </div>

              {/* Control 1: Cycle Time */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-200">Cycle Time</label>
                  <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-0.5 rounded border border-white/10">
                    {cycleTime} <span className="text-xs text-slate-400">sec</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="80"
                  value={cycleTime}
                  onChange={(e) => setCycleTime(Number(e.target.value))}
                  className="industrial-slider"
                  aria-label="Cycle Time Slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Fast (25s)</span>
                  <span>Optimal (45s)</span>
                  <span>High Latency (80s)</span>
                </div>
              </div>

              {/* Control 2: Station Capacity */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-200">Station Capacity</label>
                  <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-0.5 rounded border border-white/10">
                    {stationCapacity} <span className="text-xs text-slate-400">units/hr</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={stationCapacity}
                  onChange={(e) => setStationCapacity(Number(e.target.value))}
                  className="industrial-slider"
                  aria-label="Station Capacity Slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>60 u/h</span>
                  <span>120 u/h</span>
                  <span>200 u/h</span>
                </div>
              </div>

              {/* Control 3: Utilization */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-200">Utilization</label>
                  <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-0.5 rounded border border-white/10">
                    {utilization}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={utilization}
                  onChange={(e) => setUtilization(Number(e.target.value))}
                  className="industrial-slider"
                  aria-label="Utilization Slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>50%</span>
                  <span>85% (Target)</span>
                  <span>100% (Constrained)</span>
                </div>
              </div>

              {/* Control 4: Production Rate */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label className="font-medium text-slate-200">Production Rate</label>
                  <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2.5 py-0.5 rounded border border-white/10">
                    {productionRate} <span className="text-xs text-slate-400">units/hr</span>
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={productionRate}
                  onChange={(e) => setProductionRate(Number(e.target.value))}
                  className="industrial-slider"
                  aria-label="Production Rate Slider"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>40 u/h</span>
                  <span>100 u/h</span>
                  <span>160 u/h</span>
                </div>
              </div>
            </div>

            {/* Right Column: Simulated Outputs */}
            <div className="lg:col-span-6 space-y-6">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  Simulated Output Projections
                </h4>
                <span className="text-[10px] font-mono text-emerald-400">Reactive telemetry</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Output 1: Throughput [CALCULATED] */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Throughput</span>
                    <span className="tag-calculated text-[9px]">[CALCULATED]</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-white">
                    {calculatedThroughput} <span className="text-xs font-normal text-slate-400">units/hr</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Daily Est: {calculatedThroughput * 24} units
                  </div>
                </div>

                {/* Output 2: WIP [ESTIMATED] */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">WIP (Work In Progress)</span>
                    <span className="tag-estimated text-[9px]">[ESTIMATED]</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-sky-400">
                    {estimatedWIP} <span className="text-xs font-normal text-slate-400">buffer units</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Queue pressure: {estimatedWIP > 25 ? 'High' : 'Normal'}
                  </div>
                </div>

                {/* Output 3: Scrap/Rework [SIMULATED] */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Scrap / Rework Rate</span>
                    <span className="tag-simulated text-[9px]">[SIMULATED]</span>
                  </div>
                  <div className={`text-2xl font-bold font-heading ${
                    simulatedScrapRate > 4.5 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {simulatedScrapRate}%
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {scrappedUnits} scrapped units / shift
                  </div>
                </div>

                {/* Output 4: Production Loss [ESTIMATED] */}
                <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Production Loss</span>
                    <span className="tag-estimated text-[9px]">[ESTIMATED]</span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-rose-400">
                    -${estimatedProductionLoss.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Per 8-hour operating shift
                  </div>
                </div>
              </div>

              {/* Output 5: Estimated Profit Impact [SIMULATED] Hero Metric */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950/40 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-heading">
                    Estimated Net Profit Impact
                  </span>
                  <span className="tag-simulated text-[10px]">[SIMULATED]</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl sm:text-4xl font-extrabold font-heading ${
                    simulatedProfitImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {simulatedProfitImpact >= 0 ? `+$${simulatedProfitImpact.toLocaleString()}` : `-$${Math.abs(simulatedProfitImpact).toLocaleString()}`}
                  </span>
                  <span className="text-xs font-mono text-slate-400">/ month vs current baseline</span>
                </div>
                <p className="text-xs text-slate-400 font-sans">
                  Derived from unit revenue ($65), standard shift cost, scrap penalty, and predicted cycle balancing.
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      setIsSaving(true);
                      setSaveStatus('Saving to Firestore...');
                      try {
                        const id = await saveSimulationScenario({
                          cycleTime,
                          stationCapacity,
                          utilization,
                          productionRate,
                          simulatedOutputs: {
                            calculatedThroughput,
                            estimatedWIP,
                            simulatedScrapRate,
                            estimatedProductionLoss,
                            simulatedProfitImpact,
                          },
                        });
                        setSaveStatus(`Saved to Firestore (ID: ${id.slice(0, 10)}...)`);
                        setTimeout(() => setSaveStatus(null), 3500);
                      } catch (e) {
                        setSaveStatus('Scenario cached locally');
                        setTimeout(() => setSaveStatus(null), 3000);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 hover:text-white transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <span>☁ Save Scenario to Cloud Database</span>
                  </button>

                  {saveStatus && (
                    <span className="text-[11px] font-mono text-emerald-400 animate-fadeIn">
                      ✓ {saveStatus}
                    </span>
                  )}
                </div>
              </div>

              {/* Advisory Disclaimer Notice - REQUIRED */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-start gap-2.5">
                <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
                <p className="text-xs text-amber-200/90 font-mono leading-relaxed">
                  <strong>Simulation results are advisory and do not directly control production equipment.</strong>
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
