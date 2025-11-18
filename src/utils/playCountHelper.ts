/**
 * Helper untuk record play events di seluruh aplikasi
 * Gunakan ini setiap kali user play musik
 */

import somniaService from '@/services/somniaDatastreamService.v3';
import { createPlayEventData } from '@/config/somniaDataStreams.v3';

/**
 * Extract NFT tokenId from track object
 * Handles different track object structures
 */
function extractTokenId(track: any): number {
  // Priority order:
  // 1. tokenId (NFT token ID)
  // 2. nftTokenId (alternative field name)
  // 3. id (fallback, might be tokenId)
  
  if (track.tokenId && typeof track.tokenId === 'number' && track.tokenId > 0) {
    return track.tokenId;
  }
  
  if (track.nftTokenId && typeof track.nftTokenId === 'number' && track.nftTokenId > 0) {
    return track.nftTokenId;
  }
  
  // Fallback to id if it's a valid number
  if (track.id && typeof track.id === 'number' && track.id > 0) {
    console.warn('⚠️ [PlayCount] Using track.id as tokenId - verify this is correct:', track.id);
    return track.id;
  }
  
  return 0;
}

/**
 * Record play event untuk NFT music
 * 
 * @param trackOrTokenId - Track object or NFT token ID
 * @param listener - User address yang play
 * @param duration - Durasi lagu dalam detik
 * @param source - Source play (album, feed, collection, playlist, explore, beats, post)
 */
export async function recordMusicPlay(
  trackOrTokenId: any | number,
  listener: string | undefined,
  duration: number,
  source: 'album' | 'feed' | 'collection' | 'playlist' | 'explore' | 'beats' | 'post' | 'detail'
): Promise<void> {
  // Skip jika tidak ada listener (user belum connect wallet)
  if (!listener) {
    console.log('⚠️ [PlayCount] Skipping play event - no wallet connected');
    return;
  }

  // Extract tokenId
  const tokenId = typeof trackOrTokenId === 'number' 
    ? trackOrTokenId 
    : extractTokenId(trackOrTokenId);

  // Skip jika tokenId invalid
  if (!tokenId || tokenId <= 0) {
    console.log('⚠️ [PlayCount] Skipping play event - invalid tokenId:', tokenId);
    console.log('⚠️ [PlayCount] Track object:', trackOrTokenId);
    return;
  }

  try {
    console.log('🎵 [PlayCount] Recording play event:', {
      tokenId,
      listener: listener.substring(0, 10) + '...',
      duration,
      source
    });

    const playEvent = createPlayEventData(tokenId, listener, duration, source);
    
    // 🔥 Use immediate mode (true) to write to blockchain immediately
    // This ensures play events are recorded for trending calculation
    await somniaService.recordPlayEvent(playEvent, true);
    
    console.log('✅ [PlayCount] Play event recorded to blockchain');
  } catch (error) {
    console.error('❌ [PlayCount] Failed to record play event:', error);
    // Don't throw - play count tracking shouldn't break the app
  }
}

/**
 * Get play count untuk specific token
 */
export async function getPlayCount(tokenId: number): Promise<number> {
  try {
    const counts = await somniaService.getPlayCountsForTokens([tokenId]);
    return counts.get(tokenId) || 0;
  } catch (error) {
    console.error('❌ [PlayCount] Failed to get play count:', error);
    return 0;
  }
}

/**
 * Get play counts untuk multiple tokens
 */
export async function getPlayCounts(tokenIds: number[]): Promise<Map<number, number>> {
  try {
    return await somniaService.getPlayCountsForTokens(tokenIds);
  } catch (error) {
    console.error('❌ [PlayCount] Failed to get play counts:', error);
    return new Map();
  }
}

/**
 * Format play count untuk display
 */
export function formatPlayCount(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}
