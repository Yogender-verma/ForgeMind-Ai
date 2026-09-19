import React from 'react';

export type TabId = 'overview' | 'health' | 'bottlenecks' | 'root-cause' | 'economics' | 'simulation' | 'recommendations';

interface PipelineNavProps {
  activeTab: TabId;
  onTabSelect: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; step: number }[] = [
  { id: 'overview', label: 'Overview', step: 1 },
  { id: 'health', label: 'Process Health', step: 2 },
  { id: 'bottlenecks', label: 'Bottlenecks', step: 3 },
  { id: 'root-cause', label: 'Root-Cause & ML', step: 4 },
  { id: 'economics', label: 'Economic Impact', step: 5 },
  { id: 'simulation', label: 'What-If Simulation', step: 6 },
  { id: 'recommendations', label: 'Recommendations', step: 7 },
];

export const PipelineNav: React.FC<PipelineNavProps> = ({ activeTab, onTabSelect }) => {
  return (
    <nav className="flex items-center gap-1.5 p-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-x-auto">
      {TABS.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            id={`tab-btn-${t.id}`}
            onClick={() => onTabSelect(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
              isActive
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/25 text-white border border-cyan-400 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                isActive ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-white/10 text-slate-400'
              }`}
            >
              {t.step}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
