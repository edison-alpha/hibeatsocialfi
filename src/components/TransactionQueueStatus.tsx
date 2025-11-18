import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { transactionQueue } from '@/utils/transactionQueue';

/**
 * Transaction Queue Status Component
 * Menampilkan status transaksi yang sedang diproses dalam queue
 */
export const TransactionQueueStatus: React.FC = () => {
  const [queueStatus, setQueueStatus] = useState(transactionQueue.getStatus());

  useEffect(() => {
    // Update status setiap 500ms
    const interval = setInterval(() => {
      setQueueStatus(transactionQueue.getStatus());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Jangan tampilkan jika queue kosong dan tidak sedang processing
  if (queueStatus.queueSize === 0 && !queueStatus.isProcessing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center gap-3">
        {queueStatus.isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <Clock className="w-5 h-5 text-muted-foreground" />
        )}
        
        <div className="flex-1">
          <div className="font-semibold text-sm">
            {queueStatus.isProcessing ? 'Processing Transaction' : 'Transactions Queued'}
          </div>
          <div className="text-xs text-muted-foreground">
            {queueStatus.queueSize} transaction{queueStatus.queueSize !== 1 ? 's' : ''} in queue
          </div>
        </div>
      </div>

      {/* Show pending transactions */}
      {queueStatus.pendingTransactions.length > 0 && (
        <div className="mt-3 space-y-2">
          {queueStatus.pendingTransactions.slice(0, 3).map((tx, index) => (
            <div 
              key={tx.id} 
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="truncate flex-1">{tx.id}</span>
              {tx.retryCount > 0 && (
                <span className="text-orange-500">
                  Retry {tx.retryCount}/{tx.maxRetries}
                </span>
              )}
            </div>
          ))}
          {queueStatus.pendingTransactions.length > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{queueStatus.pendingTransactions.length - 3} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};
