// React Hook for BeatsXP System
// Easy integration with components

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { bxpService } from '@/services/bxpService';
import { calculateLevel } from '@/config/bxpRewards';
import type { BXPRewardType, UserBXPProfile, BXPTransaction } from '@/config/bxpRewards';

export function useBXP() {
  const { address } = useAccount();
  const [profile, setProfile] = useState<UserBXPProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<BXPTransaction[]>([]);

  // Load user profile
  const loadProfile = useCallback(async () => {
    if (!address) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userProfile = await bxpService.getUserProfile(address);
      setProfile(userProfile);
    } catch (error) {
      console.error('[useBXP] Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Load transactions
  const loadTransactions = useCallback(async () => {
    if (!address) return;

    try {
      const txs = await bxpService.getUserTransactions(address, 50);
      setTransactions(txs);
    } catch (error) {
      console.error('[useBXP] Error loading transactions:', error);
    }
  }, [address]);

  // Award XP
  const awardXP = useCallback(
    async (rewardType: BXPRewardType, metadata?: Record<string, any>) => {
      if (!address) return { success: false, xpAwarded: 0, newTotal: 0 };

      const result = await bxpService.awardXP(address, rewardType, metadata);
      
      if (result.success) {
        // Reload profile to get updated stats
        await loadProfile();
      }

      return result;
    },
    [address, loadProfile]
  );

  // Update streak
  const updateStreak = useCallback(async () => {
    if (!address) return 0;
    
    const newStreak = await bxpService.updateStreak(address);
    await loadProfile(); // Reload to get updated streak
    return newStreak;
  }, [address, loadProfile]);

  // Initial load
  useEffect(() => {
    loadProfile();
    loadTransactions();
  }, [loadProfile, loadTransactions]);

  // Calculate level info
  const levelInfo = profile ? calculateLevel(profile.totalXP) : null;

  return {
    profile,
    loading,
    transactions,
    levelInfo,
    awardXP,
    updateStreak,
    refresh: loadProfile,
  };
}

// Hook for leaderboard
export function useBXPLeaderboard(
  period: 'all_time' | 'monthly' | 'weekly' = 'all_time',
  limit: number = 100
) {
  const [leaderboard, setLeaderboard] = useState<UserBXPProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await bxpService.getLeaderboard(period, limit);
      setLeaderboard(data);
    } catch (error) {
      console.error('[useBXPLeaderboard] Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [period, limit]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return {
    leaderboard,
    loading,
    refresh: loadLeaderboard,
  };
}
