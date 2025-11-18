// src/contexts/GeneratedMusicContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useGeneratedMusic } from '../hooks/useGeneratedMusic';
import { GeneratedMusic, SunoGenerateRequest } from '../types/music';

interface GeneratedMusicContextType {
  // State
  generatedMusic: GeneratedMusic[];
  isGenerating: boolean;
  currentTaskId: string | null;
  pendingTasks: Set<string>;
  progress: { stage: string; percent: number };
  lastPrompt: string | null;
  
  // 🔥 NEW: Minting state for deduplication
  mintingTracks: Set<string>; // Currently minting tracks
  mintedTracks: Set<string>; // Successfully minted tracks

  // Actions
  generateMusic: (params: SunoGenerateRequest) => Promise<any>;
  handleSunoCallback: (callbackData: any, generationParams: SunoGenerateRequest, transactionHash: string) => Promise<void>;
  clearGeneratedMusic: () => void;
  removeTrack: (trackId: string) => void;

  // Computed values
  hasGeneratedMusic: boolean;
  totalTracks: number;
}

const GeneratedMusicContext = createContext<GeneratedMusicContextType | undefined>(undefined);

export const useGeneratedMusicContext = () => {
  const context = useContext(GeneratedMusicContext);
  if (!context) {
    throw new Error('useGeneratedMusicContext must be used within GeneratedMusicProvider');
  }
  return context;
};

interface GeneratedMusicProviderProps {
  children: ReactNode;
}

export const GeneratedMusicProvider: React.FC<GeneratedMusicProviderProps> = ({ children }) => {
  const hookData = useGeneratedMusic();

  const value: GeneratedMusicContextType = {
    ...hookData,
    hasGeneratedMusic: hookData.generatedMusic.length > 0,
    totalTracks: hookData.generatedMusic.length
  };

  return (
    <GeneratedMusicContext.Provider value={value}>
      {children}
    </GeneratedMusicContext.Provider>
  );
};