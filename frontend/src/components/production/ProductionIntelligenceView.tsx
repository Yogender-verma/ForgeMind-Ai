import React, { useState, useEffect } from 'react';

interface ProvenanceInfo {
  evidence_type: string;
  source_dataset: string;
  source_version: number;
  source_file: string;
  source_field: string;
  calculation_method: string;
}

export interface ProductionMetricValue {
  value: number;
  unit: string;
  provenance: ProvenanceInfo;
}

interface UtilizationMetric {
  mean_utilization: number;
  mean_utilization_pct: number;
  min_utilization: number;
  max_utilization: number;
  std_utilization: number;
  provenance: ProvenanceInfo;
}

interface WaitingTimeMetric {
  mean_waiting_time: number;
  max_waiting_time: number;
  std_waiting_time: number;
  unit: string;
  provenance: ProvenanceInfo;
}

interface ProductionIntelligenceData {
  source_dataset: string;
  source_url: string;
  dataset_version: number;
  model_key: string;
  image_to_production_linkage: {
    status: string;
    evidence_type: string;
    notice: string;
  };
  economic_impact: {
    status: string;
    evidence_type: string;
    notice: string;
  };
  production_overview: Record<string, any>;
  process_utilization: Record<string, UtilizationMetric>;
  bottleneck_analysis: {
    primary_bottleneck: string;
    primary_bottleneck_utilization_pct: number;
    secondary_bottleneck: string;
    secondary_bottleneck_utilization_pct: number;
    system_utilization_imbalance_std: number;
    explanation: string;
    provenance: ProvenanceInfo;
  };
  waiting_time_analysis: Record<string, WaitingTimeMetric>;
  throughput_analysis: {
    metric: string;
    mean_throughput: number;
    min_throughput: number;
    max_throughput: number;
    std_throughput: number;
    unit: string;
    flow_pattern: string;
    provenance: ProvenanceInfo;
  };
  capacity_margin_analysis: Record<
    string,
    {
      headroom_pct: number;
      status: string;
      provenance: ProvenanceInfo;
    }
  >;
  what_if_scenario: {
    capability_label: string;
    evidence_type: string;
    parameter_adjusted: string;
    baseline_value: number;
    baseline_unit: string;
    scenario_adjustment: string;
    projected_throughput: number;
    difference: number;
    provenance: ProvenanceInfo;
  };
}

