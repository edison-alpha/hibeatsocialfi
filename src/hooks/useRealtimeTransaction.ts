// React Hook untuk Real-Time Transaction dengan Somnia High-Throughput
// Optimized untuk instant updates dan sub-second finality

import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { realtimeTxService, type TxResult, type TxMetrics } from '@/services/realtimeTxService';
import { useRealtimeTransaction as useRealtimeTxContext } from '@/contexts/RealtimeTransactionContext';

interface UseRealtimeTransactionOptions {
  onSuccess?: (result: TxResult) => void;
  onError?: (error: any) => void;
  onUpdate?: (data: any) => void;
  priority?: 'high' | 'medium' | 'low';
  autoConnect?: boolean;
}

interface TransactionState {
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  txHash: string | null;
  blockNumber: number | null;
  latency: number | null;
  error: string | null;
  queuePosition: number | null;
}

export function useRealtimeTransaction(options: UseRealtimeTransactionOptions = {}) {
  const {
    onSuccess,
    onError,
    onUpdate,
    priority = 'medium',
    autoConnect = true
  } = options;

  const [state, setState] = useState<TransactionState>({
    isLoading: false,
    isPending: false,
    isSuccess: false,
    isError: false,
    txHash: null,
    blockNumber: null,
    latency: null,
    error: null,
    queuePosition: null
  });

  const [metrics, setMetrics] = useState<TxMetrics | null>(null);
  const [queueStats, setQueueStats] = useState({
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    total: 0
  });

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const metricsUnsubscribeRef = useRef<(() => void) | null>(null);
  const currentTxId = useRef<string | null>(null);

  // Initialize service and subscribe to updates
  useEffect(() => {
    if (autoConnect) {
      initializeService();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (metricsUnsubscribeRef.current) {
        metricsUnsubscribeRef.current();
      }
    };
  }, [autoConnect]);

  // Initialize real-time transaction service
  const initializeService = async () => {
    try {
      const rpcUrl = import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
      const wsUrl = import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';

      await realtimeTxService.initialize(rpcUrl, wsUrl);

      // Subscribe to real-time updates
      unsubscribeRef.current = realtimeTxService.onUpdate((data) => {
        handleRealtimeUpdate(data);
      });

      // Subscribe to metrics updates
      metricsUnsubscribeRef.current = realtimeTxService.onMetrics((newMetrics) => {
        setMetrics(newMetrics);
      });

      console.log('✅ Real-time transaction hook initialized');
    } catch (error) {
      console.error('❌ Failed to initialize real-time transaction service:', error);
    }
  };

  // Handle real-time updates from service
  const handleRealtimeUpdate = (data: any) => {
    // Update state based on update type
    if (data.type === 'transaction_success' && data.txId === currentTxId.current) {
      setState(prev => ({
        ...prev,
        isPending: false,
        isSuccess: true,
        txHash: data.result.txHash,
        blockNumber: data.result.blockNumber,
        latency: data.result.latency
      }));

      if (onSuccess) {
        onSuccess(data.result);
      }
    } else if (data.type === 'transaction_error' && data.txId === currentTxId.current) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPending: false,
        isError: true,
        error: data.error
      }));

      if (onError) {
        onError(data.error);
      }
    } else if (data.type === 'realtime_update') {
      // Pass through real-time updates to callback
      if (onUpdate) {
        onUpdate(data);
      }
    }

    // Update queue stats
    setQueueStats(realtimeTxService.getQueueStats());
  };

  // Execute transaction with real-time updates
  const executeTransaction = useCallback(
    async (
      contract: ethers.Contract,
      method: string,
      args: any[],
      txPriority?: 'high' | 'medium' | 'low'
    ): Promise<string> => {
      try {
        // Reset state
        setState({
          isLoading: true,
          isPending: false,
          isSuccess: false,
          isError: false,
          txHash: null,
          blockNumber: null,
          latency: null,
          error: null,
          queuePosition: null
        });

        // Queue transaction
        const txId = await realtimeTxService.queueTransaction(
          contract,
          method,
          args,
          txPriority || priority,
          (result) => {
            // Success callback
            setState(prev => ({
              ...prev,
              isLoading: false,
              isPending: false,
              isSuccess: true,
              txHash: result.txHash,
              blockNumber: result.blockNumber,
              latency: result.latency
            }));

            if (onSuccess) {
              onSuccess(result);
            }
          },
          (error) => {
            // Error callback
            setState(prev => ({
              ...prev,
              isLoading: false,
              isPending: false,
              isError: true,
              error: error.message
            }));

            if (onError) {
              onError(error);
            }
          }
        );

        currentTxId.current = txId;

        // Update state to pending
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPending: true
        }));

        // Update queue position
        const stats = realtimeTxService.getQueueStats();
        setQueueStats(stats);

        console.log(`✅ Transaction queued: ${txId}`);
        return txId;

      } catch (error: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPending: false,
          isError: true,
          error: error.message
        }));

        if (onError) {
          onError(error);
        }

        throw error;
      }
    },
    [priority, onSuccess, onError]
  );

  // Execute multiple transactions in parallel
  const executeBatch = useCallback(
    async (
      transactions: Array<{
        contract: ethers.Contract;
        method: string;
        args: any[];
        priority?: 'high' | 'medium' | 'low';
      }>
    ): Promise<string[]> => {
      try {
        setState(prev => ({
          ...prev,
          isLoading: true,
          isPending: true
        }));

        const txIds = await Promise.all(
          transactions.map(tx =>
            realtimeTxService.queueTransaction(
              tx.contract,
              tx.method,
              tx.args,
              tx.priority || priority
            )
          )
        );

        console.log(`✅ Batch queued: ${txIds.length} transactions`);
        return txIds;

      } catch (error: any) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPending: false,
          isError: true,
          error: error.message
        }));

        if (onError) {
          onError(error);
        }

        throw error;
      }
    },
    [priority, onError]
  );

  // Get transaction status
  const getTransactionStatus = useCallback((txId: string) => {
    return realtimeTxService.getTransactionStatus(txId);
  }, []);

  // Get transaction result
  const getTransactionResult = useCallback((txId: string) => {
    return realtimeTxService.getTransactionResult(txId);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isPending: false,
      isSuccess: false,
      isError: false,
      txHash: null,
      blockNumber: null,
      latency: null,
      error: null,
      queuePosition: null
    });
    currentTxId.current = null;
  }, []);

  return {
    // State
    ...state,
    metrics,
    queueStats,

    // Methods
    executeTransaction,
    executeBatch,
    getTransactionStatus,
    getTransactionResult,
    reset,

    // Service methods
    getMetrics: () => realtimeTxService.getMetrics(),
    getQueueStats: () => realtimeTxService.getQueueStats()
  };
}

// Hook untuk monitoring real-time metrics saja
export function useTransactionMetrics() {
  // Try to get from context first
  try {
    const context = useRealtimeTxContext();
    
    if (context) {
      // Use context metrics if available
      return {
        metrics: context.metrics,
        queueStats: context.queueStats,
        getMetrics: () => context.metrics,
        getQueueStats: () => context.queueStats
      };
    }
  } catch (error) {
    // Context not available, use fallback
    console.log('Using fallback metrics (context not available)');
  }

  // Fallback to default metrics
  const [metrics, setMetrics] = useState<TxMetrics>({
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageLatency: 0,
    currentTPS: 0,
    peakTPS: 0
  });

  const [queueStats, setQueueStats] = useState({
    high: 0,
    medium: 0,
    low: 0,
    pending: 0,
    total: 0
  });

  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribe = realtimeTxService.onMetrics((newMetrics) => {
      setMetrics(newMetrics);
    });

    // Update queue stats every second
    const interval = setInterval(() => {
      setQueueStats(realtimeTxService.getQueueStats());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    metrics,
    queueStats,
    getMetrics: () => realtimeTxService.getMetrics(),
    getQueueStats: () => realtimeTxService.getQueueStats()
  };
}
