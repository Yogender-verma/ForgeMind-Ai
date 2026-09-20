import {
  InspectionRecord,
  DashboardKPIs,
  DefectDistributionItem,
  DefectType,
  SeverityInfo,
} from '../types/inspection';
import { DATASET_SAMPLES } from './visionEngine';

const STORAGE_KEY = 'forgemind_inspection_records';
const NOTIFICATIONS_KEY = 'forgemind_notifications';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'warning' | 'alert';
  read: boolean;
  link?: string;
}

// Normalized default inspections including verified FM-7714
const SEED_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'FM-7714',
    imageUrl: DATASET_SAMPLES[2]?.url || '',
    imageName: 'die_cast_flange_sample_7714.png',
    timestamp: new Date().toISOString(),
    formattedDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    prediction: 'Rust',
    confidence: 99.5,
    status: 'Defective',
    severity: {
      level: null,
      status: 'not_available',
    },
    probabilities: {
      Crack: 0.001,
      Normal: 0.002,
      Hole: 0.001,
      Scratch: 0.001,
      Rust: 0.995,
    },
    investigation: {
      defect: 'Rust',
      potential_causes: [
        {
          cause: 'Weakened protective coolant fluid',
          explanation: 'The protective cutting fluid may have become too diluted, leaving the fresh metal surface vulnerable to rust. Fluid concentration must be tested on the shop floor to verify.',
          evidence_strength: 'moderate',
          sources: [
            'Engineering Guidance: Machining Coolant Emulsion & Rust Prevention (KB-GUIDE-CLT-03)',
          ],
        },
        {
          cause: 'High humidity or damp storage',
          explanation: 'Moisture left on the metal part in a humid room can quickly trigger surface rust. Checking drying blowers and room humidity is needed to confirm.',
          evidence_strength: 'moderate',
          sources: [
            'Engineering Guidance: Machining Coolant Emulsion & Rust Prevention (KB-GUIDE-CLT-03)',
          ],
        },
      ],
      recommended_actions: [
        {
          action: 'Audit coolant refractometer concentration (maintain >6%) and verify pH remains between 8.8 and 9.2',
          reason: 'Provides immediate barrier passivation against atmospheric oxidation',
          sources: [
            'Engineering Guidance: Machining Coolant Emulsion & Rust Prevention (KB-GUIDE-CLT-03)',
          ],
        },
        {
          action: 'Inspect wash stage drying air knife blower temperature and airflow velocity',
          reason: 'Ensures all standing moisture is evaporated before staging transfer',
          sources: [
            'Engineering Guidance: Machining Coolant Emulsion & Rust Prevention (KB-GUIDE-CLT-03)',
          ],
        },
      ],
      factory_evidence: [
        'Visual-to-production record linkage is not available in the supplied datasets.',
      ],
      limitations: [
        'Visual-to-production record linkage is not available in the supplied datasets.',
        'Potential contributing factors are engineering hypotheses derived from technical standards, not confirmed physical causes on this specific specimen.',
      ],
      requires_engineer_review: true,
      insufficient_evidence: false,
    },
    gradcamOverlayUrl: DATASET_SAMPLES[2]?.url || '',
    qualityStatus: 'VALID',
    aiModel: 'ForgeMind EfficientNet-B0',
  },
  {
    id: 'FM-1042',
    imageUrl: DATASET_SAMPLES[0]?.url || '',
    imageName: 'cast_bracket_sample_1042.png',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    formattedDate: new Date(Date.now() - 3600000).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    prediction: 'Crack',
    confidence: 96.4,
    status: 'Defective',
    severity: {
      level: null,
      status: 'not_available',
    },
    probabilities: {
      Crack: 0.964,
      Normal: 0.012,
      Hole: 0.015,
      Scratch: 0.005,
      Rust: 0.004,
    },
    investigation: {
      defect: 'Crack',
      potential_causes: [
        {
          cause: 'Excessive clamping force or worn cutting tools',
          explanation: 'Dull cutting tools or clamps squeezing too tightly can put too much stress on the metal, potentially causing cracks. Checking tool sharpness and clamp pressure on the line is required to verify.',
          evidence_strength: 'moderate',
          sources: [
            'Engineering Guidance: Mechanical Tool Shock & Surface Cracking (KB-GUIDE-CRK-01)',
          ],
        },
        {
          cause: 'Uneven or rapid cooling',
          explanation: 'If hot metal cools down unevenly or too quickly, the sudden temperature drop might pull the material apart and crack it. A physical check of the cooling spray nozzles is needed to confirm.',
          evidence_strength: 'moderate',
          sources: [
            'Engineering Guidance: Mechanical Tool Shock & Surface Cracking (KB-GUIDE-CRK-01)',
          ],
        },
      ],
      recommended_actions: [
        {
          action: 'Verify fixture clamping hydraulic pressure and die alignment to ensure uniform load distribution',
          reason: 'Prevents mechanical stress concentration along component boundaries',
          sources: [
            'AIAG & VDA FMEA Handbook (Failure Mode and Effects Analysis for Tool Wear & Mechanical Fracture)',
          ],
        },
        {
          action: 'Inspect tool cutting edge radius and review spindle cycle time limits',
          reason: 'Dull tooling drastically increases cutting friction and tensile fracture risk',
          sources: [
            'AIAG & VDA FMEA Handbook (Failure Mode and Effects Analysis for Tool Wear & Mechanical Fracture)',
          ],
        },
      ],
      factory_evidence: [
        'Visual-to-production record linkage is not available in the supplied datasets.',
      ],
      limitations: [
        'Visual-to-production record linkage is not available in the supplied datasets.',
        'Potential contributing factors are engineering hypotheses derived from technical standards, not confirmed physical causes on this specific specimen.',
      ],
      requires_engineer_review: true,
      insufficient_evidence: false,
    },
    gradcamOverlayUrl: DATASET_SAMPLES[0]?.url || '',
    qualityStatus: 'VALID',
    aiModel: 'ForgeMind EfficientNet-B0',
  },
];

