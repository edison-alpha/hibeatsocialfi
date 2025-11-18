import { useState, useEffect } from 'react';
import { rpcFallbackManager } from '@/lib/rpc-fallback';
import { Server, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

/**
 * Component untuk menampilkan status semua RPC endpoints
 * Berguna untuk debugging dan monitoring
 */
export const RpcEndpointStatus = () => {
  const [endpoints, setEndpoints] = useState(rpcFallbackManager.getEndpointStatus());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Update status setiap 5 detik
    const interval = setInterval(() => {
      setEndpoints(rpcFallbackManager.getEndpointStatus());
    }, 5000);

    // Listen for endpoint changes
    const handleEndpointChange = () => {
      setEndpoints(rpcFallbackManager.getEndpointStatus());
    };

    window.addEventListener('rpc-endpoint-changed', handleEndpointChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('rpc-endpoint-changed', handleEndpointChange);
    };
  }, []);

  const activeEndpoint = endpoints.find(e => e.isActive);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view - show active endpoint */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 bg-background/95 backdrop-blur border rounded-lg shadow-lg hover:bg-accent transition-colors"
        >
          <Server className="w-4 h-4" />
          <span className="text-sm font-medium">
            RPC: {activeEndpoint?.name}
          </span>
          {activeEndpoint && activeEndpoint.failures > 0 && (
            <span className="text-xs text-yellow-500">
              ({activeEndpoint.failures} failures)
            </span>
          )}
        </button>
      )}

      {/* Expanded view - show all endpoints */}
      {isExpanded && (
        <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg p-4 min-w-[300px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <h3 className="font-semibold text-sm">RPC Endpoints</h3>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.url}
                className={`p-2 rounded border ${
                  endpoint.isActive
                    ? 'bg-primary/10 border-primary/20'
                    : 'bg-muted/50 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {endpoint.isActive && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    {!endpoint.isActive && endpoint.failures === 0 && (
                      <CheckCircle className="w-3 h-3 text-muted-foreground" />
                    )}
                    {!endpoint.isActive && endpoint.failures > 0 && endpoint.failures < 3 && (
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                    )}
                    {!endpoint.isActive && endpoint.failures >= 3 && (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-sm font-medium">{endpoint.name}</span>
                  </div>
                  {endpoint.isActive && (
                    <span className="text-xs text-primary font-medium">Active</span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground truncate">
                  {endpoint.url}
                </div>

                {endpoint.failures > 0 && (
                  <div className="text-xs text-yellow-500 mt-1">
                    Failures: {endpoint.failures}
                  </div>
                )}

                {endpoint.lastCheck && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last check: {new Date(endpoint.lastCheck).toLocaleTimeString()}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              rpcFallbackManager.reset();
              setEndpoints(rpcFallbackManager.getEndpointStatus());
            }}
            className="w-full mt-3 px-3 py-1.5 text-xs bg-muted hover:bg-accent rounded transition-colors"
          >
            Reset All
          </button>
        </div>
      )}
    </div>
  );
};
