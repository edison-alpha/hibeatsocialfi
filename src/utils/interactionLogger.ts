/**
 * Interaction Logger
 * 
 * Comprehensive logging system untuk tracking semua social interactions
 * dengan raw data dan status untuk debugging
 */

export interface InteractionLog {
  timestamp: number;
  type: 'POST' | 'LIKE' | 'UNLIKE' | 'COMMENT' | 'REPOST' | 'UNREPOST' | 'QUOTE';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  wallet: 'USER' | 'SERVER';
  data: {
    // Core data
    id?: number | string;
    author?: string;
    fromUser?: string;
    targetId?: number | string;
    content?: string;
    
    // Blockchain data
    txHash?: string;
    schemaId?: string;
    publisherAddress?: string;
    
    // Metadata
    contentType?: string;
    interactionType?: number;
    timestamp?: number;
    
    // Raw data
    rawData?: any;
    encodedData?: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  duration?: number;
}

class InteractionLogger {
  private logs: InteractionLog[] = [];
  private maxLogs = 100; // Keep last 100 logs
  private enabled = true; // Enable/disable logging

  /**
   * Log interaction start
   */
  logStart(
    type: InteractionLog['type'],
    wallet: InteractionLog['wallet'],
    data: InteractionLog['data']
  ): number {
    const logId = Date.now();
    
    const log: InteractionLog = {
      timestamp: logId,
      type,
      status: 'PENDING',
      wallet,
      data: { ...data }
    };

    this.logs.push(log);
    this.trimLogs();

    if (this.enabled) {
      console.group(`🔵 [${type}] START - ${wallet} WALLET`);
      console.log('⏰ Timestamp:', new Date(logId).toISOString());
      console.log('📊 Data:', data);
      console.groupEnd();
    }

    return logId;
  }

  /**
   * Log interaction success
   */
  logSuccess(
    logId: number,
    txHash: string,
    publisherAddress: string,
    rawData?: any
  ): void {
    const log = this.logs.find(l => l.timestamp === logId);
    if (!log) return;

    const duration = Date.now() - logId;
    
    log.status = 'SUCCESS';
    log.data.txHash = txHash;
    log.data.publisherAddress = publisherAddress;
    log.data.rawData = rawData;
    log.duration = duration;

    if (this.enabled) {
      console.group(`✅ [${log.type}] SUCCESS - ${log.wallet} WALLET`);
      console.log('⏱️ Duration:', duration + 'ms');
      console.log('🔗 TX Hash:', txHash);
      console.log('👤 Publisher:', publisherAddress);
      console.log('📦 Raw Data:', rawData);
      console.groupEnd();
    }

    // Save to localStorage for persistence
    this.saveToStorage();
  }

  /**
   * Log interaction failure
   */
  logFailure(
    logId: number,
    error: Error | string
  ): void {
    const log = this.logs.find(l => l.timestamp === logId);
    if (!log) return;

    const duration = Date.now() - logId;
    
    log.status = 'FAILED';
    log.duration = duration;
    
    if (error instanceof Error) {
      log.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    } else {
      log.error = {
        message: String(error)
      };
    }

    if (this.enabled) {
      console.group(`❌ [${log.type}] FAILED - ${log.wallet} WALLET`);
      console.log('⏱️ Duration:', duration + 'ms');
      console.error('💥 Error:', log.error);
      console.log('📊 Data:', log.data);
      console.groupEnd();
    }

    // Save to localStorage for persistence
    this.saveToStorage();
  }

  /**
   * Log raw blockchain data
   */
  logBlockchainData(
    logId: number,
    schemaId: string,
    encodedData: string,
    dataId: string
  ): void {
    const log = this.logs.find(l => l.timestamp === logId);
    if (!log) return;

    log.data.schemaId = schemaId;
    log.data.encodedData = encodedData;
    log.data.id = dataId;

    if (this.enabled) {
      console.group(`📦 [${log.type}] BLOCKCHAIN DATA`);
      console.log('🔑 Schema ID:', schemaId);
      console.log('🆔 Data ID:', dataId);
      console.log('📝 Encoded Data:', encodedData);
      console.groupEnd();
    }
  }

  /**
   * Get all logs
   */
  getAllLogs(): InteractionLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by type
   */
  getLogsByType(type: InteractionLog['type']): InteractionLog[] {
    return this.logs.filter(l => l.type === type);
  }

  /**
   * Get logs by status
   */
  getLogsByStatus(status: InteractionLog['status']): InteractionLog[] {
    return this.logs.filter(l => l.status === status);
  }