export const simplifyCauseTitle = (title?: string): string => {
  if (!title) return 'Possible Factor';
  const t = title.toLowerCase();
  if (t.includes('swarf') || t.includes('debris') || t.includes('metal debris')) {
    return 'Metal Debris Trapped on Clamps';
  }
  if (t.includes('guide rail') || t.includes('conveyor') || t.includes('rubbing')) {
    return 'Rubbing Against Conveyor Rails or Grippers';
  }
  if (t.includes('clamping') || t.includes('cutting tool')) {
    return 'Excessive Clamping Force or Worn Cutting Tools';
  }
  if (t.includes('cooling') || t.includes('quench')) {
    return 'Uneven or Rapid Cooling';
  }
  if (t.includes('molding') || t.includes('gas porosity') || t.includes('entrained gas')) {
    return 'Air or Gas Trapped During Molding';
  }
  if (t.includes('degass') || t.includes('hydrogen')) {
    return 'Gas Not Fully Removed from Melted Metal';
  }
  if (t.includes('coolant') || t.includes('inhibitor')) {
    return 'Weakened Protective Coolant Fluid';
  }
  if (t.includes('humidity') || t.includes('drying')) {
    return 'High Humidity or Incomplete Drying';
  }
  return title;
};

export const simplifyExplanation = (text?: string): string => {
  if (!text) return '';
  const t = text.toLowerCase();
  if (t.includes('chips or machining') || t.includes('metal shavings')) {
    return 'Small metal shavings or dust may have been trapped under the clamps that hold the part, scratching it when tightened. An engineer would need to check the holding fixtures to see if this happened.';
  }
  if (t.includes('unpadded guide rails') || t.includes('scraped against unpadded')) {
    return 'The part might have scraped against unpadded metal rails or robotic fingers while moving between stations. Physical inspection of the conveyor line is needed to confirm this possibility.';
  }
  if (t.includes('mechanical stress') || t.includes('dull cutting tools') || t.includes('clamping pressure')) {
    return 'Dull cutting tools or clamps squeezing too tightly can put excessive mechanical stress on the metal, potentially causing surface cracks. Checking tool sharpness and clamp pressure on the line is required to verify.';
  }
  if (t.includes('quench') || t.includes('cools down unevenly') || t.includes('cooling spray')) {
    return 'If hot metal cools down unevenly or too quickly, the sudden temperature drop might pull the material apart and crack it. A physical check of the cooling spray nozzles is needed to confirm.';
  }
  if (t.includes('entrained gas') || t.includes('pockets of air') || t.includes('mold spray')) {
    return 'Tiny pockets of air or mold spray vapor might have been trapped inside the liquid metal before it hardened. Inspecting the mold air vents is necessary to see if this occurred.';
  }
  if (t.includes('degassing') || t.includes('dissolved gases')) {
    return 'Dissolved gases in the liquid metal can form small bubble voids if the metal was not completely degassed before pouring. Melt degassing logs must be reviewed by an engineer to confirm.';
  }
  if (t.includes('corrosion inhibitor') || t.includes('protective fluid') || t.includes('coolant')) {
    return 'The protective fluid used during cutting might have become diluted, leaving the fresh metal surface open to rusting. The fluid mixture on the shop floor must be tested to see if this was a factor.';
  }
  if (t.includes('humidity') || t.includes('moisture left') || t.includes('drying blowers')) {
    return 'Moisture left on the metal in a damp room can quickly cause rust patches to form. Checking the drying blowers and room humidity would be required to verify.';
  }
  return text;
};

/**
 * Normalize an inspection record to ensure type safety and valid severity structure.
 */
