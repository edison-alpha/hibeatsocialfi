/**
 * Transaction Queue Manager untuk Concurrent Transactions
 * 
 * Mengelola queue untuk write operations agar dieksekusi secara sequential
 * Ini mencegah nonce collision saat melakukan multiple transactions bersamaan
 */

type TransactionTask<T> = () => Promise<T>;

class TransactionQueueManager {
  private queue: Array<{
    task: TransactionTask<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;
  private processingCount = 0;

  /**
   * Add transaction to queue and execute sequentially
   * 
   * Ensures transactions are executed one at a time to avoid nonce conflicts
   */
  async enqueue<T>(task: TransactionTask<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      console.log(`📥 [TxQueue] Task added to queue (queue length: ${this.queue.length})`);
      
      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log(`🔄 [TxQueue] Starting queue processing...`);

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      this.processingCount++;
      const taskNumber = this.processingCount;
      
      try {
        console.log(`⚡ [TxQueue] Executing task #${taskNumber} (${this.queue.length} remaining)...`);
        const startTime = Date.now();
        
        const result = await item.task();
        
        const duration = Date.now() - startTime;
        console.log(`✅ [TxQueue] Task #${taskNumber} completed in ${duration}ms`);
        
        item.resolve(result);
        
        // 🔥 Increased delay between transactions to ensure nonce is updated
        // This prevents "relayer: Request aborted" errors from Sequence WaaS
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ [TxQueue] Task #${taskNumber} failed:`, error);
        item.reject(error);
      }
    }

    this.isProcessing = false;
    console.log(`✅ [TxQueue] Queue processing completed (total processed: ${this.processingCount})`);
  }

  /**
   * Get queue stats
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      totalProcessed: this.processingCount,
    };
  }

  /**
   * Clear queue (use with caution)
   */
  clearQueue(): void {
    const cleared = this.queue.length;
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log(`🗑️ [TxQueue] Cleared ${cleared} pending tasks`);
  }
}

// Export singleton instance
export const transactionQueue = new TransactionQueueManager();
export default transactionQueue;
