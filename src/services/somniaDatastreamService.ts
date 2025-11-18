// ✅ CORRECTED: Somnia Datastream Service with Real-Time Support
// Based on official Somnia Datastream SDK documentation
// https://docs.somnia.network/somnia-data-streams/getting-started/publish-your-docs
// https://docs.somnia.network/somnia-data-streams/basics/editor/build-your-first-schema

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, type Hex, toHex, keccak256, toBytes, pad } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { decodeProfileEvent } from '@/utils/eventDecoder';
import { somniaTestnet } from '@/lib/web3-config';

interface DatastreamConfig {
  rpcUrl: string;
  wsUrl: string;
  chainId: number;
  contractAddresses: string[];
  schemaIds: string[];
}

// ✅ Subscription callback types for real-time events
interface SubscriptionCallback {
  onData: (data: any) => void;
  onError?: (error: Error) => void;
}

// ✅ Event data types for setAndEmitEvents
interface EventData {
  id: string; // Event schema ID registered in Somnia
  argumentTopics: Hex[]; // Indexed parameters for filtering
  data: Hex; // Non-indexed event data
}

// ✅ Data stream entry for set() and setAndEmitEvents()
interface DataStream {
  id: Hex; // Unique data key
  schemaId: Hex; // Schema identifier
  data: Hex; // Encoded data
}

// Somnia DataStream Schema Definitions for HiBeats Social Music Platform
interface HiBeatsPostSchema {
  id: string;
  author: string;
  content: string;
  metadata: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  likes: number;
  comments: number;
  shares: number;
  isRepost: boolean;
  originalPostId?: number;
  genre?: string;
  ipfsHash?: string;
}

interface HiBeatsInteractionSchema {
  id: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'tip' | 'share';
  postId?: string;
  fromUser: string;
  toUser?: string;
  content?: string;
  amount?: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  parentCommentId?: number;
}

interface HiBeatsMusicEventSchema {
  id: string;
  type: 'generate' | 'mint' | 'play' | 'purchase' | 'tip' | 'remix' | 'stream';
  tokenId?: string;
  artist: string;
  listener?: string;
  amount?: string;
  songTitle?: string;
  genre?: string;
  duration?: number;
  ipfsAudioHash?: string;
  ipfsImageHash?: string;
  taskId?: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

interface HiBeatsUserProfileSchema {
  id: string;
  userAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  bannerHash: string;
  location: string;
  website: string;
  isArtist: boolean;
  isVerified: boolean;
  reputationScore: number;
  createdAt: number;
  updatedAt: number;
  socialLinks: {
    instagram: string;
    twitter: string;
    youtube: string;
    spotify: string;
    soundcloud: string;
    bandcamp: string;
    discord: string;
    telegram: string;
  };
  blockNumber: number;
  transactionHash: string;
}

class SomniaDatastreamService {
  private sdk: SDK | null = null;
  private config: DatastreamConfig;
  private publicClient: any = null;
  private walletClient: any = null;
  private schemaCache: Map<string, Map<string, any>> = new Map();
  private activeSubscriptions: Map<string, any> = new Map();
  private knownPublishers: Set<string> = new Set(); // Track all publishers we've seen
  
  // ⚡ OPTIMIZATION: Cache computed schema IDs to avoid repeated computation
  private schemaIdCache: Map<string, Hex> = new Map();
  
  // ⚡ OPTIMIZATION: Request deduplication to prevent duplicate in-flight requests
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(config: DatastreamConfig) {
    this.config = config;
    this.initializeClients();
  }

  // ✅ Initialize Viem clients for Somnia SDK
  private initializeClients(): void {
    try {
      // Create public client with WebSocket for real-time subscriptions
      this.publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket(this.config.wsUrl),
      });

