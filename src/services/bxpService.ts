// BeatsXP Service
// Handles all BXP transactions, rewards, and profile management

import { somniaDatastreamServiceV3 } from './somniaDatastreamService.v3';
import {
  BXP_REWARDS,
  BXP_MULTIPLIERS,
  DAILY_XP_CAP,
  WEEKLY_XP_CAP,
  calculateLevel,
  calculateFinalXP,
  type BXPRewardType,
  type BXPMultiplierType,
  type BXPTransaction,
  type UserBXPProfile,
} from '@/config/bxpRewards';
import { BXP_SCHEMA_IDS } from '@/config/somniaDataStreams.bxp';

// Forward declaration to avoid circular dependency
let questServiceInstance: any = null;
export function setQuestService(service: any) {
  questServiceInstance = service;
}

class BXPService {
  private batchQueue: BXPTransaction[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 2000; // 2 seconds
  private readonly MAX_BATCH_SIZE = 10;

  /**
   * Award XP to a user
   */
  async awardXP(
    userAddress: string,
    rewardType: BXPRewardType,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; xpAwarded: number; newTotal: number }> {
    try {
      if (!userAddress) {
        console.warn('[BXP] No user address provided');
        return { success: false, xpAwarded: 0, newTotal: 0 };
      }

      // Get base XP amount
      const baseXP = BXP_REWARDS[rewardType];
      
      // Get user profile to check multipliers and caps
      const profile = await this.getUserProfile(userAddress);
      
      // Check daily cap
      if (profile.dailyXP >= DAILY_XP_CAP) {
        console.warn('[BXP] Daily XP cap reached');
        return { success: false, xpAwarded: 0, newTotal: profile.totalXP };
      }

      // Check weekly cap
      if (profile.weeklyXP >= WEEKLY_XP_CAP) {
        console.warn('[BXP] Weekly XP cap reached');
        return { success: false, xpAwarded: 0, newTotal: profile.totalXP };
      }

      // Calculate final XP with multipliers
      const finalXP = calculateFinalXP(baseXP, profile.multipliers);
      
      // Create transaction
      const transaction: BXPTransaction = {
        id: `${userAddress}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userAddress,
        amount: finalXP,
        type: rewardType,
        multiplier: profile.multipliers.length > 0 ? 
          profile.multipliers.reduce((acc, m) => acc * BXP_MULTIPLIERS[m], 1) : 1,
        timestamp: Date.now(),
        metadata,
      };

      // Add to batch queue
      this.batchQueue.push(transaction);

      // Process batch if needed
      if (this.batchQueue.length >= this.MAX_BATCH_SIZE) {
        await this.processBatch();
      } else {
        this.scheduleBatchProcess();
      }

      // Update profile
      const newTotal = profile.totalXP + finalXP;
      await this.updateUserProfile(userAddress, {
        totalXP: newTotal,
        dailyXP: profile.dailyXP + finalXP,
        weeklyXP: profile.weeklyXP + finalXP,
      });

      console.log(`✅ [BXP] Awarded ${finalXP} XP to ${userAddress.slice(0, 6)}... for ${rewardType}`);

      // Update quest progress (if quest service is available)
      if (questServiceInstance) {
        try {
          await questServiceInstance.updateQuestProgress(userAddress, rewardType, 1);
        } catch (error) {
          console.error('[BXP] Error updating quest progress:', error);
        }
      }

      return { success: true, xpAwarded: finalXP, newTotal };
    } catch (error) {
      console.error('[BXP] Error awarding XP:', error);
      return { success: false, xpAwarded: 0, newTotal: 0 };
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcess() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batch of transactions
   */
  private async processBatch() {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Write to Somnia DataStream
      for (const transaction of batch) {
        const data = {
          id: transaction.id,
          userAddress: transaction.userAddress,
          amount: transaction.amount,
          baseAmount: BXP_REWARDS[transaction.type],
          type: transaction.type,
          multiplier: transaction.multiplier,
          timestamp: transaction.timestamp,
          metadata: JSON.stringify(transaction.metadata || {}),
          dailyTotal: 0, // Will be calculated
          weeklyTotal: 0, // Will be calculated
        };

        await somniaDatastreamServiceV3.writeData(BXP_SCHEMA_IDS.BXP_TRANSACTIONS, data);
      }

      console.log(`✅ [BXP] Processed batch of ${batch.length} transactions`);
    } catch (error) {
      console.error('[BXP] Error processing batch:', error);
      // Re-add failed transactions to queue
      this.batchQueue.unshift(...batch);
    }
  }

  /**
   * Get user BXP profile
   */
  async getUserProfile(userAddress: string): Promise<UserBXPProfile> {
    try {
      // Query from Somnia DataStream
      const profiles = await somniaDatastreamServiceV3.queryData(
        BXP_SCHEMA_IDS.BXP_PROFILES,
        { userAddress }
      );

      if (profiles && profiles.length > 0) {
        const profile = profiles[0];
        const levelInfo = calculateLevel(profile.totalXP);

        return {
          userAddress: profile.userAddress,
          totalXP: profile.totalXP,
          level: levelInfo.level,
          currentLevelXP: levelInfo.currentLevelXP,
          nextLevelXP: levelInfo.nextLevelXP,
          dailyXP: profile.dailyXP,
          weeklyXP: profile.weeklyXP,
          streak: profile.streak,
          lastActivityDate: profile.lastActivityDate,
          multipliers: JSON.parse(profile.multipliers || '[]'),
          achievements: JSON.parse(profile.achievements || '[]'),
          rank: profile.rank,
        };
      }

      // Return default profile for new users
      return {
        userAddress,
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        nextLevelXP: 100,
        dailyXP: 0,
        weeklyXP: 0,
        streak: 0,
        lastActivityDate: new Date().toISOString().split('T')[0],
        multipliers: [],
        achievements: [],
        rank: 0,
      };
    } catch (error) {
      console.error('[BXP] Error getting user profile:', error);
      // Return default profile on error
      return {
        userAddress,
        totalXP: 0,
        level: 1,
        currentLevelXP: 0,
        nextLevelXP: 100,
        dailyXP: 0,
        weeklyXP: 0,
        streak: 0,
        lastActivityDate: new Date().toISOString().split('T')[0],
        multipliers: [],
        achievements: [],
        rank: 0,
      };
    }
  }

  /**
   * Update user profile
   */
  private async updateUserProfile(
    userAddress: string,
    updates: Partial<UserBXPProfile>
  ): Promise<void> {
    try {
      const currentProfile = await this.getUserProfile(userAddress);
      const levelInfo = calculateLevel(updates.totalXP || currentProfile.totalXP);

      const profileData = {
        userAddress,
        totalXP: updates.totalXP || currentProfile.totalXP,
        level: levelInfo.level,
        dailyXP: updates.dailyXP || currentProfile.dailyXP,
        weeklyXP: updates.weeklyXP || currentProfile.weeklyXP,
        monthlyXP: 0, // TODO: Calculate
        streak: updates.streak || currentProfile.streak,
        longestStreak: Math.max(updates.streak || 0, currentProfile.streak),
        lastActivityDate: new Date().toISOString().split('T')[0],
        multipliers: JSON.stringify(updates.multipliers || currentProfile.multipliers),
        achievements: JSON.stringify(updates.achievements || currentProfile.achievements),
        rank: updates.rank || currentProfile.rank,
        updatedAt: Date.now(),
      };

      await somniaDatastreamServiceV3.writeData(BXP_SCHEMA_IDS.BXP_PROFILES, profileData);
    } catch (error) {
      console.error('[BXP] Error updating user profile:', error);
    }
  }

  /**
   * Get user transactions
   */
  async getUserTransactions(
    userAddress: string,
    limit: number = 50
  ): Promise<BXPTransaction[]> {
    try {
      const transactions = await somniaDatastreamServiceV3.queryData(
        BXP_SCHEMA_IDS.BXP_TRANSACTIONS,
        { userAddress },
        limit
      );

      return transactions.map((tx: any) => ({
        id: tx.id,
        userAddress: tx.userAddress,
        amount: tx.amount,
        type: tx.type as BXPRewardType,
        multiplier: tx.multiplier,
        timestamp: tx.timestamp,
        metadata: JSON.parse(tx.metadata || '{}'),
      }));
    } catch (error) {
      console.error('[BXP] Error getting user transactions:', error);
      return [];
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    period: 'all_time' | 'monthly' | 'weekly' = 'all_time',
    limit: number = 100
  ): Promise<UserBXPProfile[]> {
    try {
      const leaderboard = await somniaDatastreamServiceV3.queryData(
        BXP_SCHEMA_IDS.BXP_LEADERBOARD,
        { period },
        limit
      );

      return leaderboard.map((entry: any) => ({
        userAddress: entry.userAddress,
        totalXP: entry.totalXP,
        level: entry.level,
        currentLevelXP: 0,
        nextLevelXP: 0,
        dailyXP: 0,
        weeklyXP: 0,
        streak: 0,
        lastActivityDate: '',
        multipliers: [],
        achievements: [],
        rank: entry.rank,
      }));
    } catch (error) {
      console.error('[BXP] Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Check and update daily streak
   */
  async updateStreak(userAddress: string): Promise<number> {
    try {
      const profile = await this.getUserProfile(userAddress);
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = new Date(profile.lastActivityDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = profile.streak;

      if (profile.lastActivityDate === today) {
        // Already active today, no change
        return newStreak;
      } else if (profile.lastActivityDate === yesterdayStr) {
        // Consecutive day, increment streak
        newStreak = profile.streak + 1;
      } else {
        // Streak broken, reset to 1
        newStreak = 1;
      }

      await this.updateUserProfile(userAddress, { streak: newStreak });

      // Award streak bonus
      if (newStreak === 7) {
        await this.awardXP(userAddress, 'LISTENING_STREAK_DAILY', { streak: 7 });
      }

      return newStreak;
    } catch (error) {
      console.error('[BXP] Error updating streak:', error);
      return 0;
    }
  }

  /**
   * Add multiplier to user
   */
  async addMultiplier(
    userAddress: string,
    multiplierType: BXPMultiplierType
  ): Promise<void> {
    try {
      const profile = await this.getUserProfile(userAddress);
      
      if (!profile.multipliers.includes(multiplierType)) {
        const newMultipliers = [...profile.multipliers, multiplierType];
        await this.updateUserProfile(userAddress, { multipliers: newMultipliers });
        console.log(`✅ [BXP] Added multiplier ${multiplierType} to ${userAddress.slice(0, 6)}...`);
      }
    } catch (error) {
      console.error('[BXP] Error adding multiplier:', error);
    }
  }

  /**
   * Flush pending transactions
   */
  async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatch();
  }
}

export const bxpService = new BXPService();
