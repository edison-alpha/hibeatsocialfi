// BeatsXP (BXP) Reward Configuration
// Gamification system untuk user engagement

export const BXP_REWARDS = {
  // Listening Activities
  COMPLETE_SONG_PLAY: 10,           // Dengar lagu sampai selesai (>80%)
  FIRST_PLAY_OF_DAY: 50,            // Bonus first play hari ini
  DISCOVER_NEW_ARTIST: 25,          // Dengar artist baru pertama kali
  COMPLETE_ALBUM: 100,              // Dengar full album
  LISTENING_STREAK_DAILY: 30,      // Bonus streak harian
  
  // Social Activities
  LIKE_SONG: 5,
  COMMENT_ON_POST: 15,
  SHARE_SONG: 20,
  CREATE_POST: 25,
  QUOTE_POST: 30,
  
  // Creation Activities
  UPLOAD_SONG: 100,
  CREATE_ALBUM: 200,
  GENERATE_AI_MUSIC: 50,
  MINT_NFT: 150,
  
  // Playlist Activities
  CREATE_PLAYLIST: 50,
  ADD_TO_PLAYLIST: 5,
  SHARE_PLAYLIST: 30,
  COLLABORATIVE_PLAYLIST: 75,
  
  // Collection Activities
  COLLECT_NFT: 100,
  FIRST_NFT_PURCHASE: 500,
  SELL_NFT: 150,
  
  // Community Activities
  FOLLOW_USER: 10,
  GET_FOLLOWED: 15,
  RECEIVE_TIP: 50,
  SEND_TIP: 25,
  
  // Milestone Bonuses
  REACH_100_PLAYS: 1000,
  REACH_1000_PLAYS: 5000,
  REACH_10000_PLAYS: 25000,
  FIRST_VIRAL_SONG: 10000,          // 10k plays in 24h
  
  // Daily Quests
  DAILY_QUEST_COMPLETE: 100,
  WEEKLY_QUEST_COMPLETE: 500,
  MONTHLY_QUEST_COMPLETE: 2000,
} as const;

export const BXP_LEVELS = [
  { level: 1, minXP: 0, maxXP: 100, title: "Newbie", badge: "🎵" },
  { level: 2, minXP: 100, maxXP: 300, title: "Listener", badge: "🎧" },
  { level: 3, minXP: 300, maxXP: 600, title: "Fan", badge: "⭐" },
  { level: 4, minXP: 600, maxXP: 1000, title: "Enthusiast", badge: "🎸" },
  { level: 5, minXP: 1000, maxXP: 1500, title: "Collector", badge: "💿" },
  { level: 6, minXP: 1500, maxXP: 2500, title: "Curator", badge: "🎼" },
  { level: 7, minXP: 2500, maxXP: 4000, title: "Influencer", badge: "🌟" },
  { level: 8, minXP: 4000, maxXP: 6000, title: "Artist", badge: "🎤" },
  { level: 9, minXP: 6000, maxXP: 10000, title: "Producer", badge: "🎹" },
  { level: 10, minXP: 10000, maxXP: 15000, title: "Maestro", badge: "🎺" },
  { level: 11, minXP: 15000, maxXP: 25000, title: "Legend", badge: "🏆" },
  { level: 12, minXP: 25000, maxXP: 50000, title: "Icon", badge: "👑" },
  { level: 13, minXP: 50000, maxXP: 100000, title: "Hall of Fame", badge: "💎" },
  { level: 14, minXP: 100000, maxXP: 250000, title: "Immortal", badge: "🔥" },
  { level: 15, minXP: 250000, maxXP: Infinity, title: "God of Beats", badge: "⚡" },
] as const;

export const BXP_MULTIPLIERS = {
  PREMIUM_USER: 1.5,                // Premium users get 50% more XP
  EARLY_ADOPTER: 2.0,               // First 1000 users
  VERIFIED_ARTIST: 1.3,             // Verified artists
  NFT_HOLDER: 1.2,                  // Owns at least 1 NFT
  STREAK_7_DAYS: 1.2,
  STREAK_30_DAYS: 1.5,
  STREAK_100_DAYS: 2.0,
} as const;

export const DAILY_XP_CAP = 1000;   // Max XP per day untuk prevent abuse
export const WEEKLY_XP_CAP = 5000;

export type BXPRewardType = keyof typeof BXP_REWARDS;
export type BXPMultiplierType = keyof typeof BXP_MULTIPLIERS;

export interface BXPTransaction {
  id: string;
  userAddress: string;
  amount: number;
  type: BXPRewardType;
  multiplier: number;
  timestamp: number;
  metadata?: {
    songId?: string;
    postId?: string;
    playlistId?: string;
    targetUser?: string;
    [key: string]: any;
  };
}

export interface UserBXPProfile {
  userAddress: string;
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  dailyXP: number;
  weeklyXP: number;
  streak: number;
  lastActivityDate: string;
  multipliers: BXPMultiplierType[];
  achievements: string[];
  rank: number;
}

// Helper function to calculate level from XP
export function calculateLevel(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
  title: string;
  badge: string;
} {
  let currentLevel = BXP_LEVELS[0];
  
  for (const levelData of BXP_LEVELS) {
    if (totalXP >= levelData.minXP && totalXP < levelData.maxXP) {
      currentLevel = levelData;
      break;
    }
  }
  
  const currentLevelXP = totalXP - currentLevel.minXP;
  const nextLevelXP = currentLevel.maxXP - currentLevel.minXP;
  const progress = (currentLevelXP / nextLevelXP) * 100;
  
  return {
    level: currentLevel.level,
    currentLevelXP,
    nextLevelXP,
    progress,
    title: currentLevel.title,
    badge: currentLevel.badge,
  };
}

// Helper function to calculate total multiplier
export function calculateMultiplier(multipliers: BXPMultiplierType[]): number {
  let totalMultiplier = 1.0;
  
  for (const multiplierType of multipliers) {
    totalMultiplier *= BXP_MULTIPLIERS[multiplierType];
  }
  
  return totalMultiplier;
}

// Helper function to calculate final XP with multipliers
export function calculateFinalXP(
  baseXP: number,
  multipliers: BXPMultiplierType[]
): number {
  const multiplier = calculateMultiplier(multipliers);
  return Math.floor(baseXP * multiplier);
}
