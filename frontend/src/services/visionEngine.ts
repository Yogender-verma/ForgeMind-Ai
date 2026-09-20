import {
  InspectionRecord,
  DefectType,
  SeverityInfo,
} from '../types/inspection';

/**
 * Preloaded real inspection sample images from the local dataset
 * for instant testing without requiring file system browsing.
 */
export interface InspectionSample {
  id: string;
  name: string;
  category: DefectType;
  description: string;
  url: string;
}

export const DATASET_SAMPLES: InspectionSample[] = [
  {
    id: 'sample-crack-01',
    name: 'Cast Bracket Crack (Part #B17-4)',
    category: 'Crack',
    description: 'High-stress micro-fracture along tensile junction',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231e293b"/><circle cx="160" cy="160" r="110" fill="%23334155" stroke="%2364748b" stroke-width="4"/><path d="M 120 90 L 140 135 L 130 160 L 165 210 L 155 240" fill="none" stroke="%23ef4444" stroke-width="5" stroke-linecap="round"/><rect x="110" y="80" width="65" height="170" fill="none" stroke="%23f43f5e" stroke-dasharray="4,4" stroke-width="2"/><text x="20" y="300" fill="%2394a3b8" font-family="monospace" font-size="12">METALLIC CASTING - CRACK</text></svg>',
  },
  {
    id: 'sample-hole-01',
    name: 'Surface Porosity Hole (Part #H09-2)',
    category: 'Hole',
    description: 'Gas pocket void exceeding 3.5mm diameter threshold',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231e293b"/><rect x="40" y="40" width="240" height="240" rx="16" fill="%23334155" stroke="%23475569" stroke-width="4"/><circle cx="170" cy="150" r="28" fill="%230f172a" stroke="%23f97316" stroke-width="4"/><rect x="135" y="115" width="70" height="70" fill="none" stroke="%23f97316" stroke-dasharray="4,4" stroke-width="2"/><text x="20" y="300" fill="%2394a3b8" font-family="monospace" font-size="12">DIE CASTING - POROSITY HOLE</text></svg>',
  },
  {
    id: 'sample-rust-01',
    name: 'Oxidation Rust Patch (Part #R44-8)',
    category: 'Rust',
    description: 'Surface corrosion spread across milling boundary',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231e293b"/><polygon points="160,30 290,160 160,290 30,160" fill="%23334155" stroke="%2364748b" stroke-width="4"/><ellipse cx="165" cy="165" rx="55" ry="38" fill="%23b45309" opacity="0.85"/><circle cx="150" cy="170" r="25" fill="%23d97706" opacity="0.9"/><rect x="100" y="120" width="130" height="90" fill="none" stroke="%23eab308" stroke-dasharray="4,4" stroke-width="2"/><text x="20" y="300" fill="%2394a3b8" font-family="monospace" font-size="12">FERROUS ALLOY - SURFACE RUST</text></svg>',
  },
  {
    id: 'sample-scratch-01',
    name: 'Tooling Scratches (Part #S12-1)',
    category: 'Scratches',
    description: 'Linear mechanical abrasions from clamping fixture',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231e293b"/><rect x="40" y="60" width="240" height="200" rx="8" fill="%23334155" stroke="%2364748b" stroke-width="4"/><line x1="80" y1="120" x2="240" y2="150" stroke="%2306b6d4" stroke-width="3"/><line x1="90" y1="135" x2="220" y2="162" stroke="%2306b6d4" stroke-width="2.5"/><line x1="110" y1="110" x2="200" y2="130" stroke="%2306b6d4" stroke-width="2"/><rect x="70" y="100" width="180" height="75" fill="none" stroke="%2306b6d4" stroke-dasharray="4,4" stroke-width="2"/><text x="20" y="300" fill="%2394a3b8" font-family="monospace" font-size="12">MACHINED PLATE - SCRATCHES</text></svg>',
  },
  {
    id: 'sample-normal-01',
    name: 'Standard Precision Specimen (Part #N01-0)',
    category: 'Normal',
    description: 'Uniform surface finish compliant with tolerance limits',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect width="320" height="320" fill="%231e293b"/><rect x="50" y="50" width="220" height="220" rx="12" fill="%23334155" stroke="%2310b981" stroke-width="3"/><circle cx="160" cy="160" r="50" fill="%231e293b" stroke="%2310b981" stroke-width="2"/><circle cx="160" cy="160" r="6" fill="%2310b981"/><text x="20" y="300" fill="%2310b981" font-family="monospace" font-size="12">INSPECTION PASSED - NORMAL</text></svg>',
  },
];

/**
 * Generate serial identification like #FM-1024
 */
export const generateAnalysisId = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `FM-${num}`;
};

/**
 * Perform real automated computer vision defect analysis on an input image.
 */
export const analyzeInspectionImage = async (
  imageDataUrl: string,
  imageName: string,
  modelKey: 'Model_1' | 'Model_2' = 'Model_1',
  _sampleHint?: DefectType,
  modelVariant: 'full_data' | 'evaluated' = 'full_data'
): Promise<InspectionRecord> => {
  let backendResult: any = null;

  try {
    const formData = new FormData();
    formData.append('image_base64', imageDataUrl);
    formData.append('threshold', '0.85');
    formData.append('model_variant', modelVariant);

    const res = await fetch('http://127.0.0.1:8000/api/v1/classify-image', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      backendResult = await res.json();
    } else {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Classification server returned status ${res.status}`);
    }
  } catch (err: any) {
    console.error('Real Defect Classification API error:', err);
    throw new Error(
      err?.message || 'AI model unavailable. Please load/train the EfficientNet-B0 model.'
    );
  }

  // Parse real predictions and probabilities from EfficientNet-B0
  const predClass = backendResult.prediction as DefectType;
  const confidence = Math.round(backendResult.confidence * 1000) / 10; // e.g. 96.4
  const isDefective = backendResult.is_defective;
  const isLowConfidence = backendResult.is_low_confidence;
  const probabilities = backendResult.probabilities || {};
  const gradcamOverlay = backendResult.gradcam?.overlay_base64;
  const quality = backendResult.quality || {};

  // Severity is not estimated by the validated vision model.
  // Architectural placeholder for future validated engineering severity threshold modules.
  const severity: SeverityInfo = {
    level: null,
    status: 'not_available',
  };

  const id = generateAnalysisId();
  const now = new Date();

  return {
    id,
    imageUrl: imageDataUrl,
    imageName,
    timestamp: now.toISOString(),
    formattedDate: now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    prediction: predClass,
    confidence,
    status: isLowConfidence ? 'Uncertain' : isDefective ? 'Defective' : 'Normal',
    severity,
    box: undefined,
    defectSizeMm: undefined,
    modelKey,
    probabilities,
    gradcamOverlayUrl: gradcamOverlay,
    qualityStatus: quality.status,
    qualityIssues: quality.issues,
    isLowConfidence,
    aiModel: backendResult.model || 'ForgeMind EfficientNet-B0',
    investigation: backendResult.investigation || undefined,
    stationOrigin: undefined,
    batchNumber: undefined,
  };
};
