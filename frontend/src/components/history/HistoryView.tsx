import React, { useState, useEffect } from 'react';
import { getAllInspections } from '../../services/inspectionStore';
import { InspectionRecord } from '../../types/inspection';

interface HistoryViewProps {
  onViewAnalysis: (id: string) => void;
  onNavigateToUpload: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onViewAnalysis,
  onNavigateToUpload,
}) => {
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    setRecords(getAllInspections());
  }, []);

  const filtered = records.filter((rec) => {
    const matchesSearch =
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.imageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.prediction.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    if (filterType === 'DEFECTIVE') return matchesSearch && rec.status === 'Defective';
    if (filterType === 'NORMAL') return matchesSearch && rec.status === 'Normal';
    return matchesSearch && rec.prediction === filterType;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold font-heading text-white tracking-tight">
            Past Searches & Inspection History
          </h2>
          <p className="text-xs text-slate-400">
            Review past inspections, defect confidence records, and historical root-cause analyses.
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToUpload}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 text-slate-950 font-bold text-xs font-heading shadow-[0_0_15px_rgba(0,229,255,0.3)] transition cursor-pointer"
        >
          + New Analysis
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ID (e.g. FM-1024), image name, or defect..."
            className="w-full bg-slate-950 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-950 border border-white/15 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-300 outline-none focus:border-cyan-400 cursor-pointer"
        >
          <option value="ALL">All Classifications</option>
          <option value="DEFECTIVE">Defective Only</option>
          <option value="NORMAL">Normal Only</option>
          <option value="Crack">Crack</option>
          <option value="Hole">Hole</option>
          <option value="Rust">Rust</option>
          <option value="Scratches">Scratches</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-3xl p-6 bg-slate-950/80 border border-white/10 overflow-hidden shadow-xl">
        {records.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="text-3xl">🕘</div>
            <h3 className="text-base font-bold text-white font-heading">No past searches yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You have not analyzed any inspection images yet. Upload an image to start recording your inspection history.
            </p>
            <button
              type="button"
              onClick={onNavigateToUpload}
              className="mt-2 px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs font-heading transition cursor-pointer"
            >
              Upload Specimen
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-xs font-mono text-slate-400">
            No inspections matched your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-mono uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="pb-3">Thumbnail</th>
                  <th className="pb-3">Analysis ID</th>
                  <th className="pb-3">Specimen Name</th>
                  <th className="pb-3">Prediction</th>
                  <th className="pb-3">Confidence</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition">
                    <td className="py-3">
                      <img
                        src={item.imageUrl}
                        alt={item.imageName}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10 bg-slate-900"
                      />
                    </td>
                    <td className="py-3 font-mono font-bold text-white">
                      #{item.id}
                    </td>
                    <td className="py-3 text-slate-300 font-mono truncate max-w-[160px]">
                      {item.imageName}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.status === 'Defective'
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.status === 'Defective' ? 'bg-rose-400' : 'bg-emerald-400'
                          }`}
                        />
                        {item.prediction}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-cyan-400">
                      {item.confidence.toFixed(1)}%
                    </td>
                    <td className="py-3 font-mono text-slate-400 text-xs">
                      {typeof item.severity === 'object' && item.severity
                        ? item.severity.level || 'Not determined'
                        : item.severity || 'Not determined'}
                    </td>
                    <td className="py-3 font-mono text-slate-400 text-[11px]">
                      {item.formattedDate}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewAnalysis(item.id)}
                        className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/25 transition cursor-pointer"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
