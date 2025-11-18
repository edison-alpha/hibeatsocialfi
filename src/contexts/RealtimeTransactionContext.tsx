// Real-Time Transaction Context untuk Somnia 1M TPS
// Menyediakan global state dan methods untuk real-time transactions

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { realtimeTxService, type TxMetrics } from '@/services/realtimeTxService';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';
import { useToast } from '@/hooks/use-toast';

interface TxRecord {
  txHash: string;
  method: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  latency?: number;
  blockNumber?: number;
}

interface RealtimeTransactionContextType {
  metrics: TxMetrics;
  isInitialized: boolean;
  isConnected: boolean;
  queueStats: {
    high: number;
    medium: number;
    low: number;
    pending: number;
    total: number;
  };
  recentTransactions: TxRecord[];
  // Real-time update callbacks
  onRealtimeUpdate: (callback: (data: any) => void) => () => void;
  // Manual transaction tracking (for non-queued transactions)
  trackTransaction: (txHash: string, method: string) => void;
  completeTransaction: (txHash: string, blockNumber: number, success?: boolean) => void;
}

const RealtimeTransactionContext = createContext<RealtimeTransactionContextType | undefined>(undefined);

export const RealtimeTransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
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
  const [recentTransactions, setRecentTransactions] = useState<TxRecord[]>([]);
  const [trackingMap, setTrackingMap] = useState<Map<string, TxRecord>>(new Map());

  const { toast } = useToast();

  // Initialize real-time transaction service
  useEffect(() => {
    const initializeService = async () => {
      try {
        console.log('🚀 Initializing Real-Time Transaction Service...');

        const rpcUrl = import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
        const wsUrl = import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';

        // Initialize real-time transaction service
        await realtimeTxService.initialize(rpcUrl, wsUrl);
        
        // Subscribe to metrics updates
        const unsubscribeMetrics = realtimeTxService.onMetrics((newMetrics) => {
          setMetrics(newMetrics);
        });

        // Subscribe to real-time updates for global notifications
        const unsubscribeUpdates = realtimeTxService.onUpdate((data) => {
          // Show toast for successful transactions
          if (data.type === 'transaction_success') {
            const latencyMs = data.result.latency;
            const latencyText = latencyMs < 1000 
              ? `${latencyMs}ms` 
              : `${(latencyMs / 1000).toFixed(1)}s`;

            toast({
              title: "⚡ Transaction Confirmed",
              description: `${data.method} completed in ${latencyText}`,
              duration: 3000,
            });
          }
        });

        // Update queue stats periodically
        const statsInterval = setInterval(() => {
          setQueueStats(realtimeTxService.getQueueStats());
        }, 1000);

        setIsInitialized(true);
        setIsConnected(true);

        console.log('✅ Real-Time Transaction Service initialized successfully');

        // Cleanup on unmount
        return () => {
          unsubscribeMetrics();
          unsubscribeUpdates();
          clearInterval(statsInterval);
          realtimeTxService.disconnect();
        };

      } catch (error) {
        console.error('❌ Failed to initialize Real-Time Transaction Service:', error);
        setIsInitialized(false);
        setIsConnected(false);

        toast({
          title: "Connection Error",
          description: "Failed to connect to Somnia network",
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    initializeService();
  }, [toast]);

  // Check connection status periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const connected = somniaDatastreamService.isConnected();
      setIsConnected(connected);
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []);

  const onRealtimeUpdate = useCallback((callback: (data: any) => void) => {
    return realtimeTxService.onUpdate(callback);
  }, []);

  // Track transaction manually (untuk non-queued transactions dari SequenceContext)
  const trackTransaction = useCallback((txHash: string, method: string) => {
    const record: TxRecord = {
      txHash,
      method,
      timestamp: Date.now(),
      status: 'pending'
    };

    setTrackingMap(prev => new Map(prev).set(txHash, record));
    
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      totalTransactions: prev.totalTransactions + 1
    }));

    console.log('📊 Tracking transaction:', { txHash: txHash.slice(0, 10), method });
  }, []);

  // Complete transaction tracking
  const completeTransaction = useCallback((txHash: string, blockNumber: number, success: boolean = true) => {
    setTrackingMap(prev => {
      const newMap = new Map(prev);
      const record = newMap.get(txHash);
      
      if (!record) {
        console.warn('⚠️ Transaction not found:', txHash.slice(0, 10));
        return prev;
      }

      const latency = Date.now() - record.timestamp;
      record.status = success ? 'confirmed' : 'failed';
      record.latency = latency;
      record.blockNumber = blockNumber;

      // Update metrics
      setMetrics(prevMetrics => {
        const newMetrics = { ...prevMetrics };
        
        if (success) {
          newMetrics.successfulTransactions++;
          
          // Update average latency
          const totalLatency = 
            prevMetrics.averageLatency * (prevMetrics.successfulTransactions) + 
            latency;
          newMetrics.averageLatency = totalLatency / newMetrics.successfulTransactions;
        } else {
          newMetrics.failedTransactions++;
        }

        return newMetrics;
      });

      // Add to recent transactions
      setRecentTransactions(prev => {
        const updated = [record, ...prev];
        return updated.slice(0, 10); // Keep last 10
      });

      console.log('✅ Transaction completed:', {
        txHash: txHash.slice(0, 10),
        method: record.method,
        latency: `${latency}ms`,
        success
      });

      return newMap;
    });
  }, []);

  // Calculate TPS periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneSecondAgo = now - 1000;

      // Count confirmed transactions in last second
      const recentTxs = recentTransactions.filter(
        tx => tx.timestamp > oneSecondAgo && tx.status === 'confirmed'
      );

      setMetrics(prev => {
        const currentTPS = recentTxs.length;
        return {
          ...prev,
          currentTPS,
          peakTPS: Math.max(prev.peakTPS, currentTPS)
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [recentTransactions]);

  return (
    <RealtimeTransactionContext.Provider
      value={{
        metrics,
        isInitialized,
        isConnected,
        queueStats,
        recentTransactions,
        onRealtimeUpdate,
        trackTransaction,
        completeTransaction
      }}
    >
      {children}
    </RealtimeTransactionContext.Provider>
  );
};

export const useRealtimeTransaction = () => {
  const context = useContext(RealtimeTransactionContext);
  if (context === undefined) {
    throw new Error('useRealtimeTransaction must be used within RealtimeTransactionProvider');
  }
  return context;
};
