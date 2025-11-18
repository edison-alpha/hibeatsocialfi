// BeatsXP Quest System Configuration
// Dynamic quest system with daily, weekly, and monthly quests

export type QuestType = 'daily' | 'weekly' | 'monthly' | 'special';
export type QuestCategory = 'listening' | 'social' | 'creation' | 'collection' | 'community';

export interface QuestTemplate {
  id: string;
  type: QuestType;
  category: QuestCategory;
  title: string;
  description: string;
  icon: string;
  targetValue: number;
  reward: number;
  trackingKey: string; // Key to track progress (e.g., "songs_played", "posts_created")
  isRepeatable: boolean;
  duration?: number; // Duration in milliseconds (for special quests)
}

// Quest Templates - Admin can add new quests here
export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ===== DAILY QUESTS =====
  {
    id: 'daily_listen_5',
    type: 'daily',
    category: 'listening',
    title: 'Music Lover',
    description: 'Listen to 5 songs today',
    icon: '🎵',
    targetValue: 5,
    reward: 50,
    trackingKey: 'songs_played',
    isRepeatable: true,
  },
  {
    id: 'daily_like_3',
    type: 'daily',
    category: 'social',
    title: 'Show Some Love',
    description: 'Like 3 songs today',
    icon: '❤️',
    targetValue: 3,
    reward: 30,
    trackingKey: 'songs_liked',
    isRepeatable: true,
  },
  {
    id: 'daily_share_1',
    type: 'daily',
    category: 'social',
    title: 'Spread the Vibes',
    description: 'Share 1 song today',
    icon: '📤',
    targetValue: 1,
    reward: 40,
    trackingKey: 'songs_shared',
    isRepeatable: true,
  },
  {
    id: 'daily_create_post',
    type: 'daily',
    category: 'social',
    title: 'Voice Your Thoughts',
    description: 'Create 1 post today',
    icon: '✍️',
    targetValue: 1,
    reward: 35,
    trackingKey: 'posts_created',
    isRepeatable: true,
  },
  {
    id: 'daily_discover_artist',
    type: 'daily',
    category: 'listening',
    title: 'Explorer',
    description: 'Listen to a new artist',
    icon: '🔍',
    targetValue: 1,
    reward: 45,
    trackingKey: 'new_artists_discovered',
    isRepeatable: true,
  },

  // ===== WEEKLY QUESTS =====
  {
    id: 'weekly_listen_50',
    type: 'weekly',
    category: 'listening',
    title: 'Music Marathon',
    description: 'Listen to 50 songs this week',
    icon: '🎧',
    targetValue: 50,
    reward: 300,
    trackingKey: 'songs_played',
    isRepeatable: true,
  },
  {
    id: 'weekly_create_playlist',
    type: 'weekly',
    category: 'creation',
    title: 'Curator',
    description: 'Create 2 playlists this week',
    icon: '📝',
    targetValue: 2,
    reward: 200,
    trackingKey: 'playlists_created',
    isRepeatable: true,
  },
  {
    id: 'weekly_upload_song',
    type: 'weekly',
    category: 'creation',
    title: 'Content Creator',
    description: 'Upload 1 song this week',
    icon: '🎤',
    targetValue: 1,
    reward: 250,
    trackingKey: 'songs_uploaded',
    isRepeatable: true,
  },
  {
    id: 'weekly_social_engagement',
    type: 'weekly',
    category: 'social',
    title: 'Social Butterfly',
    description: 'Like, comment, or share 20 times',
    icon: '🦋',
    targetValue: 20,
    reward: 350,
    trackingKey: 'social_actions',
    isRepeatable: true,
  },
  {
    id: 'weekly_follow_5',
    type: 'weekly',
    category: 'community',
    title: 'Network Builder',
    description: 'Follow 5 new users this week',
    icon: '🤝',
    targetValue: 5,
    reward: 150,
    trackingKey: 'users_followed',
    isRepeatable: true,
  },

  // ===== MONTHLY QUESTS =====
  {
    id: 'monthly_listen_500',
    type: 'monthly',
    category: 'listening',
    title: 'Music Addict',
    description: 'Listen to 500 songs this month',
    icon: '🎼',
    targetValue: 500,
    reward: 2000,
    trackingKey: 'songs_played',
    isRepeatable: true,
  },
  {
    id: 'monthly_create_album',
    type: 'monthly',
    category: 'creation',
    title: 'Album Artist',
    description: 'Create 1 album this month',
    icon: '💿',
    targetValue: 1,
    reward: 1500,
    trackingKey: 'albums_created',
    isRepeatable: true,
  },
  {
    id: 'monthly_collect_nft',
    type: 'monthly',
    category: 'collection',
    title: 'NFT Collector',
    description: 'Collect 3 NFTs this month',
    icon: '🖼️',
    targetValue: 3,
    reward: 1800,
    trackingKey: 'nfts_collected',
    isRepeatable: true,
  },
  {
    id: 'monthly_streak_30',
    type: 'monthly',
    category: 'listening',
    title: 'Dedicated Fan',
    description: 'Maintain a 30-day streak',
    icon: '🔥',
    targetValue: 30,
    reward: 3000,
    trackingKey: 'daily_streak',
    isRepeatable: false,
  },
  {
    id: 'monthly_viral_song',
    type: 'monthly',
    category: 'creation',
    title: 'Viral Hit',
    description: 'Get 1000 plays on a song',
    icon: '🚀',
    targetValue: 1000,
    reward: 5000,
    trackingKey: 'song_plays_milestone',
    isRepeatable: false,
  },

  // ===== SPECIAL QUESTS (Event-based) =====
  {
    id: 'special_launch_week',
    type: 'special',
    category: 'social',
    title: 'Launch Week Celebration',
    description: 'Complete 10 activities during launch week',
    icon: '🎉',
    targetValue: 10,
    reward: 1000,
    trackingKey: 'total_activities',
    isRepeatable: false,
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
];

