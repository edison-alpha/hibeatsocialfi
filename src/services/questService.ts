// Quest Service
// Manages quest creation, progress tracking, and completion

import { somniaDatastreamServiceV3 } from './somniaDatastreamService.v3';
import { bxpService } from './bxpService';
import {
  QUEST_TEMPLATES,
  QUEST_TRACKING_MAP,
  getQuestById,
  getQuestsByType,
  getQuestExpiration,
  shouldResetQuest,
  type QuestTemplate,
  type QuestType,
} from '@/config/bxpQuests';
import { BXP_SCHEMA_IDS } from '@/config/somniaDataStreams.bxp';
import type { BXPRewardType } from '@/config/bxpRewards';

export interface UserQuest {
  id: string;
  userAddress: string;
  questId: string;
  questType: QuestType;
  questName: string;
  description: string;
  icon: string;
  targetValue: number;
  currentValue: number;
  reward: number;
  completed: boolean;
  claimed: boolean;
  claimedAt: number;
  expiresAt: number;
  createdAt: number;
  lastUpdatedAt: number;
}

class QuestService {
  private questCache: Map<string, UserQuest[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute

  /**
   * Initialize quests for a user
   * Creates daily, weekly, and monthly quests
   */
  async initializeUserQuests(userAddress: string): Promise<void> {
    try {
      console.log(`[Quest] Initializing quests for ${userAddress.slice(0, 6)}...`);

      // Get existing quests
      const existingQuests = await this.getUserQuests(userAddress);
      const existingQuestIds = new Set(existingQuests.map(q => q.questId));

      // Create daily quests
      const dailyQuests = getQuestsByType('daily');
      for (const template of dailyQuests) {
        if (!existingQuestIds.has(template.id)) {
          await this.createQuestForUser(userAddress, template);
        }
      }

      // Create weekly quests
      const weeklyQuests = getQuestsByType('weekly');
      for (const template of weeklyQuests) {
        if (!existingQuestIds.has(template.id)) {
          await this.createQuestForUser(userAddress, template);
        }
      }

      // Create monthly quests
      const monthlyQuests = getQuestsByType('monthly');
      for (const template of monthlyQuests) {
        if (!existingQuestIds.has(template.id)) {
          await this.createQuestForUser(userAddress, template);
        }
      }

      console.log(`✅ [Quest] Initialized quests for ${userAddress.slice(0, 6)}...`);
    } catch (error) {
      console.error('[Quest] Error initializing quests:', error);
    }
  }

  /**
   * Create a quest for a user from template
   */
  async createQuestForUser(
    userAddress: string,
    template: QuestTemplate
  ): Promise<UserQuest> {
    try {
      const now = Date.now();
      const expiresAt = template.duration 
        ? now + template.duration 
        : getQuestExpiration(template.type);

      const quest: UserQuest = {
        id: `${userAddress}-${template.id}-${now}`,
        userAddress,
        questId: template.id,
        questType: template.type,
        questName: template.title,
        description: template.description,
        icon: template.icon,
        targetValue: template.targetValue,
        currentValue: 0,
        reward: template.reward,
        completed: false,
        claimed: false,
        claimedAt: 0,
        expiresAt,
        createdAt: now,
        lastUpdatedAt: now,
      };

      // Save to DataStream
      await this.saveQuest(quest);

      // Clear cache
      this.questCache.delete(userAddress);

      console.log(`✅ [Quest] Created quest "${template.title}" for ${userAddress.slice(0, 6)}...`);

      return quest;
    } catch (error) {
      console.error('[Quest] Error creating quest:', error);
      throw error;
    }
  }

  /**
   * Update quest progress
   */
  async updateQuestProgress(
    userAddress: string,
    rewardType: BXPRewardType,
    increment: number = 1
  ): Promise<void> {
    try {
      // Get user's active quests
      const quests = await this.getUserQuests(userAddress, false); // Only active

      // Find quests that track this reward type
      for (const quest of quests) {
        const template = getQuestById(quest.questId);
        if (!template) continue;

        const trackingKeys = QUEST_TRACKING_MAP[template.trackingKey];
        if (!trackingKeys) continue;

        // Check if this reward type is tracked by this quest
        const isTracked = trackingKeys.includes('*') || trackingKeys.includes(rewardType);
        if (!isTracked) continue;

        // Update progress
        quest.currentValue += increment;
        quest.lastUpdatedAt = Date.now();

        // Check if completed
        if (quest.currentValue >= quest.targetValue && !quest.completed) {
          quest.completed = true;
          console.log(`🎉 [Quest] Quest "${quest.questName}" completed!`);
        }

        // Save updated quest
        await this.saveQuest(quest);
      }

      // Clear cache
      this.questCache.delete(userAddress);
    } catch (error) {
      console.error('[Quest] Error updating quest progress:', error);
    }
  }

  /**
   * Claim quest reward
   */
  async claimQuestReward(
    userAddress: string,
    questId: string
  ): Promise<{ success: boolean; reward: number }> {
    try {
      const quests = await this.getUserQuests(userAddress);
      const quest = quests.find(q => q.id === questId);

      if (!quest) {
        return { success: false, reward: 0 };
      }

      if (!quest.completed) {
        console.warn('[Quest] Quest not completed yet');
        return { success: false, reward: 0 };
      }

      if (quest.claimed) {
        console.warn('[Quest] Quest already claimed');
        return { success: false, reward: 0 };
      }

      // Mark as claimed
      quest.claimed = true;
      quest.claimedAt = Date.now();
      await this.saveQuest(quest);

      // Award BXP
      await bxpService.awardXP(userAddress, 'DAILY_QUEST_COMPLETE', {
        questId: quest.questId,
        questName: quest.questName,
      });

      // Clear cache
      this.questCache.delete(userAddress);

      console.log(`✅ [Quest] Claimed reward for "${quest.questName}": ${quest.reward} BXP`);

      // Check if quest should be recreated (repeatable)
      const template = getQuestById(quest.questId);
      if (template?.isRepeatable) {
        await this.createQuestForUser(userAddress, template);
      }

      return { success: true, reward: quest.reward };
    } catch (error) {
      console.error('[Quest] Error claiming quest reward:', error);
      return { success: false, reward: 0 };
    }
  }

  /**
   * Get user's quests
   */
  async getUserQuests(
    userAddress: string,
    includeCompleted: boolean = true
  ): Promise<UserQuest[]> {
    try {
      // Check cache
      const cached = this.questCache.get(userAddress);
      const cacheExpiry = this.cacheExpiry.get(userAddress);
      
      if (cached && cacheExpiry && Date.now() < cacheExpiry) {
        return includeCompleted 
          ? cached 
          : cached.filter(q => !q.completed || !q.claimed);
      }

      // Query from DataStream
      const quests = await somniaDatastreamServiceV3.queryData(
        BXP_SCHEMA_IDS.BXP_QUESTS as `0x${string}`,
        { userAddress }
      );

      const userQuests: UserQuest[] = quests.map((q: any) => ({
        id: q.id,
        userAddress: q.userAddress,
        questId: q.questType, // Fix: should be questId
        questType: q.questType as QuestType,
        questName: q.questName,
        description: q.description,
        icon: '🎯', // Default icon
        targetValue: q.targetValue,
        currentValue: q.currentValue,
        reward: q.reward,
        completed: q.completed,
        claimed: q.claimedAt > 0,
        claimedAt: q.claimedAt,
        expiresAt: q.expiresAt,
        createdAt: q.createdAt,
        lastUpdatedAt: Date.now(),
      }));

      // Check for expired/reset quests
      await this.checkAndResetQuests(userAddress, userQuests);

      // Update cache
      this.questCache.set(userAddress, userQuests);
      this.cacheExpiry.set(userAddress, Date.now() + this.CACHE_DURATION);

      return includeCompleted 
        ? userQuests 
        : userQuests.filter(q => !q.completed || !q.claimed);
    } catch (error) {
      console.error('[Quest] Error getting user quests:', error);
      return [];
    }
  }

  /**
   * Check and reset expired quests
   */
  private async checkAndResetQuests(
    userAddress: string,
    quests: UserQuest[]
  ): Promise<void> {
    const now = Date.now();

    for (const quest of quests) {
      const template = getQuestById(quest.questId);
      if (!template) continue;

      // Check if expired
      if (quest.expiresAt < now && !quest.claimed) {
        // Quest expired without being claimed, reset it
        if (template.isRepeatable) {
          await this.createQuestForUser(userAddress, template);
        }
      }

      // Check if should reset (for repeatable quests)
      if (quest.claimed && template.isRepeatable) {
        const lastUpdate = new Date(quest.lastUpdatedAt);
        if (shouldResetQuest(template, lastUpdate)) {
          await this.createQuestForUser(userAddress, template);
        }
      }
    }
  }

  /**
   * Save quest to DataStream
   */
  private async saveQuest(quest: UserQuest): Promise<void> {
    try {
      const data = {
        id: quest.id,
        userAddress: quest.userAddress,
        questType: quest.questType,
        questName: quest.questName,
        description: quest.description,
        targetValue: quest.targetValue,
        currentValue: quest.currentValue,
        reward: quest.reward,
        completed: quest.completed,
        claimedAt: quest.claimedAt,
        expiresAt: quest.expiresAt,
        createdAt: quest.createdAt,
      };

      await somniaDatastreamServiceV3.writeData(BXP_SCHEMA_IDS.BXP_QUESTS as `0x${string}`, data);
    } catch (error) {
      console.error('[Quest] Error saving quest:', error);
      throw error;
    }
  }

  /**
   * Get quest statistics
   */
  async getQuestStats(userAddress: string): Promise<{
    totalCompleted: number;
    totalClaimed: number;
    totalRewards: number;
    activeQuests: number;
  }> {
    try {
      const quests = await this.getUserQuests(userAddress, true);

      return {
        totalCompleted: quests.filter(q => q.completed).length,
        totalClaimed: quests.filter(q => q.claimed).length,
        totalRewards: quests.filter(q => q.claimed).reduce((sum, q) => sum + q.reward, 0),
        activeQuests: quests.filter(q => !q.completed && !q.claimed).length,
      };
    } catch (error) {
      console.error('[Quest] Error getting quest stats:', error);
      return {
        totalCompleted: 0,
        totalClaimed: 0,
        totalRewards: 0,
        activeQuests: 0,
      };
    }
  }

  /**
   * Add custom quest (for admin/special events)
   */
  async addCustomQuest(
    userAddress: string,
    template: QuestTemplate
  ): Promise<UserQuest> {
    return this.createQuestForUser(userAddress, template);
  }

  /**
   * Clear cache
   */
  clearCache(userAddress?: string): void {
    if (userAddress) {
      this.questCache.delete(userAddress);
      this.cacheExpiry.delete(userAddress);
    } else {
      this.questCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const questService = new QuestService();
