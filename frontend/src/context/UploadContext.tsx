import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ModelKey } from '../types/forgemind';
import { DefectType } from '../types/inspection';

export interface UploadSerializableMetadata {
  analysisId?: string;
  filename?: string;
  prediction?: string;
  confidence?: number;
  timestamp?: string;
  previewUrl?: string;
}

interface UploadContextType {
  selectedImage: string | null;
  selectedImageName: string;
  selectedCategoryHint: DefectType | undefined;
  selectedModel: ModelKey;
  isAnalyzing: boolean;
  analysisStep: string;
  analysisError: string | null;
  lastAnalysisId: string | null;
  setSelectedImage: (url: string | null) => void;
  setSelectedImageName: (name: string) => void;
  setSelectedCategoryHint: (hint: DefectType | undefined) => void;
  setSelectedModel: (model: ModelKey) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalysisStep: (step: string) => void;
  setAnalysisError: (err: string | null) => void;
  setLastAnalysisId: (id: string | null) => void;
  resetUploadState: () => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string>('');
  const [selectedCategoryHint, setSelectedCategoryHint] = useState<DefectType | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<ModelKey>('Model_1');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [lastAnalysisId, setLastAnalysisId] = useState<string | null>(null);

  const resetUploadState = useCallback(() => {
    setSelectedImage(null);
    setSelectedImageName('');
    setSelectedCategoryHint(undefined);
    setIsAnalyzing(false);
    setAnalysisStep('');
    setAnalysisError(null);
    setLastAnalysisId(null);
  }, []);

  return (
    <UploadContext.Provider
      value={{
        selectedImage,
        selectedImageName,
        selectedCategoryHint,
        selectedModel,
        isAnalyzing,
        analysisStep,
        analysisError,
        lastAnalysisId,
        setSelectedImage,
        setSelectedImageName,
        setSelectedCategoryHint,
        setSelectedModel,
        setIsAnalyzing,
        setAnalysisStep,
        setAnalysisError,
        setLastAnalysisId,
        resetUploadState,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (!context) {
    // Return safe fallback instead of crashing
    return {
      selectedImage: null,
      selectedImageName: '',
      selectedCategoryHint: undefined,
      selectedModel: 'Model_1',
      isAnalyzing: false,
      analysisStep: '',
      analysisError: null,
      lastAnalysisId: null,
      setSelectedImage: () => {},
      setSelectedImageName: () => {},
      setSelectedCategoryHint: () => {},
      setSelectedModel: () => {},
      setIsAnalyzing: () => {},
      setAnalysisStep: () => {},
      setAnalysisError: () => {},
      setLastAnalysisId: () => {},
      resetUploadState: () => {},
    };
  }
  return context;
};
