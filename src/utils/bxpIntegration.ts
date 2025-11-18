// BeatsXP Integration Helper
// Easy integration with existing features

import { bxpService } from '@/services/bxpService';
import { showXPNotification } from '@/components/BXPNotification';
import type { BXPRewardType } from '@/config/bxpRewards';

/**
 * Award XP and show notification
 * Use this wrapper for easy integration
 */
export async function awardBXP(
  userAddress: string | undefined,
  rewardType: BXPRewardType,
  metadata?: Record<string, any>,
  showNotification: boolean = true
): Promise<void> {
  if (!userAddress) return;

  try {
    const result = await bxpService.awardXP(userAddress, rewardType, metadata);
    
    if (result.success && showNotification) {
      showXPNotification(result.xpAwarded, rewardType);
    }
  } catch (error) {
    console.error('[BXP Integration] Error awarding XP:', error);
  }
}

/**
 * Integration with play count tracking
 * Call this after recordMusicPlay
 */
export async function awardPlayXP(
  userAddress: string | undefined,
  songId: string,
  isFirstPlayToday: boolean = false
): Promise<void> {
  if (!userAddress) return;

  // Award base play XP
  await awardBXP(userAddress, 'COMPLETE_SONG_PLAY', { songId });

  // Award bonus for first play of the day
  if (isFirstPlayToday) {
    await awardBXP(userAddress, 'FIRST_PLAY_OF_DAY', { songId });
  }
}

/**
 * Integration with social actions
 */
export async function awardSocialXP(
  userAddress: string | undefined,
  action: 'like' | 'comment' | 'share' | 'post' | 'quote',
  targetId: string
): Promise<void> {
  if (!userAddress) return;

  const rewardMap: Record<typeof action, BXPRewardType> = {
    like: 'LIKE_SONG',
    comment: 'COMMENT_ON_POST',
    share: 'SHARE_SONG',
    post: 'CREATE_POST',
    quote: 'QUOTE_POST',
  };

  await awardBXP(userAddress, rewardMap[action], { targetId });
}

/**
 * Integration with creation actions
 */
export async function awardCreationXP(
  userAddress: string | undefined,
  action: 'upload' | 'album' | 'generate' | 'mint',
  itemId: string
): Promise<void> {
  if (!userAddress) return;

  const rewardMap: Record<typeof action, BXPRewardType> = {
    upload: 'UPLOAD_SONG',
    album: 'CREATE_ALBUM',
    generate: 'GENERATE_AI_MUSIC',
    mint: 'MINT_NFT',
  };

  await awardBXP(userAddress, rewardMap[action], { itemId });
}

/**
 * Integration with playlist actions
 */
export async function awardPlaylistXP(
  userAddress: string | undefined,
  action: 'create' | 'add' | 'share' | 'collaborate',
  playlistId: string,
  songId?: string
): Promise<void> {
  if (!userAddress) return;

  const rewardMap: Record<typeof action, BXPRewardType> = {
    create: 'CREATE_PLAYLIST',
    add: 'ADD_TO_PLAYLIST',
    share: 'SHARE_PLAYLIST',
    collaborate: 'COLLABORATIVE_PLAYLIST',
  };

  await awardBXP(userAddress, rewardMap[action], { playlistId, songId });
}

/**
 * Integration with collection actions
 */
export async function awardCollectionXP(
  userAddress: string | undefined,
  action: 'collect' | 'first_nft' | 'sell',
  tokenId: string
): Promise<void> {
  if (!userAddress) return;

  const rewardMap: Record<typeof action, BXPRewardType> = {
    collect: 'COLLECT_NFT',
    first_nft: 'FIRST_NFT_PURCHASE',
    sell: 'SELL_NFT',
  };

  await awardBXP(userAddress, rewardMap[action], { tokenId });
}

/**
 * Integration with community actions
 */
export async function awardCommunityXP(
  userAddress: string | undefined,
  action: 'follow' | 'followed' | 'tip_received' | 'tip_sent',
  targetUser: string,
  amount?: number
): Promise<void> {
  if (!userAddress) return;

  const rewardMap: Record<typeof action, BXPRewardType> = {
    follow: 'FOLLOW_USER',
    followed: 'GET_FOLLOWED',
    tip_received: 'RECEIVE_TIP',
    tip_sent: 'SEND_TIP',
  };

  await awardBXP(userAddress, rewardMap[action], { targetUser, amount });
}

/**
 * Check and award milestone bonuses
 */
export async function checkMilestones(
  userAddress: string | undefined,
  songId: string,
  playCount: number
): Promise<void> {
  if (!userAddress) return;

  // Check play count milestones
  if (playCount === 100) {
    await awardBXP(userAddress, 'REACH_100_PLAYS', { songId, playCount });
  } else if (playCount === 1000) {
    await awardBXP(userAddress, 'REACH_1000_PLAYS', { songId, playCount });
  } else if (playCount === 10000) {
    await awardBXP(userAddress, 'REACH_10000_PLAYS', { songId, playCount });
  }
}

/**
 * Update daily streak and award bonus
 */
export async function updateDailyStreak(
  userAddress: string | undefined
): Promise<number> {
  if (!userAddress) return 0;

  const newStreak = await bxpService.updateStreak(userAddress);
  return newStreak;
}
