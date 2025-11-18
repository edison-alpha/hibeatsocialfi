// React Hook for Quest System
// Easy integration with components

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { questService, type UserQuest } from '@/services/questService';
import type { QuestType } from '@/config/bxpQuests';

export function useQuests(questType?: QuestType) {
  const { address } = useAccount();
  const [quests, setQuests] = useState<UserQuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCompleted: 0,
    totalClaimed: 0,
    totalRewards: 0,
    activeQuests: 0,
  });

  // Load quests
  const loadQuests = useCallback(async () => {
    if (!address) {
      setQuests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Initialize quests if needed
      await questService.initializeUserQuests(address);

      // Get quests
      const userQuests = await questService.getUserQuests(address, true);

      // Filter by type if specified
      const filteredQuests = questType
        ? userQuests.filter(q => q.questType === questType)
        : userQuests;

      setQuests(filteredQuests);

      // Get stats
      const questStats = await questService.getQuestStats(address);
      setStats(questStats);
    } catch (error) {
      console.error('[useQuests] Error loading quests:', error);
    } finally {
      setLoading(false);
    }
  }, [address, questType]);

  // Claim quest reward
  const claimReward = useCallback(
    async (questId: string) => {
      if (!address) return { success: false, reward: 0 };

      const result = await questService.claimQuestReward(address, questId);

      if (result.success) {
        // Reload quests
        await loadQuests();
      }

      return result;
    },
    [address, loadQuests]
  );

  // Initial load
  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Separate quests by completion status
  const activeQuests = quests.filter(q => !q.completed);
  const completedQuests = quests.filter(q => q.completed && !q.claimed);
  const claimedQuests = quests.filter(q => q.claimed);

  return {
    quests,
    activeQuests,
    completedQuests,
    claimedQuests,
    stats,
    loading,
    claimReward,
    refresh: loadQuests,
  };
}

// Hook for quest progress tracking
export function useQuestProgress(questId: string) {
  const { address } = useAccount();
  const [quest, setQuest] = useState<UserQuest | null>(null);
  const [loading, setLoading] = useState(true);

  const loadQuest = useCallback(async () => {
    if (!address) {
      setQuest(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const quests = await questService.getUserQuests(address, true);
      const foundQuest = quests.find(q => q.questId === questId);
      setQuest(foundQuest || null);
    } catch (error) {
      console.error('[useQuestProgress] Error loading quest:', error);
    } finally {
      setLoading(false);
    }
  }, [address, questId]);

  useEffect(() => {
    loadQuest();
  }, [loadQuest]);

  const progress = quest
    ? Math.min((quest.currentValue / quest.targetValue) * 100, 100)
    : 0;

  return {
    quest,
    progress,
    loading,
    refresh: loadQuest,
  };
}
