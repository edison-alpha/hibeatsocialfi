// Music Milestone Detection Service
// Automatically detects and sends notifications for music achievements

import { notificationService } from './notificationService';

interface MusicStats {
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

interface MilestoneTracker {
  tokenId: string;
  lastPlayMilestone: number;
  lastListenerMilestone: number;
  hasBeenTrending: boolean;
  hasBeenViral: boolean;
  topChartPositions: number[]; // Track which positions we've notified
}

class MusicMilestoneService {
  private milestoneTrackers: Map<string, MilestoneTracker> = new Map();
  
  // Play count milestones
  private readonly PLAY_MILESTONES = [
    100,
    500,
    1000,
    5000,
    10000,
    50000,
    100000,
    500000,
    1000000,
    5000000,
    10000000
  ];
  
  // Listener count milestones
  private readonly LISTENER_MILESTONES = [
    50,
    100,
    500,
    1000,
    5000,
    10000,
    50000,
    100000,
    500000,
    1000000
  ];
  
  // Viral threshold
  private readonly VIRAL_THRESHOLD = 1000; // Viral score
  
  // Chart positions to notify
  private readonly CHART_POSITIONS = [1, 5, 10, 50, 100];

  /**
   * Check and notify for play count milestones
   */
  async checkPlayMilestone(stats: MusicStats): Promise<void> {
    const tracker = this.getOrCreateTracker(stats.tokenId);
    
    // Find the highest milestone reached
    const currentMilestone = this.PLAY_MILESTONES
      .filter(m => stats.playCount >= m)
      .pop();
    
    if (!currentMilestone) return;
    
    // Only notify if this is a new milestone
    if (currentMilestone > tracker.lastPlayMilestone) {
      const milestoneText = this.formatNumber(currentMilestone);
      
      await notificationService.notifyMusicMilestonePlays(
        stats.artist,
        stats.tokenId,
        currentMilestone,
        milestoneText
      );
      
      tracker.lastPlayMilestone = currentMilestone;
      console.log(`🎉 Play milestone reached: ${milestoneText} for ${stats.tokenId}`);
    }
  }

  /**
   * Check and notify for unique listener milestones
   */
  async checkListenerMilestone(stats: MusicStats): Promise<void> {
    const tracker = this.getOrCreateTracker(stats.tokenId);
    
    const currentMilestone = this.LISTENER_MILESTONES
      .filter(m => stats.uniqueListeners >= m)
      .pop();
    
    if (!currentMilestone) return;
    
    if (currentMilestone > tracker.lastListenerMilestone) {
      const milestoneText = this.formatNumber(currentMilestone);
      
      await notificationService.notifyMusicMilestoneListeners(
        stats.artist,
        stats.tokenId,
        currentMilestone,
        milestoneText
      );
      
      tracker.lastListenerMilestone = currentMilestone;
      console.log(`🎧 Listener milestone reached: ${milestoneText} for ${stats.tokenId}`);
    }
  }

  /**
   * Check if music should be marked as viral
   */
  async checkViralStatus(stats: MusicStats): Promise<void> {
    const tracker = this.getOrCreateTracker(stats.tokenId);
    
    // Already notified as viral
    if (tracker.hasBeenViral) return;
    
    const viralScore = this.calculateViralScore(stats);
    
    if (viralScore >= this.VIRAL_THRESHOLD) {
      await notificationService.notifyMusicViral(
        stats.artist,
        stats.tokenId,
        viralScore
      );
      
      tracker.hasBeenViral = true;
      console.log(`🚀 Music went viral! Score: ${viralScore} for ${stats.tokenId}`);
    }
  }

