/**
 * Global Play Count Context
 * 
 * Provides centralized play count data that syncs across all pages
 * - Auto-refresh every 30 seconds
 * - Real-time updates when user plays music
 * - Shared state across components
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import somniaService from '@/services/somniaDatastreamService.v3';

interface PlayCountContextType {
  playCounts: Map<number, number>;
  getPlayCount: (tokenId: number) => number;
  refreshPlayCounts: (tokenIds: number[]) => Promise<void>;
  incrementPlayCount: (tokenId: number) => void;
  isLoading: boolean;
}

const PlayCountContext = createContext<PlayCountContextType | undefined>(undefined);

export const useGlobalPlayCounts = () => {
  const context = useContext(PlayCountContext);
  if (!context) {
    throw new Error('useGlobalPlayCounts must be used within PlayCountProvider');
  }
  return context;
};

export const PlayCountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [playCounts, setPlayCounts] = useState<Map<number, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [trackedTokenIds, setTrackedTokenIds] = useState<Set<number>>(new Set());

  // Get play count for specific token
  const getPlayCount = useCallback((tokenId: number): number => {
    return playCounts.get(tokenId) || 0;
  }, [playCounts]);

  // Refresh play counts for specific tokens
  const refreshPlayCounts = useCallback(async (tokenIds: number[]) => {
    if (tokenIds.length === 0) return;

    setIsLoading(true);
    try {
      // console.log('🔄 [GlobalPlayCounts] Refreshing play counts for', tokenIds.length, 'tokens');
      
      const counts = await somniaService.getPlayCountsForTokens(tokenIds);
      
      setPlayCounts(prevCounts => {
        const newCounts = new Map(prevCounts);
        for (const [tokenId, count] of counts.entries()) {
          newCounts.set(tokenId, count);
        }
        return newCounts;
      });
      
      // Track these token IDs for auto-refresh
      setTrackedTokenIds(prev => {
        const newSet = new Set(prev);
        tokenIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
      // console.log('✅ [GlobalPlayCounts] Refreshed', counts.size, 'play counts');
    } catch (error) {
      console.error('❌ [GlobalPlayCounts] Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Increment play count locally (optimistic update)
  const incrementPlayCount = useCallback((tokenId: number) => {
    setPlayCounts(prevCounts => {
      const newCounts = new Map(prevCounts);
      const currentCount = newCounts.get(tokenId) || 0;
      newCounts.set(tokenId, currentCount + 1);
      return newCounts;
    });
  }, []);

  // Auto-refresh all tracked tokens every 30 seconds
  useEffect(() => {
    if (trackedTokenIds.size === 0) return;

    const interval = setInterval(() => {
      const tokenIds = Array.from(trackedTokenIds);
      // console.log('🔄 [GlobalPlayCounts] Auto-refreshing', tokenIds.length, 'tracked tokens');
      refreshPlayCounts(tokenIds);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [trackedTokenIds, refreshPlayCounts]);

  const value: PlayCountContextType = {
    playCounts,
    getPlayCount,
    refreshPlayCounts,
    incrementPlayCount,
    isLoading,
  };

  return (
    <PlayCountContext.Provider value={value}>
      {children}
    </PlayCountContext.Provider>
  );
};

export default PlayCountContext;