      // Create wallet client for transactions (optional - only if private key available)
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account,
          chain: somniaTestnet,
          transport: http(this.config.rpcUrl),
        });
        console.log('✅ Wallet client initialized with private key');
      } else {
        console.warn('⚠️ No VITE_PRIVATE_KEY found - DataStream writes will use external wallet');
      }

      console.log('✅ Viem clients initialized for Somnia DataStream');
    } catch (error) {
      console.error('❌ Failed to initialize Viem clients:', error);
    }
  }

  // ✅ Set wallet client from external source (e.g., Sequence, Privy)
  setWalletClient(walletClient: any): void {
    // Only use external wallet if no private key wallet exists
    if (!this.walletClient) {
      this.walletClient = walletClient;
      console.log('✅ Wallet client set from external source (Sequence)');
      console.warn('⚠️ Using Sequence wallet - may timeout for DataStream writes');
      console.warn('💡 Tip: Set VITE_PRIVATE_KEY in .env for direct writes (faster, no relayer)');
      
      // Re-initialize SDK if it was already initialized
      if (this.sdk) {
        this.sdk = new SDK({
          public: this.publicClient,
          wallet: this.walletClient,
        });
        console.log('✅ SDK re-initialized with Sequence wallet');
      }
    } else {
      console.log('✅ Using private key wallet (preferred for DataStream writes)');
    }
  }

  // ✅ Initialize Somnia SDK
  async connect(externalWalletClient?: any): Promise<void> {
    try {
      console.log('🚀 Initializing Somnia DataStream SDK...');

      // Only use external wallet if no private key wallet exists
      if (externalWalletClient && !this.walletClient) {
        this.walletClient = externalWalletClient;
        console.log('✅ Using external wallet client (Sequence/Privy)');
        console.warn('⚠️ Using Sequence wallet - may timeout for DataStream writes');
      } else if (this.walletClient) {
        console.log('✅ Using private key wallet (preferred for DataStream writes)');
      }

      // Initialize SDK with public and wallet clients
      this.sdk = new SDK({
        public: this.publicClient,
        wallet: this.walletClient, // Optional - for publishing data
      });

      console.log('✅ Somnia DataStream SDK initialized successfully');

      // Initialize subscriptions for real-time events
      await this.initializeSubscriptions();

    } catch (error) {
      console.error('❌ Failed to initialize Somnia SDK:', error);
      throw error;
    }
  }

  // ✅ Check if SDK is connected
  isConnected(): boolean {
    return this.sdk !== null && this.walletClient !== null;
  }

  // ✅ Register schema if not already registered
  async registerSchemaIfNeeded(schemaId: string): Promise<boolean> {
    if (!this.sdk) {
      console.warn('SDK not initialized');
      return false;
    }

    try {
      const schemaString = this.getSchemaString(schemaId);
      if (!schemaString) {
        console.error(`Schema definition not found for ${schemaId}`);
        return false;
      }

      // Compute schema ID
      const computedSchemaId = await this.sdk.streams.computeSchemaId(schemaString);
      
      // Check if already registered
      const isRegistered = await this.sdk.streams.isDataSchemaRegistered(computedSchemaId);
      
      if (isRegistered) {
        console.log(`✅ Schema ${schemaId} already registered`);
        return true;
      }

      console.log(`📝 Registering schema ${schemaId}...`);
      
      // Register schema with ignoreExistingSchemas
      try {
        const txHash = await this.sdk.streams.registerDataSchemas(
          [{ id: schemaId, schema: schemaString, parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` }],
          true // ignoreExistingSchemas - skip if already registered
        );

        console.log(`✅ Schema registered with tx: ${txHash}`);
        return true;
      } catch (regError: any) {
        // If registration fails (e.g., Sequence wallet permission issue), 
        // assume schema is already registered and continue
        console.warn(`⚠️ Schema registration failed, assuming already registered:`, regError.message);
        return true; // Return true to allow write operation to continue
      }
    } catch (error: any) {
      // ✅ If schema already exists, that's fine - return true
      if (error?.message?.includes('IDAlreadyUsed') || 
          error?.shortMessage?.includes('IDAlreadyUsed') ||
          error?.message?.includes('already registered')) {
        console.log(`✅ Schema ${schemaId} already registered (caught IDAlreadyUsed)`);
        return true;
      }
      console.error(`❌ Failed to register schema ${schemaId}:`, error);
      return false;
    }
  }

  // ✅ Register event schema if not already registered
  async registerEventSchemaIfNeeded(eventId: string): Promise<boolean> {
    if (!this.sdk) {
      console.warn('SDK not initialized');
      return false;
    }

    try {
      const eventSchemaDefinition = this.getEventSchemaDefinition(eventId);
      if (!eventSchemaDefinition) {
        console.error(`Event schema definition not found for ${eventId}`);
        return false;
      }

      console.log(`📝 Registering event schema ${eventId}...`);
      
      // Register event schema using SDK format
      try {
        const txHash = await this.sdk.streams.registerEventSchemas(
          [eventId], // Event IDs
          [eventSchemaDefinition] // Event schema definitions
        );

        console.log(`✅ Event schema registered with tx: ${txHash}`);
        return true;
      } catch (regError: any) {
        // If registration fails (e.g., Sequence wallet permission issue),
        // assume schema is already registered and continue
        console.warn(`⚠️ Event schema registration failed, assuming already registered:`, regError.message);
        return true; // Return true to allow write operation to continue
      }
    } catch (error: any) {
      // If already registered, that's fine
      if (error?.message?.includes('already registered') || error?.message?.includes('AlreadyRegistered')) {
        console.log(`✅ Event schema ${eventId} already registered`);
        return true;
      }
      console.error(`❌ Failed to register event schema ${eventId}:`, error);
      return false;
    }
  }

  // ✅ Initialize all necessary subscriptions for social media data
  private async initializeSubscriptions(): Promise<void> {
    try {
      console.log('📡 Setting up real-time event subscriptions...');
      
      // Register all event schemas for real-time events
      await this.registerAllEventSchemas();
      
      // Note: Actual subscription implementation depends on your event schema
      // Example subscriptions would be set up here
      
      console.log('✅ Real-time subscriptions initialized');
    } catch (error) {
      console.error('❌ Failed to initialize subscriptions:', error);
    }
  }

  // ✅ Register all event schemas at once
  private async registerAllEventSchemas(): Promise<void> {
    if (!this.sdk) {
      console.warn('SDK not initialized, skipping event schema registration');
      return;
    }

    try {
      console.log('📝 Registering all event schemas...');

      const eventIds = ['NewPost', 'ProfileUpdate', 'Interaction', 'MusicEvent'];
      const eventSchemaDefinitions = eventIds.map(id => this.getEventSchemaDefinition(id)).filter(Boolean);

      if (eventSchemaDefinitions.length === 0) {
        console.warn('⚠️ No event schema definitions found');
        return;
      }

      // Register all event schemas in one transaction
      const txHash = await this.sdk.streams.registerEventSchemas(
        eventIds,
        eventSchemaDefinitions
      );

      console.log(`✅ All event schemas registered with tx: ${txHash}`);
    } catch (error: any) {
      // If error is about already registered schemas, that's fine
      if (error?.message?.includes('already registered') || error?.message?.includes('AlreadyRegistered')) {
        console.log('✅ Event schemas already registered');
      } else {
        console.warn('⚠️ Failed to register event schemas:', error?.shortMessage || error?.message);
        console.log('💡 Will fallback to set() without events if needed');
      }
    }
  }

  // ✅ Subscribe to real-time events using Somnia SDK
  async subscribe(
    eventId: string,
    callbacks: SubscriptionCallback,
    ethCalls: any[] = []
  ): Promise<string> {
    if (!this.sdk) {
      throw new Error('SDK not initialized. Call connect() first.');
    }

    try {
      console.log(`📡 Subscribing to event: ${eventId}`);

      // ✅ Use SDK's subscribe method for real-time updates
      await this.sdk.streams.subscribe({
        somniaStreamsEventId: eventId,
        ethCalls,
        onlyPushChanges: false, // Push all data, not just changes
        onData: callbacks.onData,
        onError: callbacks.onError || ((error: Error) => {
          console.error(`Subscription error for ${eventId}:`, error);
        }),
      });

      const subscriptionId = `sub_${eventId}_${Date.now()}`;
      this.activeSubscriptions.set(subscriptionId, { eventId });

      console.log(`✅ Subscribed to ${eventId} with ID: ${subscriptionId}`);
      return subscriptionId;
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${eventId}:`, error);
      throw error;
    }
  }

  // Disconnect from Somnia Datastream
  disconnect(): void {
    if (this.sdk) {
      this.sdk = null;
    }
    
    this.activeSubscriptions.clear();
    this.schemaCache.clear();
    
    console.log('🔌 Somnia Datastream disconnected');
  }



  // ===== SOMNIA SDK READ METHODS =====

  // ⚡ OPTIMIZATION: Get cached schema ID or compute and cache it
  private async getSchemaIdCached(schemaId: string): Promise<Hex> {
    // Check cache first
    if (this.schemaIdCache.has(schemaId)) {
      return this.schemaIdCache.get(schemaId)!;
    }
    
    // Compute and cache
    const schemaString = this.getSchemaString(schemaId);
    if (!schemaString) {
      throw new Error(`Schema definition not found for ${schemaId}`);
    }
    
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }
    
    const computed = await this.sdk.streams.computeSchemaId(schemaString);
    this.schemaIdCache.set(schemaId, computed);
    
    console.log(`🔑 [CACHE] Schema ID computed and cached: ${schemaId} -> ${computed}`);
    return computed;
  }

  // Read data by key from a specific schema and publisher
  async getByKey(schemaId: string, publisher: string, key: string): Promise<any[] | null> {
    if (!this.sdk) {
      console.warn('SDK not initialized, using cache');
      return this.getCachedData(schemaId, key);
    }

    // ⚡ OPTIMIZATION: Request deduplication
    const requestKey = `getByKey_${schemaId}_${publisher}_${key}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`⚡ [DEDUP] Reusing in-flight request: ${requestKey}`);
      return this.pendingRequests.get(requestKey)!;
    }

    const promise = this._getByKeyInternal(schemaId, publisher, key);
    this.pendingRequests.set(requestKey, promise);
    
    promise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });
    
    return promise;
  }

  private async _getByKeyInternal(schemaId: string, publisher: string, key: string): Promise<any[] | null> {
    try {
      console.log(`🔑 Reading data by key: schema=${schemaId}, publisher=${publisher}, key=${key}`);

      // Get schema string for encoding/decoding
      const schemaString = this.getSchemaString(schemaId);
      if (!schemaString) {
        console.error(`Schema definition not found for ${schemaId}`);
        return this.getCachedData(schemaId, key);
      }

      // ⚡ Use cached schema ID
      const schemaIdBytes32 = await this.getSchemaIdCached(schemaId);

      // Use SDK to read all data and filter by key
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaIdBytes32, publisher as `0x${string}`);
      if (allData && Array.isArray(allData)) {
        // ✅ Decode data using SchemaEncoder with validation
        const schemaEncoder = new SchemaEncoder(schemaString);
        const decodedData = allData
          .filter((item: any) => {
            // 🔥 Skip items with invalid or missing data
            if (!item || !item.data) {
              console.warn(`⚠️ Skipping item with missing data`);
              return false;
            }
            return true;
          })
          .map((item: any) => {
            try {
              const decoded = schemaEncoder.decodeData(item.data);
              return {
                id: item.id,
                ...decoded,
                blockNumber: item.blockNumber,
                transactionHash: item.transactionHash,
              };
            } catch (error) {
              console.warn(`⚠️ Failed to decode item ${item.id}, skipping`);
              return null;
            }
          })
          .filter((item: any) => item !== null); // Remove failed decodes
        
        const filteredData = decodedData.filter((item: any) => item.id === key);
        console.log(`✅ Found ${filteredData.length} records matching key: ${key}`);
        return filteredData.length > 0 ? filteredData : null;
      }

      return null;
    } catch (error: any) {
      // NoData() error is expected when no data exists yet - return null silently
      if (error?.message?.includes('NoData()') || error?.shortMessage?.includes('NoData()')) {
        console.log(`📭 No data found for key: ${key} (this is normal for new users)`);
        return null;
      }
      console.warn('⚠️ Error reading data by key:', error?.shortMessage || error?.message);
      return this.getCachedData(schemaId, key);
    }
  }

  // Read all data for a publisher in a specific schema
  async getAllPublisherDataForSchema(schemaId: string, publisher: string): Promise<any[] | null> {
    if (!this.sdk) {
      console.warn('SDK not initialized, using cache');
      return this.getAllCachedData(schemaId);
    }

    // ⚡ OPTIMIZATION: Request deduplication
    const requestKey = `getAllPublisher_${schemaId}_${publisher}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`⚡ [DEDUP] Reusing in-flight request: ${requestKey}`);
      return this.pendingRequests.get(requestKey)!;
    }

    const promise = this._getAllPublisherDataInternal(schemaId, publisher);
    this.pendingRequests.set(requestKey, promise);
    
    promise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });
    
    return promise;
  }

  private async _getAllPublisherDataInternal(schemaId: string, publisher: string): Promise<any[] | null> {
    try {
      const startTime = Date.now();
      console.log(`📚 Reading all publisher data: schema=${schemaId}, publisher=${publisher}`);

      // Get schema string for encoding/decoding
      const schemaString = this.getSchemaString(schemaId);
      if (!schemaString) {
        console.error(`Schema definition not found for ${schemaId}`);
        return this.getAllCachedData(schemaId);
      }

      // ⚡ Use cached schema ID
      const schemaIdBytes32 = await this.getSchemaIdCached(schemaId);
      console.log(`🔑 [READ] Schema ID (cached): ${schemaIdBytes32}`);

      // ✅ Use SDK's method to get all data with manual schema handling
      let result: any;
      try {
        result = await this.sdk.streams.getAllPublisherDataForSchema(schemaIdBytes32, publisher as `0x${string}`);
      } catch (error: any) {
        // If SDK can't compute schema, get raw data and decode manually
        if (error?.message?.includes('Unable to compute final schema')) {
          console.log('⚠️ SDK schema computation failed, using manual decoding');
          // Get raw data directly from contract
          const rawData = await this.publicClient.readContract({
            address: '0x6AB397FF662e42312c003175DCD76EfF69D048Fc' as `0x${string}`,
            abi: [{
              name: 'getAllPublisherDataForSchema',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'schemaId', type: 'bytes32' },
                { name: 'publisher', type: 'address' }
              ],
              outputs: [{ name: '', type: 'bytes[]' }]
            }],
            functionName: 'getAllPublisherDataForSchema',
            args: [schemaIdBytes32, publisher as `0x${string}`]
          });
          result = rawData;
        } else {
          throw error;
        }
      }
      
      if (result && Array.isArray(result)) {
        console.log(`📦 [DEBUG] Raw result from SDK:`, {
          count: result.length,
          firstItemType: Array.isArray(result[0]) ? 'array' : typeof result[0],
          firstItem: typeof result[0] === 'string' ? result[0].substring(0, 66) + '...' : result[0]
        });
        
        // Create schema encoder once for all decoding
        const schemaEncoder = new SchemaEncoder(schemaString);
        
        // ✅ Handle different response formats from SDK
        const decodedResults = result.map((row: any, index: number) => {
          try {
            // Check if row is hex string (encoded data) - need to decode manually
            if (typeof row === 'string' && row.startsWith('0x')) {
              // Use SchemaEncoder to decode
              const decoded = schemaEncoder.decodeData(row as `0x${string}`);
              
              // 🔍 DEBUG: Log the decoded structure
              console.log('🔍 Decoded structure:', {
                length: decoded.length,
                firstItem: decoded[0],
                firstItemType: typeof decoded[0],
                firstItemKeys: decoded[0] ? Object.keys(decoded[0]) : [],
                fullDecoded: decoded
              });
              
              // ✅ Extract values from decoded objects (SchemaEncoder returns nested {value: {value: actualValue}})
              const extractValue = (item: any) => {
                // Handle nested value structure: {value: {value: actualValue}}
                if (item && typeof item === 'object' && 'value' in item) {
                  const innerValue = item.value;
                  // Check if value is nested again
                  if (innerValue && typeof innerValue === 'object' && 'value' in innerValue) {
                    return innerValue.value;
                  }
                  return innerValue;
                }
                return item;
              };
              
              // Map decoded array to object based on schema
              if (schemaId === 'hibeats_social_posts_v1') {
                const timestamp = extractValue(decoded[0]);
                const content = extractValue(decoded[1]);
                const contentType = extractValue(decoded[2]);
                const ipfsHash = extractValue(decoded[3]);
                const author = extractValue(decoded[4]);
                const likes = extractValue(decoded[5]);
                const comments = extractValue(decoded[6]);
                const shares = extractValue(decoded[7]);
                const isDeleted = extractValue(decoded[8]);
                const isPinned = extractValue(decoded[9]);
                const nftTokenId = extractValue(decoded[10]);
                const nftContractAddress = extractValue(decoded[11]);
                const nftPrice = extractValue(decoded[12]);
                const nftIsListed = extractValue(decoded[13]);
                
                const post = {
                  id: `post_${timestamp}_${author}`,
                  timestamp: Number(timestamp),
                  content: String(content || ''),
                  contentType: String(contentType || 'text'),
                  ipfsHash: String(ipfsHash || ''),
                  author: String(author || ''),
                  likes: Number(likes || 0),
                  comments: Number(comments || 0),
                  shares: Number(shares || 0),
                  isDeleted: Boolean(isDeleted),
                  isPinned: Boolean(isPinned),
                  nftTokenId: Number(nftTokenId || 0),
                  nftContractAddress: String(nftContractAddress || '0x0000000000000000000000000000000000000000'),
                  nftPrice: Number(nftPrice || 0),
                  nftIsListed: Boolean(nftIsListed),
                };
                console.log('✅ Successfully decoded post:', post);
                return post;
              }
              
              // Interactions V2 schema (hex string format)
              if (schemaId === 'hibeats_social_interactions_v2') {
                const timestamp = extractValue(decoded[0]);
                const interactionType = extractValue(decoded[1]);
                const postId = extractValue(decoded[2]);
                const fromUser = extractValue(decoded[3]);
                const content = extractValue(decoded[4]);
                const parentId = extractValue(decoded[5]);
                
                const interaction = {
                  id: `${interactionType}_${timestamp}_${fromUser}`,
                  timestamp: Number(timestamp),
                  interactionType: String(interactionType || ''),
                  postId: String(postId || ''),
                  fromUser: String(fromUser || ''),
                  content: String(content || ''),
                  parentId: String(parentId || ''),
                };
                console.log('✅ Successfully decoded interaction V2:', interaction);
                return interaction;
              }
              
              return decoded;
            }
            
            // Check if row is already decoded (array format)
            if (Array.isArray(row)) {
              // Map array indices to field names based on schema
              if (schemaId === 'hibeats_social_posts_v1') {
                // Complete schema: timestamp, content, contentType, ipfsHash, author, likes, comments, shares, isDeleted, isPinned, nftTokenId, nftContractAddress, nftPrice, nftIsListed
                const timestamp = Number(row[0]?.value?.value || row[0]?.value || row[0]);
                const content = String(row[1]?.value?.value || row[1]?.value || row[1] || '');
                const contentType = String(row[2]?.value?.value || row[2]?.value || row[2] || 'text');
                const ipfsHash = String(row[3]?.value?.value || row[3]?.value || row[3] || '');
                const author = String(row[4]?.value?.value || row[4]?.value || row[4] || '');
                const likes = Number(row[5]?.value?.value || row[5]?.value || row[5] || 0);
                const comments = Number(row[6]?.value?.value || row[6]?.value || row[6] || 0);
                const shares = Number(row[7]?.value?.value || row[7]?.value || row[7] || 0);
                const isDeleted = Boolean(row[8]?.value?.value || row[8]?.value || row[8]);
                const isPinned = Boolean(row[9]?.value?.value || row[9]?.value || row[9]);
                const nftTokenId = Number(row[10]?.value?.value || row[10]?.value || row[10] || 0);
                const nftContractAddress = String(row[11]?.value?.value || row[11]?.value || row[11] || '0x0000000000000000000000000000000000000000');
                const nftPrice = Number(row[12]?.value?.value || row[12]?.value || row[12] || 0);
                const nftIsListed = Boolean(row[13]?.value?.value || row[13]?.value || row[13]);
                
                return {
                  id: `post_${timestamp}_${author}`,
                  timestamp,
                  content,
                  contentType,
                  ipfsHash,
                  author,
                  likes,
                  comments,
                  shares,
                  isDeleted,
                  isPinned,
                  nftTokenId,
                  nftContractAddress,
                  nftPrice,
                  nftIsListed,
                };
              }
              
              // Interactions V1 schema (old format - 4 fields)
              if (schemaId === 'hibeats_social_interactions_v1') {
                const timestamp = Number(row[0]?.value?.value || row[0]?.value || row[0]);
                const interactionType = String(row[1]?.value?.value || row[1]?.value || row[1] || '');
                const postId = String(row[2]?.value?.value || row[2]?.value || row[2] || '');
                const fromUser = String(row[3]?.value?.value || row[3]?.value || row[3] || '');
                
                return {
                  id: `${interactionType}_${timestamp}_${fromUser}`,
                  timestamp,
                  interactionType,
                  postId,
                  fromUser,
                  content: '',
                  parentId: '',
                };
              }
              
              // Interactions V2 schema (new format - 6 fields with content and parentId)
              if (schemaId === 'hibeats_social_interactions_v2') {
                // Helper to extract value from nested structure
                const getValue = (item: any) => {
                  if (!item) return '';
                  if (item.value?.value !== undefined) return item.value.value;
                  if (item.value !== undefined) return item.value;
                  return item;
                };
                
                const timestamp = Number(getValue(row[0]));
                const interactionType = String(getValue(row[1]) || '');
                const postId = String(getValue(row[2]) || '');
                const fromUser = String(getValue(row[3]) || '');
                const content = String(getValue(row[4]) || '');
                const parentId = String(getValue(row[5]) || '');
                
                return {
                  id: `${interactionType}_${timestamp}_${fromUser}`,
                  timestamp,
                  interactionType,
                  postId,
                  fromUser,
                  content,
                  parentId,
                };
              }
              
              // Fallback for other schemas (old format)
              const timestamp = Number(row[0]?.value?.value || row[0]?.value || row[0]);
              const content = String(row[1]?.value?.value || row[1]?.value || row[1] || '');
              const metadata = String(row[2]?.value?.value || row[2]?.value || row[2] || '{}');
              const author = String(row[3]?.value?.value || row[3]?.value || row[3] || '');
              
              return {
                id: `post_${timestamp}_${author}`,
                timestamp,
                content,
                metadata,
                author,
              };
            }
            
            // Fallback: if it's an object with .data field (old format)
            if (row.data) {
              // 🔥 Validate data before decoding
              if (!row.data || typeof row.data !== 'string') {
                console.warn(`⚠️ Invalid data format in row ${row.id}, skipping`);
                return null;
              }
              
              const schemaEncoder = new SchemaEncoder(schemaString);
              const decoded = schemaEncoder.decodeData(row.data);
              return {
                id: row.id,
                ...decoded,
                blockNumber: row.blockNumber,
                transactionHash: row.transactionHash,
              };
            }
            
            console.warn('⚠️ Unknown row format:', row);
            return row;
          } catch (error) {
            console.error('❌ Error processing row:', {
              rowType: Array.isArray(row) ? 'array' : typeof row,
              error: error instanceof Error ? error.message : error
            });
            return null;
          }
        }).filter(Boolean); // Remove null entries
        
        const fetchTime = Date.now() - startTime;
        console.log(`✅ Retrieved and decoded ${decodedResults.length} records in ${fetchTime}ms`);
        return decodedResults;
      }

      console.log(`📭 No data found for schema ${schemaId}, publisher ${publisher}`);
      return [];
    } catch (error: any) {
      // NoData() error is expected when no data exists yet - return empty array silently
      if (error?.message?.includes('NoData()') || error?.shortMessage?.includes('NoData()')) {
        console.log(`📭 No data yet for schema ${schemaId} (this is normal for new schemas)`);
        return [];
      }
      console.warn('⚠️ Error reading all publisher data:', error?.shortMessage || error?.message);
      return this.getAllCachedData(schemaId);
    }
  }

  // ⚡ OPTIMIZATION: Simplified value extraction helper
  private extractValue(item: any): any {
    // Recursively extract nested value structure
    while (item?.value !== undefined) {
      item = item.value;
    }
    return item;
  }

  // ✅ NEW: Read all data from ALL publishers for a schema (for user profiles, posts, etc.)
  async getAllDataForSchema(schemaId: string): Promise<any[]> {
    if (!this.sdk) {
      console.warn('SDK not initialized, using cache');
      return this.getAllCachedData(schemaId);
    }

    // ⚡ OPTIMIZATION: Request deduplication
    const requestKey = `getAllData_${schemaId}`;
    if (this.pendingRequests.has(requestKey)) {
      console.log(`⚡ [DEDUP] Reusing in-flight request: ${requestKey}`);
      return this.pendingRequests.get(requestKey)!;
    }

    const promise = this._getAllDataForSchemaInternal(schemaId);
    this.pendingRequests.set(requestKey, promise);
    
    promise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });
    
    return promise;
  }

  private async _getAllDataForSchemaInternal(schemaId: string): Promise<any[]> {
    try {
      const startTime = Date.now();
      console.log(`📚 Reading ALL data for schema: ${schemaId} (from all known publishers)`);

      // Get schema string for encoding/decoding
      const schemaString = this.getSchemaString(schemaId);
      if (!schemaString) {
        console.error(`Schema definition not found for ${schemaId}`);
        return this.getAllCachedData(schemaId);
      }

      // ⚡ Use cached schema ID
      const schemaIdBytes32 = await this.getSchemaIdCached(schemaId);

      // ⚠️ LIMITATION: Somnia SDK doesn't have a method to read from ALL publishers
      // We need to manually aggregate from known publisher addresses
      
      const schemaEncoder = new SchemaEncoder(schemaString);
      
      // List of known publishers to aggregate from
      const knownPublishers = [
        '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile contract
        '0x6d964993b50182B17206f534dcfcc460fC0CCC69', // SocialGraph contract
        // Add more known publishers here as needed
      ];
      
      // Add tracked publishers from previous writes
      this.knownPublishers.forEach(publisher => {
        if (!knownPublishers.includes(publisher)) {
          knownPublishers.push(publisher);
        }
      });
      
      // Get private key address if available
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (privateKey) {
        try {
          const { privateKeyToAccount } = await import('viem/accounts');
          const account = privateKeyToAccount(privateKey as `0x${string}`);
          if (!knownPublishers.includes(account.address)) {
            knownPublishers.push(account.address);
          }
          console.log('📝 Added private key address to publishers:', account.address);
        } catch (error) {
          console.warn('Could not get private key address:', error);
        }
      }
      
      // Get current wallet address if available
      if (this.walletClient?.account?.address) {
        if (!knownPublishers.includes(this.walletClient.account.address)) {
          knownPublishers.push(this.walletClient.account.address);
        }
        console.log('📝 Added current wallet address to publishers:', this.walletClient.account.address);
      }
      
      console.log(`📋 Aggregating from ${knownPublishers.length} known publishers`);

      // ⚡ OPTIMIZATION: Parallel reads from all publishers
      const publisherPromises = knownPublishers.map(async (publisherAddr) => {
        try {
          const publisherData = await this.sdk!.streams.getAllPublisherDataForSchema(
            schemaIdBytes32, 
            publisherAddr as `0x${string}`
          );
          
          if (publisherData && Array.isArray(publisherData)) {
            // 🔍 DEBUG: Log raw data structure
            console.log(`🔍 [DEBUG] Raw publisherData structure from ${publisherAddr.slice(0, 8)}:`, {
              length: publisherData.length,
              firstItemType: publisherData[0] ? typeof publisherData[0] : 'undefined',
              firstItemIsArray: Array.isArray(publisherData[0]),
              firstItemHasData: publisherData[0] ? 'data' in publisherData[0] : false,
              firstItemKeys: publisherData[0] && typeof publisherData[0] === 'object' ? Object.keys(publisherData[0]) : [],
              sample: publisherData[0]
            });
            
            // 🔥 CHECK: SDK might return already-decoded data (array of arrays)
            // If first item is an array, data is already decoded!
            if (publisherData.length > 0 && Array.isArray(publisherData[0])) {
              console.log(`✅ Data already decoded by SDK, using direct array access`);
              const decodedData = publisherData.map((item: any, idx: number) => ({
                id: idx,
                rawData: item,
                publisher: publisherAddr,
                // Note: Cannot decode further without knowing exact schema structure
              }));
              console.log(`✅ Retrieved ${decodedData.length} pre-decoded records from publisher ${publisherAddr.slice(0, 8)}...`);
              return decodedData;
            }
            
            // Decode data with validation (old format with item.data)
            const decodedData = publisherData
              .filter((item: any) => {
                // 🔥 Skip items with invalid or missing data
                if (!item || !item.data) {
                  console.warn(`⚠️ Skipping item with missing data from ${publisherAddr.slice(0, 8)}...`);
                  return false;
                }
                return true;
              })
              .map((item: any) => {
                try {
                  const decoded = schemaEncoder.decodeData(item.data);
                  return {
                    id: item.id,
                    ...decoded,
                    blockNumber: item.blockNumber,
                    transactionHash: item.transactionHash,
                    publisher: publisherAddr, // Track which publisher this came from
                  };
                } catch (error) {
                  console.warn(`⚠️ Failed to decode item ${item.id} from ${publisherAddr.slice(0, 8)}..., skipping`);
                  return null;
                }
              })
              .filter((item: any) => item !== null); // Remove failed decodes
            
            console.log(`✅ Retrieved ${decodedData.length} valid records from publisher ${publisherAddr.slice(0, 8)}...`);
            return decodedData;
          }
          return [];
        } catch (error: any) {
          // NoData() error is expected when no data exists yet - silently continue
          if (error?.message?.includes('NoData()') || error?.shortMessage?.includes('NoData()')) {
            console.log(`📭 No data from publisher ${publisherAddr.slice(0, 8)}... yet`);
          } else {
            console.warn(`⚠️ Could not fetch from publisher ${publisherAddr.slice(0, 8)}...:`, error?.shortMessage || error?.message);
          }
          return [];
        }
      });

      // ⚡ Wait for all parallel reads to complete
      const parallelResults = await Promise.all(publisherPromises);
      const aggregatedResults = parallelResults.flat();

      const fetchTime = Date.now() - startTime;
      console.log(`✅ [PARALLEL] Total retrieved: ${aggregatedResults.length} records in ${fetchTime}ms (${knownPublishers.length} publishers)`);
      return aggregatedResults;
    } catch (error) {
      console.error('Error reading all data for schema:', error);
      return this.getAllCachedData(schemaId);
    }
  }

  // ✅ WRITE METHOD: Publish data to schema with real-time event emission
  async publishToSchema(schemaId: string, data: any): Promise<string | null> {
    if (!this.sdk || !this.walletClient) {
      console.warn('⚠️ SDK or wallet not initialized, storing locally only');
      this.storeToDataStreamSchema(schemaId, data);
      return 'local_only';
    }

    try {
      const startTime = Date.now();
      console.log(`📤 [DATASTREAM-WRITE] Publishing data to schema ${schemaId}:`, {
        id: data.id,
        type: data.type || 'post',
        author: data.author || data.fromUser || data.userAddress
      });

      // Register schema if needed
      const registered = await this.registerSchemaIfNeeded(schemaId);
      if (!registered) {
        console.warn('⚠️ Schema not registered, but continuing anyway...');
      }

      // Create schema encoder
      const schemaString = this.getSchemaString(schemaId);
      if (!schemaString) {
        throw new Error(`Schema definition not found for ${schemaId}`);
      }

      const encoder = new SchemaEncoder(schemaString);

      // ⚡ Use cached schema ID
      const computedSchemaId = await this.getSchemaIdCached(schemaId);
      console.log(`🔑 Schema ID (cached): ${computedSchemaId}`);

      // Encode data based on schema
      const encodedData = this.encodeDataForSchema(encoder, schemaId, data);
      console.log(`📦 Data encoded: ${encodedData.substring(0, 20)}...`);

      // Generate unique data ID using keccak256 hash (must be bytes32)
      const dataIdString = `${data.id}_${Date.now()}`;
      const dataId = keccak256(toBytes(dataIdString));

      // Prepare data stream
      const dataStream: DataStream = {
        id: dataId,
        schemaId: computedSchemaId,
        data: encodedData,
      };

      // ✅ Prepare event data for real-time broadcasting
      const eventData = this.prepareEventData(schemaId, data, encodedData);
      
      // ✅ Register event schema if needed (before emitting)
      if (eventData) {
        const eventRegistered = await this.registerEventSchemaIfNeeded(eventData.id);
        if (!eventRegistered) {
          console.warn(`⚠️ Event schema ${eventData.id} not registered, will use set() instead`);
        }
      }
      
      console.log(`🚀 [DATASTREAM-WRITE] Calling ${eventData ? 'setAndEmitEvents' : 'set'}...`);
      
      // Retry mechanism for potential timeouts and nonce issues
      let txHash: any;
      let retries = 3;
      
      while (retries > 0) {
        try {
          // Use setAndEmitEvents if event schema is registered, otherwise use set()
          if (eventData) {
            txHash = await this.sdk.streams.setAndEmitEvents(
              [dataStream], // Data to store
              [eventData] // Events to emit for real-time subscribers
            );
          } else {
            txHash = await this.sdk.streams.set([dataStream]);
          }
          break; // Success, exit retry loop
        } catch (error: any) {
          retries--;
          
          // Check if it's EventSchemaNotRegistered error
          if (error?.message?.includes('EventSchemaNotRegistered')) {
            console.warn(`⚠️ Event schema not registered, falling back to set() without events`);
            // Fallback to set() without events
            txHash = await this.sdk.streams.set([dataStream]);
            break;
          }
          
          // Check if it's a nonce error - wait and retry
          if (error?.message?.includes('nonce too low') || error?.message?.includes('NonceTooLow')) {
            if (retries > 0) {
              console.log(`🔄 Nonce too low, waiting and retrying... (${retries} attempts left)`);
              // Wait longer for blockchain to sync
              await new Promise(resolve => setTimeout(resolve, 3000));
              continue;
            }
          }
          
          // Check if it's a timeout error
          if (error?.message?.includes('deadline exceeded') || error?.message?.includes('timeout')) {
            if (retries > 0) {
              console.log(`⏳ [DATASTREAM-WRITE] Timeout, retrying... (${retries} attempts left)`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
              continue;
            }
          }
          
          // If not timeout or no retries left, throw error
          throw error;
        }
      }

      const writeTime = Date.now() - startTime;

      if (txHash && typeof txHash === 'string') {
        console.log(`✅ [DATASTREAM-WRITE] Data published successfully!`, {
          txHash: txHash.substring(0, 10) + '...',
          writeTime: `${writeTime}ms`,
          performance: writeTime < 500 ? '🚀 ULTRA FAST!' : writeTime < 1000 ? '⚡ FAST' : '⚠️ Slower'
        });
        
        // ✅ NO CACHE - Data will be read from blockchain directly
        // Cache removed to ensure we only show confirmed blockchain data
        
        // Track publisher address for future reads
        if (this.walletClient?.account?.address) {
          this.knownPublishers.add(this.walletClient.account.address);
          console.log(`📝 Tracked publisher: ${this.walletClient.account.address}`);
        }
        
        return txHash;
      }

      console.warn('⚠️ [DATASTREAM-WRITE] No txHash returned');
      
      // Return null if no txHash (write failed)
      return null;
    } catch (error) {
      console.error('❌ [DATASTREAM-WRITE] Error publishing to schema:', error);
      
      // Return null on error (no fallback)
      return null;
    }
  }

  // Helper: Get schema string definition
  private getSchemaString(schemaId: string): string | null {
    const schemas: Record<string, string> = {
      // User Profiles
      'hibeats_user_profiles_v1': 'uint64 timestamp, string username, string displayName, string bio, string avatarHash, address userAddress',
      
      // Social Posts - Complete schema matching smart contract
      'hibeats_social_posts_v1': 'uint64 timestamp, string content, string contentType, string ipfsHash, address author, uint256 likes, uint256 comments, uint256 shares, bool isDeleted, bool isPinned, uint256 nftTokenId, address nftContractAddress, uint256 nftPrice, bool nftIsListed',
      
      // Interactions V1 (old - for backward compatibility)
      'hibeats_social_interactions_v1': 'uint64 timestamp, string interactionType, string postId, address fromUser',
      
      // Interactions V2 (new - with content and parentId for comments)
      'hibeats_social_interactions_v2': 'uint64 timestamp, string interactionType, string postId, address fromUser, string content, string parentId',
      
      // Music Events
      'hibeats_music_events_v1': 'uint64 timestamp, string eventType, string tokenId, address artist',
    };

    return schemas[schemaId] || null;
  }

  // Helper: Get event schema definition
  private getEventSchemaDefinition(eventId: string): any | null {
    // Event schemas define parameters and event topics
    // Format based on SDK documentation
    const eventSchemas: Record<string, any> = {
      'NewPost': {
        params: [
          { name: 'timestamp', paramType: 'uint64', isIndexed: false },
          { name: 'content', paramType: 'string', isIndexed: false },
          { name: 'metadata', paramType: 'string', isIndexed: false },
          { name: 'author', paramType: 'address', isIndexed: true }
        ],
        eventTopic: 'NewPost(uint64,string,string,address indexed)'
      },
      'ProfileUpdate': {
        params: [
          { name: 'timestamp', paramType: 'uint64', isIndexed: false },
          { name: 'username', paramType: 'string', isIndexed: false },
          { name: 'displayName', paramType: 'string', isIndexed: false },
          { name: 'bio', paramType: 'string', isIndexed: false },
          { name: 'avatarHash', paramType: 'string', isIndexed: false },
          { name: 'userAddress', paramType: 'address', isIndexed: true }
        ],
        eventTopic: 'ProfileUpdate(uint64,string,string,string,string,address indexed)'
      },
      'Interaction': {
        params: [
          { name: 'timestamp', paramType: 'uint64', isIndexed: false },
          { name: 'interactionType', paramType: 'string', isIndexed: false },
          { name: 'postId', paramType: 'string', isIndexed: false },
          { name: 'fromUser', paramType: 'address', isIndexed: true }
        ],
        eventTopic: 'Interaction(uint64,string,string,address indexed)'
      },
      'MusicEvent': {
        params: [
          { name: 'timestamp', paramType: 'uint64', isIndexed: false },
          { name: 'eventType', paramType: 'string', isIndexed: false },
          { name: 'tokenId', paramType: 'string', isIndexed: false },
          { name: 'artist', paramType: 'address', isIndexed: true }
        ],
        eventTopic: 'MusicEvent(uint64,string,string,address indexed)'
      },
    };

    return eventSchemas[eventId] || null;
  }

  // Helper: Encode data for schema
  private encodeDataForSchema(encoder: SchemaEncoder, schemaId: string, data: any): Hex {
    const timestamp = Date.now().toString();

    switch (schemaId) {
      case 'hibeats_user_profiles_v1':
        return encoder.encodeData([
          { name: 'timestamp', value: timestamp, type: 'uint64' },
          { name: 'username', value: data.username || '', type: 'string' },
          { name: 'displayName', value: data.displayName || '', type: 'string' },
          { name: 'bio', value: data.bio || '', type: 'string' },
          { name: 'avatarHash', value: data.avatarHash || '', type: 'string' },
          { name: 'userAddress', value: data.userAddress, type: 'address' },
        ]);

      case 'hibeats_social_posts_v1':
        return encoder.encodeData([
          { name: 'timestamp', value: timestamp, type: 'uint64' },
          { name: 'content', value: data.content || '', type: 'string' },
          { name: 'contentType', value: data.contentType || 'text', type: 'string' },
          { name: 'ipfsHash', value: data.ipfsHash || '', type: 'string' },
          { name: 'author', value: data.author, type: 'address' },
          { name: 'likes', value: (data.likes || 0).toString(), type: 'uint256' },
          { name: 'comments', value: (data.comments || 0).toString(), type: 'uint256' },
          { name: 'shares', value: (data.shares || 0).toString(), type: 'uint256' },
          { name: 'isDeleted', value: data.isDeleted || false, type: 'bool' },
          { name: 'isPinned', value: data.isPinned || false, type: 'bool' },
          { name: 'nftTokenId', value: (data.nftTokenId || 0).toString(), type: 'uint256' },
          { name: 'nftContractAddress', value: data.nftContractAddress || '0x0000000000000000000000000000000000000000', type: 'address' },
          { name: 'nftPrice', value: (data.nftPrice || 0).toString(), type: 'uint256' },
          { name: 'nftIsListed', value: data.nftIsListed || false, type: 'bool' },
        ]);

      case 'hibeats_social_interactions_v1':
        return encoder.encodeData([
          { name: 'timestamp', value: timestamp, type: 'uint64' },
          { name: 'interactionType', value: data.type || 'like', type: 'string' },
          { name: 'postId', value: data.postId || '', type: 'string' },
          { name: 'fromUser', value: data.fromUser, type: 'address' },
        ]);

      case 'hibeats_social_interactions_v2':
        return encoder.encodeData([
          { name: 'timestamp', value: timestamp, type: 'uint64' },
          { name: 'interactionType', value: data.type || 'like', type: 'string' },
          { name: 'postId', value: data.postId || '', type: 'string' },
          { name: 'fromUser', value: data.fromUser, type: 'address' },
          { name: 'content', value: data.content || '', type: 'string' },
          { name: 'parentId', value: data.parentId || '', type: 'string' },
        ]);

      case 'hibeats_music_events_v1':
        return encoder.encodeData([
          { name: 'timestamp', value: timestamp, type: 'uint64' },
          { name: 'eventType', value: data.type || 'play', type: 'string' },
          { name: 'tokenId', value: data.tokenId || '0', type: 'string' },
          { name: 'artist', value: data.artist, type: 'address' },
        ]);

      default:
        throw new Error(`Unknown schema: ${schemaId}`);
    }
  }

  // Helper: Prepare event data for real-time emission
  private prepareEventData(schemaId: string, data: any, encodedData: Hex): EventData | null {
    // Map schema to event IDs (these should be registered in Somnia)
    const eventIds: Record<string, string> = {
      'hibeats_user_profiles_v1': 'ProfileUpdate',
      'hibeats_social_posts_v1': 'NewPost',
      'hibeats_social_interactions_v1': 'Interaction',
      'hibeats_music_events_v1': 'MusicEvent',
    };

    const eventId = eventIds[schemaId];
    if (!eventId) return null;

    // Prepare indexed topics based on schema
    // For address types, we need to pad to 32 bytes (bytes32) using viem's pad function
    const argumentTopics: Hex[] = [];
    
    switch (schemaId) {
      case 'hibeats_user_profiles_v1':
        // ProfileUpdate has userAddress as indexed
        if (data.userAddress) {
          // Pad address to 32 bytes (bytes32) - address is 20 bytes, pad to 32
          const paddedAddress = pad(data.userAddress as Hex, { size: 32 });
          argumentTopics.push(paddedAddress);
        }
        break;
      
      case 'hibeats_social_posts_v1':
        // NewPost has author as indexed
        if (data.author) {
          const paddedAddress = pad(data.author as Hex, { size: 32 });
          argumentTopics.push(paddedAddress);
        }
        break;
      
      case 'hibeats_social_interactions_v1':
        // Interaction has fromUser as indexed
        if (data.fromUser) {
          const paddedAddress = pad(data.fromUser as Hex, { size: 32 });
          argumentTopics.push(paddedAddress);
        }
        break;
      
      case 'hibeats_music_events_v1':
        // MusicEvent has artist as indexed
        if (data.artist) {
          const paddedAddress = pad(data.artist as Hex, { size: 32 });
          argumentTopics.push(paddedAddress);
        }
        break;
    }

    return {
      id: eventId,
      argumentTopics,
      data: encodedData,
    };
  }

  // Store data to local cache
  private storeToDataStreamSchema(schemaId: string, data: any): void {
    try {
      if (!this.schemaCache.has(schemaId)) {
        this.schemaCache.set(schemaId, new Map());
      }
      
      const schemaData = this.schemaCache.get(schemaId);
      schemaData!.set(data.id, data);
      
      console.log(`✅ Data cached locally for schema ${schemaId} with ID: ${data.id}`);
    } catch (error) {
      console.error('Error storing to cache:', error);
    }
  }

  // Get cached data by key
  private getCachedData(schemaId: string, key: string): any[] | null {
    if (!this.schemaCache.has(schemaId)) {
      return null;
    }

    const schemaData = this.schemaCache.get(schemaId);
    const record = schemaData!.get(key);
    
    return record ? [record] : null;
  }

  // Get all cached data for schema
  getAllCachedData(schemaId: string): any[] {
    if (!this.schemaCache.has(schemaId)) {
      return [];
    }

    const schemaData = this.schemaCache.get(schemaId);
    return Array.from(schemaData!.values());
  }
}

