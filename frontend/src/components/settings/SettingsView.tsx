import React, { useState } from 'react';

export const SettingsView: React.FC = () => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage('Inspection parameters updated successfully.');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-2xl font-extrabold font-heading text-white tracking-tight">
          Platform Settings
        </h2>
        <p className="text-xs text-slate-400">
          Configure inspection sensitivity, confidence thresholds, and notification triggers.
        </p>
      </div>

      <form onSubmit={handleSave} className="rounded-3xl p-6 sm:p-8 bg-slate-950/80 border border-white/10 space-y-6 shadow-xl">
        {saveMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
            ✓ {saveMessage}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-white font-heading">
                Defect Confidence Threshold (%)
              </label>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {confidenceThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Detections with confidence scores below this threshold are flagged as "Uncertain / Novel Cases".
            </p>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white font-heading block">
                Quality Anomaly Alerts
              </span>
              <span className="text-[11px] text-slate-400 block">
                Dispatch immediate notification when High or Critical severity defects are detected.
              </span>
            </div>
            <input
              type="checkbox"
              checked={enableAlerts}
              onChange={(e) => setEnableAlerts(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-900 border-white/20 text-cyan-400 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 text-slate-950 font-bold text-xs font-heading shadow-[0_0_15px_rgba(0,229,255,0.3)] transition cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
