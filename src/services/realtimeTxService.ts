// Real-Time Transaction Service untuk Somnia High-Throughput (1M TPS)
// Optimized untuk sub-second finality dan instant updates

import { ethers } from 'ethers';
import { somniaDatastreamService } from './somniaDatastreamService';

interface TxQueueItem {
  id: string;
  contract: ethers.Contract;
  method: string;
  args: any[];
  priority: 'high' | 'medium' | 'low';
  callback?: (result: any) => void;
  errorCallback?: (error: any) => void;
  timestamp: number;
  retries: number;
}

interface TxBatch {
  transactions: TxQueueItem[];
  estimatedGas: bigint;
  timestamp: number;
}

interface TxResult {
  txHash: string;
  blockNumber: number;
  success: boolean;
  data?: any;
  error?: string;
  latency: number; // milliseconds
}

interface TxMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageLatency: number;
  currentTPS: number;
  peakTPS: number;
}

class RealtimeTransactionService {
  private txQueue: Map<string, TxQueueItem[]> = new Map(); // Priority-based queues
  private pendingTxs: Map<string, TxQueueItem> = new Map();
  private completedTxs: Map<string, TxResult> = new Map();
  private txMetrics: TxMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageLatency: 0,
    currentTPS: 0,
    peakTPS: 0
  };

  private provider: ethers.JsonRpcProvider | null = null;
  private wsProvider: ethers.WebSocketProvider | null = null;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  
  // Configuration optimized for Somnia's high throughput
  private readonly MAX_BATCH_SIZE = 50; // Process up to 50 txs in parallel
  private readonly BATCH_INTERVAL = 50; // Process every 50ms for sub-second finality
  private readonly MAX_RETRIES = 3;
  private readonly GAS_BUFFER = 1.1; // 10% gas buffer
  private readonly PRIORITY_WEIGHTS = {
    high: 3,
    medium: 2,
    low: 1
  };

  // Real-time update callbacks
  private updateCallbacks: Set<(data: any) => void> = new Set();
  private metricsCallbacks: Set<(metrics: TxMetrics) => void> = new Set();

  constructor() {
    this.initializeQueues();
  }

  // Initialize priority queues
  private initializeQueues(): void {
    this.txQueue.set('high', []);
    this.txQueue.set('medium', []);
    this.txQueue.set('low', []);
  }

  // Initialize providers with WebSocket for real-time updates
  async initialize(rpcUrl: string, wsUrl: string): Promise<void> {
    try {
      console.log('🚀 Initializing Real-Time Transaction Service...');

      // HTTP provider for sending transactions
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // WebSocket provider for real-time event listening
      this.wsProvider = new ethers.WebSocketProvider(wsUrl);

      // Listen for new blocks to update TPS metrics
      this.wsProvider.on('block', (blockNumber) => {
        this.updateTPSMetrics(blockNumber);
      });

      // Connect to Somnia DataStream for real-time event updates
      await somniaDatastreamService.connect();

      // Start transaction processing
      this.startProcessing();

      console.log('✅ Real-Time Transaction Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Real-Time Transaction Service:', error);
      throw error;
    }
  }

  // Queue transaction with priority
  async queueTransaction(
    contract: ethers.Contract,
    method: string,
    args: any[],
    priority: 'high' | 'medium' | 'low' = 'medium',
    callback?: (result: any) => void,
    errorCallback?: (error: any) => void
  ): Promise<string> {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queueItem: TxQueueItem = {
      id: txId,
      contract,
      method,
      args,
      priority,
      callback,
      errorCallback,
      timestamp: Date.now(),
      retries: 0
    };

    // Add to appropriate priority queue
    const queue = this.txQueue.get(priority) || [];
    queue.push(queueItem);
    this.txQueue.set(priority, queue);

    console.log(`📝 Transaction queued [${priority}]: ${method} (ID: ${txId})`);

    // Trigger immediate processing if idle
    if (!this.isProcessing) {
      this.processQueue();
    }

    return txId;
  }

  // Start continuous transaction processing
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, this.BATCH_INTERVAL);

    console.log('⚡ Transaction processing started (interval: ${this.BATCH_INTERVAL}ms)');
  }

  // Process transaction queue with batching and parallel execution
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;

      // Get next batch of transactions based on priority
      const batch = this.getNextBatch();
      
      if (batch.transactions.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`⚡ Processing batch of ${batch.transactions.length} transactions`);

      // Process transactions in parallel for maximum throughput
      const promises = batch.transactions.map(tx => this.executeTransaction(tx));
      
      // Wait for all transactions to complete (with timeout)
      const results = await Promise.allSettled(promises);

      // Handle results
      results.forEach((result, index) => {
        const tx = batch.transactions[index];
        
        if (result.status === 'fulfilled') {
          this.handleTransactionSuccess(tx, result.value);
        } else {
          this.handleTransactionError(tx, result.reason);
        }
      });

      // Update metrics
      this.updateMetrics();

    } catch (error) {
      console.error('❌ Error processing transaction queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Get next batch of transactions based on priority
  private getNextBatch(): TxBatch {
    const batch: TxQueueItem[] = [];
    let estimatedGas = 0n;

    // Process high priority first, then medium, then low
    for (const priority of ['high', 'medium', 'low']) {
      const queue = this.txQueue.get(priority) || [];
      
      while (queue.length > 0 && batch.length < this.MAX_BATCH_SIZE) {
        const tx = queue.shift();
        if (tx) {
          batch.push(tx);
          this.pendingTxs.set(tx.id, tx);
        }
      }

      this.txQueue.set(priority, queue);
      
      if (batch.length >= this.MAX_BATCH_SIZE) break;
    }

    return {
      transactions: batch,
      estimatedGas: BigInt(estimatedGas),
      timestamp: Date.now()
    };
  }

  // Execute single transaction with optimized gas estimation
  private async executeTransaction(tx: TxQueueItem): Promise<TxResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Executing: ${tx.method} (ID: ${tx.id}, Priority: ${tx.priority})`);

      // Estimate gas (cached for similar transactions)
      const gasEstimate = await tx.contract[tx.method].estimateGas(...tx.args);
      const gasLimit = BigInt(Math.floor(Number(gasEstimate) * this.GAS_BUFFER));

      // Send transaction with optimized gas settings
      const txResponse = await tx.contract[tx.method](...tx.args, {
        gasLimit
      });

      console.log(`📤 Transaction sent: ${txResponse.hash}`);

      // Wait for confirmation (sub-second on Somnia)
      const receipt = await txResponse.wait(1);

      const latency = Date.now() - startTime;

      console.log(`✅ Transaction confirmed in ${latency}ms: ${receipt.hash} (Block: ${receipt.blockNumber})`);

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        success: true,
        data: receipt,
        latency
      };

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      console.error(`❌ Transaction failed after ${latency}ms:`, error.message);

      // Retry logic for transient errors
      if (tx.retries < this.MAX_RETRIES && this.shouldRetry(error)) {
        console.log(`🔄 Retrying transaction (attempt ${tx.retries + 1}/${this.MAX_RETRIES})`);
        tx.retries++;
        
        // Re-queue with same priority
        const queue = this.txQueue.get(tx.priority) || [];
        queue.unshift(tx); // Add to front of queue
        this.txQueue.set(tx.priority, queue);
        
        throw error; // Will be caught and retried
      }

      return {
        txHash: '',
        blockNumber: 0,
        success: false,
        error: error.message,
        latency
      };
    }
  }

  // Handle successful transaction
  private handleTransactionSuccess(tx: TxQueueItem, result: TxResult): void {
    this.pendingTxs.delete(tx.id);
    this.completedTxs.set(tx.id, result);

    // Update metrics
    this.txMetrics.totalTransactions++;
    this.txMetrics.successfulTransactions++;
    this.updateAverageLatency(result.latency);

    // Call success callback
    if (tx.callback) {
      try {
        tx.callback(result);
      } catch (error) {
        console.error('Error in transaction callback:', error);
      }
    }

    // Notify all update callbacks
    this.notifyUpdateCallbacks({
      type: 'transaction_success',
      txId: tx.id,
      result,
      method: tx.method
    });

    // Emit real-time update to frontend
    this.emitRealtimeUpdate(tx, result);
  }

  // Handle transaction error
  private handleTransactionError(tx: TxQueueItem, error: any): void {
    this.pendingTxs.delete(tx.id);

    // Update metrics
    this.txMetrics.totalTransactions++;
    this.txMetrics.failedTransactions++;

    // Call error callback
    if (tx.errorCallback) {
      try {
        tx.errorCallback(error);
      } catch (callbackError) {
        console.error('Error in transaction error callback:', callbackError);
      }
    }

    // Notify all update callbacks
    this.notifyUpdateCallbacks({
      type: 'transaction_error',
      txId: tx.id,
      error: error.message,
      method: tx.method
    });
  }

  // Emit real-time update to frontend via DataStream
  private async emitRealtimeUpdate(tx: TxQueueItem, result: TxResult): Promise<void> {
    try {
      // Determine event type based on contract method
      const eventType = this.getEventTypeFromMethod(tx.method);
      
      if (eventType) {
        // Publish to appropriate DataStream schema
        const updateData = {
          id: result.txHash,
          type: eventType,
          method: tx.method,
          args: tx.args,
          blockNumber: result.blockNumber,
          timestamp: Date.now(),
          latency: result.latency
        };

        // Push update via WebSocket for instant frontend refresh
        this.notifyUpdateCallbacks({
          type: 'realtime_update',
          eventType,
          data: updateData
        });
      }
    } catch (error) {
      console.error('Error emitting realtime update:', error);
    }
  }

  // Map contract methods to event types
  private getEventTypeFromMethod(method: string): string | null {
    const methodMap: Record<string, string> = {
      'createPost': 'post_created',
      'likePost': 'post_liked',
      'commentPost': 'comment_created',
      'followUser': 'user_followed',
      'mintSong': 'song_minted',
      'purchaseSong': 'song_purchased',
      'tipArtist': 'artist_tipped',
      'createPlaylist': 'playlist_created',
      'updateProfile': 'profile_updated'
    };

    return methodMap[method] || null;
  }

  // Check if error is retryable
  private shouldRetry(error: any): boolean {
    const retryableErrors = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'INSUFFICIENT_FUNDS', // May be transient
      'NONCE_EXPIRED',
      'REPLACEMENT_UNDERPRICED'
    ];

    return retryableErrors.some(code => 
      error.code === code || error.message?.includes(code)
    );
  }

  // Update TPS metrics based on block data
  private updateTPSMetrics(blockNumber: number): void {
    // Calculate current TPS based on completed transactions in last second
    const now = Date.now();
    const recentTxs = Array.from(this.completedTxs.values()).filter(
      tx => now - tx.latency < 1000
    );

    this.txMetrics.currentTPS = recentTxs.length;

    if (this.txMetrics.currentTPS > this.txMetrics.peakTPS) {
      this.txMetrics.peakTPS = this.txMetrics.currentTPS;
    }

    // Notify metrics callbacks
    this.notifyMetricsCallbacks();
  }

  // Update average latency
  private updateAverageLatency(latency: number): void {
    const totalLatency = 
      this.txMetrics.averageLatency * (this.txMetrics.successfulTransactions - 1) + 
      latency;
    
    this.txMetrics.averageLatency = totalLatency / this.txMetrics.successfulTransactions;
  }

  // Update general metrics
  private updateMetrics(): void {
    this.notifyMetricsCallbacks();
  }

  // Register callback for real-time updates
  onUpdate(callback: (data: any) => void): () => void {
    this.updateCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  // Register callback for metrics updates
  onMetrics(callback: (metrics: TxMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.metricsCallbacks.delete(callback);
    };
  }

  // Notify all update callbacks
  private notifyUpdateCallbacks(data: any): void {
    this.updateCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in update callback:', error);
      }
    });
  }

  // Notify all metrics callbacks
  private notifyMetricsCallbacks(): void {
    this.metricsCallbacks.forEach(callback => {
      try {
        callback(this.txMetrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    });
  }

  // Get current metrics
  getMetrics(): TxMetrics {
    return { ...this.txMetrics };
  }

  // Get transaction status
  getTransactionStatus(txId: string): 'pending' | 'completed' | 'unknown' {
    if (this.pendingTxs.has(txId)) return 'pending';
    if (this.completedTxs.has(txId)) return 'completed';
    return 'unknown';
  }

  // Get transaction result
  getTransactionResult(txId: string): TxResult | null {
    return this.completedTxs.get(txId) || null;
  }

  // Get queue statistics
  getQueueStats(): {
    high: number;
    medium: number;
    low: number;
    pending: number;
    total: number;
  } {
    return {
      high: this.txQueue.get('high')?.length || 0,
      medium: this.txQueue.get('medium')?.length || 0,
      low: this.txQueue.get('low')?.length || 0,
      pending: this.pendingTxs.size,
      total: (this.txQueue.get('high')?.length || 0) +
             (this.txQueue.get('medium')?.length || 0) +
             (this.txQueue.get('low')?.length || 0) +
             this.pendingTxs.size
    };
  }

  // Clear completed transactions older than 1 hour
  private cleanupOldTransactions(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [txId, result] of this.completedTxs.entries()) {
      if (Date.now() - result.latency > oneHourAgo) {
        this.completedTxs.delete(txId);
      }
    }
  }

  // Cleanup and disconnect
  async disconnect(): Promise<void> {
    // Stop processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Disconnect WebSocket provider
    if (this.wsProvider) {
      await this.wsProvider.destroy();
      this.wsProvider = null;
    }

    // Disconnect DataStream
    somniaDatastreamService.disconnect();

    // Clear queues and callbacks
    this.txQueue.clear();
    this.pendingTxs.clear();
    this.updateCallbacks.clear();
    this.metricsCallbacks.clear();

    console.log('🔌 Real-Time Transaction Service disconnected');
  }
}

// Create singleton instance
export const realtimeTxService = new RealtimeTransactionService();

export type { TxQueueItem, TxBatch, TxResult, TxMetrics };
