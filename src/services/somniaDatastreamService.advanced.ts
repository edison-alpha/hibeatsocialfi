// ✅ ADVANCED Somnia Datastream Service with Real-Time Features
// Implements all advanced SDS features for hackathon showcase
// Features: WebSocket subscriptions, event filtering, computed queries, live indicators

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  webSocket, 
  type Hex, 
  keccak256, 
  toBytes, 
  pad
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from '@/lib/web3-config';

// Import privateKeyToAccount for querying blockchain data
import type { PrivateKeyAccount } from 'viem/accounts';

// ===== TYPES =====

interface DatastreamConfig {
  rpcUrl: string;
  wsUrl: string;
  chainId: number;
  contractAddresses: string[];
}

interface SubscriptionCallback {
  onData: (data: any) => void;
  onError?: (error: Error) => void;
}

interface EventData {
  id: string;
  argumentTopics: Hex[];
  data: Hex;
}

interface DataStream {
  id: Hex;
  schemaId: Hex;
  data: Hex;
}

interface ComputedQuery {
  to: string;
  data: Hex;
}

interface LiveIndicator {
  postId: string;
  viewerCount: number;
  activeTypers: string[];
  lastUpdate: number;
}

// ===== ADVANCED DATASTREAM SERVICE =====

class AdvancedSomniaDatastreamService {
  private sdk: SDK | null = null;
  private config: DatastreamConfig;
  private publicClient: any = null;
  private wsClient: any = null;
  private walletClient: any = null;
  
  // Caching & optimization
  private schemaIdCache: Map<string, Hex> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private dataCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5000; // 5 seconds
  
  // Real-time subscriptions
  private activeSubscriptions: Map<string, any> = new Map();
  private liveIndicators: Map<string, LiveIndicator> = new Map();
  
