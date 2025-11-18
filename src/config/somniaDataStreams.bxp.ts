// Somnia DataStream Schema for BeatsXP System
// Schema untuk tracking XP transactions dan user profiles

export const BXP_SCHEMAS = {
  // Schema untuk XP transactions
  BXP_TRANSACTIONS: {
    name: 'hibeats_bxp_transactions_v1',
    schema: {
      id: 'string',                    // Unique transaction ID
      userAddress: 'string',           // User wallet address
      amount: 'number',                // XP amount (after multipliers)
      baseAmount: 'number',            // Base XP before multipliers
      type: 'string',                  // Reward type (e.g., "COMPLETE_SONG_PLAY")
      multiplier: 'number',            // Total multiplier applied
      timestamp: 'number',             // Unix timestamp
      metadata: 'string',              // JSON string with additional data
      dailyTotal: 'number',            // Running total for the day
      weeklyTotal: 'number',           // Running total for the week
    },
    description: 'Tracks all BeatsXP transactions and rewards',
  },

  // Schema untuk user XP profiles
  BXP_PROFILES: {
    name: 'hibeats_bxp_profiles_v1',
    schema: {
      userAddress: 'string',           // Primary key
      totalXP: 'number',               // Total lifetime XP
      level: 'number',                 // Current level
      dailyXP: 'number',               // XP earned today
      weeklyXP: 'number',              // XP earned this week
      monthlyXP: 'number',             // XP earned this month
      streak: 'number',                // Current daily streak
      longestStreak: 'number',         // Longest streak achieved
      lastActivityDate: 'string',      // Last activity date (YYYY-MM-DD)
      multipliers: 'string',           // JSON array of active multipliers
      achievements: 'string',          // JSON array of achievement IDs
      rank: 'number',                  // Global rank
      updatedAt: 'number',             // Last update timestamp
    },
    description: 'User BeatsXP profiles and statistics',
  },

  // Schema untuk daily quests
  BXP_QUESTS: {
    name: 'hibeats_bxp_quests_v1',
    schema: {
      id: 'string',                    // Quest ID
      userAddress: 'string',           // User wallet address
      questType: 'string',             // "daily", "weekly", "monthly"
      questName: 'string',             // Quest name
      description: 'string',           // Quest description
      targetValue: 'number',           // Target to complete
      currentValue: 'number',          // Current progress
      reward: 'number',                // XP reward
      completed: 'boolean',            // Completion status
      claimedAt: 'number',             // Claim timestamp (0 if not claimed)
      expiresAt: 'number',             // Expiration timestamp
      createdAt: 'number',             // Creation timestamp
    },
    description: 'Daily, weekly, and monthly quests for users',
  },

  // Schema untuk achievements
  BXP_ACHIEVEMENTS: {
    name: 'hibeats_bxp_achievements_v1',
    schema: {
      id: 'string',                    // Achievement ID
      userAddress: 'string',           // User wallet address
      achievementType: 'string',       // Achievement type
      title: 'string',                 // Achievement title
      description: 'string',           // Achievement description
      badge: 'string',                 // Badge emoji/icon
      reward: 'number',                // XP reward
      unlockedAt: 'number',            // Unlock timestamp
      rarity: 'string',                // "common", "rare", "epic", "legendary"
    },
    description: 'User achievements and badges',
  },

  // Schema untuk leaderboard
  BXP_LEADERBOARD: {
    name: 'hibeats_bxp_leaderboard_v1',
    schema: {
      userAddress: 'string',           // User wallet address
      totalXP: 'number',               // Total XP for ranking
      level: 'number',                 // Current level
      rank: 'number',                  // Current rank
      previousRank: 'number',          // Previous rank
      period: 'string',                // "all_time", "monthly", "weekly"
      updatedAt: 'number',             // Last update timestamp
    },
    description: 'Leaderboard rankings for different periods',
  },
} as const;

// Schema IDs will be populated after registration
export const BXP_SCHEMA_IDS: Record<string, string> = {
  BXP_TRANSACTIONS: '',
  BXP_PROFILES: '',
  BXP_QUESTS: '',
  BXP_ACHIEVEMENTS: '',
  BXP_LEADERBOARD: '',
};

export type BXPSchemaType = keyof typeof BXP_SCHEMAS;
