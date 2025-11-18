import { useRpcHealth } from '@/hooks/useRpcHealth';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

/**
 * Component untuk menampilkan status kesehatan network
 * Membantu user memahami kenapa transaksi mungkin lambat/gagal
 */
export const NetworkStatus = () => {
  const { isHealthy, latency, consecutiveFailures, currentEndpoint } = useRpcHealth();

  // Jangan tampilkan jika network OK dan tidak ada masalah
  if (isHealthy && consecutiveFailures === 0) {
    return null;
  }

  const getStatusColor = () => {
    if (!isHealthy) return 'text-red-500';
    if (latency && latency > 3000) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isHealthy) return <WifiOff className="w-4 h-4" />;
    if (latency && latency > 3000) return <AlertCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusText = () => {
    const endpoint = currentEndpoint ? ` - ${currentEndpoint}` : '';
    if (!isHealthy) return `Network Issues Detected${endpoint}`;
    if (latency && latency > 5000) return `Network Slow (${latency}ms)${endpoint}`;
    if (latency && latency > 3000) return `Network OK (${latency}ms)${endpoint}`;
    return `Network OK (${latency}ms)${endpoint}`;
  };

  const getStatusMessage = () => {
    if (!isHealthy) {
      return `Connection issues detected (${consecutiveFailures} failures). Retrying...`;
    }
    if (latency && latency > 5000) {
      return 'Network latency is high. Transactions may take longer than usual.';
    }
    if (latency && latency > 3000) {
      return 'Network connection is stable but slightly slow.';
    }
    return 'Network connection is stable.';
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
      !isHealthy ? 'bg-red-500/10 border-red-500/20' : 
      latency && latency > 3000 ? 'bg-yellow-500/10 border-yellow-500/20' :
      'bg-green-500/10 border-green-500/20'
    }`}>
      <div className={getStatusColor()}>
        {getStatusIcon()}
      </div>
      <div className="flex-1">
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        <div className="text-xs text-muted-foreground">
          {getStatusMessage()}
        </div>
      </div>
      {consecutiveFailures > 2 && (
        <div className="text-xs text-muted-foreground">
          Failed: {consecutiveFailures}x
        </div>
      )}
    </div>
  );
};
