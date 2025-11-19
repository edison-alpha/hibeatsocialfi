/**
 * Song Generation Limit Service
 * 
 * Mengelola batasan generate song untuk user biasa (non-artis)
 * - User biasa: maksimal 3x generate per hari
 * - Artist: unlimited generate
 */

interface GenerationRecord {
  userAddress: string;
  timestamp: number;
  taskId: string;
  isArtist: boolean;
}

const STORAGE_KEY = 'hibeats_generation_history';
const MAX_GENERATIONS_PER_DAY = 3; // Limit untuk user biasa
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 jam dalam milliseconds

class SongGenerationLimitService {
  /**
   * Get generation history dari localStorage
   */
  private getHistory(): GenerationRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const history = JSON.parse(stored) as GenerationRecord[];
      
      // Filter hanya record dalam 24 jam terakhir
      const oneDayAgo = Date.now() - ONE_DAY_MS;
      return history.filter(record => record.timestamp > oneDayAgo);
    } catch (error) {
      console.error('❌ Failed to load generation history:', error);
      return [];
    }
  }

  /**
   * Save generation history ke localStorage
   */
  private saveHistory(history: GenerationRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('❌ Failed to save generation history:', error);
    }
  }

  /**
   * Check apakah user masih bisa generate song
   * 
   * @param userAddress - Wallet address user
   * @param isArtist - Apakah user adalah artist
   * @returns { canGenerate, remaining, resetTime }
   */
  checkGenerationLimit(userAddress: string, isArtist: boolean): {
    canGenerate: boolean;
    remaining: number;
    resetTime: Date | null;
    totalToday: number;
  } {
    // Artist tidak ada limit
    if (isArtist) {
      return {
        canGenerate: true,
        remaining: Infinity,
        resetTime: null,
        totalToday: 0
      };
    }

    const history = this.getHistory();
    
    // Filter hanya generation dari user ini dalam 24 jam terakhir
    const userGenerations = history.filter(
      record => record.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    const totalToday = userGenerations.length;
    const remaining = Math.max(0, MAX_GENERATIONS_PER_DAY - totalToday);
    const canGenerate = remaining > 0;

    // Hitung kapan limit akan reset (24 jam dari generation pertama)
    let resetTime: Date | null = null;
    if (userGenerations.length > 0) {
      const oldestGeneration = userGenerations.reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest
      );
      resetTime = new Date(oldestGeneration.timestamp + ONE_DAY_MS);
    }

    return {
      canGenerate,
      remaining,
      resetTime,
      totalToday
    };
  }

  /**
   * Record generation baru
   * 
   * @param userAddress - Wallet address user
   * @param taskId - Task ID dari Suno API
   * @param isArtist - Apakah user adalah artist
   */
  recordGeneration(userAddress: string, taskId: string, isArtist: boolean): void {
    const history = this.getHistory();
    
    const newRecord: GenerationRecord = {
      userAddress,
      timestamp: Date.now(),
      taskId,
      isArtist
    };

    history.push(newRecord);
    this.saveHistory(history);

    console.log('✅ Generation recorded:', {
      userAddress,
      taskId,
      isArtist,
      totalToday: history.filter(r => r.userAddress.toLowerCase() === userAddress.toLowerCase()).length
    });
  }

  /**
   * Get generation statistics untuk user
   */
  getGenerationStats(userAddress: string): {
    totalToday: number;
    totalAllTime: number;
    lastGeneration: Date | null;
  } {
    const allHistory = this.getHistory();
    const userHistory = allHistory.filter(
      record => record.userAddress.toLowerCase() === userAddress.toLowerCase()
    );

    const totalToday = userHistory.length;
    
    // Get all-time total dari localStorage (tidak filter by time)
    const allTimeHistory = (() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored) as GenerationRecord[];
      } catch {
        return [];
      }
    })();
    
    const totalAllTime = allTimeHistory.filter(
      record => record.userAddress.toLowerCase() === userAddress.toLowerCase()
    ).length;

    const lastGeneration = userHistory.length > 0
      ? new Date(Math.max(...userHistory.map(r => r.timestamp)))
      : null;

    return {
      totalToday,
      totalAllTime,
      lastGeneration
    };
  }

  /**
   * Clear history (untuk testing atau admin)
   */
  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Generation history cleared');
  }

  /**
   * Get formatted time until reset
   */
  getTimeUntilReset(resetTime: Date | null): string {
    if (!resetTime) return 'N/A';

    const now = Date.now();
    const diff = resetTime.getTime() - now;

    if (diff <= 0) return 'Now';

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}

// Export singleton instance
export const songGenerationLimitService = new SongGenerationLimitService();
export default songGenerationLimitService;
