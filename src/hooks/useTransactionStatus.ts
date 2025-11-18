/**
 * Real-time Transaction Status Hook using Somnia Datastream
 * 
 * Mendapatkan status transaksi (success/failed) secara real-time
 * menggunakan WebSocket Datastream, bukan polling RPC.
 * 
 * Somnia memiliki sub-second finality, jadi status transaksi
 * bisa didapat dalam < 1 detik setelah submit.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';

export interface TransactionStatus {
  txHash: string;
  status: 'pending' | 'success' | 'failed' | 'timeout';
  blockNumber?: number;
  timestamp?: number;
  confirmationTime?: number; // Time in ms from submit to confirmation
  error?: string;
}

interface UseTransactionStatusReturn {
  // Track a new transaction
  trackTransaction: (txHash: string) => void;
  
  // Get status of a transaction
  getStatus: (txHash: string) => TransactionStatus | undefined;
  
  // All tracked transactions
  transactions: Map<string, TransactionStatus>;
  
  // Clear completed transactions
  clearCompleted: () => void;
  
  // Statistics
  stats: {
    pending: number;
    success: number;
    failed: number;
    avgConfirmTime: number;
  };
}

export const useTransactionStatus = (): UseTransactionStatusReturn => {
  const { recentEvents, isConnected } = useSomniaDatastream();
  
  // Store transaction statuses
  const [transactions, setTransactions] = useState<Map<string, TransactionStatus>>(new Map());
  
  // Track submission times for calculating confirmation time
  const submissionTimes = useRef<Map<string, number>>(new Map());

  // Track a new transaction
  const trackTransaction = useCallback((txHash: string) => {
    const now = Date.now();
    submissionTimes.current.set(txHash, now);
    
    setTransactions(prev => {
      const newMap = new Map(prev);
      newMap.set(txHash, {
        txHash,
        status: 'pending',
        timestamp: now
      });
      return newMap;
    });
    
    console.log('📍 [TX-TRACKER] Tracking transaction:', txHash);
    
    // Set timeout for transactions that take too long (5 seconds on Somnia)
    setTimeout(() => {
      setTransactions(current => {
        const tx = current.get(txHash);
        if (tx && tx.status === 'pending') {
          console.warn('⏱️ [TX-TRACKER] Transaction timeout:', txHash);
          const newMap = new Map(current);
          newMap.set(txHash, {
            ...tx,
            status: 'timeout',
            error: 'Transaction confirmation timeout after 5 seconds'
          });
          return newMap;
        }
        return current;
      });
    }, 5000); // 5 second timeout for Somnia (should be < 1s normally)
  }, []);

  // Get status of a specific transaction
  const getStatus = useCallback((txHash: string): TransactionStatus | undefined => {
    return transactions.get(txHash);
  }, [transactions]);

  // Clear completed transactions (success/failed/timeout)
  const clearCompleted = useCallback(() => {
    setTransactions(prev => {
      const newMap = new Map(prev);
      for (const [txHash, tx] of newMap.entries()) {
        if (tx.status !== 'pending') {
          newMap.delete(txHash);
          submissionTimes.current.delete(txHash);
        }
      }
      return newMap;
    });
    console.log('🧹 [TX-TRACKER] Cleared completed transactions');
  }, []);

  // Calculate statistics
  const stats = {
    pending: Array.from(transactions.values()).filter(tx => tx.status === 'pending').length,
    success: Array.from(transactions.values()).filter(tx => tx.status === 'success').length,
    failed: Array.from(transactions.values()).filter(tx => tx.status === 'failed').length,
    avgConfirmTime: (() => {
      const successTxs = Array.from(transactions.values())
        .filter(tx => tx.status === 'success' && tx.confirmationTime);
      if (successTxs.length === 0) return 0;
      const total = successTxs.reduce((sum, tx) => sum + (tx.confirmationTime || 0), 0);
      return Math.round(total / successTxs.length);
    })()
  };

  // Listen to Datastream events for transaction confirmations
  useEffect(() => {
    if (!isConnected || recentEvents.length === 0) return;

    // Process recent events to find transaction confirmations
    for (const event of recentEvents) {
      const txHash = event.transactionHash;
      if (!txHash) continue;

      // Check if we're tracking this transaction
      const trackedTx = transactions.get(txHash);
      if (!trackedTx || trackedTx.status !== 'pending') continue;

      // Calculate confirmation time
      const submitTime = submissionTimes.current.get(txHash);
      const confirmTime = submitTime ? event.timestamp - submitTime : undefined;

      // Update transaction status based on event
      setTransactions(prev => {
        const newMap = new Map(prev);
        newMap.set(txHash, {
          ...trackedTx,
          status: 'success',
          blockNumber: event.blockNumber,
          timestamp: event.timestamp,
          confirmationTime: confirmTime
        });
        return newMap;
      });

      console.log('✅ [TX-TRACKER] Transaction confirmed via Datastream:', {
        txHash: txHash.substring(0, 10) + '...',
        blockNumber: event.blockNumber,
        confirmTime: confirmTime ? `${confirmTime}ms` : 'unknown',
        eventType: event.type
      });

      // Performance check
      if (confirmTime && confirmTime < 1000) {
        console.log('🚀 [TX-TRACKER] SUB-SECOND CONFIRMATION!', `${confirmTime}ms ⚡`);
      } else if (confirmTime && confirmTime > 1000) {
        console.warn('⚠️ [TX-TRACKER] Slower than expected:', `${confirmTime}ms (expected < 1000ms)`);
      }
    }
  }, [recentEvents, isConnected, transactions]);

  return {
    trackTransaction,
    getStatus,
    transactions,
    clearCompleted,
    stats
  };
};
