/**
 * WebSocket Client for Real-time Transaction Confirmation
 * 
 * Menggunakan WebSocket untuk mendapatkan konfirmasi transaksi secara real-time
 * tanpa polling. Ini memberikan update instant (< 100ms) vs polling (100ms-1000ms).
 * 
 * CRITICAL: WebSocket harus di-initialize SEBELUM transaksi dikirim untuk
 * mendapatkan konfirmasi instant. Jika dibuat setelah transaksi dikirim,
 * akan ada delay untuk establish connection.
 */

import { createPublicClient, webSocket } from 'viem';
import { somniaTestnet } from './web3-config';

// WebSocket URL untuk Somnia Testnet
const WS_URL = 'wss://dream-rpc.somnia.network/ws';

let wsClient: any = null;
let isInitializing = false;
let initializationPromise: Promise<any> | null = null;

/**
 * Initialize WebSocket client (call this on app startup)
 * 
 * IMPORTANT: Call this function when app starts, NOT when sending transaction.
 * WebSocket connection needs time to establish (~100-500ms).
 */
export async function initializeWebSocketClient(): Promise<any> {
  // If already initialized, return existing client
  if (wsClient) {
    console.log('✅ [WEBSOCKET] Client already initialized');
    return wsClient;
  }

  // If currently initializing, wait for it
  if (isInitializing && initializationPromise) {
    console.log('⏳ [WEBSOCKET] Waiting for ongoing initialization...');
    return initializationPromise;
  }

  isInitializing = true;
  
  initializationPromise = (async () => {
    try {
      console.log('🔌 [WEBSOCKET] Initializing WebSocket client:', WS_URL);
      const startTime = Date.now();
      
      // Create WebSocket client with Viem
      wsClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket(WS_URL, {
          keepAlive: true,
          reconnect: {
            attempts: 5, // More attempts for reliability
            delay: 1000,
          },
          timeout: 10_000,
        }),
      });

      // Test connection by getting block number
      try {
        await wsClient.getBlockNumber();
        const initTime = Date.now() - startTime;
        console.log('✅ [WEBSOCKET] Client initialized and connected:', {
          initTime: `${initTime}ms`,
          url: WS_URL,
          status: 'ready'
        });
      } catch (testError) {
        console.warn('⚠️ [WEBSOCKET] Client created but connection test failed:', testError);
        // Don't throw - client might still work for waitForTransactionReceipt
      }
      
      return wsClient;
    } catch (error) {
      console.error('❌ [WEBSOCKET] Failed to initialize client:', error);
      wsClient = null;
      throw error;
    } finally {
      isInitializing = false;
      initializationPromise = null;
    }
  })();

  return initializationPromise;
}

/**
 * Get WebSocket client (returns null if not initialized)
 * 
 * Use initializeWebSocketClient() first to ensure client is ready.
 */
export function getWebSocketClient(): any {
  if (!wsClient) {
    console.warn('⚠️ [WEBSOCKET] Client not initialized. Call initializeWebSocketClient() first.');
  }
  return wsClient;
}

/**
 * Close WebSocket connection
 */
export function closeWebSocketClient() {
  if (wsClient) {
    try {
      // Viem WebSocket clients don't have explicit close method
      // They auto-close when no longer referenced
      wsClient = null;
      console.log('🔌 [WEBSOCKET] WebSocket client closed');
    } catch (error) {
      console.error('❌ [WEBSOCKET] Error closing WebSocket client:', error);
    }
  }
}

/**
 * Check if WebSocket client is available
 */
export function isWebSocketAvailable(): boolean {
  return wsClient !== null;
}

/**
 * Reset initialization state (for testing/debugging)
 */
export function resetWebSocketClient() {
  wsClient = null;
  isInitializing = false;
  initializationPromise = null;
  console.log('🔄 [WEBSOCKET] Client reset');
}
