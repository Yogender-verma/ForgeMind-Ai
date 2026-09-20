import React, { useState, useEffect } from 'react';
import {
  InspectionRecord,
  SimulatedEconomicImpactResult,
  SimulatedWhatIfResult,
  SimulatedImpactLevel,
  DefectTreatmentStatus,
  CaseWorkflowStatus,
  CurePreventionSearchResult,
} from '../../types/inspection';
import { PipelineFullData } from '../../types/forgemind';
import { simplifyCauseTitle, simplifyExplanation } from '../../services/inspectionStore';

interface AnalysisResultViewProps {
  record: InspectionRecord | null;
  pipelineData: PipelineFullData | null;
  onBackToDashboard: () => void;
  onNavigateToUpload: () => void;
}

type AnalysisTab = 'overview' | 'impact' | 'sensitivity' | 'cure_prevention' | 'assistant';

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  record,
  pipelineData,
  onBackToDashboard,
  onNavigateToUpload,
}) => {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('overview');
  const [viewMode, setViewMode] = useState<'original' | 'gradcam'>('original');

  // Simulated User-Selected Economic Impact state (Zero fabricated costs or currency)
  const [selectedImpactLevel, setSelectedImpactLevel] = useState<SimulatedImpactLevel>(null);
  const [treatmentStatus, setTreatmentStatus] = useState<DefectTreatmentStatus>('untreated');
  const [selectedPathwayId, setSelectedPathwayId] = useState<string>('WAY-1');
  const [userReason, setUserReason] = useState<string>('');
  const [simulatedEconomicResult, setSimulatedEconomicResult] = useState<SimulatedEconomicImpactResult | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<SimulatedWhatIfResult | null>(null);

  // Cure & Prevention State (Decision Support & Historical Learning)
  const [curePreventionData, setCurePreventionData] = useState<CurePreventionSearchResult | null>(null);
  const [isLoadingCurePrevention, setIsLoadingCurePrevention] = useState(false);
  const [cureActionStatus, setCureActionStatus] = useState<CaseWorkflowStatus>('NEW');
  const [showApplyConfirmModal, setShowApplyConfirmModal] = useState(false);
  const [isApplyingAction, setIsApplyingAction] = useState(false);
  const [actionConfirmationNotice, setActionConfirmationNotice] = useState<string | null>(null);
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [showCaseReviewModal, setShowCaseReviewModal] = useState(false);
  const [showNewInvestigationModal, setShowNewInvestigationModal] = useState(false);

  // Persistence Review State (Approve, Edit, Reject with decision & timestamp)
  const [caseDecisionInfo, setCaseDecisionInfo] = useState<{
    decision: 'APPROVED' | 'EDITED' | 'REJECTED';
    timestamp: string;
    action?: string;
    note?: string;
  } | null>(null);
  const [showEditActionModal, setShowEditActionModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editActionText, setEditActionText] = useState('');
  const [editActionNote, setEditActionNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isSavingDecision, setIsSavingDecision] = useState(false);



  // Fetch Cure & Prevention Historical Case Search
  useEffect(() => {
    if (!record?.id) return;
    let isMounted = true;
    setIsLoadingCurePrevention(true);

    const defectParam = encodeURIComponent(record.prediction || 'Normal');
    const confParam = record.confidence ?? 85.7;

    fetch(
      `http://127.0.0.1:8000/api/v1/cure-prevention/search?defect=${defectParam}&confidence=${confParam}&inspection_id=${encodeURIComponent(
        record.id
      )}`
    )
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: CurePreventionSearchResult) => {
        if (isMounted) {
          setCurePreventionData(data);
          if (data.active_case_status?.status) {
            setCureActionStatus(data.active_case_status.status);
          }
          if (data.active_case_status?.decision) {
            setCaseDecisionInfo({
              decision: data.active_case_status.decision as 'APPROVED' | 'EDITED' | 'REJECTED',
              timestamp: data.active_case_status.updated_at
                ? new Date(data.active_case_status.updated_at).toLocaleString()
                : 'Previously Recorded',
              action: data.active_case_status.applied_action || undefined,
              note: data.active_case_status.notes,
            });
          }
          setIsLoadingCurePrevention(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Cure prevention fetch fallback:', err);
          fetch(
            `/api/v1/cure-prevention/search?defect=${defectParam}&confidence=${confParam}&inspection_id=${encodeURIComponent(
              record.id
            )}`
          )
            .then((r) => r.json())
            .then((d: CurePreventionSearchResult) => {
              if (isMounted) {
                setCurePreventionData(d);
                if (d.active_case_status?.status) {
                  setCureActionStatus(d.active_case_status.status);
                }
                setIsLoadingCurePrevention(false);
              }
            })
            .catch(() => {
              if (isMounted) {
                // In-browser deterministic demo fallback
                const isNormal = record.prediction === 'Normal';
                if (isNormal) {
                  setCurePreventionData({
                    status: 'no_similar_case',
                    title: 'NO SIMILAR PREVIOUS CASE FOUND',
                    message: 'No sufficiently similar resolved case is available for this defect.',
                    can_start_investigation: true,
                    evidence_tag: '[SIMULATED]',
                    current_defect: {
                      defect: 'Normal',
                      vision_confidence: record.confidence,
                      confidence_tag: '[MODEL]',
                      confidence_note: 'Independent classifier certainty metric; not similarity or causation probability.',
                      inspection_id: record.id,
                    },
                    active_case_status: {
                      inspection_id: record.id,
                      status: 'NEW',
                      status_tag: '[MEASURED]',
                      confirmed_by_user: false,
                      verification_status: 'UNVERIFIED',
                    },
                  });
                } else {
                  const demoMap: Record<string, any> = {
                    Scratch: {
                      case_id: 'CASE-DEMO-018',
                      defect: 'Scratch',
                      status: 'Resolved',
                      status_tag: '[SIMULATED]',
                      similarity_pct: 94.0,
                      similarity_tag: '[SIMILARITY]',
                      previous_investigation: 'Fixture and guide-rail inspection',
                      previous_possible_cause: 'Possible fixture/guide-rail contact',
                      cause_tag: '[HYPOTHESIS]',
                      previous_recommended_action: 'Inspect fixture contact surfaces and guide rails.',
                      action_tag: '[ADVISORY]',
                      previous_human_decision: 'Corrective action approved',
                      decision_tag: '[USER CONFIRMED]',
                      previous_outcome: 'Case marked resolved',
                      outcome_tag: '[USER CONFIRMED]',
                      evidence_why_relevant: [
                        { label: 'Same defect class', tag: '[MEASURED]', detail: 'Classified as Scratch on metal substrate' },
                        { label: 'Visual similarity', tag: '[SIMILARITY]', detail: '94% visual feature & aspect ratio match' },
                        { label: 'Similar historical inspection', tag: '[HISTORICAL EVIDENCE]', detail: 'Recorded at Assembly Station fixture B2' },
                        { label: 'Previous corrective action available', tag: '[HISTORICAL EVIDENCE]', detail: 'SOP-742 fixture guide realignment procedure' },
                      ],
                      cure_action: {
                        previous_action_summary: 'Inspect and clean fixture contact surfaces and check guide rails.',
                        evidence_tag: '[HISTORICAL EVIDENCE]',
                        simulated_tag: '[SIMULATED]',
                        recommended_review: 'Consider reviewing the same corrective procedure for the current defect.',
                        advisory_tag: '[ADVISORY]',
                        disclaimer: 'Does not guarantee physical resolution. On-site human verification is required.',
                      },
                      prevention: {
                        guidance: 'Use previous resolved cases as guidance for recurring defects.',
                        procedure: 'If the current defect is confirmed to match the previous case, review the same inspection and corrective procedure.',
                        advisory_tag: '[ADVISORY]',
                        effectiveness_notice: 'Prevention effectiveness requires follow-up inspection data.',
                      },
                      similarity_disclaimer: 'Similarity indicates resemblance to a previous case; it does not confirm the same underlying cause.',
                    },
                  };
                  const matched = demoMap[record.prediction] || demoMap['Scratch'];
                  setCurePreventionData({
                    status: 'similar_found',
                    title: 'SIMILAR DEFECT FOUND',
                    current_defect: {
                      defect: record.prediction,
                      vision_confidence: record.confidence,
                      confidence_tag: '[MODEL]',
                      confidence_note: 'Independent classifier certainty metric; not similarity or causation probability.',
                      inspection_id: record.id,
                    },
                    similar_case: matched,
                    active_case_status: {
                      inspection_id: record.id,
                      status: 'NEW',
                      status_tag: '[MEASURED]',
                      confirmed_by_user: false,
                      verification_status: 'UNVERIFIED',
                    },
                    evidence_tag: '[SIMULATED]',
                  });
                }
                setIsLoadingCurePrevention(false);
              }
            });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [record?.id, record?.prediction, record?.confidence]);

  // Safe Fallback UI if record is not found
  if (!record) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-slate-950/90 border border-white/15 text-center space-y-5 shadow-2xl animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 text-3xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
          🔍
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold font-heading text-white">
            Analysis Not Found
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            The requested inspection record could not be found in storage. It may have expired or was generated in a different session.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={onNavigateToUpload}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 text-slate-950 font-bold text-xs font-heading shadow-[0_0_20px_rgba(0,229,255,0.3)] transition cursor-pointer"
          >
            + Create New Inspection
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 font-medium text-xs transition cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Cure & Prevention Handlers
  const handleConfirmApplyPreviousAction = async () => {
    if (!record?.id || !curePreventionData?.similar_case) return;
    setIsApplyingAction(true);
    const actionText = curePreventionData.similar_case.cure_action.previous_action_summary;
    const caseId = curePreventionData.similar_case.case_id;

    const nowStr = new Date().toLocaleString();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cases/${encodeURIComponent(caseId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: record.id,
          case_id: caseId,
          action_text: actionText,
          defect_type: record.prediction,
          user_note: 'Operator approved recommendation as guidance',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCureActionStatus(data.status as CaseWorkflowStatus);
        setCaseDecisionInfo({
          decision: 'APPROVED',
          timestamp: data.decision_timestamp ? new Date(data.decision_timestamp).toLocaleString() : nowStr,
          action: actionText,
        });
      } else {
        setCureActionStatus('ACTION_APPROVED');
        setCaseDecisionInfo({
          decision: 'APPROVED',
          timestamp: nowStr,
          action: actionText,
        });
      }
    } catch (_) {
      setCureActionStatus('ACTION_APPROVED');
      setCaseDecisionInfo({
        decision: 'APPROVED',
        timestamp: nowStr,
        action: actionText,
      });
    }

    setActionConfirmationNotice('Corrective action marked for this case.');
    setIsApplyingAction(false);
    setShowApplyConfirmModal(false);
  };

  const handleOpenEditModal = () => {
    const defaultAction =
      curePreventionData?.similar_case?.cure_action?.previous_action_summary ||
      curePreventionData?.similar_case?.previous_recommended_action ||
      '';
    setEditActionText(defaultAction);
    setEditActionNote('');
    setShowEditActionModal(true);
    setShowRejectModal(false);
    setShowApplyConfirmModal(false);
  };

  const handleOpenRejectModal = () => {
    setRejectReason('');
    setRejectError(null);
    setShowRejectModal(true);
    setShowEditActionModal(false);
    setShowApplyConfirmModal(false);
  };

  const handleConfirmEditAction = async () => {
    if (!record?.id || !editActionText.trim()) return;
    setIsSavingDecision(true);
    const caseId = curePreventionData?.similar_case?.case_id || `CASE-${record.id}`;
    const origAction =
      curePreventionData?.similar_case?.cure_action?.previous_action_summary ||
      curePreventionData?.similar_case?.previous_recommended_action ||
      '';

    const nowStr = new Date().toLocaleString();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cases/${encodeURIComponent(caseId)}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: record.id,
          edited_action: editActionText.trim(),
          reviewer_note: editActionNote.trim() || undefined,
          defect_type: record.prediction,
          recommended_action: origAction,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCureActionStatus((data.status as CaseWorkflowStatus) || 'ACTION_APPROVED');
        setCaseDecisionInfo({
          decision: 'EDITED',
          timestamp: data.decision_timestamp ? new Date(data.decision_timestamp).toLocaleString() : nowStr,
          action: editActionText.trim(),
          note: editActionNote.trim() || undefined,
        });
      } else {
        setCureActionStatus('ACTION_APPROVED');
        setCaseDecisionInfo({
          decision: 'EDITED',
          timestamp: nowStr,
          action: editActionText.trim(),
          note: editActionNote.trim() || undefined,
        });
      }
    } catch (_) {
      setCureActionStatus('ACTION_APPROVED');
      setCaseDecisionInfo({
        decision: 'EDITED',
        timestamp: nowStr,
        action: editActionText.trim(),
        note: editActionNote.trim() || undefined,
      });
    }

    setActionConfirmationNotice('Edited corrective action saved and applied.');
    setIsSavingDecision(false);
    setShowEditActionModal(false);
  };

  const handleConfirmReject = async () => {
    if (!record?.id) return;
    if (!rejectReason.trim()) {
      setRejectError('A reason is required to reject the recommendation.');
      return;
    }

    setIsSavingDecision(true);
    const caseId = curePreventionData?.similar_case?.case_id || `CASE-${record.id}`;
    const origAction =
      curePreventionData?.similar_case?.cure_action?.previous_action_summary ||
      curePreventionData?.similar_case?.previous_recommended_action ||
      '';

    const nowStr = new Date().toLocaleString();
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/cases/${encodeURIComponent(caseId)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: record.id,
          reason: rejectReason.trim(),
          defect_type: record.prediction,
          recommended_action: origAction,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCureActionStatus((data.status as CaseWorkflowStatus) || 'REJECTED');
        setCaseDecisionInfo({
          decision: 'REJECTED',
          timestamp: data.decision_timestamp ? new Date(data.decision_timestamp).toLocaleString() : nowStr,
          note: rejectReason.trim(),
        });
      } else {
        setCureActionStatus('REJECTED');
        setCaseDecisionInfo({
          decision: 'REJECTED',
          timestamp: nowStr,
          note: rejectReason.trim(),
        });
      }
    } catch (_) {
      setCureActionStatus('REJECTED');
      setCaseDecisionInfo({
        decision: 'REJECTED',
        timestamp: nowStr,
        note: rejectReason.trim(),
      });
    }

    setActionConfirmationNotice('Recommendation rejected by reviewer.');
    setIsSavingDecision(false);
    setShowRejectModal(false);
  };

  const handleUpdateWorkflowStatus = async (newStatus: CaseWorkflowStatus) => {
    if (!record?.id) return;
    setCureActionStatus(newStatus);
    try {
      await fetch('http://127.0.0.1:8000/api/v1/cure-prevention/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: record.id,
          status: newStatus,
        }),
      });
    } catch (_) {}
  };

  const handleVerifyCase = async (outcome: 'verified' | 'recurred') => {
    if (!record?.id) return;
    const newStatus: CaseWorkflowStatus = outcome === 'verified' ? 'VERIFIED' : 'DEFECT_RECURRED';
    setCureActionStatus(newStatus);
    setVerificationNotice(
      outcome === 'verified'
        ? 'Case marked verified by quality engineer. Prevention effectiveness recorded in historical case library.'
        : 'Defect recorded as recurred. Escalating for engineering re-investigation.'
    );

    try {
      await fetch('http://127.0.0.1:8000/api/v1/cure-prevention/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspection_id: record.id,
          outcome: outcome,
          defect_type: record.prediction,
        }),
      });
    } catch (_) {}
  };

  // User-Selected Simulated Economic Impact Handlers
  const handleSelectImpactLevel = async (
    level: 'LOW' | 'MEDIUM' | 'HIGH',
    status: DefectTreatmentStatus = treatmentStatus
  ) => {
    setSelectedImpactLevel(level);

    const payload = {
      impact_level: level,
      defect_type: record?.prediction || 'Defect',
      vision_confidence: record?.confidence,
      user_reason: userReason,
      treatment_status: status,
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/economic/unit-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data: SimulatedEconomicImpactResult = await res.json();
        setSimulatedEconomicResult(data);
        return;
      }
    } catch (_) {}

    // Deterministic in-browser fallback
    const map = { LOW: 5.0, MEDIUM: 10.0, HIGH: 20.0 };
    const overheadMap = { LOW: 1.0, MEDIUM: 2.0, HIGH: 4.0 };
    const baselinePct = map[level];
    const overheadPct = overheadMap[level];
    const profitPct = baselinePct - overheadPct;

    setSimulatedEconomicResult({
      impact_level: level,
      simulated_impact_pct: baselinePct,
      formatted_impact: status === 'cured' ? `+${profitPct.toFixed(0)}%` : `${baselinePct.toFixed(0)}%`,
      evidence_tag: '[SIMULATED]',
      status: 'assessed',
      defect_type: record?.prediction || 'Defect',
      vision_confidence: record?.confidence,
      user_reason: userReason.trim(),
      reason_tag: userReason.trim() ? '[USER INPUT]' : null,
      treatment_status: status,
      before_treatment_loss_pct: baselinePct,
      formatted_before_treatment_loss: `-${baselinePct.toFixed(0)}%`,
      treatment_overhead_pct: overheadPct,
      formatted_treatment_overhead: `-${overheadPct.toFixed(0)}%`,
      after_treatment_profit_pct: profitPct,
      formatted_after_treatment_profit: `+${profitPct.toFixed(0)}%`,
      avoided_loss_pct: baselinePct,
      net_profit_recovery_pct: profitPct,
      disclosure:
        'Demo impact score only. The supplied dataset does not contain product cost, product criticality, disposition, or financial records. This value is not an actual monetary loss.',
      future_integration_note:
        'Future Factory Integration: Product + ERP/MES + Quality Data → Verified Economic Impact',
    });
  };

  const handleToggleTreatmentStatus = async (newStatus: DefectTreatmentStatus) => {
    setTreatmentStatus(newStatus);
    if (selectedImpactLevel) {
      await handleSelectImpactLevel(selectedImpactLevel, newStatus);
    }
  };

  const handleUserReasonChange = (newReason: string) => {
    setUserReason(newReason);
    if (simulatedEconomicResult && selectedImpactLevel) {
      setSimulatedEconomicResult({
        ...simulatedEconomicResult,
        user_reason: newReason.trim(),
        reason_tag: newReason.trim() ? '[USER INPUT]' : null,
      });
    }
  };

  const handleResetImpact = () => {
    setSelectedImpactLevel(null);
    setUserReason('');
    setTreatmentStatus('untreated');
    setSimulatedEconomicResult({
      impact_level: null,
      simulated_impact_pct: null,
      formatted_impact: 'Not assessed',
      evidence_tag: '[SIMULATED]',
      status: 'not_assessed',
      defect_type: record?.prediction || 'Defect',
      vision_confidence: record?.confidence,
      user_reason: '',
      reason_tag: null,
      treatment_status: 'untreated',
      before_treatment_loss_pct: null,
      formatted_before_treatment_loss: 'Not assessed',
      treatment_overhead_pct: null,
      formatted_treatment_overhead: 'Not assessed',
      after_treatment_profit_pct: null,
      formatted_after_treatment_profit: 'Not assessed',
      avoided_loss_pct: null,
      net_profit_recovery_pct: null,
      disclosure:
        'Demo impact score only. The supplied dataset does not contain product cost, product criticality, disposition, or financial records. This value is not an actual monetary loss.',
      future_integration_note:
        'Future Factory Integration: Product + ERP/MES + Quality Data → Verified Economic Impact',
    });
    setCustomEconomicRanges(null);
  };

  // Custom Economic Inputs (User-Entered Cost Modeling)
  const [customUnitPrice, setCustomUnitPrice] = useState(50.0);
  const [customMaterialCost, setCustomMaterialCost] = useState(30.0);
  const [customScrapCost, setCustomScrapCost] = useState(15.0);
  const [customReworkCost, setCustomReworkCost] = useState(20.0);
  const [customDefectRate, setCustomDefectRate] = useState(0.08);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [customEconomicRanges, setCustomEconomicRanges] = useState<{
    point_estimate: { estimated_profit_per_run: number; profit_margin_pct: number; total_loss_from_defects: number };
    ranges: {
      estimated_profit_per_run: { low: number; likely: number; high: number };
      profit_margin_pct: { low: number; likely: number; high: number };
      total_loss_from_defects: { low: number; likely: number; high: number };
      label: string;
      guardrail_status: string;
    };
  } | null>(null);

  // Preset tier defect rates
  const applyPresetDefectRate = (tier: 'LOW' | 'MEDIUM' | 'HIGH') => {
    const rateMap = { LOW: 0.05, MEDIUM: 0.10, HIGH: 0.20 };
    setCustomDefectRate(rateMap[tier]);
  };

  const handleRecalculateCustomEconomic = async () => {
    setIsRecalculating(true);
    const payload = {
      unit_price: customUnitPrice,
      material_cost: customMaterialCost,
      scrap_cost: customScrapCost,
      rework_cost: customReworkCost,
      defect_rate: customDefectRate,
      units_per_run: 1000,
    };

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/economic/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setCustomEconomicRanges(data);
        setIsRecalculating(false);
        return;
      }
    } catch (_) {}

    // Local deterministic fallback (simplified range)
    const units = 1000;
    const dr = Math.max(0.001, Math.min(customDefectRate, 0.999));
    const goodUnits = units * (1 - dr);
    const defectiveUnits = units * dr;
    const revenue = goodUnits * customUnitPrice;
    const prodCost = units * customMaterialCost;
    const lossScrap = defectiveUnits * 0.5 * customScrapCost;
    const lossRework = defectiveUnits * 0.5 * customReworkCost;
    const totalLoss = lossScrap + lossRework;
    const profit = revenue - prodCost - totalLoss;
    const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Approximate ±15% range
    const mkRange = (v: number) => ({
      low: Math.round((v * 0.85) * 100) / 100,
      likely: Math.round(v * 100) / 100,
      high: Math.round((v * 1.15) * 100) / 100,
    });

    setCustomEconomicRanges({
      point_estimate: {
        estimated_profit_per_run: Math.round(profit * 100) / 100,
        profit_margin_pct: Math.round(marginPct * 100) / 100,
        total_loss_from_defects: Math.round(totalLoss * 100) / 100,
      },
      ranges: {
        estimated_profit_per_run: mkRange(profit),
        profit_margin_pct: mkRange(marginPct),
        total_loss_from_defects: { low: Math.round(totalLoss * 0.85 * 100) / 100, likely: Math.round(totalLoss * 100) / 100, high: Math.round(totalLoss * 1.15 * 100) / 100 },
        label: 'SIMULATED RANGE',
        guardrail_status: 'computed from your inputs, simulated',
      },
    });
    setIsRecalculating(false);
  };

  // Reset to initial unassessed state and fetch scenarios on record load
  useEffect(() => {
    handleResetImpact();
    const defectParam = encodeURIComponent(record?.prediction || 'Scratch');

    fetch(`http://127.0.0.1:8000/api/v1/economic/what-if?defect=${defectParam}`)
      .then((res) => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.json();
      })
      .then((data: SimulatedWhatIfResult) => {
        setWhatIfResult(data);
        if (data.recommended_pathway_id) {
          setSelectedPathwayId(data.recommended_pathway_id);
        }
      })
      .catch(() => {
        setWhatIfResult({
          evidence_tag: '[SIMULATED]',
          method: 'Discrete demo sensitivity levels mapped from user operational tier assumptions.',
          defect_type: record?.prediction || 'Scratch',
          total_ways_available: 4,
          pathways: [
            {
              pathway_id: 'WAY-1',
              name: 'Way 1: Precision Targeted Micro-Buffing & Recoat',
              category: 'In-Line Automated Treatment',
              description: 'Automated localized micro-abrasion buffing to smooth surface scratch, followed by protective seal coat.',
              is_recommended: true,
              badge: '[RECOMMENDED PATHWAY]',
              net_profit_recovery_pct: 8.5,
              formatted_profit_recovery: '+8.5% Net Profit',
              avoided_loss_pct: 10.0,
              treatment_overhead_pct: 1.5,
              cycle_time_delta_min: 2.5,
              formatted_cycle_time: '+2.5 min in-line buffer',
              feasibility: 'Immediate (In-line robotic station)',
              quality_risk: 'Very Low (0.8% recurrence risk)',
              final_grade: 'Grade-A (Full OEM Spec)',
            },
            {
              pathway_id: 'WAY-2',
              name: 'Way 2: Full Thermal Annealing & Passivation Re-dip',
              category: 'Off-Line Batch Remediation',
              description: 'Batch furnace re-bake to re-flow grain structure, followed by full nitric acid passivation tank.',
              is_recommended: false,
              badge: '[OFF-LINE ALTERNATIVE]',
              net_profit_recovery_pct: 3.5,
              formatted_profit_recovery: '+3.5% Net Profit',
              avoided_loss_pct: 10.0,
              treatment_overhead_pct: 6.5,
              cycle_time_delta_min: 48.0,
              formatted_cycle_time: '+48.0 min batch oven queue',
              feasibility: 'Batch Queue (Requires off-line oven scheduling)',
              quality_risk: 'Low (1.2% recurrence risk)',
              final_grade: 'Grade-A (Thermal Normalized)',
            },
            {
              pathway_id: 'WAY-3',
              name: 'Way 3: Commercial Concession (Sell as Grade-B)',
              category: 'Commercial Concession',
              description: 'Waive physical repair. Re-classify and sell unit to secondary industrial market at commercial price discount.',
              is_recommended: false,
              badge: '[DOWNGRADE ALTERNATIVE]',
              net_profit_recovery_pct: -40.0,
              formatted_profit_recovery: '-40.0% Margin Haircut',
              avoided_loss_pct: 0.0,
              treatment_overhead_pct: 40.0,
              cycle_time_delta_min: 0.0,
              formatted_cycle_time: '0 min (Instant ERP transfer)',
              feasibility: 'Immediate (Commercial ERP transfer)',
              quality_risk: 'Zero (Customer accepts downgraded spec)',
              final_grade: 'Grade-B (Secondary Market)',
            },
            {
              pathway_id: 'WAY-4',
              name: 'Way 4: Direct Component Scrap (Destructive Disposal)',
              category: 'Destructive Rejection',
              description: 'Immediate line rejection and component destruction for raw material salvage only.',
              is_recommended: false,
              badge: '[REJECT / SCRAP]',
              net_profit_recovery_pct: -90.0,
              formatted_profit_recovery: '-90.0% Unrecoverable Scrap Loss',
              avoided_loss_pct: 0.0,
              treatment_overhead_pct: 90.0,
              cycle_time_delta_min: 12.0,
              formatted_cycle_time: '+12.0 min line replacement penalty',
              feasibility: 'Immediate (Scrap chute)',
              quality_risk: 'Zero (Component destroyed)',
              final_grade: 'Scrap (Raw Material Salvage Only)',
            },
          ],
          recommended_pathway_id: 'WAY-1',
          why_we_choose_this_way: {
            recommended_pathway_id: 'WAY-1',
            recommended_pathway_name: 'Way 1: Precision Targeted Micro-Buffing & Recoat',
            summary: `For surface ${record?.prediction || 'Scratch'} defects, Way 1 provides maximum value recovery (+8.5%) with minimal cycle delay (+2.5 min), completely curing the surface blemish without oven queues or scrap penalties.`,
            defect_type: record?.prediction || 'Scratch',
            key_reasons: [
              {
                title: 'Highest Net Profit Recovery',
                detail: 'Way 1 achieves +8.5% net profit recovery, outperforming Way 2 (+3.5%), Way 3 (-40% commercial markdown), and Way 4 (-90% unrecoverable scrap loss).',
                metric: '+8.5% Net Profit',
              },
              {
                title: 'Minimal Throughput Disruption',
                detail: 'Requires only +2.5 minutes in-line robotic buffing, avoiding the severe +48-minute thermal oven queue bottleneck of Way 2.',
                metric: '+2.5 min vs +48.0 min',
              },
              {
                title: 'Full Grade-A Specification Restored',
                detail: 'Restores 100% of original dimensional and cosmetic tolerances, protecting customer SLA commitments and eliminating Grade-B margin penalties.',
                metric: 'Grade-A OEM Spec',
              },
              {
                title: 'Targeted Physics Match',
                detail: `For ${record?.prediction || 'Scratch'}, micro-buffing removes the superficial defect within tolerance limits without altering core metallurgy.`,
                metric: `Optimized for ${record?.prediction || 'Scratch'}`,
              },
            ],
          },
          scenarios: [
            {
              scenario_id: 'SCN-LOW',
              name: 'Scenario A: Low Operational Disruption',
              impact_level: 'LOW',
              simulated_impact_pct: 5.0,
              formatted_impact: '5%',
              description: 'Minor line disturbance with minimal downstream queue accumulation.',
            },
            {
              scenario_id: 'SCN-MED',
              name: 'Scenario B: Moderate Line Impact',
              impact_level: 'MEDIUM',
              simulated_impact_pct: 10.0,
              formatted_impact: '10%',
              description: 'Moderate work-center backlog requiring standard dispositioning intervention.',
            },
            {
              scenario_id: 'SCN-HIGH',
              name: 'Scenario C: Critical Work-Center Halt',
              impact_level: 'HIGH',
              simulated_impact_pct: 20.0,
              formatted_impact: '20%',
              description: 'Severe stoppage or critical safety-relevant work-center buffer exhaustion.',
            },
          ],
          notice:
            'All scenario impacts are simulated benchmark percentages [SIMULATED]. The supplied dataset contains no financial records.',
        });
      });
  }, [record?.id, record?.prediction]);

  const investigation = record.investigation;
  const potentialCauses = investigation?.potential_causes || [];
  const recommendedActions = investigation?.recommended_actions || [];



  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
            title="Back to Dashboard"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-extrabold font-heading text-white">
                Analysis #{record.id}
              </span>
              <span
                className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  record.status === 'Defective'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {record.status}
              </span>
              {record.qualityStatus && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-semibold border ${
                    record.qualityStatus === 'VALID'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                  title="OpenCV Quality Gate check (blur, lighting, dimension integrity)"
                >
                  CV: {record.qualityStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Specimen: {record.imageName} &bull; Model: {record.aiModel || 'ForgeMind EfficientNet-B0'} &bull; Inspected on {record.formattedDate}
              {pipelineData?.process_health?.summary?.model && (
                <span> &bull; Facility Model: {pipelineData.process_health.summary.model}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToUpload}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition cursor-pointer"
          >
            + New Inspection
          </button>
        </div>
      </div>

      {/* Main Specimen Preview Banner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start p-6 rounded-3xl bg-slate-950/80 border border-white/10 shadow-xl">
        {/* Specimen Visual with Grad-CAM Explainability Toggle */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center min-h-[260px] max-h-[340px]">
            <img
              src={viewMode === 'gradcam' && record.gradcamOverlayUrl ? record.gradcamOverlayUrl : record.imageUrl}
              alt={record.imageName}
              className="max-h-[320px] w-auto object-contain rounded-xl transition-all duration-300"
            />
          </div>

          {/* Grad-CAM Toggle Bar */}
          {record.gradcamOverlayUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-1 bg-slate-900 rounded-xl border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('original')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition font-semibold cursor-pointer ${
                    viewMode === 'original'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Original Image
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('gradcam')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition font-semibold cursor-pointer ${
                    viewMode === 'gradcam'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Grad-CAM Attention
                </button>
              </div>
              <p className="text-[10px] font-mono text-slate-400 text-center">
                Grad-CAM highlights neural feature attention overlay (explainability), not an exact geometric bounding box.
              </p>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-500 text-center py-1">
              Visual attention overlay not available for this specimen
            </div>
          )}
        </div>

        {/* Specimen Telemetry & Key Metrics */}
        <div className="lg:col-span-7 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Classification */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-0.5">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Classification</span>
              <span className="text-sm font-bold text-white font-heading">{record.prediction}</span>
            </div>

            {/* Card 2: Model Confidence */}
            <div
              className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-0.5 group relative cursor-help"
              title="Model confidence indicates how strongly the classifier favors this class. It is not a guarantee of correctness."
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Confidence</span>
                <span className="text-[9px] text-cyan-400 font-mono">ℹ️</span>
              </div>
              <span className="text-sm font-bold text-cyan-300 font-heading font-mono">
                {record.confidence.toFixed(1)}%
              </span>
            </div>

            {/* Card 3: Severity */}
            <div
              className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-0.5 group relative cursor-help"
              title="Severity rating requires physical engineering measurement. No validated severity model is currently connected."
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Severity</span>
                <span className="text-[9px] text-slate-500 font-mono">ℹ️</span>
              </div>
              <span className="text-xs font-semibold text-slate-400">Not determined</span>
            </div>

            {/* Card 4: Anomaly Location */}
            <div
              className="p-3 rounded-xl bg-slate-900/90 border border-white/5 space-y-0.5 group relative cursor-help"
              title="Grad-CAM indicates the neural network's visual attention heatmap, not an exact mechanical boundary."
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Location</span>
                <span className="text-[9px] text-cyan-400 font-mono">ℹ️</span>
              </div>
              <span className="text-xs font-semibold text-cyan-400">Grad-CAM region</span>
            </div>
          </div>

          {/* 5-Class Probability Breakdown */}
          {record.probabilities && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Class Probabilities (5-Class Distribution)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  EfficientNet-B0 Softmax
                </span>
              </div>
              <div className="space-y-1.5">
                {(['Crack', 'Hole', 'Normal', 'Rust', 'Scratch'] as const).map((cls) => {
                  const prob = (record.probabilities?.[cls] || 0) * 100;
                  const isTop = cls === record.prediction;
                  return (
                    <div key={cls} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className={isTop ? 'text-cyan-300 font-bold' : 'text-slate-400'}>
                          {cls} {isTop && '✓ (Top Class)'}
                        </span>
                        <span className={isTop ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                          {prob.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isTop
                              ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                              : 'bg-slate-800'
                          }`}
                          style={{ width: `${Math.max(prob, 0.5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* Tabs Navigation (4 Clean Tabs with Strict Taxonomic Labels) */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer font-semibold ${
            activeTab === 'overview'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          1. Diagnostic Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('impact')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer font-semibold ${
            activeTab === 'impact'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          2. Economic Impact
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sensitivity')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer font-semibold flex items-center gap-1.5 ${
            activeTab === 'sensitivity'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>3. Scenario Sensitivity</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            [SENSITIVITY]
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cure_prevention')}
          className={`px-4 py-2 rounded-xl transition cursor-pointer font-semibold flex items-center gap-1.5 ${
            activeTab === 'cure_prevention' || activeTab === 'assistant'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>4. Cure & Prevention</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
            [HISTORICAL]
          </span>
        </button>
      </div>

      {/* Tab Content Panes */}
      <div className="rounded-3xl p-6 bg-slate-950/80 border border-white/10 min-h-[350px]">
        {/* Tab 1: Diagnostic Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="text-base font-bold font-heading text-white">
              Inspection Diagnostic Overview
            </h3>

            {/* Quality Intelligence Summary */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-3">
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Quality Intelligence Summary
              </span>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>
                    <strong>What is wrong?</strong> Detected surface condition:{' '}
                    <span className="text-white font-semibold">{record.prediction}</span>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>
                    <strong>Where is it?</strong> Location: Grad-CAM attention region available.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span
                    className="cursor-help"
                    title="No validated severity model or engineering severity threshold is currently connected."
                  >
                    <strong>How severe?</strong> Severity: <span className="text-slate-400 font-semibold">Not determined</span>. (Severity is not currently estimated by the validated vision model).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span
                    className="cursor-help"
                    title="Model confidence indicates how strongly the classifier favors this class. It is not a guarantee of correctness."
                  >
                    <strong>Classification Confidence:</strong> Model confidence: <span className="text-cyan-300 font-semibold font-mono">{record.confidence.toFixed(1)}%</span>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">&bull;</span>
                  <span>
                    <strong>Economic Impact:</strong>{' '}
                    <span className="text-cyan-300 font-mono font-semibold">
                      {selectedImpactLevel && simulatedEconomicResult
                        ? `${simulatedEconomicResult.formatted_impact} [SIMULATED]`
                        : 'Not assessed'}
                    </span>
                    <span className="text-slate-400 ml-2">
                      (Configured in{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('impact')}
                        className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer font-semibold"
                      >
                        Economic Impact section &rarr;
                      </button>
                      )
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Dynamic Section 1: Why It May Have Occurred */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold font-heading text-cyan-400">
                    Why It May Have Occurred
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Possible contributing factors based on engineering guidance. These are hypotheses, not confirmed causes.
                  </p>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  [HYPOTHESIS]
                </span>
              </div>

              {potentialCauses.length > 0 ? (
                <div className="space-y-3">
                  {potentialCauses.map((cause, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-2 hover:border-cyan-500/20 transition"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white font-heading">
                          Possible factor: {simplifyCauseTitle(cause.cause)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            Evidence strength:
                          </span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md uppercase ${
                              cause.evidence_strength === 'strong'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {cause.evidence_strength}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            [HYPOTHESIS]
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-slate-400">Why it may have occurred:</strong> {simplifyExplanation(cause.explanation)}
                      </p>

                      <div className="pt-1 text-[11px] font-mono text-cyan-400 flex items-start gap-1">
                        <span className="text-slate-500 shrink-0">Source:</span>
                        <span>{cause.sources.join(', ') || 'Engineering Guidance Standard'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-slate-500 space-y-1">
                  <p>Insufficient evidence to identify a specific contributing factor.</p>
                  <p className="text-[10px] text-slate-600">
                    No verified failure mode documentation matched for this condition.
                  </p>
                </div>
              )}
            </div>

            {/* Dynamic Section 2: RECOMMENDED INVESTIGATION / ACTIONS */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    RECOMMENDED INVESTIGATION / ACTIONS
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Targeted physical verification steps derived from manufacturing SOPs.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Advisory — requires engineer verification
                </span>
              </div>

              {recommendedActions.length > 0 ? (
                <ol className="space-y-3">
                  {recommendedActions.map((action, idx) => (
                    <li
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/80 border border-white/5 space-y-1.5"
                    >
                      <div className="flex items-start gap-2.5 text-xs text-white">
                        <span className="font-mono text-cyan-400 font-bold shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="font-semibold leading-relaxed">
                          {action.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                        <strong className="text-slate-400">Engineering Rationale:</strong> {action.reason}
                      </p>
                      <div className="pl-6 pt-1 text-[10px] font-mono text-slate-400 flex items-start gap-1">
                        <span className="text-slate-500 shrink-0">Standard / SOP:</span>
                        <span>{action.sources.join(', ') || 'Internal Manufacturing Quality SOP'}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="py-6 text-center text-xs font-mono text-slate-500">
                  No automated investigation actions recommended. Standard continuous line monitoring applies.
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-400">
                <strong className="text-amber-300">IMPORTANT NOTICE:</strong> These are NOT confirmed root causes unless actual factory evidence supports them. An authorized quality engineer must conduct physical verification on the work center.
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Economic Impact Studio (User-Selected Simulated Model) */}
        {activeTab === 'impact' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-heading text-white">
                    Simulated Economic Impact Studio
                  </h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                    [SIMULATED]
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Decision-support impact modeling based on user-selected operational tiers. Zero fabricated monetary costs or currency symbols.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetImpact}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer"
                >
                  Reset Selection
                </button>
              </div>
            </div>

            {/* SECTION 1: SIMULATED IMPACT SELECTOR & DEFECT CURED PROFIT RECOVERY */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold font-heading text-white tracking-wide">
                    ECONOMIC IMPACT
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                    [SIMULATED]
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Defect: <strong className="text-white">{record.prediction}</strong> &bull; Vision Confidence:{' '}
                  <strong className="text-cyan-300">{record.confidence.toFixed(1)}%</strong>{' '}
                  <span className="text-slate-500 text-[10px]">(classifier metric only)</span>
                </div>
              </div>

              {/* Defect Treatment State Switcher: Untreated Defect vs Defect Cured */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-bold">Defect Treatment State:</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      treatmentStatus === 'cured'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {treatmentStatus === 'cured' ? '✓ Defect Cured / Remediated' : '⚠ Untreated Defect (Uncured)'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleTreatmentStatus('untreated')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      treatmentStatus === 'untreated'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
                    }`}
                  >
                    <span>1. Before Treatment</span>
                    <span className="text-[10px] text-rose-400 font-bold">
                      (-{selectedImpactLevel ? (selectedImpactLevel === 'LOW' ? '5' : selectedImpactLevel === 'MEDIUM' ? '10' : '20') : '10'}% Loss)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleTreatmentStatus('cured')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                      treatmentStatus === 'cured'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-white bg-slate-900 border border-white/5'
                    }`}
                  >
                    <span>2. Defect Cured</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      (+{selectedImpactLevel ? (selectedImpactLevel === 'LOW' ? '4' : selectedImpactLevel === 'MEDIUM' ? '8' : '16') : '8'}% Profit Recovery)
                    </span>
                  </button>
                </div>
              </div>

              {/* Selector Buttons */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => {
                    const pctMap = { LOW: '5%', MEDIUM: '10%', HIGH: '20%' };
                    const profitMap = { LOW: '+4% Profit', MEDIUM: '+8% Profit', HIGH: '+16% Profit' };
                    const descMap = {
                      LOW: 'Low disruption / routine buffer absorption',
                      MEDIUM: 'Moderate line slowdown / supervisor review',
                      HIGH: 'Critical bottleneck risk / station stop',
                    };
                    const isActive = selectedImpactLevel === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => handleSelectImpactLevel(lvl)}
                        className={`flex-1 min-w-[200px] p-4 rounded-xl border text-left transition cursor-pointer ${
                          isActive
                            ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                            : 'bg-slate-950 border-white/10 hover:border-white/20 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span
                            className={`text-sm font-bold uppercase ${
                              lvl === 'HIGH' ? 'text-rose-400' : lvl === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {lvl}
                          </span>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-cyan-300 block">
                              {treatmentStatus === 'cured' ? profitMap[lvl] : pctMap[lvl]}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {treatmentStatus === 'cured' ? 'Cured recovery' : 'Untreated loss'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                          {descMap[lvl]}
                        </p>
                        <span className="inline-block mt-2 text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          [SIMULATED]
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Reason Field */}
                <div className="space-y-1.5 font-mono">
                  <label className="text-xs text-slate-300 flex items-center justify-between">
                    <span>Operational Reason (Optional):</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      [USER INPUT]
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Critical customer shipment, standard batch inspection, high-value assembly line..."
                    value={userReason}
                    onChange={(e) => handleUserReasonChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/15 text-white placeholder-slate-600 focus:border-cyan-400 focus:outline-none text-xs"
                  />
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span>Selected Reason:</span>
                    <strong className="text-slate-200">
                      {userReason.trim() ? `"${userReason.trim()}"` : 'Not provided'}
                    </strong>
                    {userReason.trim() && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                        [USER INPUT]
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Assessment State: Before Treatment Loss vs Defect Cured Profit */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 font-mono pt-2 border-t border-white/10">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Impact Level
                  </span>
                  <span className="text-base font-bold text-white uppercase block">
                    {selectedImpactLevel ? selectedImpactLevel : 'Not selected'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {selectedImpactLevel ? '[USER SELECTED]' : 'Awaiting selection'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/20 space-y-1">
                  <span className="text-[10px] text-rose-300 uppercase tracking-wider block">
                    Before Treatment Loss
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-rose-400">
                      {selectedImpactLevel && simulatedEconomicResult ? simulatedEconomicResult.formatted_before_treatment_loss : 'Not assessed'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                      [LOSS]
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Initial untreated risk
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-1 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                    Defect Cured Profit
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-extrabold text-emerald-400">
                      {selectedImpactLevel && simulatedEconomicResult ? simulatedEconomicResult.formatted_after_treatment_profit : 'Not assessed'}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      [SIMULATED]
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Avoided loss &minus; treatment overhead
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Vision Classification
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-white">
                      {record.confidence.toFixed(1)}%
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      [MODEL]
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Image feature certainty
                  </span>
                </div>
              </div>

              {/* Formula & Recovery Transparency Banner */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
                    Cured Benefit Formula
                  </span>
                  <span className="text-slate-300 text-[11px]">
                    {selectedImpactLevel ? (
                      <>
                        <strong className="text-white">Avoided Defect Loss ({selectedImpactLevel === 'LOW' ? '5%' : selectedImpactLevel === 'MEDIUM' ? '10%' : '20%'})</strong>
                        {' '}&minus;{' '}
                        <span className="text-amber-300">Simulated Treatment Overhead ({selectedImpactLevel === 'LOW' ? '1%' : selectedImpactLevel === 'MEDIUM' ? '2%' : '4%'})</span>
                        {' '}={' '}
                        <strong className="text-emerald-300 font-bold text-xs">
                          +{selectedImpactLevel === 'LOW' ? '4%' : selectedImpactLevel === 'MEDIUM' ? '8%' : '16%'} Net Profit Recovery [SIMULATED]
                        </strong>
                      </>
                    ) : (
                      <span className="text-slate-500">
                        When the defect is cured, ForgeMind models the avoided scrap/line loss minus simulated treatment effort. Select a level above to view.
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Zero fake rupee values</span>
              </div>

              {/* Model Confidence Separation Guarantee Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-xs font-mono space-y-1">
                <span className="text-cyan-400 font-bold text-[11px] uppercase block">
                  Model Confidence Separation Guarantee
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Vision model confidence (<strong className="text-cyan-300">{record.confidence.toFixed(1)}%</strong>) reflects classifier certainty over image pixels. It is <strong className="text-white">never multiplied into the economic impact</strong> and <strong className="text-white">never used to determine Low/Medium/High automatically</strong>.
                </p>
              </div>
            </div>

            {/* SECTION 2: CUSTOM COST ANALYSIS — USER-ENTERED INPUTS & MONTE CARLO RANGES */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-5 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold font-heading text-white tracking-wide">
                    CUSTOM COST ANALYSIS
                  </h4>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    [SIMULATED]
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Enter your production costs to estimate profit/margin ranges
                </span>
              </div>

              {/* Editable Cost Inputs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Unit Price (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={customUnitPrice}
                    onChange={(e) => setCustomUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Material Cost (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customMaterialCost}
                    onChange={(e) => setCustomMaterialCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Scrap Cost (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customScrapCost}
                    onChange={(e) => setCustomScrapCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Rework Cost (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customReworkCost}
                    onChange={(e) => setCustomReworkCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Defect Rate Presets + Manual Input */}
              <div className="flex flex-wrap items-end gap-3 font-mono">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Defect Rate</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    max="0.999"
                    value={customDefectRate}
                    onChange={(e) => setCustomDefectRate(parseFloat(e.target.value) || 0.08)}
                    className="w-28 px-3 py-2 rounded-lg bg-slate-950 border border-white/15 text-white text-xs focus:border-purple-400 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-500 block">e.g. 0.08 = 8%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 mr-1">Presets:</span>
                  {(['LOW', 'MEDIUM', 'HIGH'] as const).map((tier) => {
                    const pctLabel = { LOW: '5%', MEDIUM: '10%', HIGH: '20%' };
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => applyPresetDefectRate(tier)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                          customDefectRate === (tier === 'LOW' ? 0.05 : tier === 'MEDIUM' ? 0.10 : 0.20)
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                            : 'text-slate-400 bg-slate-950 border-white/10 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {tier} ({pctLabel[tier]})
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleRecalculateCustomEconomic}
                  disabled={isRecalculating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-purple-400 hover:from-purple-400 hover:to-purple-300 text-white font-bold text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isRecalculating ? (
                    <><span className="animate-spin">⟳</span> Calculating...</>
                  ) : (
                    <><span>📊</span> Recalculate</>
                  )}
                </button>
              </div>

              {/* Range Results Display */}
              {customEconomicRanges && (
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-xs font-bold text-purple-300 uppercase">Profit, Margin & Loss Ranges</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      [SIMULATED RANGE]
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                    {/* Estimated Profit */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2">
                      <span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">
                        Est. Profit / Run
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-emerald-400">
                          {customEconomicRanges.ranges.estimated_profit_per_run.likely.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">INR</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-rose-400">{customEconomicRanges.ranges.estimated_profit_per_run.low.toLocaleString()}</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-emerald-300 font-bold">{customEconomicRanges.ranges.estimated_profit_per_run.likely.toLocaleString()}</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-cyan-400">{customEconomicRanges.ranges.estimated_profit_per_run.high.toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex gap-2">
                        <span>Low (p10)</span><span>Likely (p50)</span><span>High (p90)</span>
                      </div>
                    </div>

                    {/* Profit Margin % */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 space-y-2">
                      <span className="text-[10px] text-cyan-300 uppercase tracking-wider block font-bold">
                        Profit Margin %
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-cyan-400">
                          {customEconomicRanges.ranges.profit_margin_pct.likely.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-rose-400">{customEconomicRanges.ranges.profit_margin_pct.low.toFixed(1)}%</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-cyan-300 font-bold">{customEconomicRanges.ranges.profit_margin_pct.likely.toFixed(1)}%</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-emerald-400">{customEconomicRanges.ranges.profit_margin_pct.high.toFixed(1)}%</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex gap-2">
                        <span>Low (p10)</span><span>Likely (p50)</span><span>High (p90)</span>
                      </div>
                    </div>

                    {/* Total Loss from Defects */}
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/20 space-y-2">
                      <span className="text-[10px] text-rose-300 uppercase tracking-wider block font-bold">
                        Total Defect Loss
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold text-rose-400">
                          {customEconomicRanges.ranges.total_loss_from_defects.likely.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">INR</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="text-emerald-400">{customEconomicRanges.ranges.total_loss_from_defects.low.toLocaleString()}</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-rose-300 font-bold">{customEconomicRanges.ranges.total_loss_from_defects.likely.toLocaleString()}</span>
                        <span className="text-slate-500">—</span>
                        <span className="text-rose-400">{customEconomicRanges.ranges.total_loss_from_defects.high.toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex gap-2">
                        <span>Low (p10)</span><span>Likely (p50)</span><span>High (p90)</span>
                      </div>
                    </div>
                  </div>

                  {/* Guardrail Notice */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/20 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                      SIMULATED
                    </span>
                    <span>
                      Computed from your inputs, simulated. Monte Carlo ±10-20% perturbation on defect rate, scrap/rework costs, and unit price. Not actual factory financial data.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation Callout to Tab 3: Scenario Sensitivity & What-If Simulator */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900/80 to-slate-900/80 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 font-mono shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">⚡ What-If Remediation Simulator</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    [4 STRATEGIC PATHWAYS]
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Compare alternative remediation ways to treat this defect, profit/loss trade-offs, and inspect the decision rationale in Scenario Sensitivity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('sensitivity')}
                className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <span>Open in Scenario Sensitivity (Tab 3) &rarr;</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Scenario Sensitivity (What-If Remediation Simulator & Throughput Sensitivity) */}
        {activeTab === 'sensitivity' && (
          <div className="space-y-6">
            {/* SECTION 1: WHAT-IF REMEDIATION SIMULATOR & MULTI-PATHWAY SELECTION */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">⚡</span>
                    <h4 className="text-base font-bold font-heading text-white">
                      What-If Remediation Simulator: 4 Strategic Pathways
                    </h4>
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      [SIMULATED]
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Compare how many distinct ways exist to treat this <span className="text-white font-semibold">{record.prediction}</span> defect, evaluate profit/loss vs line disruption trade-offs, and see why ForgeMind selects the optimal path.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/30 font-semibold shadow-sm">
                    {whatIfResult?.total_ways_available || 4} Strategic Ways Evaluated
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-white/10">
                    Zero fake rupee losses
                  </span>
                </div>
              </div>

              {/* The 4 Alternative Ways Grid */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-slate-300 font-bold tracking-wide uppercase text-[11px] font-mono">
                    Available Remediation Strategies ("How Many Other Ways There Are"):
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px] flex items-center gap-1">
                    <span>💡</span> Click any card to inspect path details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {whatIfResult?.pathways?.map((pathway) => {
                    const isSelected = selectedPathwayId === pathway.pathway_id;
                    const isRec = pathway.is_recommended;
                    const isPositive = pathway.net_profit_recovery_pct > 0;

                    const badgeLabel = isRec
                      ? '★ RECOMMENDED'
                      : pathway.pathway_id === 'WAY-2'
                      ? 'OFF-LINE'
                      : pathway.pathway_id === 'WAY-3'
                      ? 'DOWNGRADE'
                      : 'SCRAP';

                    return (
                      <button
                        key={pathway.pathway_id}
                        type="button"
                        onClick={() => setSelectedPathwayId(pathway.pathway_id)}
                        className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 group ${
                          isSelected
                            ? isRec
                              ? 'bg-gradient-to-b from-cyan-950/50 to-slate-950 border-cyan-400 shadow-[0_0_25px_rgba(0,229,255,0.2)]'
                              : 'bg-gradient-to-b from-amber-950/30 to-slate-950 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                            : isRec
                            ? 'bg-slate-950/90 border-cyan-500/40 hover:border-cyan-400/80 hover:bg-slate-900'
                            : 'bg-slate-950/90 border-white/10 hover:border-white/25 hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-2.5 w-full">
                          <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                            <span className="text-xs font-mono font-bold text-white tracking-wider">
                              {pathway.pathway_id}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold ${
                                isRec
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                                  : pathway.pathway_id === 'WAY-4'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-slate-800/80 text-slate-300 border border-white/10'
                              }`}
                            >
                              {badgeLabel}
                            </span>
                          </div>

                          <h5 className="text-xs sm:text-sm font-bold text-white font-heading group-hover:text-cyan-300 transition-colors leading-snug min-h-[38px]">
                            {pathway.name.replace(/^Way \d+:\s*/i, '')}
                          </h5>

                          <p className="text-[11px] text-slate-400 leading-relaxed min-h-[44px] line-clamp-3">
                            {pathway.description}
                          </p>
                        </div>

                        <div className="w-full pt-3 border-t border-white/10 space-y-2 text-xs font-mono bg-white/[0.02] p-2.5 rounded-xl">
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate-400 text-[10px] uppercase">Net Benefit</span>
                            <span
                              className={`font-black text-sm ${
                                isPositive
                                  ? 'text-emerald-400'
                                  : pathway.net_profit_recovery_pct === 0
                                  ? 'text-amber-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {pathway.formatted_profit_recovery}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/5">
                            <span>Cycle Time:</span>
                            <span className="font-semibold text-slate-200">
                              {pathway.formatted_cycle_time.split(' ')[0]} {pathway.formatted_cycle_time.split(' ')[1] || 'min'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-400">
                            <span>Result Grade:</span>
                            <span className="font-semibold text-slate-200">
                              {pathway.final_grade.split(' ')[0]}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* WHY WE CHOOSE THIS WAY: EXPLICIT DECISION RATIONALE CALLOUT */}
              {whatIfResult?.why_we_choose_this_way && (
                <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/40 via-slate-950/90 to-slate-950 border-2 border-cyan-500/40 space-y-5 shadow-2xl animate-fadeIn">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-cyan-500/30 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold uppercase tracking-wider">
                          Selection Decision Rationale
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <h4 className="text-base sm:text-lg font-black text-white font-heading tracking-wide">
                        Why We Choose: {whatIfResult.why_we_choose_this_way.recommended_pathway_name}
                      </h4>
                    </div>
                    <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold shrink-0">
                      ★ Chosen Optimal Strategy
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-cyan-950/30 border-l-4 border-cyan-400 text-xs text-slate-200 leading-relaxed font-sans shadow-sm">
                    <strong className="text-cyan-300 font-mono font-bold block mb-1 uppercase tracking-wider text-[11px]">
                      Executive Engineering Summary
                    </strong>
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      {whatIfResult.why_we_choose_this_way.summary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {whatIfResult.why_we_choose_this_way.key_reasons.map((reason, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/20 space-y-2 hover:border-cyan-500/40 transition shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-1 border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-white font-heading">
                            0{idx + 1}. {reason.title}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded inline-block">
                          {reason.metric}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {reason.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 space-y-2">
                    <div className="text-xs text-slate-300 font-bold flex items-center justify-between font-mono">
                      <span>Remediation Trade-Off Comparison Matrix</span>
                      <span className="text-[10px] text-slate-400">Specimen #{record.id} &bull; {record.prediction}</span>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/90 shadow-lg">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-white/10 bg-slate-900 text-[10px] text-slate-400 uppercase tracking-wider">
                            <th className="p-3">Pathway</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Net Profit / Loss</th>
                            <th className="p-3">Cycle Time Delta</th>
                            <th className="p-3">Restored Grade</th>
                            <th className="p-3">ForgeMind Decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-[11px]">
                          {whatIfResult?.pathways?.map((pw) => (
                            <tr
                              key={pw.pathway_id}
                              className={
                                pw.is_recommended
                                  ? 'bg-cyan-500/10 font-medium'
                                  : 'hover:bg-white/5 transition-colors'
                              }
                            >
                              <td className="p-3 text-white font-bold">
                                {pw.name.split(':')[0]}
                              </td>
                              <td className="p-3 text-slate-300">
                                {pw.category}
                              </td>
                              <td
                                className={`p-3 font-bold ${
                                  pw.net_profit_recovery_pct > 0
                                    ? 'text-emerald-300 font-black'
                                    : pw.net_profit_recovery_pct === 0
                                    ? 'text-amber-300'
                                    : 'text-rose-400'
                                }`}
                              >
                                {pw.formatted_profit_recovery}
                              </td>
                              <td className="p-3 text-slate-300">
                                {pw.formatted_cycle_time}
                              </td>
                              <td className="p-3 text-slate-300">
                                {pw.final_grade}
                              </td>
                              <td className="p-3">
                                {pw.is_recommended ? (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold inline-flex items-center gap-1 shadow-sm">
                                    <span>★</span> CHOSEN PATHWAY
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">
                                    {pw.pathway_id === 'WAY-4' ? 'Worst-case rejection' : 'Sub-optimal alternative'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-white/5 pt-2 font-mono">
                <strong className="text-amber-300">Notice:</strong> {whatIfResult?.notice || whatIfResult?.disclosure || 'All scenario impacts are simulated benchmark percentages [SIMULATED]. The supplied dataset contains no financial records.'}
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: Cure & Prevention (Decision-Support & Historical Learning) */}
        {(activeTab === 'cure_prevention' || activeTab === 'assistant') && (
          <div className="space-y-6">
            {/* Header with Subtitle */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <h3 className="text-base font-bold font-heading text-white">
                    Cure & Prevention
                  </h3>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    [DECISION SUPPORT]
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  Learn from previous defects and guide the next corrective action.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono px-3 py-1 rounded-xl bg-slate-900 border border-white/10 text-slate-300">
                  Human-in-the-Loop Guidance &bull; Zero Automatic Repairs
                </span>
              </div>
            </div>

            {/* SECTION 1: CURRENT DEFECT */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3 font-mono shadow-md">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  CURRENT DEFECT
                </span>
                <span className="text-[10px] text-slate-400">
                  Specimen ID: <strong className="text-white">#{record.id}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">Detected Defect</span>
                  <span className="text-base font-extrabold text-white block">
                    {record.prediction}
                  </span>
                  <span className="text-[9px] text-cyan-300 block font-bold">
                    [MEASURED CLASSIFICATION]
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">Vision Confidence</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-cyan-300">
                      {record.confidence.toFixed(1)}%
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      [MODEL]
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Independent certainty metric
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-1">
                  <span className="text-[10px] text-emerald-300 uppercase block font-bold">Case Status</span>
                  <span className="text-sm font-bold text-emerald-400 block font-mono">
                    {cureActionStatus}
                  </span>
                  <span className="text-[9px] text-slate-400 block">
                    {cureActionStatus === 'NEW' ? '[MEASURED]' : '[USER CONFIRMED]'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase block">Metric Decoupling</span>
                  <span className="text-xs font-semibold text-slate-200 block">
                    Vision &ne; Similarity
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Never treated as root-cause probability
                  </span>
                </div>
              </div>
            </div>

            {/* Notification / Alert Banners */}
            {actionConfirmationNotice && (
              <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-start justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">✓</span>
                  <div>
                    <strong>{actionConfirmationNotice}</strong> Status updated to <span className="font-bold text-white uppercase">{cureActionStatus} [USER CONFIRMED]</span>.
                    <p className="text-slate-300 text-[11px] mt-0.5">
                      Physical corrective action must be completed and verified by the responsible human/team.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionConfirmationNotice(null)}
                  className="text-slate-400 hover:text-white cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            {verificationNotice && (
              <div className="p-4 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono flex items-start justify-between gap-3 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <span className="text-base">ℹ️</span>
                  <div>
                    <strong>{verificationNotice}</strong> Status updated to <span className="font-bold text-white uppercase">{cureActionStatus} [USER CONFIRMED]</span>.
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Verification data not available in the organizer dataset. Recorded based on human confirmation.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationNotice(null)}
                  className="text-slate-400 hover:text-white cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>
            )}

            {/* SECTION 2: SIMILAR DEFECT FOUND OR NO SIMILAR CASE */}
            {isLoadingCurePrevention ? (
              <div className="p-12 text-center text-xs font-mono text-slate-400 space-y-2">
                <div className="w-8 h-8 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <p>Searching historical defect case library...</p>
              </div>
            ) : curePreventionData?.status === 'similar_found' && curePreventionData.similar_case ? (
              <div className="space-y-6">
                {/* PROMINENT SIMILAR DEFECT FOUND CARD */}
                <div className="p-6 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/40 space-y-5 shadow-2xl">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="text-base sm:text-lg font-black font-heading text-white tracking-wide">
                          SIMILAR DEFECT FOUND
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          [SIMILARITY]
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-mono">
                        Previous similar case found in historical knowledge base.
                      </p>
                    </div>

                    {/* Key Metrics Row */}
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-emerald-500/30">
                        <span className="text-slate-400 text-[10px] block">Similarity</span>
                        <span className="font-extrabold text-emerald-400 text-sm">
                          {curePreventionData.similar_case.similarity_pct}%
                        </span>
                        <span className="text-[9px] text-slate-400 ml-1 font-bold">[SIMILARITY]</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10">
                        <span className="text-slate-400 text-[10px] block">Previous Case</span>
                        <span className="font-bold text-white">
                          {curePreventionData.similar_case.case_id}
                        </span>
                        <span className="text-[9px] text-blue-300 ml-1 font-bold">[SIMULATED]</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10">
                        <span className="text-slate-400 text-[10px] block">Outcome</span>
                        <span className="font-bold text-cyan-300">
                          {curePreventionData.similar_case.status}
                        </span>
                        <span className="text-[9px] text-blue-300 ml-1 font-bold">[SIMULATED]</span>
                      </div>
                    </div>
                  </div>

                  {/* Strict Semantic Disclaimer */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-[11px] font-mono text-slate-300 flex items-start gap-2.5">
                    <span className="text-cyan-400 text-base shrink-0">ℹ️</span>
                    <p className="leading-relaxed">
                      <strong>Similarity Disclaimer:</strong> "{curePreventionData.similar_case.similarity_disclaimer}" The similarity percentage is a visual/semantic feature resemblance score; it is NOT probability of same root cause or model confidence.
                    </p>
                  </div>

                  {/* 2-Column Breakdown: Previous Case Info & Why Relevant */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Column 1: PREVIOUS CASE INFORMATION */}
                    <div className="p-5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          PREVIOUS CASE INFORMATION
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ID: <strong className="text-white">{curePreventionData.similar_case.case_id}</strong> [SIMULATED]
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-300">
                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Defect Type</span>
                          <span className="font-bold text-white">{curePreventionData.similar_case.defect}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 text-[10px] block uppercase">Previous Investigation</span>
                          <span className="text-slate-200">
                            {curePreventionData.similar_case.previous_investigation}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[10px] uppercase">Previous Possible Cause</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                              [HYPOTHESIS]
                            </span>
                          </div>
                          <span className="text-slate-200 font-medium">
                            "{curePreventionData.similar_case.previous_possible_cause}"
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[10px] uppercase">Previous Recommended Action</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              [ADVISORY]
                            </span>
                          </div>
                          <span className="text-slate-200">
                            {curePreventionData.similar_case.previous_recommended_action}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Human Decision:</span>
                            <span className="text-white font-semibold">
                              {curePreventionData.similar_case.previous_human_decision}
                            </span>{' '}
                            <span className="text-[9px] text-emerald-400 font-bold">[USER CONFIRMED]</span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px]">Outcome:</span>
                            <span className="text-cyan-300 font-semibold">
                              {curePreventionData.similar_case.previous_outcome}
                            </span>{' '}
                            <span className="text-[9px] text-emerald-400 font-bold">[USER CONFIRMED]</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-[10px] text-slate-500">
                        Notice: ForgeMind does not convert a previous hypothesis into a confirmed root cause.
                      </div>
                    </div>

                    {/* Column 2: WHY THIS CASE IS RELEVANT */}
                    <div className="p-5 rounded-2xl bg-slate-950/90 border border-white/10 space-y-3 font-mono">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          WHY THIS CASE IS RELEVANT
                        </span>
                        <span className="text-[10px] text-slate-400">[HISTORICAL EVIDENCE]</span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {curePreventionData.similar_case.evidence_why_relevant.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-900 border border-white/5 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold">{ev.label}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                  ev.tag === '[MEASURED]'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                    : ev.tag === '[SIMILARITY]'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {ev.tag}
                              </span>
                            </div>
                            {ev.detail && (
                              <p className="text-[11px] text-slate-400">{ev.detail}</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
                        <strong>Causality Rule:</strong> "Previous similar cases were associated with fixture-related issues. This may be relevant to the current case."
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: CURE / CORRECTIVE ACTION */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-950 border border-emerald-500/30 space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🔧</span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          CURE / CORRECTIVE ACTION
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                        [HISTORICAL EVIDENCE] [SIMULATED]
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <span className="text-slate-400 block">
                        Previous case used the following corrective action:
                      </span>
                      <blockquote className="p-3.5 rounded-xl bg-slate-950 border-l-4 border-emerald-400 text-white font-medium text-xs sm:text-sm">
                        "{curePreventionData.similar_case.cure_action.previous_action_summary}"
                      </blockquote>
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-amber-300 font-semibold">
                          RECOMMENDED FOR REVIEW [ADVISORY]:
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          Does not claim physical repair &bull; requires human verification
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs italic pl-2">
                        "{curePreventionData.similar_case.cure_action.recommended_review}"
                      </p>
                    </div>
                  </div>

                  {/* SECTION 4: PREVENTION */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🛡️</span>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          PREVENTION
                        </span>
                      </div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
                        [ADVISORY]
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-slate-300">
                      <p className="text-slate-200">
                        {curePreventionData.similar_case.prevention.guidance}
                      </p>
                      <blockquote className="p-3 rounded-xl bg-slate-900 border-l-4 border-blue-400 text-slate-200">
                        "{curePreventionData.similar_case.prevention.procedure}"
                      </blockquote>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/20 text-[11px] text-amber-300">
                        ⚠️ <strong>Important Notice:</strong> "{curePreventionData.similar_case.prevention.effectiveness_notice}" ForgeMind does not claim a defect has been prevented merely because a recommendation was displayed.
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: HUMAN-IN-THE-LOOP ACTION BUTTONS */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-4 font-mono">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        HUMAN-IN-THE-LOOP ACTION
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Decision-Support &bull; Human Confirmation Required
                      </span>
                    </div>

                    {/* Saved Decision Banner with Timestamp */}
                    {caseDecisionInfo && (
                      <div
                        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn ${
                          caseDecisionInfo.decision === 'APPROVED'
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : caseDecisionInfo.decision === 'EDITED'
                            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider ${
                                caseDecisionInfo.decision === 'APPROVED'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : caseDecisionInfo.decision === 'EDITED'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {caseDecisionInfo.decision} [USER CONFIRMED]
                            </span>
                            <span className="text-xs font-semibold text-white">
                              Review Decision Recorded
                            </span>
                          </div>
                          {caseDecisionInfo.action && (
                            <p className="text-xs text-slate-300">
                              <strong>Action:</strong> {caseDecisionInfo.action}
                            </p>
                          )}
                          {caseDecisionInfo.note && (
                            <p className="text-xs text-slate-400">
                              <strong>Note / Reason:</strong> {caseDecisionInfo.note}
                            </p>
                          )}
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                            Decision Saved At
                          </span>
                          <span className="text-xs font-mono font-bold text-white">
                            {caseDecisionInfo.timestamp}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowApplyConfirmModal(true)}
                        className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        <span>✓</span>
                        <span>APPLY PREVIOUS ACTION</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenEditModal}
                        className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      >
                        <span>✏️</span>
                        <span>EDIT ACTION</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenRejectModal}
                        className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.2)]"
                      >
                        <span>✕</span>
                        <span>REJECT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCaseReviewModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-white/10 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>📄</span>
                        <span>REVIEW PREVIOUS CASE</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowNewInvestigationModal(true)}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🔍</span>
                        <span>START NEW INVESTIGATION</span>
                      </button>
                    </div>

                    {/* Inline Confirmation Card when button clicked */}
                    {showApplyConfirmModal && (
                      <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 space-y-3 animate-fadeIn">
                        <div className="flex items-start gap-2">
                          <span className="text-base text-emerald-400">❓</span>
                          <span className="text-xs text-white font-bold leading-relaxed">
                            Use the previous corrective action as guidance for this case?
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 pl-6 leading-relaxed">
                          Action: "{curePreventionData.similar_case.cure_action.previous_action_summary}"
                        </p>
                        <div className="flex items-center gap-2 pl-6 pt-1">
                          <button
                            type="button"
                            onClick={handleConfirmApplyPreviousAction}
                            disabled={isApplyingAction}
                            className="px-4 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                          >
                            {isApplyingAction ? 'Applying...' : 'CONFIRM'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowApplyConfirmModal(false)}
                            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Edit Action Modal */}
                    {showEditActionModal && (
                      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-3 animate-fadeIn">
                        <div className="flex items-start gap-2">
                          <span className="text-base text-amber-400">✏️</span>
                          <div>
                            <h4 className="text-xs text-white font-bold uppercase tracking-wider">
                              Edit Recommended Corrective Action
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Customize the SOP procedure and record reviewer notes before saving.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pl-6">
                          <div>
                            <label className="text-[10px] text-amber-300 font-bold uppercase block mb-1">
                              Recommended Action (Editable):
                            </label>
                            <textarea
                              rows={3}
                              value={editActionText}
                              onChange={(e) => setEditActionText(e.target.value)}
                              className="w-full p-2.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                              placeholder="Enter customized corrective procedure..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                              Reviewer Note (Optional):
                            </label>
                            <input
                              type="text"
                              value={editActionNote}
                              onChange={(e) => setEditActionNote(e.target.value)}
                              className="w-full p-2 rounded-lg bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                              placeholder="e.g. Modified tool offset per maintenance log audit"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleConfirmEditAction}
                              disabled={isSavingDecision || !editActionText.trim()}
                              className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              {isSavingDecision ? 'Saving...' : 'SAVE & APPLY EDITED ACTION'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowEditActionModal(false)}
                              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Inline Reject Modal */}
                    {showRejectModal && (
                      <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-fadeIn">
                        <div className="flex items-start gap-2">
                          <span className="text-base text-rose-400">✕</span>
                          <div>
                            <h4 className="text-xs text-white font-bold uppercase tracking-wider">
                              Reject Recommended Action
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Rejection requires an explicit engineering reason for audit and learning loop capture.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pl-6">
                          <div>
                            <label className="text-[10px] text-rose-300 font-bold uppercase block mb-1">
                              Reason for Rejection (Required):
                            </label>
                            <textarea
                              rows={3}
                              value={rejectReason}
                              onChange={(e) => {
                                setRejectReason(e.target.value);
                                if (rejectError) setRejectError(null);
                              }}
                              className={`w-full p-2.5 rounded-lg bg-slate-900 border text-xs text-white placeholder-slate-500 focus:outline-none font-mono ${
                                rejectError ? 'border-rose-500' : 'border-white/15 focus:border-rose-400'
                              }`}
                              placeholder="State reason (e.g. Fixture guide rails were inspected and confirmed within spec; crack appears thermal shock)..."
                            />
                            {rejectError && (
                              <p className="text-[10px] text-rose-400 mt-1 font-bold">
                                ⚠️ {rejectError}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={handleConfirmReject}
                              disabled={isSavingDecision}
                              className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                            >
                              {isSavingDecision ? 'Saving...' : 'CONFIRM REJECTION'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRejectModal(false);
                                setRejectError(null);
                              }}
                              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
                            >
                              CANCEL
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 6: CASE STATUS WORKFLOW STEPPER */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-white/10 space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        CASE STATUS WORKFLOW
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Current: {cureActionStatus} [USER CONFIRMED]
                      </span>
                    </div>

                    {/* Interactive Workflow States */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {(
                        [
                          'NEW',
                          'ACTION_RECOMMENDED',
                          'ACTION_APPROVED',
                          'ACTION_IN_PROGRESS',
                          'RESOLVED',
                          'VERIFICATION_PENDING',
                          'VERIFIED',
                        ] as CaseWorkflowStatus[]
                      ).map((st, idx) => {
                        const isCurrent = cureActionStatus === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleUpdateWorkflowStatus(st)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              isCurrent
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'
                            }`}
                          >
                            {idx + 1}. {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SECTION 7: VERIFY THE OUTCOME */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/20 space-y-3 font-mono">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        VERIFY PREVENTION
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Physical inspection verification
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      Review subsequent inspection results to determine whether the defect has recurred.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleVerifyCase('verified')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          cureActionStatus === 'VERIFIED'
                            ? 'bg-emerald-500 text-slate-950 shadow-md'
                            : 'bg-slate-900 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        <span>✓</span>
                        <span>MARK VERIFIED</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleVerifyCase('recurred')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          cureActionStatus === 'DEFECT_RECURRED'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-slate-900 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        <span>⚠</span>
                        <span>DEFECT RECURRED</span>
                      </button>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-[10px] text-slate-500">
                      Verification data not available in the organizer dataset. Recorded based on human confirmation. Zero fabricated improvement percentages.
                    </div>
                  </div>

                  {/* SECTION 8: HISTORICAL LEARNING LOOP DIAGRAM */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-3 font-mono">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block border-b border-white/5 pb-2">
                      Continuous Historical Learning Loop
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10px]">
                      {[
                        { title: 'NEW DEFECT', desc: 'Classifier detects defect' },
                        { title: 'CASE SEARCH', desc: 'Search library for match' },
                        { title: 'PREV EVIDENCE', desc: 'Review prior FMEA/SOP' },
                        { title: 'HUMAN REVIEW', desc: 'Engineer inspects trade-offs' },
                        { title: 'ACTION', desc: 'Human confirms guidance' },
                        { title: 'OUTCOME', desc: 'Record case status' },
                        { title: 'VERIFIED', desc: 'Check subsequent runs' },
                        { title: 'FUTURE REUSE', desc: 'Library learning' },
                      ].map((step, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-slate-900 border border-white/5 text-center space-y-1"
                        >
                          <span className="font-bold text-emerald-300 block">
                            0{idx + 1}. {step.title}
                          </span>
                          <span className="text-slate-400 block text-[9px]">
                            {step.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* NO SIMILAR PREVIOUS CASE FOUND STATE */
              <div className="p-8 rounded-3xl bg-slate-900/90 border border-white/10 text-center space-y-4 font-mono">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 text-2xl">
                  🔍
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold uppercase text-white">
                    NO SIMILAR PREVIOUS CASE FOUND
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    No sufficiently similar resolved case is available for this defect.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewInvestigationModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition cursor-pointer"
                  >
                    START NEW INVESTIGATION
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* CASE REVIEW MODAL */}
      {showCaseReviewModal && curePreventionData?.similar_case && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl text-emerald-400">📄</span>
                <div>
                  <h3 className="text-base font-bold font-heading text-white">
                    Historical Case Dossier &bull; {curePreventionData.similar_case.case_id}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Previous resolved defect record [SIMULATED]
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCaseReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase block">Prior Investigation Report</span>
                <p className="text-white">{curePreventionData.similar_case.previous_investigation}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-purple-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-[10px] uppercase block font-bold">Investigated Possible Cause</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                    [HYPOTHESIS]
                  </span>
                </div>
                <p className="text-white">"{curePreventionData.similar_case.previous_possible_cause}"</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300 text-[10px] uppercase block font-bold">Recorded Corrective Procedure</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    [HISTORICAL EVIDENCE]
                  </span>
                </div>
                <p className="text-white">"{curePreventionData.similar_case.cure_action.previous_action_summary}"</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase block">Human Resolution Decision</span>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{curePreventionData.similar_case.previous_human_decision}</span>
                  <span className="text-emerald-400 font-bold text-[11px]">{curePreventionData.similar_case.status}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setShowCaseReviewModal(false);
                  setShowApplyConfirmModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Apply This Previous Action &rarr;
              </button>
              <button
                type="button"
                onClick={() => setShowCaseReviewModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START NEW INVESTIGATION MODAL */}
      {showNewInvestigationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl text-cyan-400">🔍</span>
                <div>
                  <h3 className="text-base font-bold font-heading text-white">
                    Start New Engineering Investigation
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Specimen #{record.id} &bull; Detected {record.prediction} ({record.confidence.toFixed(1)}%)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewInvestigationModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-200">
                Initiate a fresh root-cause investigation for this specimen. Follow the standard physical quality inspection protocol:
              </p>

              <ol className="space-y-2 p-4 rounded-xl bg-slate-950 border border-white/5 list-decimal list-inside text-xs leading-relaxed">
                <li><strong className="text-white">Physical Specimen Verification:</strong> Confirm dimensional tolerances and cosmetic severity on work center.</li>
                <li><strong className="text-white">Tooling Inspection:</strong> Audit cutting edges, tool offsets, and spindle thermal sensors.</li>
                <li><strong className="text-white">Fixture & Guide-Rail Check:</strong> Inspect clamping surfaces for metal debris or wear grooves.</li>
                <li><strong className="text-white">Process Fluid Audit:</strong> Measure coolant concentration (refractometer) and ambient humidity logs.</li>
              </ol>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                Note: Investigation status will be recorded under Case #{record.id}. Physical verification by an authorized quality engineer is mandatory.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  handleUpdateWorkflowStatus('INVESTIGATING');
                  setShowNewInvestigationModal(false);
                  setActionConfirmationNotice('New investigation initiated. Status set to INVESTIGATING.');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                Mark Case As "INVESTIGATING" &rarr;
              </button>
              <button
                type="button"
                onClick={() => setShowNewInvestigationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
