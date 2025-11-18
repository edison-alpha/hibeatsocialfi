/**
 * RPC Fallback System
 * Automatically switches between multiple RPC endpoints for reliability
 */

export interface RpcEndpoint {
  name: string;
  http: string;
  ws?: string;
  priority: number; // Lower = higher priority
}

// 🔥 Multiple RPC endpoints with fallback support
export const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    name: 'Ankr',
    http: 'https://rpc.ankr.com/somnia_testnet',
    priority: 1,
  },
  {
    name: 'Somnia.network',
    http: 'https://dream-rpc.somnia.network',
    ws: 'wss://dream-rpc.somnia.network/ws',
    priority: 2,
  },
  {
    name: 'Thirdweb',
    http: 'https://50312.rpc.thirdweb.com',
    priority: 3,
  },
];

class RpcFallbackManager {
  private currentEndpointIndex = 0;
  private failureCount = new Map<string, number>();
  private lastHealthCheck = new Map<string, number>();
  private readonly MAX_FAILURES = 3;
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute

  constructor() {
    // Sort endpoints by priority
    RPC_ENDPOINTS.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get current active RPC endpoint
   */
  getCurrentEndpoint(): RpcEndpoint {
    return RPC_ENDPOINTS[this.currentEndpointIndex];
  }

  /**
   * Get all HTTP endpoints for fallback
   */
  getAllHttpEndpoints(): string[] {
    return RPC_ENDPOINTS.map(e => e.http);
  }

  /**
   * Get WebSocket URL (if available)
   */
  getWebSocketUrl(): string | undefined {
    return this.getCurrentEndpoint().ws;
  }

  /**
   * Report a failure for current endpoint
   */
  reportFailure(endpoint?: string): void {
    const current = endpoint || this.getCurrentEndpoint().http;
    const failures = (this.failureCount.get(current) || 0) + 1;
    this.failureCount.set(current, failures);

    console.warn(`⚠️ RPC Failure reported for ${this.getCurrentEndpoint().name}:`, {
      endpoint: current,
      failures,
      maxFailures: this.MAX_FAILURES,
    });

    // Switch to next endpoint if too many failures
    if (failures >= this.MAX_FAILURES) {
      this.switchToNextEndpoint();
    }
  }

  /**
   * Report a success for current endpoint
   */
  reportSuccess(endpoint?: string): void {
    const current = endpoint || this.getCurrentEndpoint().http;
    // Reset failure count on success
    this.failureCount.set(current, 0);
  }

  /**
   * Switch to next available endpoint
   */
  private switchToNextEndpoint(): void {
    const previousEndpoint = this.getCurrentEndpoint();
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    const newEndpoint = this.getCurrentEndpoint();

    console.log('🔄 Switching RPC endpoint:', {
      from: previousEndpoint.name,
      to: newEndpoint.name,
      url: newEndpoint.http,
    });

    // Notify listeners about endpoint change
    this.notifyEndpointChange(newEndpoint);
  }

  /**
   * Check health of an endpoint
   */
  async checkEndpointHealth(endpoint: RpcEndpoint): Promise<boolean> {
    const now = Date.now();
    const lastCheck = this.lastHealthCheck.get(endpoint.http) || 0;

    // Skip if checked recently
    if (now - lastCheck < this.HEALTH_CHECK_INTERVAL) {
      return true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint.http, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      this.lastHealthCheck.set(endpoint.http, now);

      if (response.ok) {
        this.reportSuccess(endpoint.http);
        return true;
      }

      this.reportFailure(endpoint.http);
      return false;
    } catch (error) {
      console.error(`❌ Health check failed for ${endpoint.name}:`, error);
      this.reportFailure(endpoint.http);
      return false;
    }
  }

  /**
   * Find best available endpoint
   */
  async findBestEndpoint(): Promise<RpcEndpoint> {
    // Try current endpoint first
    const current = this.getCurrentEndpoint();
    if (await this.checkEndpointHealth(current)) {
      return current;
    }

    // Try other endpoints
    for (let i = 0; i < RPC_ENDPOINTS.length; i++) {
      if (i === this.currentEndpointIndex) continue;

      const endpoint = RPC_ENDPOINTS[i];
      if (await this.checkEndpointHealth(endpoint)) {
        this.currentEndpointIndex = i;
        this.notifyEndpointChange(endpoint);
        return endpoint;
      }
    }

    // If all fail, return current and hope for the best
    console.error('❌ All RPC endpoints failed health check');
    return current;
  }

  /**
   * Notify listeners about endpoint change
   */
  private notifyEndpointChange(endpoint: RpcEndpoint): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rpc-endpoint-changed', {
        detail: { endpoint },
      }));
    }
  }

  /**
   * Get status of all endpoints
   */
  getEndpointStatus() {
    return RPC_ENDPOINTS.map(endpoint => ({
      name: endpoint.name,
      url: endpoint.http,
      failures: this.failureCount.get(endpoint.http) || 0,
      isActive: endpoint === this.getCurrentEndpoint(),
      lastCheck: this.lastHealthCheck.get(endpoint.http),
    }));
  }

  /**
   * Reset all failure counts
   */
  reset(): void {
    this.failureCount.clear();
    this.lastHealthCheck.clear();
    this.currentEndpointIndex = 0;
    console.log('🔄 RPC Fallback Manager reset');
  }
}

// Singleton instance
export const rpcFallbackManager = new RpcFallbackManager();

// Helper function to get current RPC URL
export const getCurrentRpcUrl = (): string => {
  return rpcFallbackManager.getCurrentEndpoint().http;
};

// Helper function to get all RPC URLs for fallback
export const getAllRpcUrls = (): string[] => {
  return rpcFallbackManager.getAllHttpEndpoints();
};

// Helper function to get WebSocket URL
export const getWebSocketUrl = (): string | undefined => {
  return rpcFallbackManager.getWebSocketUrl();
};
