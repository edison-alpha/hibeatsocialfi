/**
 * Hook for managing play counts and tracking
 * Tracks play events for NFT music tokens
 * Uses global context for synced data across pages
 */

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { createPlayEventData } from '@/config/somniaDataStreams.v3';
import somniaService from '@/services/somniaDatastreamService.v3';
import { useGlobalPlayCounts } from '@/contexts/PlayCountContext';

export interface PlayCountData {
  tokenId: number;
  playCount: number;
}

export interface BestSongData {
  tokenId: number;
  playCount: number;
}

export function usePlayCounts(tokenIds: number[]) {
  const { address } = useAccount();
  const globalPlayCounts = useGlobalPlayCounts();
  const [bestSong, setBestSong] = useState<BestSongData | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Load play counts using global context
  const loadPlayCounts = useCallback(async () => {
    if (tokenIds.length === 0) return;

    try {
      console.log('🎵 Loading play counts for tokens:', tokenIds);
      
      // Use global context to refresh
      await globalPlayCounts.refreshPlayCounts(tokenIds);
      
      // Calculate best song from global counts
      const best = await somniaService.getBestSongInAlbum(tokenIds);
      setBestSong(best);
      
      console.log('✅ Play counts loaded from global context');
      console.log('🏆 Best song:', best);
    } catch (err) {
      console.error('❌ Failed to load play counts:', err);
      setError(err as Error);
    }
  }, [tokenIds, globalPlayCounts]);

  // Record play event
  const recordPlay = useCallback(async (
    tokenId: number,
    duration: number,
    source: string = 'app'
  ) => {
    if (!address) {
      console.warn('⚠️ No wallet connected, skipping play event');
      return;
    }

    try {
      console.log('🎵 Recording play event:', { tokenId, duration, source });
      
      const playEvent = createPlayEventData(tokenId, address, duration, source);
      await somniaService.recordPlayEvent(playEvent, false); // Use batch mode
      
      console.log('✅ Play event recorded');
      
      // Optimistic update in global context
      globalPlayCounts.incrementPlayCount(tokenId);
      
      // Update best song if needed
      const currentCount = globalPlayCounts.getPlayCount(tokenId);
      if (!bestSong || currentCount > bestSong.playCount) {
        setBestSong({ tokenId, playCount: currentCount });
      }
    } catch (err) {
      console.error('❌ Failed to record play event:', err);
    }
  }, [address, globalPlayCounts, bestSong]);

  // Get play count for specific token (from global context)
  const getPlayCount = useCallback((tokenId: number): number => {
    return globalPlayCounts.getPlayCount(tokenId);
  }, [globalPlayCounts]);

  // Check if token is best song
  const isBestSong = useCallback((tokenId: number): boolean => {
    return bestSong?.tokenId === tokenId;
  }, [bestSong]);

  // Load on mount and when tokenIds change
  useEffect(() => {
    loadPlayCounts();
  }, [loadPlayCounts]);

  return {
    playCounts: globalPlayCounts.playCounts,
    bestSong,
    isLoading: globalPlayCounts.isLoading,
    error,
    recordPlay,
    getPlayCount,
    isBestSong,
    reload: loadPlayCounts,
  };
}

export default usePlayCounts;