const normalizeRecord = (rec: any): InspectionRecord => {
  let normSeverity: SeverityInfo = {
    level: null,
    status: 'not_available',
  };

  if (rec.severity && typeof rec.severity === 'object' && 'status' in rec.severity) {
    normSeverity = rec.severity;
  }

  // Preserve or populate investigation report
  const seedMatch = SEED_INSPECTIONS.find((s) => s.id === rec.id);
  let investigation = rec.investigation || seedMatch?.investigation || undefined;

  if (investigation && Array.isArray(investigation.potential_causes)) {
    investigation = {
      ...investigation,
      potential_causes: investigation.potential_causes.map((c: any) => ({
        ...c,
        cause: simplifyCauseTitle(c.cause || c.factor),
        factor: simplifyCauseTitle(c.factor || c.cause),
        explanation: simplifyExplanation(c.explanation || c.why_considered),
        why_considered: simplifyExplanation(c.why_considered || c.explanation),
        status: 'HYPOTHESIS',
      })),
    };
  }

  return {
    ...rec,
    severity: normSeverity,
    investigation,
    modelKey: undefined,
    stationOrigin: undefined,
    batchNumber: undefined,
  };
};

/**
 * Retrieve all inspections from storage.
 */
export const getAllInspections = (): InspectionRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INSPECTIONS));
      return SEED_INSPECTIONS;
    }
    const parsed = JSON.parse(data) as any[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_INSPECTIONS));
      return SEED_INSPECTIONS;
    }
    return parsed.map(normalizeRecord);
  } catch (err) {
    console.warn('Could not read inspections from storage, using seed:', err);
    return SEED_INSPECTIONS;
  }
};

/**
 * Save an inspection record to storage.
 */
export const saveInspection = (record: InspectionRecord): void => {
  try {
    const list = getAllInspections();
    const updated = [record, ...list.filter((item) => item.id !== record.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Create a notification for the new inspection
    addNotification({
      id: `notif_${Date.now()}`,
      title: `Analysis ${record.id} Completed`,
      message: `${record.prediction} detected with ${record.confidence.toFixed(1)}% confidence. Status: ${record.status}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: record.status === 'Defective' ? 'alert' : 'info',
      read: false,
      link: `/analysis/${record.id}`,
    });
  } catch (err) {
    console.error('Could not save inspection record:', err);
  }
};

/**
 * Get an individual inspection by ID (case-insensitive).
 */
export const getInspectionById = (id: string): InspectionRecord | null => {
  if (!id) return null;
  const list = getAllInspections();
  const normalized = id.trim().toUpperCase();
  const match = list.find((item) => item.id.toUpperCase() === normalized);
  return match ? normalizeRecord(match) : null;
};

/**
 * Get recent inspections, sorted latest first.
 */
export const getRecentInspections = (limit = 5): InspectionRecord[] => {
  const list = getAllInspections();
  return list.slice(0, limit);
};

/**
 * Calculate KPI metrics from real stored inspection data.
 */
export const getDashboardKPIs = (): DashboardKPIs => {
  const list = getAllInspections();
  const total = list.length;

  if (total === 0) {
    return {
      totalInspections: 0,
      defectiveUnits: 0,
      normalUnits: 0,
      defectRatePct: 0,
      averageConfidencePct: 0,
      uncertainCases: 0,
      hasData: false,
    };
  }

  const defective = list.filter((item) => item.prediction !== 'Normal').length;
  const normal = list.filter((item) => item.prediction === 'Normal').length;
  const uncertain = list.filter((item) => item.status === 'Uncertain' || item.confidence < 80).length;

  const totalConfidence = list.reduce((acc, item) => acc + item.confidence, 0);
  const avgConfidence = totalConfidence / total;
  const defectRate = (defective / total) * 100;

  return {
    totalInspections: total,
    defectiveUnits: defective,
    normalUnits: normal,
    defectRatePct: Number(defectRate.toFixed(1)),
    averageConfidencePct: Number(avgConfidence.toFixed(1)),
    uncertainCases: uncertain,
    hasData: true,
  };
};

/**
 * Calculate defect distribution from actual inspection data.
 */
export const getDefectDistribution = (): DefectDistributionItem[] => {
  const list = getAllInspections();
  const total = list.length;

  const classes: Array<{ defectClass: DefectType; color: string }> = [
    { defectClass: 'Crack', color: '#f43f5e' },
    { defectClass: 'Hole', color: '#f97316' },
    { defectClass: 'Rust', color: '#eab308' },
    { defectClass: 'Scratches', color: '#06b6d4' },
    { defectClass: 'Normal', color: '#10b981' },
  ];

  return classes.map(({ defectClass, color }) => {
    const count = list.filter((item) => item.prediction === defectClass).length;
    const percentage = total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0;
    return {
      defectClass,
      count,
      percentage,
      color,
    };
  });
};

/**
 * Notifications Store
 */
export const getNotifications = (): AppNotification[] => {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!data) return [];
    return JSON.parse(data) as AppNotification[];
  } catch {
    return [];
  }
};

export const addNotification = (notif: AppNotification): void => {
  try {
    const list = getNotifications();
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([notif, ...list.slice(0, 15)]));
  } catch {
    // Non-blocking
  }
};

export const markNotificationsRead = (): void => {
  try {
    const list = getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    // Non-blocking
  }
};