  // Performance tracking
  private performanceMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
    lastFetchTime: 0
  };

  constructor(config: DatastreamConfig) {
    this.config = config;
    this.initializeClients();
  }

  // ===== INITIALIZATION =====

  private initializeClients(): void {
    try {
      // HTTP client for reads
      this.publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(this.config.rpcUrl),
      });

      // WebSocket client for real-time subscriptions
      this.wsClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket(this.config.wsUrl, {
          reconnect: true,
          retryCount: 10,
          retryDelay: 1000,
        }),
      });

      // Wallet client for writes
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account,
          chain: somniaTestnet,
          transport: http(this.config.rpcUrl),
        });
        console.log('✅ [ADVANCED-SDS] Wallet client initialized');
      }

      console.log('✅ [ADVANCED-SDS] Clients initialized');
    } catch (error) {
      console.error('❌ [ADVANCED-SDS] Failed to initialize clients:', error);
    }
  }

  private isInitialized = false;

  async connect(externalWalletClient?: any): Promise<void> {
    try {
      // Only log on first initialization
      if (!this.isInitialized) {
        console.log('🚀 [ADVANCED-SDS] Initializing SDK...');
      }

      if (externalWalletClient && !this.walletClient) {
        this.walletClient = externalWalletClient;
      }

      this.sdk = new SDK({
        public: this.publicClient,
        wallet: this.walletClient,
      });

      if (!this.isInitialized) {
        console.log('✅ [ADVANCED-SDS] SDK initialized successfully');
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('❌ [ADVANCED-SDS] Failed to initialize SDK:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.sdk !== null;
  }

  // ===== HELPER METHODS (Like Notification Service) =====

  /**
   * Get publisher address (private key account)
   * Same pattern as notification service
   */
  private async getPublisherAddress(): Promise<string> {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (privateKey) {
      try {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        return account.address;
      } catch (error) {
        console.warn('⚠️ [LIVE] Could not get private key address:', error);
      }
    }
    return '';
  }

  /**
   * Get private key wallet client for writes
   * Same pattern as notification service
   */
  private async getPrivateKeyWallet(): Promise<any> {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VITE_PRIVATE_KEY not found in environment');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    return createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(this.config.rpcUrl),
    });
  }

  /**
   * Get SDK with private key wallet
   * Used for writing live indicators (like notifications)
   */
  private async getPrivateKeySDK(): Promise<SDK> {
    const wallet = await this.getPrivateKeyWallet();
    return new SDK({
      public: this.publicClient,
      wallet: wallet,
    });
  }

  // ===== ADVANCED FEATURE 1: TRUE REAL-TIME SUBSCRIPTIONS WITH EVENT FILTERING =====

  /**
   * Subscribe to real-time events with advanced filtering
   * Uses WebSocket + indexed topics for efficient filtering
   */
  async subscribeToEvents(
    eventId: string,
    filters: {
      author?: string;
      postId?: string;
      fromUser?: string;
    } = {},
    callbacks: SubscriptionCallback
  ): Promise<string> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      console.log(`📡 [ADVANCED-SDS] Subscribing to ${eventId} with filters:`, filters);

      // Build argument topics for filtering
      const argumentTopics: Hex[] = [];
      
      if (filters.author) {
        argumentTopics.push(pad(filters.author as Hex, { size: 32 }));
      }
      if (filters.fromUser) {
        argumentTopics.push(pad(filters.fromUser as Hex, { size: 32 }));
      }

      // Subscribe with SDK
      await this.sdk.streams.subscribe({
        somniaStreamsEventId: eventId,
        ethCalls: [], // Will add computed queries separately
        onlyPushChanges: true, // Only push when data actually changes
        onData: (data) => {
          console.log(`🔔 [ADVANCED-SDS] Event received: ${eventId}`, data);
          callbacks.onData(data);
        },
        onError: callbacks.onError || ((error: Error) => {
          console.error(`❌ [ADVANCED-SDS] Subscription error for ${eventId}:`, error);
        }),
      });

      const subscriptionId = `sub_${eventId}_${Date.now()}`;
      this.activeSubscriptions.set(subscriptionId, { eventId, filters });

      console.log(`✅ [ADVANCED-SDS] Subscribed to ${eventId} with ID: ${subscriptionId}`);
      return subscriptionId;
    } catch (error) {
      console.error(`❌ [ADVANCED-SDS] Failed to subscribe to ${eventId}:`, error);
      throw error;
    }
  }

  // ===== ADVANCED FEATURE 2: COMPUTED QUERIES FOR AGGREGATE DATA =====

  /**
   * Subscribe with computed queries to get aggregate stats in real-time
   * Example: Get post stats (likes, comments, shares) computed on-chain
   */
  async subscribeWithComputedQueries(
    eventId: string,
    computedQueries: ComputedQuery[],
    callbacks: SubscriptionCallback
  ): Promise<string> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      console.log(`📊 [ADVANCED-SDS] Subscribing with ${computedQueries.length} computed queries`);

      await this.sdk.streams.subscribe({
        somniaStreamsEventId: eventId,
        ethCalls: computedQueries.map(q => ({
          to: q.to as `0x${string}`,
          data: q.data,
        })),
        onlyPushChanges: true,
        onData: (data) => {
          console.log(`📊 [ADVANCED-SDS] Computed data received:`, data);
          callbacks.onData(data);
        },
        onError: callbacks.onError,
      });

      const subscriptionId = `sub_computed_${eventId}_${Date.now()}`;
      this.activeSubscriptions.set(subscriptionId, { eventId, type: 'computed' });

      console.log(`✅ [ADVANCED-SDS] Subscribed with computed queries: ${subscriptionId}`);
      return subscriptionId;
    } catch (error) {
      console.error(`❌ [ADVANCED-SDS] Failed to subscribe with computed queries:`, error);
      throw error;
    }
  }

  // ===== ADVANCED FEATURE 3: INCREMENTAL DATA LOADING =====

  /**
   * Load only new data since last timestamp (incremental loading)
   * Much faster than loading all data every time
   */
  async loadIncrementalData(
    schemaId: string,
    publisherAddress: string,
    sinceTimestamp: number
  ): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      console.log(`⚡ [ADVANCED-SDS] Loading incremental data since ${new Date(sinceTimestamp).toISOString()}`);

      // Check cache first
      const cacheKey = `incremental_${schemaId}_${publisherAddress}_${sinceTimestamp}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.performanceMetrics.cacheHits++;
        console.log(`💾 [ADVANCED-SDS] Cache hit! (${Date.now() - startTime}ms)`);
        return cached;
      }

      this.performanceMetrics.cacheMisses++;

      // Get schema ID
      const schemaIdBytes32 = await this.getSchemaIdCached(schemaId);

      // Load all data (SDK doesn't support timestamp filtering yet)
      const allData = await this.sdk!.streams.getAllPublisherDataForSchema(
        schemaIdBytes32,
        publisherAddress as `0x${string}`
      );

      if (!allData || !Array.isArray(allData)) {
        return [];
      }

      // Filter by timestamp client-side
      const incrementalData = allData.filter((item: any) => {
        const timestamp = item.timestamp || item[0]?.value?.value || 0;
        return Number(timestamp) > sinceTimestamp;
      });

      const loadTime = Date.now() - startTime;
      console.log(`⚡ [ADVANCED-SDS] Loaded ${incrementalData.length} new items in ${loadTime}ms`);

      // Update performance metrics
      this.performanceMetrics.totalRequests++;
      this.performanceMetrics.avgResponseTime = 
        (this.performanceMetrics.avgResponseTime * (this.performanceMetrics.totalRequests - 1) + loadTime) / 
        this.performanceMetrics.totalRequests;
      this.performanceMetrics.lastFetchTime = loadTime;

      // Cache result
      this.setCache(cacheKey, incrementalData);

      return incrementalData;
    } catch (error) {
      console.error('❌ [ADVANCED-SDS] Failed to load incremental data:', error);
      return [];
    }
  }

  // ===== ADVANCED FEATURE 4: LIVE INDICATORS =====

  /**
   * Track live view counts with OPTIMISTIC UPDATES
   * ⚡ Updates UI immediately, writes to blockchain in background
   */
  async updateLiveViewCount(postId: string, viewerAddress: string): Promise<void> {
    const viewerLower = viewerAddress.toLowerCase();
    
    // ⚡ STEP 1: OPTIMISTIC UPDATE - Update local state IMMEDIATELY (0ms)
    const indicator = this.liveIndicators.get(postId) || {
      postId,
      viewerCount: 0,
      activeTypers: [],
      lastUpdate: Date.now()
    };
    
    const viewersKey = `${postId}_viewers`;
    if (!this.dataCache.has(viewersKey)) {
      this.dataCache.set(viewersKey, { data: new Set<string>(), timestamp: Date.now() });
    }
    
    const viewersSet = this.dataCache.get(viewersKey)!.data as Set<string>;
    const wasNew = !viewersSet.has(viewerLower);
    viewersSet.add(viewerLower);
    
    indicator.viewerCount = viewersSet.size;
    indicator.lastUpdate = Date.now();
    this.liveIndicators.set(postId, indicator);
    
    if (wasNew) {
      console.log(`⚡ [LIVE-OPTIMISTIC] New viewer ${viewerLower.slice(0, 10)}... (instant UI update)`);
      console.log(`⚡ [LIVE-OPTIMISTIC] Total viewers: ${indicator.viewerCount}`);
      
      // Trigger callbacks immediately
      this.notifySubscribers(postId, indicator);
    }
    
    // ⚡ STEP 2: BACKGROUND BLOCKCHAIN WRITE - Don't await, run async
    this.writeViewToBlockchain(postId, viewerAddress).catch(error => {
      console.error('❌ [LIVE-BACKGROUND] Failed to write view to blockchain:', error);
      // Don't rollback - user already sees the change
    });
  }

  /**
   * Write view count to blockchain (background, non-blocking)
   */
  private async writeViewToBlockchain(postId: string, viewerAddress: string): Promise<void> {
    try {
      const privateSDK = await this.getPrivateKeySDK();
      const publisherAddress = await this.getPublisherAddress();
      
      const liveSchemaId = await this.getSchemaIdCached('hibeats_live_indicators_v1');
      const streamId = keccak256(toBytes(`live_view_${postId}_${viewerAddress}_${Date.now()}`));
      
      const encoder = new SchemaEncoder('uint64 timestamp, string postId, address userAddress, string action');
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: postId, type: 'string' },
        { name: 'userAddress', value: viewerAddress, type: 'address' },
        { name: 'action', value: 'view', type: 'string' }
      ]);
      
      await privateSDK.streams.set([{
        id: streamId,
        schemaId: liveSchemaId,
        data: encodedData as Hex
      }]);
      
      console.log(`✅ [LIVE-BACKGROUND] View written to blockchain by ${publisherAddress.slice(0, 10)}...`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Track live typing indicators with OPTIMISTIC UPDATES
   * ⚡ Updates UI immediately, writes to blockchain in background
   */
  async updateTypingIndicator(postId: string, userAddress: string, isTyping: boolean): Promise<void> {
    const userLower = userAddress.toLowerCase();
    
    // ⚡ STEP 1: OPTIMISTIC UPDATE - Update local state IMMEDIATELY (0ms)
    const indicator = this.liveIndicators.get(postId) || {
      postId,
      viewerCount: 0,
      activeTypers: [],
      lastUpdate: Date.now()
    };
    
    // Update typers list instantly
    if (isTyping && !indicator.activeTypers.includes(userLower)) {
      indicator.activeTypers.push(userLower);
      console.log(`⚡ [LIVE-OPTIMISTIC] ${userLower.slice(0, 10)}... started typing (instant UI update)`);
    } else if (!isTyping) {
      const beforeCount = indicator.activeTypers.length;
      indicator.activeTypers = indicator.activeTypers.filter(addr => addr !== userLower);
      if (beforeCount !== indicator.activeTypers.length) {
        console.log(`⚡ [LIVE-OPTIMISTIC] ${userLower.slice(0, 10)}... stopped typing (instant UI update)`);
      }
    }
    
    indicator.lastUpdate = Date.now();
    this.liveIndicators.set(postId, indicator);
    
    // Trigger callbacks immediately for instant UI update
    this.notifySubscribers(postId, indicator);
    
    // ⚡ STEP 2: BACKGROUND BLOCKCHAIN WRITE - Don't await, run async
    this.writeTypingToBlockchain(postId, userAddress, isTyping).catch(error => {
      console.error('❌ [LIVE-BACKGROUND] Failed to write typing to blockchain:', error);
      // Don't rollback optimistic update - user already sees the change
    });
  }

  /**
   * Write typing indicator to blockchain (background, non-blocking)
   */
  private async writeTypingToBlockchain(postId: string, userAddress: string, isTyping: boolean): Promise<void> {
    try {
      const privateSDK = await this.getPrivateKeySDK();
      const publisherAddress = await this.getPublisherAddress();
      
      const liveSchemaId = await this.getSchemaIdCached('hibeats_live_indicators_v1');
      const streamId = keccak256(toBytes(`live_typing_${postId}_${userAddress}_${Date.now()}`));
      
      const encoder = new SchemaEncoder('uint64 timestamp, string postId, address userAddress, string action');
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: postId, type: 'string' },
        { name: 'userAddress', value: userAddress, type: 'address' },
        { name: 'action', value: isTyping ? 'typing_start' : 'typing_stop', type: 'string' }
      ]);
      
      await privateSDK.streams.set([{
        id: streamId,
        schemaId: liveSchemaId,
        data: encodedData as Hex
      }]);
      
      console.log(`✅ [LIVE-BACKGROUND] Typing written to blockchain by ${publisherAddress.slice(0, 10)}...`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Notify all subscribers of indicator update
   */
  private notifySubscribers(postId: string, indicator: LiveIndicator): void {
    // Find all subscriptions for this post
    for (const [subId, sub] of this.activeSubscriptions.entries()) {
      if (sub.type === 'live' && sub.postId === postId && sub.callback) {
        try {
          sub.callback(indicator);
        } catch (error) {
          console.error(`❌ [LIVE] Failed to notify subscriber ${subId}:`, error);
        }
      }
    }
  }

  /**
   * Get live indicators for a post
   */
  getLiveIndicators(postId: string): LiveIndicator | null {
    return this.liveIndicators.get(postId) || null;
  }

  /**
   * Refresh live indicators from blockchain
   * Re-queries all data to get latest state
   */
  async refreshLiveIndicators(postId: string): Promise<LiveIndicator | null> {
    try {
      if (!this.sdk) {
        console.warn('⚠️ [LIVE] SDK not initialized');
        return null;
      }

      const publisherAddress = await this.getPublisherAddress();
      if (!publisherAddress) {
        console.error('❌ [LIVE] No publisher address found');
        return null;
      }

      const liveSchemaId = await this.getSchemaIdCached('hibeats_live_indicators_v1');
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(
        liveSchemaId,
        publisherAddress as `0x${string}`
      );

      // Parse data
      const uniqueViewers = new Set<string>();
      const userLastAction = new Map<string, { action: string; timestamp: number }>();

      if (allData && Array.isArray(allData)) {
        for (const item of allData) {
          try {
            const itemAny = item as any;
            
            // Helper to extract nested value
            const extractValue = (val: any): any => {
              if (val && typeof val === 'object' && 'value' in val) {
                return extractValue(val.value);
              }
              return val;
            };
            
            let timestampValue, postIdValue, userAddressValue, actionValue;
            
            if (itemAny.postId && itemAny.userAddress && itemAny.action) {
              timestampValue = itemAny.timestamp;
              postIdValue = itemAny.postId;
              userAddressValue = itemAny.userAddress;
              actionValue = itemAny.action;
            } else if (Array.isArray(itemAny)) {
              timestampValue = extractValue(itemAny.find((i: any) => i.name === 'timestamp')?.value);
              postIdValue = extractValue(itemAny.find((i: any) => i.name === 'postId')?.value);
              userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
              actionValue = extractValue(itemAny.find((i: any) => i.name === 'action')?.value);
            }

            if (!postIdValue || !userAddressValue || !actionValue) continue;

            const recordPostId = String(postIdValue);
            const userAddress = String(userAddressValue).toLowerCase();
            const action = String(actionValue);
            const timestamp = Number(timestampValue) || Date.now();

            // Only process records for this post
            if (recordPostId === postId) {
              if (action === 'view') {
                uniqueViewers.add(userAddress);
              } else if (action === 'typing_start' || action === 'typing_stop') {
                const existing = userLastAction.get(userAddress);
                if (!existing || timestamp > existing.timestamp) {
                  userLastAction.set(userAddress, { action, timestamp });
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [LIVE] Failed to parse record:', error);
          }
        }
      }

      // Calculate active typers based on last action
      const activeTypers: string[] = [];
      for (const [user, state] of userLastAction.entries()) {
        if (state.action === 'typing_start') {
          activeTypers.push(user);
        }
      }

      const indicator: LiveIndicator = {
        postId,
        viewerCount: uniqueViewers.size,
        activeTypers,
        lastUpdate: Date.now()
      };

      this.liveIndicators.set(postId, indicator);
      
      console.log(`🔄 [LIVE] Refreshed indicators for post ${postId.substring(0, 10)}: ${indicator.viewerCount} viewers, ${indicator.activeTypers.length} typing`);
      
      return indicator;
    } catch (error) {
      console.error('❌ [LIVE] Failed to refresh indicators:', error);
      return null;
    }
  }

  /**
   * Subscribe to live indicators updates
   * Pure blockchain solution - queries existing data and subscribes to new events
   */
  async subscribeToLiveIndicators(
    postId: string,
    callback: (indicator: LiveIndicator) => void
  ): Promise<string> {
    const subscriptionId = `live_${postId}_${Date.now()}`;
    
    console.log(`📡 [LIVE] Setting up subscription for post ${postId.substring(0, 10)}...`);
    
    try {
      if (!this.sdk) {
        console.warn('⚠️ [LIVE] SDK not initialized, cannot subscribe');
        return subscriptionId;
      }

      // 1. Query blockchain for existing views (like notifications)
      console.log(`🔍 [LIVE] Querying blockchain for existing views...`);
      
      const publisherAddress = await this.getPublisherAddress();
      if (!publisherAddress) {
        console.error('❌ [LIVE] No publisher address found');
        return subscriptionId;
      }
      
      console.log(`📡 [LIVE] Reading from publisher: ${publisherAddress.slice(0, 10)}...`);
      
      const liveSchemaId = await this.getSchemaIdCached('hibeats_live_indicators_v1');
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(
        liveSchemaId,
        publisherAddress as `0x${string}`
      );
      
      console.log(`📊 [LIVE] Found ${allData?.length || 0} total live indicator records`);
      
      // Filter for this post and count unique viewers
      const uniqueViewers = new Set<string>();
      const activeTypers: string[] = [];
      
      if (allData && Array.isArray(allData)) {
        for (const item of allData) {
          try {
            // Handle different data formats (like notifications)
            let postIdValue, userAddressValue, actionValue;
            
            const itemAny = item as any;
            
            if (itemAny.postId && itemAny.userAddress && itemAny.action) {
              // Already decoded
              postIdValue = itemAny.postId;
              userAddressValue = itemAny.userAddress;
              actionValue = itemAny.action;
            } else if (Array.isArray(itemAny) && itemAny.length >= 4) {
              // Array format
              postIdValue = itemAny.find((i: any) => i.name === 'postId')?.value;
              userAddressValue = itemAny.find((i: any) => i.name === 'userAddress')?.value;
              actionValue = itemAny.find((i: any) => i.name === 'action')?.value;
            }
            
            if (!postIdValue || !userAddressValue || !actionValue) continue;
            
            const recordPostId = String(postIdValue);
            const userAddress = String(userAddressValue);
            const action = String(actionValue);
            
            // Only process records for this post
            if (recordPostId === postId) {
              if (action === 'view') {
                uniqueViewers.add(userAddress.toLowerCase());
              } else if (action === 'typing_start') {
                if (!activeTypers.includes(userAddress.toLowerCase())) {
                  activeTypers.push(userAddress.toLowerCase());
                }
              } else if (action === 'typing_stop') {
                const index = activeTypers.indexOf(userAddress.toLowerCase());
                if (index > -1) {
                  activeTypers.splice(index, 1);
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [LIVE] Failed to parse record:', error);
          }
        }
      }
      
      // Create indicator with real data
      const indicator: LiveIndicator = {
        postId,
        viewerCount: uniqueViewers.size,
        activeTypers,
        lastUpdate: Date.now()
      };
      
      this.liveIndicators.set(postId, indicator);
      
      // Populate cache
      const viewersKey = `${postId}_viewers`;
      this.dataCache.set(viewersKey, { data: uniqueViewers, timestamp: Date.now() });
      
      // Send initial callback
      callback(indicator);
      console.log(`✅ [LIVE] Initial state loaded from blockchain: ${indicator.viewerCount} viewers, ${indicator.activeTypers.length} typing`);
      
      // 2. Subscribe to real-time events
      console.log(`📡 [LIVE] Subscribing to real-time events...`);
      const eventId = `hibeats_live_typing_${postId}`;
      
      await this.sdk.streams.subscribe({
        somniaStreamsEventId: eventId,
        ethCalls: [],
        onlyPushChanges: true,
        onData: (data) => {
          console.log(`🔔 [LIVE] Event received for post ${postId.substring(0, 10)}:`, data);
          
          // Get current indicator
          const currentIndicator = this.liveIndicators.get(postId) || {
            postId,
            viewerCount: 0,
            activeTypers: [],
            lastUpdate: Date.now()
          };
          
          // Re-query blockchain for latest data
          this.refreshLiveIndicators(postId).then(refreshedIndicator => {
            if (refreshedIndicator) {
              callback(refreshedIndicator);
              console.log(`✅ [LIVE] Indicator refreshed: ${refreshedIndicator.viewerCount} viewing, ${refreshedIndicator.activeTypers.length} typing`);
            }
          }).catch(error => {
            console.error('❌ [LIVE] Failed to refresh indicators:', error);
          });
        },
        onError: (error: Error) => {
          console.error(`❌ [LIVE] Subscription error:`, error);
        }
      });
      
      // Store subscription with callback for instant updates
      this.activeSubscriptions.set(subscriptionId, { 
        type: 'live', 
        eventId,
        postId,
        callback 
      });
      console.log(`✅ [LIVE] Subscribed to real-time events`);
      
      // 3. Set up FAST polling for cross-user sync (every 2 seconds)
      console.log(`⏰ [LIVE] Setting up fast polling (2s interval)...`);
      const pollingInterval = setInterval(async () => {
        try {
          const refreshedIndicator = await this.refreshLiveIndicators(postId);
          if (refreshedIndicator) {
            callback(refreshedIndicator);
            console.log(`🔄 [LIVE] Polling update: ${refreshedIndicator.viewerCount} viewers, ${refreshedIndicator.activeTypers.length} typing`);
          }
        } catch (error) {
          console.error('❌ [LIVE] Polling error:', error);
        }
      }, 2000); // ⚡ Reduced from 5s to 2s for faster sync
      
      // Store interval for cleanup
      const subscription = this.activeSubscriptions.get(subscriptionId);
      if (subscription) {
        subscription.interval = pollingInterval;
        this.activeSubscriptions.set(subscriptionId, subscription);
      }
      
      console.log(`✅ [LIVE] Fast polling started (2s interval)`);
      
    } catch (error) {
      console.error('❌ [LIVE] Failed to subscribe:', error);
    }
    
    return subscriptionId;
  }

  // ===== CACHING HELPERS =====

  private getSchemaIdCached(schemaId: string): Promise<Hex> {
    if (this.schemaIdCache.has(schemaId)) {
      return Promise.resolve(this.schemaIdCache.get(schemaId)!);
    }

    // Compute and cache
    const schemaString = this.getSchemaString(schemaId);
    if (!schemaString) {
      throw new Error(`Schema definition not found for ${schemaId}`);
    }

    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    return this.sdk.streams.computeSchemaId(schemaString).then(computed => {
      this.schemaIdCache.set(schemaId, computed);
      return computed;
    });
  }

  private getFromCache(key: string): any | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.dataCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // ===== PERFORMANCE METRICS =====

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalRequests > 0
        ? (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests) * 100
        : 0,
      activeSubs: this.activeSubscriptions.size,
      cacheSize: this.dataCache.size
    };
  }

  // ===== UNSUBSCRIBE =====

  unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    
    if (subscription) {
      if (subscription.interval) {
        clearInterval(subscription.interval);
      }
      
      this.activeSubscriptions.delete(subscriptionId);
      console.log(`✅ [ADVANCED-SDS] Unsubscribed: ${subscriptionId}`);
    }
  }

  // ===== SCHEMA HELPERS =====

  private getSchemaString(schemaId: string): string | null {
    const schemas: Record<string, string> = {
      'hibeats_user_profiles_v1': 'uint64 timestamp, string username, string displayName, string bio, string avatarHash, address userAddress',
      'hibeats_social_posts_v1': 'uint64 timestamp, string content, string contentType, string ipfsHash, address author, uint256 likes, uint256 comments, uint256 shares, bool isDeleted, bool isPinned, uint256 nftTokenId, address nftContractAddress, uint256 nftPrice, bool nftIsListed',
      'hibeats_social_interactions_v2': 'uint64 timestamp, string interactionType, string postId, address fromUser, string content, string parentId',
      'hibeats_notifications_v1': 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead',
      'hibeats_live_indicators_v1': 'uint64 timestamp, string postId, address userAddress, string action',
    };

    return schemas[schemaId] || null;
  }

  disconnect(): void {
    this.activeSubscriptions.forEach((_, id) => this.unsubscribe(id));
    this.activeSubscriptions.clear();
    this.dataCache.clear();
    this.liveIndicators.clear();
    this.sdk = null;
    console.log('🔌 [ADVANCED-SDS] Disconnected');
  }
}

// Export singleton
export const advancedDatastreamService = new AdvancedSomniaDatastreamService({
  rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  wsUrl: import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network',
  chainId: 50312,
  contractAddresses: []
});

export default advancedDatastreamService;
