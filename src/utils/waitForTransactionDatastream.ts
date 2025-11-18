/**
 * Wait for Transaction Confirmation using Somnia Datastream
 * 
 * Menunggu konfirmasi transaksi menggunakan WebSocket Datastream
 * untuk mendapatkan status real-time (< 1 detik) tanpa polling RPC.
 */

import { somniaDatastreamService } from '@/services/somniaDatastreamService';

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  status: 'success' | 'failed';
  timestamp: number;
  confirmationTime: number; // ms from submission
}

/**
 * Wait for transaction confirmation via Datastream WebSocket
 * 
 * @param txHash - Transaction hash to wait for
 * @param timeout - Maximum time to wait in ms (default: 5000ms for Somnia)
 * @returns Promise<TransactionReceipt>
 */
export async function waitForTransactionDatastream(
  txHash: string,
  timeout: number = 5000
): Promise<TransactionReceipt> {
  const startTime = Date.now();
  
  console.log('⏳ [DATASTREAM] Waiting for transaction confirmation:', {
    txHash: txHash.substring(0, 10) + '...',
    timeout: `${timeout}ms`,
    method: 'WebSocket Datastream (real-time)'
  });

  return new Promise((resolve, reject) => {
    let subscriptionId: string | null = null;
    let timeoutId: NodeJS.Timeout;
    let resolved = false;

    // Set timeout
    timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('⏱️ [DATASTREAM] Transaction confirmation timeout:', {
          txHash: txHash.substring(0, 10) + '...',
          waited: `${Date.now() - startTime}ms`
        });
        
        // Cleanup subscription
        if (subscriptionId) {
          // Note: Implement unsubscribe if needed
        }
        
        reject(new Error(`Transaction confirmation timeout after ${timeout}ms`));
      }
    }, timeout);

    // Subscribe to transaction events via Datastream
    const subscribeToTransaction = async () => {
      try {
        // Subscribe to blockchain events that include this transaction
        subscriptionId = await somniaDatastreamService.subscribe(
          'transaction_confirmed', // Event ID for transaction confirmations
          {
            onData: (data: any) => {
              // Check if this is our transaction
              if (data.transactionHash === txHash && !resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                
                const confirmTime = Date.now() - startTime;
                
                const receipt: TransactionReceipt = {
                  transactionHash: txHash,
                  blockNumber: data.blockNumber || 0,
                  status: data.status === 'failed' ? 'failed' : 'success',
                  timestamp: data.timestamp || Date.now(),
                  confirmationTime: confirmTime
                };

                console.log('✅ [DATASTREAM] Transaction confirmed via WebSocket:', {
                  txHash: txHash.substring(0, 10) + '...',
                  blockNumber: receipt.blockNumber,
                  status: receipt.status,
                  confirmTime: `${confirmTime}ms`,
                  performance: confirmTime < 1000 ? '🚀 SUB-SECOND!' : '⚠️ Slower than expected'
                });

                resolve(receipt);
              }
            },
            onError: (error: Error) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                console.error('❌ [DATASTREAM] Subscription error:', error);
                reject(error);
              }
            }
          },
          [] // No specific eth_calls needed for transaction monitoring
        );

        console.log('📡 [DATASTREAM] Subscribed to transaction events:', subscriptionId);
      } catch (error) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          console.error('❌ [DATASTREAM] Failed to subscribe:', error);
          reject(error);
        }
      }
    };

    // Start subscription
    subscribeToTransaction();
  });
}

/**
 * Wait for transaction with fallback to RPC polling
 * 
 * Tries Datastream first, falls back to RPC polling if Datastream fails
 */
export async function waitForTransactionWithFallback(
  txHash: string,
  publicClient: any,
  timeout: number = 5000
): Promise<TransactionReceipt> {
  try {
    // Try Datastream first (fastest)
    return await waitForTransactionDatastream(txHash, timeout);
  } catch (datastreamError) {
    console.warn('⚠️ [DATASTREAM] Failed, falling back to RPC polling:', datastreamError);
    
    // Fallback to RPC polling
    try {
      const startTime = Date.now();
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout,
        pollingInterval: 100, // 100ms polling
        confirmations: 1
      });
      
      const confirmTime = Date.now() - startTime;
      
      console.log('✅ [RPC-FALLBACK] Transaction confirmed via polling:', {
        txHash: txHash.substring(0, 10) + '...',
        blockNumber: receipt.blockNumber,
        confirmTime: `${confirmTime}ms`
      });

      return {
        transactionHash: txHash,
        blockNumber: Number(receipt.blockNumber),
        status: receipt.status === 'success' ? 'success' : 'failed',
        timestamp: Date.now(),
        confirmationTime: confirmTime
      };
    } catch (rpcError) {
      console.error('❌ [RPC-FALLBACK] Also failed:', rpcError);
      throw rpcError;
    }
  }
}