  /**
   * Check and notify for chart positions
   */
  async checkChartPosition(stats: MusicStats, rank: number, chartType: string = 'Top 100'): Promise<void> {
    const tracker = this.getOrCreateTracker(stats.tokenId);
    
    // Find the highest chart position threshold this rank qualifies for
    const chartThreshold = this.CHART_POSITIONS
      .filter(pos => rank <= pos)
      .pop();
    
    if (!chartThreshold) return;
    
    // Only notify once per chart position threshold
    if (!tracker.topChartPositions.includes(chartThreshold)) {
      const chartName = this.getChartName(chartThreshold);
      
      await notificationService.notifyMusicTopChart(
        stats.artist,
        stats.tokenId,
        rank,
        chartName
      );
      
      tracker.topChartPositions.push(chartThreshold);
      console.log(`🏆 Chart position reached: ${chartName} #${rank} for ${stats.tokenId}`);
    }
  }

  /**
   * Check and notify for trending status
   */
  async checkTrendingStatus(stats: MusicStats, trendingRank: number): Promise<void> {
    const tracker = this.getOrCreateTracker(stats.tokenId);
    
    // Notify once when entering trending (top 20)
    if (trendingRank <= 20 && !tracker.hasBeenTrending) {
      await notificationService.notifyMusicTrending(
        stats.artist,
        stats.tokenId,
        trendingRank
      );
      
      tracker.hasBeenTrending = true;
      console.log(`🔥 Music is trending at #${trendingRank} for ${stats.tokenId}`);
    }
  }

  /**
   * Process all milestone checks for a track
   */
  async processAllMilestones(stats: MusicStats, chartRank?: number, trendingRank?: number): Promise<void> {
    try {
      // Check play milestones
      await this.checkPlayMilestone(stats);
      
      // Check listener milestones
      await this.checkListenerMilestone(stats);
      
      // Check viral status
      await this.checkViralStatus(stats);
      
      // Check chart position if provided
      if (chartRank) {
        await this.checkChartPosition(stats, chartRank);
      }
      
      // Check trending status if provided
      if (trendingRank) {
        await this.checkTrendingStatus(stats, trendingRank);
      }
    } catch (error) {
      console.error('Error processing milestones:', error);
    }
  }

  /**
   * Calculate viral score based on engagement metrics
   */
  private calculateViralScore(stats: MusicStats): number {
    const plays = stats.plays24h || 0;
    const likes = stats.likes24h || 0;
    const shares = stats.shares24h || 0;
    const comments = stats.comments24h || 0;
    
    // Weighted scoring
    return plays + (likes * 2) + (shares * 5) + (comments * 3);
  }

  /**
   * Format number with K/M suffix
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
    }
    return num.toString();
  }

  /**
   * Get chart name based on position threshold
   */
  private getChartName(threshold: number): string {
    switch (threshold) {
      case 1: return 'Top 1 🏆';
      case 5: return 'Top 5';
      case 10: return 'Top 10';
      case 50: return 'Top 50';
      case 100: return 'Top 100';
      default: return `Top ${threshold}`;
    }
  }

  /**
   * Get or create milestone tracker for a token
   */
  private getOrCreateTracker(tokenId: string): MilestoneTracker {
    if (!this.milestoneTrackers.has(tokenId)) {
      this.milestoneTrackers.set(tokenId, {
        tokenId,
        lastPlayMilestone: 0,
        lastListenerMilestone: 0,
        hasBeenTrending: false,
        hasBeenViral: false,
        topChartPositions: [],
      });
    }
    const tracker = this.milestoneTrackers.get(tokenId);
    if (!tracker) {
      throw new Error(`Failed to get tracker for ${tokenId}`);
    }
    return tracker;
  }

  /**
   * Reset tracker for a token (useful for testing)
   */
  resetTracker(tokenId: string): void {
    this.milestoneTrackers.delete(tokenId);
  }

  /**
   * Clear all trackers
   */
  clearAllTrackers(): void {
    this.milestoneTrackers.clear();
  }
}

// Export singleton instance
export const musicMilestoneService = new MusicMilestoneService();
export default musicMilestoneService;
