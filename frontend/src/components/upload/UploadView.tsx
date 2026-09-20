import React, { useRef, useEffect } from 'react';
import { ModelKey } from '../../types/forgemind';
import {
  DATASET_SAMPLES,
  InspectionSample,
  analyzeInspectionImage,
} from '../../services/visionEngine';
import { saveInspection } from '../../services/inspectionStore';
import { useUpload } from '../../context/UploadContext';

interface UploadViewProps {
  currentModel: ModelKey;
  onAnalysisComplete: (analysisId: string) => void;
  onBackToDashboard: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  currentModel,
  onAnalysisComplete,
  onBackToDashboard,
}) => {
  const {
    selectedImage,
    selectedImageName,
    selectedCategoryHint,
    selectedModel,
    isAnalyzing,
    analysisStep,
    analysisError,
    setSelectedImage,
    setSelectedImageName,
    setSelectedCategoryHint,
    setSelectedModel,
    setIsAnalyzing,
    setAnalysisStep,
    setAnalysisError,
    setLastAnalysisId,
    resetUploadState,
  } = useUpload();

  const [dragOver, setDragOver] = React.useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (currentModel && selectedModel !== currentModel) {
      setSelectedModel(currentModel);
    }
    return () => {
      isMountedRef.current = false;
      // Do NOT destroy global/context state on unmount!
      // Only abort in-flight requests if analyzing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentModel, selectedModel, setSelectedModel]);

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

  const processFile = (file: File) => {
    setSelectedCategoryHint(undefined);
    setAnalysisError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setAnalysisError(
        `Image size exceeds maximum limit of 5MB (selected file is ${sizeMB} MB). Please upload an image under 5MB.`
      );
      setSelectedImage(null);
      setSelectedImageName('');
      return;
    }

    setSelectedImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (isMountedRef.current) {
        setSelectedImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSelectSample = (sample: InspectionSample) => {
    setSelectedImage(sample.url);
    setSelectedImageName(sample.name);
    setSelectedCategoryHint(sample.category);
    setAnalysisError(null);
  };

  const handleRunAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('OpenCV quality validation & dimension analysis...');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      if (!isMountedRef.current) return;

      setAnalysisStep('Executing EfficientNet-B0 visual defect classification forward pass...');

      const result = await analyzeInspectionImage(
        selectedImage,
        selectedImageName || 'inspection_part.png',
        selectedModel,
        selectedCategoryHint
      );

      if (!isMountedRef.current) return;

      setAnalysisStep('Generating Grad-CAM visual attention heatmap overlay...');
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!isMountedRef.current) return;

      // Save inspection record to persistent store
      saveInspection(result);
      setLastAnalysisId(result.id);
      setIsAnalyzing(false);

      // Navigate to analysis page
      onAnalysisComplete(result.id);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('Analysis request aborted.');
        return;
      }
      console.error('Inference error:', err);
      if (isMountedRef.current) {
        setIsAnalyzing(false);
        setAnalysisError(
          err?.message || 'AI model unavailable. Please load/train the EfficientNet-B0 model.'
        );
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="text-xs font-mono text-slate-400 hover:text-cyan-300 transition flex items-center gap-1.5 mb-2 cursor-pointer"
          >
            <span>←</span>
            <span>Back to Dashboard</span>
          </button>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Upload & Analyze Product Image
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Feed inspection image into OpenCV quality validation, PyTorch EfficientNet-B0 defect classifier, and Grad-CAM visual attention explainability.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono">
          <span className="text-slate-400">Line:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ModelKey)}
            className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
          >
            <option value="Model_1" className="bg-slate-950 text-white">Model 1 (3-Station)</option>
            <option value="Model_2" className="bg-slate-950 text-white">Model 2 (Dual-Part)</option>
          </select>
        </div>
      </div>

      {/* Error Alert Banner */}
      {analysisError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-3 shadow-xl animate-fadeIn">
          <span className="text-base text-rose-400 font-bold">⚠</span>
          <div className="space-y-1">
            <p className="font-bold text-rose-200">Defect Classification Notice</p>
            <p>{analysisError}</p>
          </div>
        </div>
      )}

      {/* Main Upload Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Upload Box or Image Preview */}
        <div className="md:col-span-7 space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {!selectedImage ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-3xl border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-4 ${
                dragOver
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-white/15 bg-slate-950/80 hover:border-cyan-500/50 hover:bg-slate-900/60'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400 text-3xl shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                📥
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white font-heading">
                  Drag and drop your inspection image here
                </p>
                <p className="text-xs text-slate-400">
                  Supports PNG, JPG, JPEG, WEBP from line camera or inspection bench (Max 5MB)
                </p>
              </div>
              <button
                type="button"
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-white/10 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-semibold transition"
              >
                Browse Local File
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-cyan-500/30 bg-slate-950/90 p-5 space-y-4 shadow-xl">
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center min-h-[280px]">
                <img
                  src={selectedImage}
                  alt="Selected inspection specimen"
                  className="max-h-72 w-auto object-contain rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => resetUploadState()}
                  className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/20 text-xs text-slate-300 hover:text-white hover:bg-rose-500/20 hover:border-rose-500 transition cursor-pointer"
                  title="Remove image"
                >
                  ✕ Change Image
                </button>
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-mono text-slate-400 truncate max-w-[200px]">
                  {selectedImageName}
                </span>
                {selectedCategoryHint && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Sample: {selectedCategoryHint}
                  </span>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                id="run-analysis-btn"
                disabled={isAnalyzing}
                onClick={handleRunAnalysis}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 text-slate-950 font-bold text-sm shadow-[0_0_30px_rgba(0,229,255,0.4)] transition-all font-heading cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Analyzing Image...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Run AI Quality Analysis</span>
                  </>
                )}
              </button>

              {isAnalyzing && (
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono text-center animate-pulse">
                  {analysisStep}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Preloaded Real Dataset Samples */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-5 rounded-3xl bg-slate-950/80 border border-white/10 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
                Or Select Real Dataset Sample
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Test with verified inspection parts from the manufacturing dataset:
              </p>
            </div>

            <div className="space-y-2.5">
              {DATASET_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className={`w-full text-left p-3 rounded-2xl border transition flex items-center gap-3 cursor-pointer ${
                    selectedImageName === sample.name
                      ? 'bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                      : 'bg-slate-900/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <img
                    src={sample.url}
                    alt={sample.name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-slate-900 shrink-0"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white truncate font-heading">
                        {sample.name}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                          sample.category === 'Normal'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {sample.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {sample.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