// Quest tracking key mappings to BXP reward types
export const QUEST_TRACKING_MAP: Record<string, string[]> = {
  songs_played: ['COMPLETE_SONG_PLAY'],
  songs_liked: ['LIKE_SONG'],
  songs_shared: ['SHARE_SONG'],
  posts_created: ['CREATE_POST', 'QUOTE_POST'],
  new_artists_discovered: ['DISCOVER_NEW_ARTIST'],
  playlists_created: ['CREATE_PLAYLIST'],
  songs_uploaded: ['UPLOAD_SONG'],
  social_actions: ['LIKE_SONG', 'COMMENT_ON_POST', 'SHARE_SONG'],
  users_followed: ['FOLLOW_USER'],
  albums_created: ['CREATE_ALBUM'],
  nfts_collected: ['COLLECT_NFT', 'FIRST_NFT_PURCHASE'],
  daily_streak: ['LISTENING_STREAK_DAILY'],
  song_plays_milestone: ['REACH_1000_PLAYS'],
  total_activities: ['*'], // All activities count
};

// Helper to get quests by type
export function getQuestsByType(type: QuestType): QuestTemplate[] {
  return QUEST_TEMPLATES.filter(q => q.type === type);
}

// Helper to get quests by category
export function getQuestsByCategory(category: QuestCategory): QuestTemplate[] {
  return QUEST_TEMPLATES.filter(q => q.category === category);
}

// Helper to get quest by ID
export function getQuestById(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find(q => q.id === id);
}

// Helper to add custom quest (for admin panel)
export function createCustomQuest(quest: QuestTemplate): QuestTemplate {
  // Validate quest
  if (!quest.id || !quest.title || !quest.targetValue || !quest.reward) {
    throw new Error('Invalid quest template');
  }

  // Add to templates (in production, this would save to database)
  QUEST_TEMPLATES.push(quest);
  
  return quest;
}

// Quest expiration helpers
export function getQuestExpiration(type: QuestType, startDate: Date = new Date()): number {
  const date = new Date(startDate);
  
  switch (type) {
    case 'daily':
      date.setHours(23, 59, 59, 999);
      return date.getTime();
    
    case 'weekly':
      // End of week (Sunday)
      const daysUntilSunday = 7 - date.getDay();
      date.setDate(date.getDate() + daysUntilSunday);
      date.setHours(23, 59, 59, 999);
      return date.getTime();
    
    case 'monthly':
      // End of month
      date.setMonth(date.getMonth() + 1, 0);
      date.setHours(23, 59, 59, 999);
      return date.getTime();
    
    case 'special':
      // Custom duration
      return date.getTime();
    
    default:
      return date.getTime();
  }
}

// Check if quest should be reset
export function shouldResetQuest(quest: QuestTemplate, lastResetDate: Date): boolean {
  const now = new Date();
  const lastReset = new Date(lastResetDate);
  
  switch (quest.type) {
    case 'daily':
      return now.getDate() !== lastReset.getDate() ||
             now.getMonth() !== lastReset.getMonth() ||
             now.getFullYear() !== lastReset.getFullYear();
    
    case 'weekly':
      const weekDiff = Math.floor((now.getTime() - lastReset.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weekDiff >= 1;
    
    case 'monthly':
      return now.getMonth() !== lastReset.getMonth() ||
             now.getFullYear() !== lastReset.getFullYear();
    
    case 'special':
      return false; // Special quests don't auto-reset
    
    default:
      return false;
  }
}