export const ProductionIntelligenceView: React.FC = () => {
  const [modelKey, setModelKey] = useState<'Model_1' | 'Model_2'>('Model_1');
  const [data, setData] = useState<ProductionIntelligenceData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvenance, setExpandedProvenance] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`http://127.0.0.1:8000/api/v1/production-intelligence?model=${modelKey}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (mounted) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load production intelligence data');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [modelKey]);

  const toggleProvenance = (id: string) => {
    setExpandedProvenance((prev) => (prev === id ? null : id));
  };

  const renderProvenanceDrawer = (id: string, prov: ProvenanceInfo) => {
    if (expandedProvenance !== id) return null;
    return (
      <div className="mt-2 p-3 rounded-xl bg-slate-950/95 border border-cyan-500/30 text-[11px] font-mono text-slate-300 space-y-1.5 animate-fadeIn">
        <div className="flex items-center justify-between text-cyan-400 font-bold border-b border-white/10 pb-1">
          <span>DATA PROVENANCE RECORD</span>
          <span className="text-[10px] uppercase">{prov.evidence_type}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
          <div>
            <span className="text-slate-500 block">Dataset:</span>
            <span className="text-white">{prov.source_dataset} (v{prov.source_version})</span>
          </div>
          <div>
            <span className="text-slate-500 block">Source File:</span>
            <span className="text-cyan-300">{prov.source_file}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Source Field:</span>
            <span className="text-emerald-400 font-semibold">{prov.source_field}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Calculation Method:</span>
            <span className="text-amber-300 font-semibold">{prov.calculation_method}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-400 mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>DISCRETE-EVENT SIMULATION INTEL &bull; MENDELEY DOI: 10.17632/3rw227zxt7.2</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Production Intelligence
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            Empirical process metrics calculated directly from Rockwell Arena simulation logs. Zero hardcoded metrics, strict provenance auditing, and zero fabricated image linkage.
          </p>
        </div>

        {/* Model Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-white/10 text-xs font-mono shrink-0">
          <button
            type="button"
            onClick={() => setModelKey('Model_1')}
            className={`px-3 py-2 rounded-lg transition font-semibold cursor-pointer ${
              modelKey === 'Model_1'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model 1 (Sequential Line)
          </button>
          <button
            type="button"
            onClick={() => setModelKey('Model_2')}
            className={`px-3 py-2 rounded-lg transition font-semibold cursor-pointer ${
              modelKey === 'Model_2'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Model 2 (Dual-Stream Line)
          </button>
        </div>
      </div>

      {/* Mandatory Non-Linkage Disclosure Banner */}
      <div className="p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 flex items-start gap-3">
        <span className="text-xl text-amber-400 shrink-0">⚠️</span>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-300 uppercase">
              Data Linkage Disclosure
            </span>
            <span className="tag-measured text-[9px]">[MEASURED]</span>
          </div>
          <p className="text-xs text-white font-mono">
            Visual-to-production record linkage is not available in the supplied datasets.
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            The visual inspection dataset (10,726 images) and discrete-event manufacturing simulation dataset (3,000 runs per model) are independent organizer-provided datasets. No batch, station, or machine serial numbers map between them. ForgeMind AI will not fabricate artificial causation between inspection specimens and production telemetry.
          </p>
        </div>
      </div>

      {loading && (
        <div className="py-16 text-center text-xs font-mono text-cyan-400 space-y-2">
          <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <p>Computing verified metrics from {modelKey} discrete-event logs...</p>
        </div>
      )}

      {error && (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
          Failed to load production intelligence data: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-8">
          
          {/* Section 1: Production Overview */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                <span>1. Production Overview</span>
                <span className="tag-calculated text-[9px]">[CALCULATED]</span>
              </h3>
              <span className="text-xs font-mono text-slate-500">
                {data.production_overview.total_records} empirical simulation runs analyzed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {modelKey === 'Model_1' ? (
                <>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Mean Demand</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov_demand')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-white">
                      {data.production_overview.mean_demand.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_demand.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov_demand', data.production_overview.mean_demand.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Mean Total Parts</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov_parts')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-emerald-400">
                      {data.production_overview.mean_total_parts.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_total_parts.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov_parts', data.production_overview.mean_total_parts.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Throughput Rate</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov_rate')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-cyan-300">
                      {data.production_overview.mean_throughput_rate.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_throughput_rate.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov_rate', data.production_overview.mean_throughput_rate.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Mean Value-Added Time</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov_va')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-amber-300">
                      {data.production_overview.mean_va_time.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_va_time.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov_va', data.production_overview.mean_va_time.provenance)}
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Mean Demand</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov2_demand')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-white">
                      {data.production_overview.mean_demand.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_demand.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov2_demand', data.production_overview.mean_demand.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Part 1 Inflow</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov2_p1')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-cyan-300">
                      {data.production_overview.mean_entities_in_p1.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_entities_in_p1.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov2_p1', data.production_overview.mean_entities_in_p1.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Part 2 Inflow</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov2_p2')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-cyan-300">
                      {data.production_overview.mean_entities_in_p2.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_entities_in_p2.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov2_p2', data.production_overview.mean_entities_in_p2.provenance)}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Completed Entities Out</span>
                      <button
                        type="button"
                        onClick={() => toggleProvenance('ov2_out')}
                        className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                      >
                        Provenance ℹ️
                      </button>
                    </div>
                    <div className="text-2xl font-bold font-heading text-emerald-400">
                      {data.production_overview.mean_entities_out.value} <span className="text-xs font-normal text-slate-400">{data.production_overview.mean_entities_out.unit}</span>
                    </div>
                    {renderProvenanceDrawer('ov2_out', data.production_overview.mean_entities_out.provenance)}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Section 2 & 3: Process Utilization & Bottleneck Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Process Utilization */}
            <section className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                  <span>2. Process Utilization</span>
                  <span className="tag-calculated text-[9px]">[CALCULATED]</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4">
                {Object.entries(data.process_utilization).map(([station, m]) => (
                  <div key={station} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{station} Work Center</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-[11px]">
                          Range: {(m.min_utilization * 100).toFixed(1)}% – {(m.max_utilization * 100).toFixed(1)}% (σ: {(m.std_utilization * 100).toFixed(1)}%)
                        </span>
                        <span className="text-cyan-300 font-bold text-sm">
                          {m.mean_utilization_pct.toFixed(2)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleProvenance(`util_${station}`)}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          ℹ️
                        </button>
                      </div>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.mean_utilization_pct > 80
                            ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                            : 'bg-gradient-to-r from-cyan-400 to-blue-500'
                        }`}
                        style={{ width: `${Math.min(m.mean_utilization_pct, 100)}%` }}
                      />
                    </div>
                    {renderProvenanceDrawer(`util_${station}`, m.provenance)}
                  </div>
                ))}
              </div>
            </section>

            {/* Bottleneck Analysis */}
            <section className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                  <span>3. Bottleneck Analysis</span>
                  <span className="tag-calculated text-[9px]">[CALCULATED]</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-rose-500/30 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Primary Constraint</span>
                    <div className="text-2xl font-bold font-heading text-rose-400 mt-0.5">
                      {data.bottleneck_analysis.primary_bottleneck} Station
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Peak Mean Util</span>
                    <div className="text-lg font-bold font-mono text-rose-300 mt-0.5">
                      {data.bottleneck_analysis.primary_bottleneck_utilization_pct.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-white/5">
                  {data.bottleneck_analysis.explanation}
                </p>

                <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-400 border-t border-white/5">
                  <span>Secondary Constraint:</span>
                  <span className="text-amber-300 font-semibold">
                    {data.bottleneck_analysis.secondary_bottleneck} ({data.bottleneck_analysis.secondary_bottleneck_utilization_pct.toFixed(2)}%)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => toggleProvenance('bn_calc')}
                  className="w-full text-center text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer pt-1"
                >
                  View Bottleneck Determination Provenance ℹ️
                </button>
                {renderProvenanceDrawer('bn_calc', data.bottleneck_analysis.provenance)}
              </div>
            </section>
          </div>

          {/* Section 4 & 5: Waiting Time & Throughput Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Waiting Time & Queue Analysis */}
            <section className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                  <span>4. Waiting Time & Queue Analysis</span>
                  <span className="tag-calculated text-[9px]">[CALCULATED]</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3">
                {Object.entries(data.waiting_time_analysis).map(([station, w]) => (
                  <div key={station} className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white">{station} Queue</span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 font-bold text-sm">
                          {w.mean_waiting_time} {w.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleProvenance(`wait_${station}`)}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                        >
                          ℹ️
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Max wait recorded: {w.max_waiting_time} min</span>
                      <span>Variance σ: {w.std_waiting_time} min</span>
                    </div>
                    {renderProvenanceDrawer(`wait_${station}`, w.provenance)}
                  </div>
                ))}
              </div>
            </section>

            {/* Throughput & Production Flow */}
            <section className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                  <span>5. Throughput & Production Flow</span>
                  <span className="tag-calculated text-[9px]">[CALCULATED]</span>
                </h3>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Line Flow Topology</span>
                  <div className="text-xs font-mono text-cyan-300 font-semibold">
                    {data.throughput_analysis.flow_pattern}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-slate-500 block text-[10px]">Min Throughput</span>
                    <span className="text-slate-300 font-bold">{data.throughput_analysis.min_throughput}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-slate-500 block text-[10px]">Mean Throughput</span>
                    <span className="text-emerald-400 font-bold text-sm">{data.throughput_analysis.mean_throughput}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/5">
                    <span className="text-slate-500 block text-[10px]">Max Throughput</span>
                    <span className="text-cyan-300 font-bold">{data.throughput_analysis.max_throughput}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleProvenance('tp_prov')}
                  className="w-full text-center text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                >
                  View Throughput Provenance ℹ️
                </button>
                {renderProvenanceDrawer('tp_prov', data.throughput_analysis.provenance)}
              </div>
            </section>
          </div>

          {/* Section 6: Capacity Headroom Analysis */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                <span>6. Capacity Margin Analysis</span>
                <span className="tag-calculated text-[9px]">[CALCULATED]</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(data.capacity_margin_analysis).map(([station, cap]) => (
                <div key={station} className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">{station} Station</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        cap.status === 'Severely Constrained'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {cap.status}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-heading text-cyan-300 font-mono">
                    {cap.headroom_pct}% <span className="text-xs font-normal text-slate-400 font-sans">headroom</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProvenance(`cap_${station}`)}
                    className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
                  >
                    Provenance ℹ️
                  </button>
                  {renderProvenanceDrawer(`cap_${station}`, cap.provenance)}
                </div>
              ))}
            </div>
          </section>

          {/* Section 7: What-If Scenario Analysis */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
                <span>7. What-If Simulation Scenario</span>
                <span className="tag-simulated text-[9px]">[SIMULATED]</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {data.what_if_scenario.capability_label}
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Parameter Adjusted</span>
                  <span className="text-white font-bold">{data.what_if_scenario.parameter_adjusted}</span>
                  <span className="text-cyan-400 text-[10px] block">{data.what_if_scenario.scenario_adjustment}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Baseline Value</span>
                  <span className="text-slate-200 font-bold">
                    {data.what_if_scenario.baseline_value} {data.what_if_scenario.baseline_unit}
                  </span>
                  <span className="text-slate-500 text-[10px] block">Empirical Mean</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Projected Throughput</span>
                  <span className="text-emerald-400 font-bold">
                    {data.what_if_scenario.projected_throughput} {data.what_if_scenario.baseline_unit}
                  </span>
                  <span className="tag-simulated text-[9px]">[SIMULATED]</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-slate-400 block text-[10px] uppercase">Projected Net Delta</span>
                  <span className="text-cyan-300 font-bold">
                    {data.what_if_scenario.difference > 0 ? `+${data.what_if_scenario.difference}` : data.what_if_scenario.difference} {data.what_if_scenario.baseline_unit}
                  </span>
                  <span className="text-emerald-400 text-[10px] block">Line Gain</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleProvenance('whatif_prov')}
                className="w-full text-center text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer"
              >
                View Scenario Projection Provenance ℹ️
              </button>
              {renderProvenanceDrawer('whatif_prov', data.what_if_scenario.provenance)}
            </div>
          </section>

          {/* Section 8: Economic & Causality Disclosures */}
          <section className="space-y-3">
            <h3 className="text-sm font-mono uppercase tracking-widest text-slate-300 font-bold flex items-center gap-2">
              <span>8. Operational Boundaries & Data Governance</span>
              <span className="tag-measured text-[9px]">[MEASURED]</span>
            </h3>

            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 text-xs font-mono">
              <div className="flex items-start gap-3">
                <span className="text-amber-400 text-base">ℹ️</span>
                <div className="space-y-1">
                  <span className="text-white font-bold">Financial Calculation Limitation:</span>
                  <p className="text-slate-400">
                    {data.economic_impact.notice}
                  </p>
                </div>
              </div>
            </div>
          </section>

        </div>
      )}
    </div>
  );
};