  /**
   * Get logs by wallet
   */
  getLogsByWallet(wallet: InteractionLog['wallet']): InteractionLog[] {
    return this.logs.filter(l => l.wallet === wallet);
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 10): InteractionLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get statistics
   */
  getStats() {
    const total = this.logs.length;
    const success = this.logs.filter(l => l.status === 'SUCCESS').length;
    const failed = this.logs.filter(l => l.status === 'FAILED').length;
    const pending = this.logs.filter(l => l.status === 'PENDING').length;
    
    const userWallet = this.logs.filter(l => l.wallet === 'USER').length;
    const serverWallet = this.logs.filter(l => l.wallet === 'SERVER').length;

    const byType = {
      POST: this.logs.filter(l => l.type === 'POST').length,
      LIKE: this.logs.filter(l => l.type === 'LIKE').length,
      UNLIKE: this.logs.filter(l => l.type === 'UNLIKE').length,
      COMMENT: this.logs.filter(l => l.type === 'COMMENT').length,
      REPOST: this.logs.filter(l => l.type === 'REPOST').length,
      UNREPOST: this.logs.filter(l => l.type === 'UNREPOST').length,
      QUOTE: this.logs.filter(l => l.type === 'QUOTE').length,
    };

    const avgDuration = this.logs
      .filter(l => l.duration)
      .reduce((sum, l) => sum + (l.duration || 0), 0) / 
      this.logs.filter(l => l.duration).length || 0;

    return {
      total,
      success,
      failed,
      pending,
      successRate: total > 0 ? (success / total * 100).toFixed(2) + '%' : '0%',
      userWallet,
      serverWallet,
      byType,
      avgDuration: Math.round(avgDuration) + 'ms'
    };
  }

  /**
   * Print statistics to console
   */
  printStats(): void {
    const stats = this.getStats();
    
    console.group('📊 INTERACTION STATISTICS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Total Interactions:', stats.total);
    console.log('✅ Success:', stats.success);
    console.log('❌ Failed:', stats.failed);
    console.log('⏳ Pending:', stats.pending);
    console.log('📊 Success Rate:', stats.successRate);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 User Wallet:', stats.userWallet);
    console.log('🖥️ Server Wallet:', stats.serverWallet);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > 0) {
        console.log(`  ${type}: ${count}`);
      }
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⏱️ Avg Duration:', stats.avgDuration);
    console.groupEnd();
  }

  /**
   * Print recent logs
   */
  printRecentLogs(count: number = 10): void {
    const recent = this.getRecentLogs(count);
    
    console.group(`📋 RECENT ${count} INTERACTIONS`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    recent.forEach((log, index) => {
      const statusIcon = log.status === 'SUCCESS' ? '✅' : 
                        log.status === 'FAILED' ? '❌' : '⏳';
      const walletIcon = log.wallet === 'USER' ? '👤' : '🖥️';
      
      console.log(`${index + 1}. ${statusIcon} ${walletIcon} [${log.type}]`);
      console.log(`   Time: ${new Date(log.timestamp).toLocaleTimeString()}`);
      console.log(`   Duration: ${log.duration || 0}ms`);
      
      if (log.data.txHash) {
        console.log(`   TX: ${log.data.txHash.slice(0, 10)}...`);
      }
      
      if (log.error) {
        console.log(`   Error: ${log.error.message}`);
      }
      
      console.log('   ─────────────────────────────────────');
    });
    
    console.groupEnd();
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('interaction_logs');
    console.log('🗑️ All interaction logs cleared');
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`📝 Interaction logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Trim logs to max size
   */
  private trimLogs(): void {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveToStorage(): void {
    try {
      const recentLogs = this.logs.slice(-50); // Save last 50 logs
      localStorage.setItem('interaction_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.warn('⚠️ Failed to save logs to localStorage:', error);
    }
  }

  /**
   * Load logs from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('interaction_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        this.logs = logs;
        console.log(`📥 Loaded ${logs.length} interaction logs from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load logs from localStorage:', error);
    }
  }
}

// Export singleton
export const interactionLogger = new InteractionLogger();

// Load logs on initialization
interactionLogger.loadFromStorage();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  (window as any).interactionLogger = interactionLogger;
  console.log('💡 Interaction Logger available at: window.interactionLogger');
  console.log('💡 Commands:');
  console.log('   - interactionLogger.printStats()');
  console.log('   - interactionLogger.printRecentLogs(10)');
  console.log('   - interactionLogger.getAllLogs()');
  console.log('   - interactionLogger.clearLogs()');
}

export default interactionLogger;
