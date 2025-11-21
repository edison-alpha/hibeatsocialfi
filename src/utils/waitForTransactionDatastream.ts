/**
 * Wait for Transaction Confirmation using WebSocket
 * 
 * Menggunakan WebSocket untuk mendapatkan konfirmasi transaksi secara real-time.
 * WebSocket memberikan notifikasi instant ketika transaksi di-mine, tanpa perlu polling.
 * 
 * Performance:
 * - WebSocket: < 100ms (instant notification)
 * - HTTP Polling: 100ms - 1000ms (tergantung polling interval)
 * 
 * Berdasarkan dokumentasi Somnia:
 * https://docs.somnia.network/developer/building-dapps/data-indexing-and-querying/listening-to-blockchain-events-websocket
 */

import { getWebSocketClient } from '@/lib/websocket-client';

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  status: 'success' | 'failed';
  timestamp: number;
  confirmationTime: number; // ms from submission
}

/**
 * Wait for transaction confirmation via WebSocket (real-time)
 * 
 * Menggunakan WebSocket untuk mendapatkan konfirmasi real-time tanpa polling.
 * Ini adalah cara tercepat untuk mendapatkan konfirmasi di Somnia.
 * 
 * @param txHash - Transaction hash to wait for
 * @param publicClient - Viem public client (HTTP fallback)
 * @param timeout - Maximum time to wait in ms (default: 5000ms for Somnia)
 * @returns Promise<TransactionReceipt>
 */
export async function waitForTransactionRPC(
  txHash: string,
  publicClient: any,
  timeout: number = 5000
): Promise<TransactionReceipt> {
  const startTime = Date.now();
  
  // 🔥 Try to use WebSocket client first for instant confirmation
  const wsClient = getWebSocketClient();
  const clientToUse = wsClient || publicClient;
  const usingWebSocket = wsClient !== null;
  
  console.log(`⏳ [${usingWebSocket ? 'WEBSOCKET' : 'HTTP'}] Waiting for transaction confirmation:`, {
    txHash: txHash.substring(0, 10) + '...',
    timeout: `${timeout}ms`,
    method: usingWebSocket ? 'WebSocket Real-time (instant)' : 'HTTP Polling (100ms interval)'
  });

  try {
    // Use Viem's waitForTransactionReceipt
    // WebSocket: Gets instant notification when tx is mined (< 100ms)
    // HTTP: Polls every 100ms until tx is found (100ms - 1000ms)
    const receipt = await clientToUse.waitForTransactionReceipt({
      hash: txHash as `0x${string}`,
      timeout,
      pollingInterval: 100, // Only used for HTTP transport
      confirmations: 1
    });
    
    const confirmTime = Date.now() - startTime;
    
    const result: TransactionReceipt = {
      transactionHash: txHash,
      blockNumber: Number(receipt.blockNumber),
      status: receipt.status === 'success' ? 'success' : 'failed',
      timestamp: Date.now(),
      confirmationTime: confirmTime
    };
    
    console.log(`✅ [${usingWebSocket ? 'WEBSOCKET' : 'HTTP'}] Transaction confirmed:`, {
      txHash: txHash.substring(0, 10) + '...',
      blockNumber: result.blockNumber,
      status: result.status,
      confirmTime: `${confirmTime}ms`,
      performance: confirmTime < 200 ? '🚀 INSTANT!' : confirmTime < 500 ? '⚡ VERY FAST!' : confirmTime < 1000 ? '✅ SUB-SECOND!' : confirmTime < 2000 ? '✅ FAST' : '⚠️ Slower than expected',
      transport: usingWebSocket ? 'WebSocket (real-time)' : 'HTTP (polling)',
      explorerConfirmTime: '~58ms (from Somnia Explorer)'
    });
    
    // Performance warning if slower than expected
    if (confirmTime > 1000 && usingWebSocket) {
      console.warn('⚠️ [WEBSOCKET] Confirmation slower than expected:', {
        confirmTime: `${confirmTime}ms`,
        expected: '< 200ms with WebSocket',
        possibleCauses: [
          'Network latency',
          'WebSocket connection issue',
          'RPC endpoint slow',
        ]
      });
    }
    
    return result;
  } catch (error: any) {
    const waitTime = Date.now() - startTime;
    console.error(`❌ [${usingWebSocket ? 'WEBSOCKET' : 'HTTP'}] Transaction confirmation failed:`, {
      txHash: txHash.substring(0, 10) + '...',
      waited: `${waitTime}ms`,
      error: error.message
    });
    throw error;
  }
}

/**
 * Wait for transaction with optimized RPC polling
 * 
 * Menggunakan RPC polling yang dioptimalkan untuk Somnia's sub-second finality.
 * Polling interval 100ms memastikan deteksi cepat tanpa membebani RPC.
 */
export async function waitForTransactionWithFallback(
  txHash: string,
  publicClient: any,
  timeout: number = 5000
): Promise<TransactionReceipt> {
  // Langsung gunakan RPC polling yang dioptimalkan
  // Datastream subscription untuk transaction events tidak tersedia
  return waitForTransactionRPC(txHash, publicClient, timeout);
}