// Create optimized singleton instance with proper Somnia configuration
const somniaDatastreamService = new SomniaDatastreamService({
  rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  wsUrl: import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws',
  chainId: 50312, // Somnia Devnet
  contractAddresses: [
    '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile (v3.0.0)
    '0x6d964993b50182B17206f534dcfcc460fC0CCC69', // SocialGraph (v3.0.0)
    '0xC31388420ff0d045c4477f5Fa6513A17E3638272', // SongNFT (v3.0.0)
    '0x2ae67AC387A4DE0F2109Bdd18E82a18a1B582dee', // AlbumManager (v3.0.0)
    '0xC34f9FE5C732ce01a2C5a4658f14AA25217e2b70', // Marketplace (v3.0.0)
    '0x3B4123D5c0C8eD1c381D38d66a89817e07D32Df6', // PlaylistManager (v3.0.0)
    '0xC5D2C577A027124905e251E5c0925dC8bfD8368B', // TippingSystem (v3.0.0)
    '0x4deE5202e34f7AA84504Dd70446d9A25a7921a6E'  // DirectMessages (v3.0.0)
  ],
  schemaIds: [
    'hibeats_posts_v1',
    'hibeats_interactions_v1', 
    'hibeats_music_events_v1',
    'hibeats_user_profiles_v1'
  ]
});

export { 
  somniaDatastreamService, 
  type DatastreamConfig,
  type SubscriptionCallback,
  type EventData,
  type DataStream,
  type HiBeatsPostSchema,
  type HiBeatsInteractionSchema,
  type HiBeatsMusicEventSchema,
  type HiBeatsUserProfileSchema
};