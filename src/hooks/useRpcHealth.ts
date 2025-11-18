import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { rpcFallbackManager } from '@/lib/rpc-fallback';

export interface RpcHealthStatus {
  isHealthy: boolean;
  latency: number | null;
  lastCheck: number | null;
  consecutiveFailures: number;
  currentEndpoint?: string;
}

/**
 * Hook untuk monitor kesehatan RPC endpoint
 * Berguna untuk mendeteksi network issues sebelum transaksi
 */
export const useRpcHealth = () => {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<RpcHealthStatus>({
    isHealthy: true,
    latency: null,
    lastCheck: null,
    consecutiveFailures: 0,
    currentEndpoint: rpcFallbackManager.getCurrentEndpoint().name,
  });

  useEffect(() => {
    if (!publicClient) return;

    const checkHealth = async () => {
      try {
        const start = Date.now();
        
        // Simple health check: get latest block number with timeout
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 10000)
        );
        
        await Promise.race([
          publicClient.getBlockNumber(),
          timeoutPromise
        ]);
        
        const latency = Date.now() - start;
        // 🔥 FIXED: More forgiving threshold (10 seconds instead of 5)
        // Only mark unhealthy after 3 consecutive failures
        const isHealthy = latency < 10000;

        setStatus(prev => {
          const newFailures = isHealthy ? 0 : prev.consecutiveFailures + 1;
          // Only mark as unhealthy after 3 consecutive failures
          const actuallyUnhealthy = newFailures >= 3;
          
          // Report to fallback manager
          if (isHealthy) {
            rpcFallbackManager.reportSuccess();
          } else {
            rpcFallbackManager.reportFailure();
          }
          
          return {
            isHealthy: !actuallyUnhealthy,
            latency,
            lastCheck: Date.now(),
            consecutiveFailures: newFailures,
            currentEndpoint: rpcFallbackManager.getCurrentEndpoint().name,
          };
        });

        if (!isHealthy) {
          console.warn('⚠️ RPC health check: High latency detected', {
            latency: `${latency}ms`,
            threshold: '10000ms',
            endpoint: rpcFallbackManager.getCurrentEndpoint().name,
          });
        }
      } catch (error) {
        console.error('❌ RPC health check failed:', error);
        
        // Report failure to fallback manager
        rpcFallbackManager.reportFailure();
        
        setStatus(prev => {
          const newFailures = prev.consecutiveFailures + 1;
          // Only mark as unhealthy after 3 consecutive failures
          const actuallyUnhealthy = newFailures >= 3;
          
          return {
            isHealthy: !actuallyUnhealthy,
            latency: null,
            lastCheck: Date.now(),
            consecutiveFailures: newFailures,
            currentEndpoint: rpcFallbackManager.getCurrentEndpoint().name,
          };
        });
      }
    };

    // Initial check
    checkHealth();

    // Periodic check setiap 60 detik (less aggressive)
    const interval = setInterval(checkHealth, 60000);

    return () => clearInterval(interval);
  }, [publicClient]);

  return status;
};
