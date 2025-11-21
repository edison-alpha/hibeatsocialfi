// Publisher Indexer Service
// Tracks all publishers (user wallets) that have published data
// Used for discovering and loading data from multiple publishers

import { SDK } from '@somnia-chain/streams';

interface PublisherInfo {
  address: string;
  lastActivity: number;
  postCount?: number;
}

class PublisherIndexer {
  private publishers: Map<string, PublisherInfo> = new Map();
  private isInitialized: boolean = false;
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Initialize indexer with blockchain sync
   */
  async initialize(sdk: SDK, schemaIds: { [key: string]: string }) {
    if (this.isInitialized) {
      console.log('ℹ️ [INDEXER] Already initialized');
      return;
    }

    console.log('🔄 [INDEXER] Initializing publisher indexer...');

    // Subscribe to all schemas to discover publishers
    for (const [name, schemaId] of Object.entries(schemaIds)) {
      await this.subscribeToSchema(sdk, name, schemaId);
    }

    this.isInitialized = true;
    console.log(`✅ [INDEXER] Initialized with ${this.publishers.size} publishers`);
  }

  /**
   * Subscribe to schema events to discover new publishers
   */
  private async subscribeToSchema(sdk: SDK, schemaName: string, schemaId: string) {
    try {
      console.log(`📡 [INDEXER] Subscribing to ${schemaName} schema...`);

      // ✅ FIXED: Add required parameters ethCalls and onlyPushChanges
      const subscription = await sdk.streams.subscribe({
        somniaStreamsEventId: schemaId, // Use schemaId as event ID
        ethCalls: [], // Required: empty array if no eth calls needed
        onlyPushChanges: false, // Required: push all events, not just changes
        onData: (data: any) => {
          // Extract publisher from event data
          // Event structure: { result: { topics: [...], data: '0x...' } }
          try {
            if (data.result && data.result.topics) {
              // Topic[0] = event signature
              // Topic[1] = publisher address (indexed parameter)
              const publisherAddress = data.result.topics[1];
              if (publisherAddress) {
                this.addPublisher(publisherAddress);
                console.log(`📥 [INDEXER] New publisher from event: ${publisherAddress.slice(0, 10)}...`);
              }
            }
            // Fallback: check for publisher in data object
            else if (data.publisher) {
              this.addPublisher(data.publisher);
              console.log(`📥 [INDEXER] New publisher: ${data.publisher.slice(0, 10)}...`);
            }
          } catch (error) {
            console.warn('⚠️ [INDEXER] Failed to extract publisher from event:', error);
          }
        },
        onError: (error: Error) => {
          console.error(`❌ [INDEXER] Subscription error for ${schemaName}:`, error);
        }
      });

      this.subscriptions.set(schemaName, subscription);
      console.log(`✅ [INDEXER] Subscribed to ${schemaName}`);
    } catch (error) {
      console.warn(`⚠️ [INDEXER] Failed to subscribe to ${schemaName}:`, error);
    }
  }

  /**
   * Add publisher to index
   */
  addPublisher(address: string, postCount?: number) {
    const normalized = address.toLowerCase();
    
    const existing = this.publishers.get(normalized);
    
    if (existing) {
      // Update existing
      existing.lastActivity = Date.now();
      if (postCount !== undefined) {
        existing.postCount = postCount;
      }
    } else {
      // Add new
      this.publishers.set(normalized, {
        address: normalized,
        lastActivity: Date.now(),
        postCount
      });
      console.log(`➕ [INDEXER] New publisher: ${normalized.slice(0, 10)}...`);
    }
    
    this.saveToLocalStorage();
  }

  /**
   * Add multiple publishers at once
   */
  addPublishers(addresses: string[]) {
    addresses.forEach(addr => this.addPublisher(addr));
  }

  /**
   * Get all known publishers
   */
  getAllPublishers(): string[] {
    return Array.from(this.publishers.keys());
  }

  /**
   * Get publishers sorted by activity
   */
  getActivePublishers(limit?: number): string[] {
    const sorted = Array.from(this.publishers.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .map(p => p.address);
    
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get publisher count
   */
  getPublisherCount(): number {
    return this.publishers.size;
  }

  /**
   * Check if publisher is indexed
   */
  hasPublisher(address: string): boolean {
    return this.publishers.has(address.toLowerCase());
  }

  /**
   * Get publisher info
   */
  getPublisherInfo(address: string): PublisherInfo | undefined {
    return this.publishers.get(address.toLowerCase());
  }

  /**
   * Remove publisher from index
   */
  removePublisher(address: string) {
    const normalized = address.toLowerCase();
    this.publishers.delete(normalized);
    this.saveToLocalStorage();
    console.log(`➖ [INDEXER] Removed publisher: ${normalized.slice(0, 10)}...`);
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage() {
    try {
      const data = Array.from(this.publishers.values());
      localStorage.setItem('known_publishers', JSON.stringify(data));
    } catch (error) {
      console.warn('⚠️ [INDEXER] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load from localStorage
   */
  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem('known_publishers');
      if (stored) {
        const data: PublisherInfo[] = JSON.parse(stored);
        data.forEach(info => {
          this.publishers.set(info.address, info);
        });
        console.log(`📥 [INDEXER] Loaded ${this.publishers.size} publishers from cache`);
      }
    } catch (error) {
      console.warn('⚠️ [INDEXER] Failed to load from localStorage:', error);
    }
  }

  /**
   * Clear all publishers
   */
  clear() {
    this.publishers.clear();
    localStorage.removeItem('known_publishers');
    console.log('🗑️ [INDEXER] Publisher index cleared');
  }

  /**
   * Export publishers for backup
   */
  export(): PublisherInfo[] {
    return Array.from(this.publishers.values());
  }

  /**
   * Import publishers from backup
   */
  import(publishers: PublisherInfo[]) {
    publishers.forEach(info => {
      this.publishers.set(info.address, info);
    });
    this.saveToLocalStorage();
    console.log(`📥 [INDEXER] Imported ${publishers.length} publishers`);
  }

  /**
   * Get statistics
   */
  getStats() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    const publishers = Array.from(this.publishers.values());

    return {
      total: publishers.length,
      activeLastHour: publishers.filter(p => now - p.lastActivity < oneHour).length,
      activeLastDay: publishers.filter(p => now - p.lastActivity < oneDay).length,
      activeLastWeek: publishers.filter(p => now - p.lastActivity < oneWeek).length,
      totalPosts: publishers.reduce((sum, p) => sum + (p.postCount || 0), 0)
    };
  }

  /**
   * Cleanup old publishers (optional)
   */
  cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000) { // 30 days default
    const now = Date.now();
    let removed = 0;

    for (const [address, info] of this.publishers.entries()) {
      if (now - info.lastActivity > maxAge) {
        this.publishers.delete(address);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveToLocalStorage();
      console.log(`🗑️ [INDEXER] Cleaned up ${removed} inactive publishers`);
    }
  }

  /**
   * Unsubscribe from all schemas
   */
  destroy() {
    // TODO: Implement unsubscribe when SDK supports it
    this.subscriptions.clear();
    this.isInitialized = false;
    console.log('🔌 [INDEXER] Destroyed');
  }
}

// Export singleton
export const publisherIndexer = new PublisherIndexer();
export default publisherIndexer;
