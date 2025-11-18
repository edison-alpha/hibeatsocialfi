/**
 * Transaction Queue Manager
 * Mengatasi masalah nonce collision dan timeout saat multiple transaksi berurutan
 * 
 * Problem: Ketika user like post 1, 2, 3, 4 secara cepat, hanya post 1 yang berhasil
 * Solution: Queue system yang memproses transaksi satu per satu dengan retry logic
 */

interface QueuedTransaction {
  id: string;
  execute: () => Promise<string>;
  resolve: (value: string) => void;
  reject: (error: any) => void;
  retryCount: number;
  maxRetries: number;
}

class TransactionQueue {
  private queue: QueuedTransaction[] = [];
  private isProcessing: boolean = false;
  private readonly MAX_RETRIES = 0; // Tidak ada retry, hanya 1x percobaan
  private readonly RETRY_DELAY = 1000; // 1 detik antara retry
  private readonly TX_DELAY = 0; // 🔥 No delay - Somnia has sub-second finality and handles nonce automatically

  /**
   * Tambahkan transaksi ke queue
   * @param id - Unique identifier untuk transaksi (e.g., "like-123")
   * @param execute - Function yang menjalankan transaksi
   * @returns Promise yang resolve dengan transaction hash
   */
  async add(id: string, execute: () => Promise<string>): Promise<string> {
    return new Promise((resolve, reject) => {
      const transaction: QueuedTransaction = {
        id,
        execute,
        resolve,
        reject,
        retryCount: 0,
        maxRetries: this.MAX_RETRIES,
      };

      this.queue.push(transaction);
      console.log(`📝 Transaction queued: ${id} (Queue size: ${this.queue.length})`);

      // Start processing if not already processing
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Proses queue satu per satu
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const transaction = this.queue[0];

      try {
        console.log(`🚀 Processing transaction: ${transaction.id} (Attempt ${transaction.retryCount + 1}/${transaction.maxRetries + 1})`);
        
        // Execute transaksi
        const txHash = await transaction.execute();
        
        console.log(`✅ Transaction successful: ${transaction.id} - ${txHash}`);
        
        // Remove dari queue dan resolve promise
        this.queue.shift();
        transaction.resolve(txHash);

        // 🔥 Somnia: No delay needed - sub-second finality handles nonce automatically
        // Delay sebelum transaksi berikutnya untuk memastikan nonce ter-update
        if (this.queue.length > 0 && this.TX_DELAY > 0) {
          console.log(`⏳ Waiting ${this.TX_DELAY}ms before next transaction...`);
          await this.delay(this.TX_DELAY);
        }

      } catch (error: any) {
        console.error(`❌ Transaction failed: ${transaction.id}`, error);

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);

        if (isRetryable && transaction.retryCount < transaction.maxRetries) {
          // Retry transaksi
          transaction.retryCount++;
          console.log(`🔄 Retrying transaction: ${transaction.id} (${transaction.retryCount}/${transaction.maxRetries})`);
          
          // Delay sebelum retry
          await this.delay(this.RETRY_DELAY * transaction.retryCount); // Exponential backoff
          
          // Keep in queue for retry (don't shift)
          continue;
        } else {
          // Max retries reached atau error tidak bisa di-retry
          console.error(`💥 Transaction failed permanently: ${transaction.id}`);
          
          // Remove dari queue dan reject promise
          this.queue.shift();
          transaction.reject(error);
        }
      }
    }

    this.isProcessing = false;
    console.log('✅ Queue processing complete');
  }

  /**
   * Check apakah error bisa di-retry
   */
  private isRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Retryable errors
    const retryableErrors = [
      'nonce',
      'timeout',
      'network',
      'fetch failed',
      'socket',
      'econnrefused',
      'context deadline exceeded',
      'webrpcrequestfailed',
      'replacement transaction underpriced',
      'already known',
    ];

    return retryableErrors.some(err => errorMessage.includes(err));
  }

  /**
   * Helper untuk delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueSize: this.queue.length,
      isProcessing: this.isProcessing,
      pendingTransactions: this.queue.map(tx => ({
        id: tx.id,
        retryCount: tx.retryCount,
        maxRetries: tx.maxRetries,
      })),
    };
  }

  /**
   * Clear queue (untuk emergency)
   */
  clear() {
    this.queue.forEach(tx => {
      tx.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.isProcessing = false;
    console.log('🗑️ Transaction queue cleared');
  }
}

// Export singleton instance
export const transactionQueue = new TransactionQueue();
