// Background Job for Music Milestone Detection
// Runs periodically to check and send milestone notifications

import { musicMilestoneService } from './musicMilestoneService';
import { somniaDatastreamServiceV3 } from './somniaDatastreamService.v3';

interface TrackStats {
  tokenId: string;
  artist: string;
  playCount: number;
  uniqueListeners: number;
  likes: number;
  shares: number;
  comments: number;
  plays24h?: number;
  likes24h?: number;
  shares24h?: number;
  comments24h?: number;
}

class MusicMilestoneBackgroundJob {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private checkInterval = 60 * 60 * 1000; // 1 hour

  /**
   * Start the background job
   */
  start(intervalMs?: number): void {
    if (this.isRunning) {
      console.warn('⚠️ Milestone job already running');
      return;
    }

    if (intervalMs) {
      this.checkInterval = intervalMs;
    }

    console.log(`🚀 Starting milestone detection job (interval: ${this.checkInterval / 1000}s)`);
    
    // Run immediately on start
    this.checkAllMilestones();
    
    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAllMilestones();
    }, this.checkInterval);
    
    this.isRunning = true;
  }

  /**
   * Stop the background job
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Milestone detection job stopped');
  }

  /**
   * Check milestones for all tracks
   */
  private async checkAllMilestones(): Promise<void> {
    try {
      console.log('🔍 [MILESTONE] Checking milestones for all tracks...');
      
      // Get all generated music from datastream
      const allMusic = await this.getAllGeneratedMusic();
      
      if (!allMusic || allMusic.length === 0) {
        console.log('📭 [MILESTONE] No music found');
        return;
      }

      console.log(`📊 [MILESTONE] Found ${allMusic.length} tracks to check`);
      
      // Check milestones for each track
      for (const music of allMusic) {
        try {
          await this.checkTrackMilestones(music);
        } catch (error) {
          console.error(`❌ [MILESTONE] Error checking track ${music.tokenId}:`, error);
        }
      }
      
      console.log('✅ [MILESTONE] Milestone check complete');
    } catch (error) {
      console.error('❌ [MILESTONE] Error in milestone job:', error);
    }
  }

  /**
   * Get all generated music from datastream
   */
  private async getAllGeneratedMusic(): Promise<any[]> {
    try {
      // This would fetch from your datastream
      // For now, return empty array - you need to implement this based on your schema
      return [];
    } catch (error) {
      console.error('❌ Failed to get generated music:', error);
      return [];
    }
  }

  /**
   * Check milestones for a specific track
   */
  private async checkTrackMilestones(music: any): Promise<void> {
    try {
      // Get track stats (you need to implement this based on your data structure)
      const stats: TrackStats = await this.getTrackStats(music);
      
      // Get chart rank if available
      const chartRank = await this.getChartRank(music.tokenId);
      
      // Get trending rank if available
      const trendingRank = await this.getTrendingRank(music.tokenId);
      
      // Process all milestones
      await musicMilestoneService.processAllMilestones(
        stats,
        chartRank,
        trendingRank
      );
    } catch (error) {
      console.error(`❌ Error checking milestones for ${music.tokenId}:`, error);
    }
  }

  /**
   * Get track statistics
   */
  private async getTrackStats(music: any): Promise<TrackStats> {
    // TODO: Implement based on your play events schema
    // This is a placeholder - you need to aggregate from your datastream
    
    return {
      tokenId: music.tokenId || music.id,
      artist: music.owner,
      playCount: 0, // Get from play events
      uniqueListeners: 0, // Count unique listeners
      likes: 0, // Get from interactions
      shares: 0, // Get from interactions
      comments: 0, // Get from interactions
      plays24h: 0, // Get plays in last 24h
      likes24h: 0, // Get likes in last 24h
      shares24h: 0, // Get shares in last 24h
      comments24h: 0, // Get comments in last 24h
    };
  }

  /**
   * Get chart rank for a track
   */
  private async getChartRank(tokenId: string): Promise<number | undefined> {
    // TODO: Implement chart ranking logic
    // This would sort tracks by play count and return rank
    return undefined;
  }

  /**
   * Get trending rank for a track
   */
  private async getTrendingRank(tokenId: string): Promise<number | undefined> {
    // TODO: Implement trending logic
    // This would sort tracks by recent engagement and return rank
    return undefined;
  }

  /**
   * Manual trigger for testing
   */
  async triggerManualCheck(): Promise<void> {
    console.log('🔧 [MILESTONE] Manual check triggered');
    await this.checkAllMilestones();
  }

  /**
   * Get job status
   */
  getStatus(): { isRunning: boolean; interval: number } {
    return {
      isRunning: this.isRunning,
      interval: this.checkInterval,
    };
  }
}

// Export singleton instance
export const musicMilestoneBackgroundJob = new MusicMilestoneBackgroundJob();
export default musicMilestoneBackgroundJob;
