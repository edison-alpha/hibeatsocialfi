/**
 * Somnia Datastream Service V3
 * 
 * Optimized service layer untuk skema V3
 * - Simplified API
 * - Better caching
 * - Faster performance
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, type Hex, numberToHex, pad } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from '@/lib/web3-config';
import {
  SOMNIA_CONFIG_V3,
  PostDataV3,
  InteractionDataV3,
  ProfileDataV3,
  ContentType,
  InteractionType,
  TargetType,
  createPostId,
  aggregateInteractions,
  enrichPostsWithQuotes,
  buildCommentTree,
  PostStats,
  validatePostData,
  validateInteractionData,
  GeneratedMusicData,
  GeneratedMusicStatus,
  PlayEventData,
  ActivityHistoryData,
  ActivityHistoryType,
} from '@/config/somniaDataStreams.v3';
import { transactionQueue } from './nonceManager';

// Helper function to convert number to bytes32 (Hex)
function numberToBytes32(num: number): Hex {
  return pad(numberToHex(num), { size: 32 });
}

class SomniaDatastreamServiceV3 {
  private sdk: SDK | null = null;
  private publicClient: any = null;
  private walletClient: any = null;
  
  // Caching
  private schemaIdCache: Map<string, Hex> = new Map();
  private dataCache: Map<string, { data: any[]; timestamp: number }> = new Map();
  private cacheExpiry = 30000; // 30 seconds
  
  // Request deduplication
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private initPromise: Promise<void> | null = null;

  constructor() {
    // Auto-initialize on construction
    this.initPromise = this.initialize();
  }

  // ===== INITIALIZATION =====

  private async initialize(): Promise<void> {
    try {
      // Initialize clients
      this.publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: webSocket(SOMNIA_CONFIG_V3.wsUrl),
      });

      // Wallet client (if private key available)
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account,
          chain: somniaTestnet,
          transport: http(SOMNIA_CONFIG_V3.rpcUrl),
        });
        console.log('✅ [V3] Wallet client initialized');
      }

      console.log('✅ [V3] Viem clients initialized');

      // Initialize SDK
      console.log('🚀 [V3] Initializing Somnia DataStream SDK...');
      this.sdk = new SDK({
        public: this.publicClient,
        wallet: this.walletClient,
      });

      console.log('✅ [V3] SDK initialized successfully');
    } catch (error) {
      console.error('❌ [V3] Failed to initialize:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    // Wait for initialization to complete
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }
  }

  isConnected(): boolean {
    return this.sdk !== null;
  }

  /**
   * Get total count of posts for current publisher
   */
  async getPostCount(): Promise<number> {
    await this.ensureInitialized();
    
    try {
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('posts');
      
      // Use getAllPublisherDataForSchema and count length
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
      const count = allData.length;
      
      console.log(`📊 [V3] Total posts in blockchain: ${count}`, {
        publisher,
        schemaId
      });
      
      return count;
    } catch (error) {
      console.error('❌ [V3] Failed to get post count:', error);
      return 0;
    }
  }

  // ===== SCHEMA MANAGEMENT =====

  private async getSchemaIdCached(schemaName: keyof typeof SOMNIA_CONFIG_V3.schemas): Promise<Hex> {
    await this.ensureInitialized();
    
    const schemaKey = SOMNIA_CONFIG_V3.schemas[schemaName];
    
    if (this.schemaIdCache.has(schemaKey)) {
      return this.schemaIdCache.get(schemaKey)!;
    }
    
    const schemaString = SOMNIA_CONFIG_V3.schemaStrings[schemaName];
    const computed = await this.sdk.streams.computeSchemaId(schemaString);
    this.schemaIdCache.set(schemaKey, computed);
    
    console.log(`🔑 [V3] Schema ID cached: ${schemaName} -> ${computed}`);
    return computed;
  }

  // ===== READ OPERATIONS (ULTRA-OPTIMIZED) =====

  /**
   * Get posts using index-based pagination (FASTEST METHOD)
   * 
   * Uses getBetweenRange for O(1) pagination instead of loading all data
   * Performance: ~50-100ms for 20 posts (vs ~500ms loading all)
   */
  async getPostsPaginated(page: number = 0, pageSize: number = 20): Promise<PostDataV3[]> {
    await this.ensureInitialized();

    try {
      const startTime = Date.now();
      const startIndex = BigInt(page * pageSize);
      const endIndex = BigInt((page + 1) * pageSize);
      
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('posts');
      
      console.log(`📚 [V3] Loading posts ${startIndex}-${endIndex} (page ${page})...`, {
        publisher,
        schemaId
      });
      
      // ⚡ Use getAllPublisherDataForSchema and slice (getBetweenRange has issues)
      console.log('📊 [V3] Using getAllPublisherDataForSchema...');
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
      console.log(`✅ [V3] Got ${allData.length} total posts from blockchain`);
      
      const rawData = allData.slice(Number(startIndex), Number(endIndex));
      console.log(`📄 [V3] Sliced to ${rawData.length} posts for page ${page}`);

      if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        console.log('📭 [V3] No posts found in range');
        return [];
      }

      // Helper function to safely extract value
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        
        // Try nested value.value first
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        
        // Direct value
        return item;
      };

      // Helper to safely convert to string
      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          console.warn('⚠️ [V3] Object detected, using default:', value);
          return defaultValue;
        }
        return String(value);
      };

      // Helper to safely convert to number
      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') {
          console.warn('⚠️ [V3] Object detected for number, using default:', value);
          return defaultValue;
        }
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Decode data - SDK returns already decoded data with nested structure
      const posts: PostDataV3[] = [];
      
      for (let idx = 0; idx < rawData.length; idx++) {
        try {
          const item = rawData[idx];
          
          // Skip empty or invalid data
          if (!item || !Array.isArray(item) || item.length === 0) {
            console.warn('⚠️ [V3] Skipping invalid post record (empty data)');
            continue;
          }

          // Access nested value.value for decoded data - V6 (18 fields)
          const id = safeNumber(safeExtractValue(item[0]));
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const content = safeString(safeExtractValue(item[2]));
          const contentType = safeNumber(safeExtractValue(item[3]), 0);
          const mediaHashes = safeString(safeExtractValue(item[4])); // V6
          const author = safeString(safeExtractValue(item[5]));
          const quotedPostId = safeNumber(safeExtractValue(item[6]), 0); // V6: uint256
          const replyToId = safeNumber(safeExtractValue(item[7]), 0); // V6
          const mentions = safeString(safeExtractValue(item[8])); // V6
          const collectModule = safeString(safeExtractValue(item[9]), '0x0000000000000000000000000000000000000000'); // V6
          const collectPrice = safeNumber(safeExtractValue(item[10]), 0); // V6
          const collectLimit = safeNumber(safeExtractValue(item[11]), 0); // V6
          const collectCount = safeNumber(safeExtractValue(item[12]), 0); // V6
          const isGated = Boolean(safeExtractValue(item[13])); // V6
          const referrer = safeString(safeExtractValue(item[14]), '0x0000000000000000000000000000000000000000'); // V6
          const nftTokenId = safeNumber(safeExtractValue(item[15]), 0);
          const isDeleted = Boolean(safeExtractValue(item[16]));
          const isPinned = Boolean(safeExtractValue(item[17]));
          
          posts.push({
            id,
            index: Number(startIndex) + idx,
            timestamp,
            content,
            contentType: contentType as ContentType,
            mediaHashes,
            author,
            quotedPostId,
            replyToId,
            mentions,
            collectModule,
            collectPrice,
            collectLimit,
            collectCount,
            isGated,
            referrer,
            nftTokenId,
            isDeleted,
            isPinned,
          });
        } catch (decodeError: any) {
          console.warn('⚠️ [V3] Failed to decode post record, skipping:', decodeError.message);
          continue;
        }
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Loaded ${posts.length} posts in ${loadTime}ms (index-based)`);

      return posts;
    } catch (error: any) {
      // Handle InvalidSize error - fallback to getAllPublisherDataForSchema
      if (error?.message?.includes('InvalidSize()')) {
        console.log('⚠️ [V3] InvalidSize error, falling back to getAllPublisherDataForSchema');
        try {
          const privateKey = import.meta.env.VITE_PRIVATE_KEY;
          const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
          
          if (!publisher) {
            throw new Error('Publisher address not found');
          }

          const schemaId = await this.getSchemaIdCached('posts');
          const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
          console.log(`📊 [V3] Got ${allData.length} total posts, slicing ${page * pageSize}-${(page + 1) * pageSize}`);
          
          const slicedData = allData.slice(page * pageSize, (page + 1) * pageSize);
          
          // Helper function to safely extract value
          const safeExtractValue = (item: any, defaultValue: any = '') => {
            if (!item) return defaultValue;
            if (item.value !== undefined) {
              if (typeof item.value === 'object' && item.value.value !== undefined) {
                return item.value.value;
              }
              return item.value;
            }
            return item;
          };

          const safeString = (value: any, defaultValue: string = ''): string => {
            if (value === null || value === undefined) return defaultValue;
            if (typeof value === 'string') return value;
            if (typeof value === 'object') return defaultValue;
            return String(value);
          };

          const safeNumber = (value: any, defaultValue: number = 0): number => {
            if (value === null || value === undefined) return defaultValue;
            if (typeof value === 'number') return value;
            if (typeof value === 'bigint') return Number(value);
            if (typeof value === 'object') return defaultValue;
            const num = Number(value);
            return isNaN(num) ? defaultValue : num;
          };
          
          // Decode data - V6 (18 fields)
          const posts: PostDataV3[] = slicedData.map((item: any, idx: number) => {
            const id = safeNumber(safeExtractValue(item[0]));
            const timestamp = safeNumber(safeExtractValue(item[1]));
            const content = safeString(safeExtractValue(item[2]));
            const contentType = safeNumber(safeExtractValue(item[3]), 0);
            const mediaHashes = safeString(safeExtractValue(item[4]));
            const author = safeString(safeExtractValue(item[5]));
            const quotedPostId = safeNumber(safeExtractValue(item[6]), 0);
            const replyToId = safeNumber(safeExtractValue(item[7]), 0);
            const mentions = safeString(safeExtractValue(item[8]));
            const collectModule = safeString(safeExtractValue(item[9]), '0x0000000000000000000000000000000000000000');
            const collectPrice = safeNumber(safeExtractValue(item[10]), 0);
            const collectLimit = safeNumber(safeExtractValue(item[11]), 0);
            const collectCount = safeNumber(safeExtractValue(item[12]), 0);
            const isGated = Boolean(safeExtractValue(item[13]));
            const referrer = safeString(safeExtractValue(item[14]), '0x0000000000000000000000000000000000000000');
            const nftTokenId = safeNumber(safeExtractValue(item[15]), 0);
            const isDeleted = Boolean(safeExtractValue(item[16]));
            const isPinned = Boolean(safeExtractValue(item[17]));
            
            return {
              id,
              index: page * pageSize + idx,
              timestamp,
              content,
              contentType: contentType as ContentType,
              mediaHashes,
              author,
              quotedPostId,
              replyToId,
              mentions,
              collectModule,
              collectPrice,
              collectLimit,
              collectCount,
              isGated,
              referrer,
              nftTokenId,
              isDeleted,
              isPinned,
            };
          });
          
          console.log(`✅ [V3] Loaded ${posts.length} posts using fallback method`);
          return posts;
        } catch (fallbackError) {
          console.error('❌ [V3] Fallback also failed:', fallbackError);
          return [];
        }
      }
      
      console.error('❌ [V3] Failed to load posts:', error);
      return [];
    }
  }

  /**
   * Get all posts (fallback method, use getPostsPaginated instead)
   */
  async getAllPosts(limit?: number, offset = 0): Promise<PostDataV3[]> {
    const cacheKey = 'all_posts';
    
    // Check cache
    const cached = this.dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('⚡ [V3] Using cached posts');
      const posts = cached.data as PostDataV3[];
      return limit ? posts.slice(offset, offset + limit) : posts;
    }
    
    // Deduplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⚡ [V3] Reusing in-flight request');
      return this.pendingRequests.get(cacheKey)!;
    }
    
    const promise = this._getAllPostsInternal();
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const posts = await promise;
      
      // Cache result
      this.dataCache.set(cacheKey, { data: posts, timestamp: Date.now() });
      
      return limit ? posts.slice(offset, offset + limit) : posts;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async _getAllPostsInternal(): Promise<PostDataV3[]> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      const startTime = Date.now();
      console.log('📚 [V3] Loading all posts...');

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('posts');
      const rawData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!rawData || rawData.length === 0) {
        console.log('📭 [V3] No posts found');
        return [];
      }

      // Helper functions for safe extraction
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Decode data - SDK returns already decoded data with nested structure - V6 (18 fields)
      const posts: PostDataV3[] = rawData.map((item: any, idx: number) => {
        const id = safeNumber(safeExtractValue(item[0]));
        const timestamp = safeNumber(safeExtractValue(item[1]));
        const content = safeString(safeExtractValue(item[2]));
        const contentType = safeNumber(safeExtractValue(item[3]), 0);
        const mediaHashes = safeString(safeExtractValue(item[4]));
        const author = safeString(safeExtractValue(item[5]));
        const quotedPostId = safeNumber(safeExtractValue(item[6]), 0);
        const replyToId = safeNumber(safeExtractValue(item[7]), 0);
        const mentions = safeString(safeExtractValue(item[8]));
        const collectModule = safeString(safeExtractValue(item[9]), '0x0000000000000000000000000000000000000000');
        const collectPrice = safeNumber(safeExtractValue(item[10]), 0);
        const collectLimit = safeNumber(safeExtractValue(item[11]), 0);
        const collectCount = safeNumber(safeExtractValue(item[12]), 0);
        const isGated = Boolean(safeExtractValue(item[13]));
        const referrer = safeString(safeExtractValue(item[14]), '0x0000000000000000000000000000000000000000');
        const nftTokenId = safeNumber(safeExtractValue(item[15]), 0);
        const isDeleted = Boolean(safeExtractValue(item[16]));
        const isPinned = Boolean(safeExtractValue(item[17]));
        
        return {
          id,
          index: idx,
          timestamp,
          content,
          contentType: contentType as ContentType,
          mediaHashes,
          author,
          quotedPostId,
          replyToId,
          mentions,
          collectModule,
          collectPrice,
          collectLimit,
          collectCount,
          isGated,
          referrer,
          nftTokenId,
          isDeleted,
          isPinned,
        };
      });

      // Sort by timestamp (newest first)
      posts.sort((a, b) => b.timestamp - a.timestamp);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Loaded ${posts.length} posts in ${loadTime}ms`);

      return posts;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No posts found (NoData)');
        return [];
      }
      console.error('❌ [V3] Failed to load posts:', error);
      throw error;
    }
  }

  /**
   * Get all interactions (with optional filtering)
   */
  async getAllInteractions(targetIds?: string[]): Promise<InteractionDataV3[]> {
    const cacheKey = targetIds ? `interactions_${targetIds.join(',')}` : 'all_interactions';
    
    // Check cache (PENTING: Jangan gunakan cache untuk all_interactions agar selalu fresh dari blockchain)
    const cached = this.dataCache.get(cacheKey);
    const shouldUseCache = targetIds && targetIds.length > 0; // Only cache filtered interactions
    
    if (shouldUseCache && cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('⚡ [V3] Using cached interactions');
      return cached.data as InteractionDataV3[];
    }
    
    // Deduplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⚡ [V3] Reusing in-flight request');
      return this.pendingRequests.get(cacheKey)!;
    }
    
    const promise = this._getAllInteractionsInternal(targetIds);
    this.pendingRequests.set(cacheKey, promise);
    
    try {
      const interactions = await promise;
      
      // Cache result (only if filtered)
      if (shouldUseCache) {
        this.dataCache.set(cacheKey, { data: interactions, timestamp: Date.now() });
      }
      
      return interactions;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async _getAllInteractionsInternal(targetIds?: string[]): Promise<InteractionDataV3[]> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      const startTime = Date.now();
      console.log('📚 [V3] Loading interactions...');

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('interactions');
      const rawData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!rawData || rawData.length === 0) {
        console.log('📭 [V3] No interactions found');
        return [];
      }

      // Helper function to safely extract value
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Decode data with error handling for invalid records
      // SDK returns already decoded data with nested structure (like posts)
      let interactions: InteractionDataV3[] = [];
      
      for (const item of rawData) {
        try {
          // Skip empty or invalid data
          if (!item || !Array.isArray(item) || item.length === 0) {
            console.warn('⚠️ [V3] Skipping invalid interaction record (empty data)');
            continue;
          }

          // Access nested value.value for decoded data V6 (9 fields)
          const id = safeNumber(safeExtractValue(item[0]));
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const interactionType = safeNumber(safeExtractValue(item[2]), 0);
          const targetId = safeNumber(safeExtractValue(item[3]), 0); // V6: uint256
          const targetType = safeNumber(safeExtractValue(item[4]), 0);
          const fromUser = safeString(safeExtractValue(item[5]));
          const content = safeString(safeExtractValue(item[6]));
          const parentId = safeNumber(safeExtractValue(item[7]), 0); // V6: uint256
          const tipAmount = safeNumber(safeExtractValue(item[8]), 0); // V6: Tipping
          
          // Debug log untuk interaction pertama
          if (interactions.length === 0) {
            console.log('🔍 [V3] First interaction decoded:', {
              decoded: {
                timestamp,
                interactionType: InteractionType[interactionType],
                targetId,
                targetType: TargetType[targetType],
                fromUser: fromUser.substring(0, 10) + '...',
                content: content.substring(0, 30),
                parentId
              }
            });
          }
          
          interactions.push({
            id,
            timestamp,
            interactionType: interactionType as InteractionType,
            targetId,
            targetType: targetType as TargetType,
            fromUser,
            content,
            parentId,
            tipAmount, // V6
          });
        } catch (decodeError: any) {
          console.warn('⚠️ [V3] Failed to decode interaction record, skipping:', decodeError.message);
          continue;
        }
      }

      // Filter by targetIds if provided (convert to number for comparison)
      if (targetIds && targetIds.length > 0) {
        const targetIdsNum = targetIds.map(id => typeof id === 'string' ? parseInt(id) : id);
        interactions = interactions.filter(i => targetIdsNum.includes(i.targetId));
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Loaded ${interactions.length} interactions in ${loadTime}ms`);

      return interactions;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No interactions found (NoData)');
        return [];
      }
      console.error('❌ [V3] Failed to load interactions:', error);
      throw error;
    }
  }

  // ===== WRITE OPERATIONS (BATCH-OPTIMIZED) =====

  private writeBatch: Array<{ schemaId: Hex; id: Hex; data: Hex }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  /**
   * Flush batch writes to blockchain
   * 
   * Combines multiple writes into single transaction for efficiency
   */
  private async flushBatch(): Promise<string[]> {
    if (this.writeBatch.length === 0) return [];
    
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    // Use transaction queue to prevent nonce conflicts
    return transactionQueue.enqueue(async () => {
      const batch = [...this.writeBatch];
      this.writeBatch = [];
      
      console.log(`📦 [V3] Flushing batch of ${batch.length} writes...`);
      const startTime = Date.now();

      // ⚡ Single transaction for all writes
      const txHash = await this.sdk.streams.set(batch);

      const flushTime = Date.now() - startTime;
      console.log(`✅ [V3] Batch flushed in ${flushTime}ms:`, txHash);

      // Invalidate caches
      this.dataCache.clear();

      return [txHash];
    });
  }

  /**
   * Add write to batch (auto-flushes after delay)
   */
  private addToBatch(schemaId: Hex, id: Hex, data: Hex): void {
    this.writeBatch.push({ schemaId, id, data });

    // Auto-flush after delay or when batch is full
    if (this.writeBatch.length >= SOMNIA_CONFIG_V3.performance.batchSize) {
      this.flushBatch();
    } else {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, SOMNIA_CONFIG_V3.performance.batchDelay);
    }
  }

  /**
   * Create a new post (batched)
   */
  async createPost(postData: Partial<PostDataV3>, immediate: boolean = false): Promise<number> {
    await this.ensureInitialized();
    
    if (!validatePostData(postData)) {
      throw new Error('Invalid post data');
    }

    if (!postData.author) {
      throw new Error('Author is required');
    }

    try {
      console.log('📝 [V3] Creating post...', postData);

      const schemaId = await this.getSchemaIdCached('posts');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.posts);

      // Generate ID if not provided
      const timestamp = postData.timestamp || Date.now();
      const author = postData.author;
      const postId = postData.id || createPostId(author, timestamp);

      // Encode data using SDK format V6 (18 fields)
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: postId.toString(), type: 'uint256' },
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'content', value: postData.content || '', type: 'string' },
        { name: 'contentType', value: (postData.contentType ?? ContentType.TEXT).toString(), type: 'uint8' },
        { name: 'mediaHashes', value: postData.mediaHashes || '', type: 'string' }, // V6: Multiple media
        { name: 'author', value: author, type: 'address' },
        { name: 'quotedPostId', value: (postData.quotedPostId || 0).toString(), type: 'uint256' }, // V6: uint256
        { name: 'replyToId', value: (postData.replyToId || 0).toString(), type: 'uint256' }, // V6: Threading
        { name: 'mentions', value: postData.mentions || '', type: 'string' }, // V6: Mentions
        { name: 'collectModule', value: postData.collectModule || '0x0000000000000000000000000000000000000000', type: 'address' }, // V6: Monetization
        { name: 'collectPrice', value: (postData.collectPrice || 0).toString(), type: 'uint256' }, // V6: Monetization
        { name: 'collectLimit', value: (postData.collectLimit || 0).toString(), type: 'uint32' }, // V6: Monetization
        { name: 'collectCount', value: (postData.collectCount || 0).toString(), type: 'uint32' }, // V6: Monetization
        { name: 'isGated', value: postData.isGated || false, type: 'bool' }, // V6: Gated content
        { name: 'referrer', value: postData.referrer || '0x0000000000000000000000000000000000000000', type: 'address' }, // V6: Referral
        { name: 'nftTokenId', value: (postData.nftTokenId || 0).toString(), type: 'uint32' },
        { name: 'isDeleted', value: postData.isDeleted || false, type: 'bool' },
        { name: 'isPinned', value: postData.isPinned || false, type: 'bool' },
      ]);

      // Convert number ID to bytes32
      const postIdHex = numberToBytes32(postId);

      if (immediate) {
        // Immediate write (use transaction queue to prevent nonce conflicts)
        console.log('📤 [V3] Writing post to blockchain...', {
          schemaId,
          postId,
          author,
          content: postData.content?.substring(0, 50)
        });
        
        // Use transaction queue to ensure sequential execution
        await transactionQueue.enqueue(async () => {
          const txHash = await this.sdk.streams.set([{
            schemaId,
            id: postIdHex,
            data: encodedData,
          }]);
          
          console.log('✅ [V3] Post written to blockchain!', {
            txHash,
            postId,
            schemaId
          });
          
          this.dataCache.delete('all_posts');
          return txHash;
        });
        
        return postId;
      } else {
        // Add to batch (faster, but delayed)
        this.addToBatch(schemaId, postIdHex, encodedData);
        console.log('✅ [V3] Post added to batch (not yet written to blockchain)');
        console.log('💡 [V3] Click "Flush Batch" to write to blockchain');
        return postId;
      }
    } catch (error) {
      console.error('❌ [V3] Failed to create post:', error);
      throw error;
    }
  }

  /**
   * Delete a post (soft delete by setting isDeleted = true)
   */
  async deletePost(postId: number, postData: PostDataV3): Promise<void> {
    await this.ensureInitialized();

    if (!postData.author) {
      throw new Error('Author is required');
    }

    try {
      console.log('🗑️ [V3] Deleting post...', postId);

      const schemaId = await this.getSchemaIdCached('posts');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.posts);

      // Encode data with isDeleted = true (keep all other fields the same)
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: postId.toString(), type: 'uint256' },
        { name: 'timestamp', value: postData.timestamp.toString(), type: 'uint256' },
        { name: 'content', value: postData.content || '', type: 'string' },
        { name: 'contentType', value: postData.contentType.toString(), type: 'uint8' },
        { name: 'mediaHashes', value: postData.mediaHashes || '', type: 'string' },
        { name: 'author', value: postData.author, type: 'address' },
        { name: 'quotedPostId', value: (postData.quotedPostId || 0).toString(), type: 'uint256' },
        { name: 'replyToId', value: (postData.replyToId || 0).toString(), type: 'uint256' },
        { name: 'mentions', value: postData.mentions || '', type: 'string' },
        { name: 'collectModule', value: postData.collectModule || '0x0000000000000000000000000000000000000000', type: 'address' },
        { name: 'collectPrice', value: (postData.collectPrice || 0).toString(), type: 'uint256' },
        { name: 'collectLimit', value: (postData.collectLimit || 0).toString(), type: 'uint32' },
        { name: 'collectCount', value: (postData.collectCount || 0).toString(), type: 'uint32' },
        { name: 'isGated', value: postData.isGated || false, type: 'bool' },
        { name: 'referrer', value: postData.referrer || '0x0000000000000000000000000000000000000000', type: 'address' },
        { name: 'nftTokenId', value: postData.nftTokenId || 0, type: 'uint32' },
        { name: 'isDeleted', value: true, type: 'bool' }, // Set to true for delete
        { name: 'isPinned', value: postData.isPinned || false, type: 'bool' },
      ]);

      // Convert number ID to bytes32
      const postIdHex = numberToBytes32(postId);

      console.log('📤 [V3] Writing delete to blockchain...', {
        schemaId,
        postId,
        author: postData.author
      });
      
      // Use transaction queue to ensure sequential execution
      await transactionQueue.enqueue(async () => {
        const txHash = await this.sdk.streams.set([{
          schemaId,
          id: postIdHex,
          data: encodedData,
        }]);
        
        console.log('✅ [V3] Post deleted on blockchain!', {
          txHash,
          postId,
          schemaId
        });
        
        // Clear cache
        this.dataCache.delete('all_posts');
        return txHash;
      });
    } catch (error) {
      console.error('❌ [V3] Failed to delete post:', error);
      throw error;
    }
  }

  /**
   * Create an interaction (like, comment, repost, etc.) - batched
   */
  async createInteraction(interactionData: Partial<InteractionDataV3>, immediate: boolean = false): Promise<string> {
    if (!validateInteractionData(interactionData)) {
      throw new Error('Invalid interaction data');
    }

    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      console.log('📝 [V3] Creating interaction:', InteractionType[interactionData.interactionType!]);

      const schemaId = await this.getSchemaIdCached('interactions');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.interactions);

      // Encode data using SDK format V6 (9 fields)
      const timestamp = interactionData.timestamp || Date.now();
      const id = interactionData.id || (timestamp * 10 + (interactionData.interactionType || 0));
      
      // V6: targetId and parentId are uint256
      const targetId = interactionData.targetId || 0;
      const parentId = interactionData.parentId || 0;
      const tipAmount = interactionData.tipAmount || 0;
      
      console.log('🔍 [V3] Encoding interaction data V6:', {
        id,
        timestamp,
        interactionType: interactionData.interactionType,
        targetId,
        targetType: interactionData.targetType,
        fromUser: interactionData.fromUser?.substring(0, 10) + '...',
        content: interactionData.content?.substring(0, 30),
        parentId,
        tipAmount
      });
      
      // Encode V6 with uint256 IDs
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: id.toString(), type: 'uint256' },
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'interactionType', value: (interactionData.interactionType ?? InteractionType.LIKE).toString(), type: 'uint8' },
        { name: 'targetId', value: targetId.toString(), type: 'uint256' }, // V6: uint256
        { name: 'targetType', value: (interactionData.targetType ?? TargetType.POST).toString(), type: 'uint8' },
        { name: 'fromUser', value: interactionData.fromUser || '', type: 'address' },
        { name: 'content', value: interactionData.content || '', type: 'string' },
        { name: 'parentId', value: parentId.toString(), type: 'uint256' }, // V6: uint256
        { name: 'tipAmount', value: tipAmount.toString(), type: 'uint256' }, // V6: Tipping
      ]);
      
      console.log('✅ [V3] Data encoded successfully');

      // Convert number ID to bytes32
      const idHex = numberToBytes32(id);

      if (immediate) {
        // Immediate write (use transaction queue to prevent nonce conflicts)
        console.log('📤 [V3] Writing interaction to blockchain...');
        
        // Use transaction queue to ensure sequential execution
        const txHash = await transactionQueue.enqueue(async () => {
          const hash = await this.sdk.streams.set([{
            schemaId,
            id: idHex,
            data: encodedData,
          }]);
          
          console.log('✅ [V3] Interaction created (immediate):', hash);
          this.dataCache.delete('all_interactions');
          return hash;
        });
        
        return txHash;
      } else {
        // Add to batch (for non-critical interactions like likes)
        this.addToBatch(schemaId, idHex, encodedData);
        console.log('✅ [V3] Interaction added to batch');
        return 'batched';
      }
    } catch (error) {
      console.error('❌ [V3] Failed to create interaction:', error);
      throw error;
    }
  }

  /**
   * Batch create multiple interactions at once
   * 
   * Use this for bulk operations (e.g., importing data)
   */
  async createInteractionsBatch(interactions: Partial<InteractionDataV3>[]): Promise<string> {
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    // Use transaction queue to prevent nonce conflicts
    return transactionQueue.enqueue(async () => {
      console.log(`📦 [V3] Creating ${interactions.length} interactions in batch...`);
      const startTime = Date.now();

      const schemaId = await this.getSchemaIdCached('interactions');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.interactions);

      const batch = interactions.map(interaction => {
        const timestamp = interaction.timestamp || Date.now();
        const id = interaction.id || (timestamp * 10 + (interaction.interactionType || 0));
        
        // V6: targetId dan parentId sebagai uint256
        const targetId = interaction.targetId || 0;
        const parentId = interaction.parentId || 0;
        const tipAmount = interaction.tipAmount || 0;
        
        const encodedData = schemaEncoder.encodeData([
          { name: 'id', value: id.toString(), type: 'uint256' },
          { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
          { name: 'interactionType', value: (interaction.interactionType ?? InteractionType.LIKE).toString(), type: 'uint8' },
          { name: 'targetId', value: targetId.toString(), type: 'uint256' },
          { name: 'targetType', value: (interaction.targetType ?? TargetType.POST).toString(), type: 'uint8' },
          { name: 'fromUser', value: interaction.fromUser || '', type: 'address' },
          { name: 'content', value: interaction.content || '', type: 'string' },
          { name: 'parentId', value: parentId.toString(), type: 'uint256' },
          { name: 'tipAmount', value: tipAmount.toString(), type: 'uint256' },
        ]);

        return {
          schemaId,
          id: numberToBytes32(id),
          data: encodedData,
        };
      });

      const txHash = await this.sdk.streams.set(batch);

      const batchTime = Date.now() - startTime;
      console.log(`✅ [V3] Batch created in ${batchTime}ms:`, txHash);

      this.dataCache.delete('all_interactions');
      return txHash;
    });
  }

  /**
   * Force flush pending batch writes
   */
  async forceBatchFlush(): Promise<string[]> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    return this.flushBatch();
  }

  // ===== CACHE MANAGEMENT =====

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.dataCache.clear();
    console.log('🗑️ [V3] Cache cleared');
  }

  /**
   * Clear specific cache
   */
  clearCacheFor(key: string): void {
    this.dataCache.delete(key);
    console.log(`🗑️ [V3] Cache cleared for: ${key}`);
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys()),
      expiry: this.cacheExpiry,
    };
  }

  // ===== HIGH-LEVEL FEED OPERATIONS (WEB2-LEVEL PERFORMANCE) =====

  /**
   * Load complete feed with stats (OPTIMIZED)
   * 
   * Single method that loads posts + interactions + aggregates
   * Performance: ~100-200ms for 20 posts with stats
   */
  async loadFeedOptimized(
    page: number = 0,
    pageSize: number = 20,
    currentUser?: string
  ): Promise<{
    posts: PostDataV3[];
    statsMap: Map<number, PostStats>;
    loadTime: number;
    interactions: InteractionDataV3[];
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 [V3] Loading optimized feed (page ${page}, pageSize ${pageSize})...`);

      // ⚡ STEP 1: Load posts (paginated) - ~50ms
      const posts = await this.getPostsPaginated(page, pageSize);
      
      if (posts.length === 0) {
        console.log('📭 [V3] No posts found');
        return { posts: [], statsMap: new Map(), loadTime: Date.now() - startTime, interactions: [] };
      }

      console.log(`📚 [V3] Loaded ${posts.length} posts, now loading interactions...`);

      // ⚡ STEP 2: Load ALL interactions (not filtered by postIds) - ~50ms
      // PENTING: Load semua interactions agar like/unlike/comment/repost persisten
      const interactions = await this.getAllInteractions();
      
      console.log(`💬 [V3] Loaded ${interactions.length} total interactions from blockchain`);

      // Filter interactions for current posts (optional, for performance)
      const postIds = posts.map(p => p.id);
      const relevantInteractions = interactions.filter(i => postIds.includes(i.targetId));
      
      console.log(`🎯 [V3] Found ${relevantInteractions.length} interactions for current posts`);

      // ⚡ STEP 3: Aggregate stats (client-side, super fast) - ~1ms
      const { aggregateInteractions } = await import('@/config/somniaDataStreams.v3');
      const statsMap = aggregateInteractions(relevantInteractions, currentUser);

      console.log(`📊 [V3] Aggregated stats for ${statsMap.size} posts`);
      
      // Log sample stats for debugging
      if (statsMap.size > 0) {
        const firstPostId = Array.from(statsMap.keys())[0];
        const firstStats = statsMap.get(firstPostId);
        console.log(`📈 [V3] Sample stats for ${String(firstPostId).substring(0, 20)}:`, {
          likes: firstStats?.likes,
          comments: firstStats?.comments,
          reposts: firstStats?.reposts,
          userLiked: firstStats?.userLiked,
          userReposted: firstStats?.userReposted
        });
      }

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Feed loaded in ${loadTime}ms (${posts.length} posts, ${relevantInteractions.length} interactions)`);

      return { posts, statsMap, loadTime, interactions: relevantInteractions };
    } catch (error) {
      console.error('❌ [V3] Failed to load feed:', error);
      throw error;
    }
  }

  /**
   * Load feed with enriched data (posts + stats + quotes + profiles)
   * 
   * Performance: ~200-300ms for complete feed
   */
  async loadFeedEnriched(
    page: number = 0,
    pageSize: number = 20,
    currentUser?: string
  ): Promise<{
    posts: Array<PostDataV3 & { quotedPost?: PostDataV3 }>;
    statsMap: Map<number, PostStats>;
    profiles: Map<string, ProfileDataV3>;
    loadTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 [V3] Loading enriched feed (page ${page})...`);

      // Load basic feed
      const { posts, statsMap } = await this.loadFeedOptimized(page, pageSize, currentUser);

      // Enrich with quoted posts
      const enrichedPosts = enrichPostsWithQuotes(posts);

      // Load profiles for all authors (parallel)
      const authorAddresses = new Set(posts.map(p => p.author));
      const profiles = new Map<string, ProfileDataV3>();
      
      // TODO: Implement profile loading
      // For now, return empty profiles map

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Enriched feed loaded in ${loadTime}ms`);

      return { posts: enrichedPosts, statsMap, profiles, loadTime };
    } catch (error) {
      console.error('❌ [V3] Failed to load enriched feed:', error);
      throw error;
    }
  }

  /**
   * Prefetch next page for smooth infinite scroll
   */
  async prefetchNextPage(currentPage: number, pageSize: number = 20): Promise<void> {
    if (!SOMNIA_CONFIG_V3.performance.prefetchNextPage) return;

    try {
      console.log(`🔮 [V3] Prefetching page ${currentPage + 1}...`);
      
      // Load next page in background
      await this.getPostsPaginated(currentPage + 1, pageSize);
      
      console.log(`✅ [V3] Page ${currentPage + 1} prefetched`);
    } catch (error) {
      console.warn('⚠️ [V3] Prefetch failed:', error);
    }
  }

  /**
   * Get post by ID (with caching)
   */
  async getPostById(postId: number): Promise<PostDataV3 | null> {
    const cacheKey = `post_${postId}`;
    
    // Check cache
    const cached = this.dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      const cachedData = cached.data as PostDataV3[];
      return cachedData[0] || null;
    }

    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('posts');
      
      // Get all posts and find by ID
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
      
      // Helper functions
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };
      
      // Find the post by matching ID
      for (let idx = 0; idx < allData.length; idx++) {
        const item = allData[idx] as any;
        const id = safeNumber(safeExtractValue(item[0]));
        
        if (id === postId) {
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const content = safeString(safeExtractValue(item[2]));
          const contentType = safeNumber(safeExtractValue(item[3]), 0);
          const mediaHashes = safeString(safeExtractValue(item[4]));
          const author = safeString(safeExtractValue(item[5]));
          const quotedPostId = safeNumber(safeExtractValue(item[6]), 0);
          const replyToId = safeNumber(safeExtractValue(item[7]), 0);
          const mentions = safeString(safeExtractValue(item[8]));
          const collectModule = safeString(safeExtractValue(item[9]), '0x0000000000000000000000000000000000000000');
          const collectPrice = safeNumber(safeExtractValue(item[10]), 0);
          const collectLimit = safeNumber(safeExtractValue(item[11]), 0);
          const collectCount = safeNumber(safeExtractValue(item[12]), 0);
          const isGated = Boolean(safeExtractValue(item[13]));
          const referrer = safeString(safeExtractValue(item[14]), '0x0000000000000000000000000000000000000000');
          const nftTokenId = safeNumber(safeExtractValue(item[15]), 0);
          const isDeleted = Boolean(safeExtractValue(item[16]));
          const isPinned = Boolean(safeExtractValue(item[17]));
          
          const post: PostDataV3 = {
            id,
            index: idx,
            timestamp,
            content,
            contentType: contentType as ContentType,
            mediaHashes,
            author,
            quotedPostId,
            replyToId,
            mentions,
            collectModule,
            collectPrice,
            collectLimit,
            collectCount,
            isGated,
            referrer,
            nftTokenId,
            isDeleted,
            isPinned,
          };
          
          // Cache result (store as array for consistency)
          this.dataCache.set(cacheKey, { data: [post], timestamp: Date.now() });
          
          return post;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ [V3] Failed to get post by ID:', error);
      return null;
    }
  }

  /**
   * Get interactions for specific post (with caching)
   */
  async getInteractionsForPost(postId: number): Promise<InteractionDataV3[]> {
    const cacheKey = `interactions_${postId}`;
    
    // Check cache
    const cached = this.dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data as InteractionDataV3[];
    }

    const allInteractions = await this.getAllInteractions([postId.toString()]);
    
    // Cache result
    this.dataCache.set(cacheKey, { data: allInteractions, timestamp: Date.now() });
    
    return allInteractions;
  }

  /**
   * Get comment tree for post
   */
  async getCommentTree(postId: number): Promise<Array<InteractionDataV3 & { replies: InteractionDataV3[] }>> {
    const interactions = await this.getInteractionsForPost(postId);
    return buildCommentTree(postId, interactions);
  }

  /**
   * Get performance stats
   */
  getPerformanceStats() {
    return {
      cacheSize: this.dataCache.size,
      pendingRequests: this.pendingRequests.size,
      batchSize: this.writeBatch.length,
      cacheKeys: Array.from(this.dataCache.keys()),
    };
  }

  // ===== GENERATED MUSIC BACKUP OPERATIONS =====

  /**
   * Save generated music to datastream (backup for failed mints)
   */
  async saveGeneratedMusic(musicData: Partial<GeneratedMusicData>, immediate: boolean = true): Promise<number> {
    await this.ensureInitialized();
    
    const { validateGeneratedMusicData, createGeneratedMusicId, GeneratedMusicStatus } = await import('@/config/somniaDataStreams.v3');
    
    if (!validateGeneratedMusicData(musicData)) {
      throw new Error('Invalid generated music data');
    }

    if (!musicData.owner) {
      throw new Error('Owner is required');
    }

    try {
      console.log('🎵 [V3] Saving generated music to datastream...', {
        title: musicData.title,
        taskId: musicData.taskId
      });

      const schemaId = await this.getSchemaIdCached('generatedMusic');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.generatedMusic);

      // Generate ID if not provided
      const timestamp = musicData.timestamp || Date.now();
      const owner = musicData.owner;
      const musicId = musicData.id || createGeneratedMusicId(owner, timestamp);

      // Encode data (11 fields)
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: musicId.toString(), type: 'uint256' },
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'owner', value: owner, type: 'address' },
        { name: 'taskId', value: musicData.taskId || '', type: 'string' },
        { name: 'title', value: musicData.title || '', type: 'string' },
        { name: 'audioUrl', value: musicData.audioUrl || '', type: 'string' },
        { name: 'imageUrl', value: musicData.imageUrl || '', type: 'string' },
        { name: 'prompt', value: musicData.prompt || '', type: 'string' },
        { name: 'style', value: musicData.style || '', type: 'string' },
        { name: 'lyrics', value: musicData.lyrics || '', type: 'string' },
        { name: 'status', value: (musicData.status ?? GeneratedMusicStatus.COMPLETED).toString(), type: 'uint8' },
      ]);

      // Convert number ID to bytes32
      const musicIdHex = numberToBytes32(musicId);

      if (immediate) {
        // Immediate write
        console.log('📤 [V3] Writing generated music to blockchain...', {
          schemaId,
          musicId,
          owner,
          title: musicData.title,
          taskId: musicData.taskId,
          audioUrl: musicData.audioUrl?.substring(0, 50) + '...',
          imageUrl: musicData.imageUrl?.substring(0, 50) + '...',
          status: musicData.status
        });
        
        await transactionQueue.enqueue(async () => {
          const txHash = await this.sdk.streams.set([{
            schemaId,
            id: musicIdHex,
            data: encodedData,
          }]);
          
          console.log('✅ [V3] Generated music saved to blockchain!', {
            txHash,
            musicId,
            schemaId,
            title: musicData.title
          });
          
          // Clear cache to force reload
          this.dataCache.delete('all_generated_music');
          
          // Verify save by reading back (with longer delay for blockchain confirmation)
          setTimeout(async () => {
            try {
              // Force clear cache again before verify
              this.dataCache.delete('all_generated_music');
              
              const allMusic = await this.getAllGeneratedMusic();
              const savedMusic = allMusic.find(m => m.id === musicId);
              if (savedMusic) {
                console.log('✅ [V3] Verified music saved:', savedMusic.title);
              } else {
                console.warn('⚠️ [V3] Music not found after save (may need more time for blockchain confirmation):', musicId);
                console.log('💡 [V3] Total music in blockchain:', allMusic.length);
                console.log('💡 [V3] Latest music IDs:', allMusic.slice(0, 3).map(m => m.id));
              }
            } catch (verifyError) {
              console.error('❌ [V3] Failed to verify save:', verifyError);
            }
          }, 3000); // Increase delay to 3 seconds
          
          return txHash;
        });
        
        return musicId;
      } else {
        // Add to batch
        this.addToBatch(schemaId, musicIdHex, encodedData);
        console.log('✅ [V3] Generated music added to batch');
        return musicId;
      }
    } catch (error) {
      console.error('❌ [V3] Failed to save generated music:', error);
      throw error;
    }
  }

  /**
   * Get all generated music for current user
   */
  async getAllGeneratedMusic(): Promise<GeneratedMusicData[]> {
    await this.ensureInitialized();

    const cacheKey = 'all_generated_music';
    
    // Check cache
    const cached = this.dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('⚡ [V3] Using cached generated music');
      return cached.data as GeneratedMusicData[];
    }

    try {
      const startTime = Date.now();
      console.log('🎵 [V3] Loading all generated music...');

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('generatedMusic');
      const rawData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!rawData || rawData.length === 0) {
        console.log('📭 [V3] No generated music found');
        return [];
      }

      // Helper functions
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Decode data (11 fields)
      const { GeneratedMusicStatus } = await import('@/config/somniaDataStreams.v3');
      
      const musicList: GeneratedMusicData[] = [];
      
      for (let idx = 0; idx < rawData.length; idx++) {
        try {
          const item = rawData[idx];
          
          // Skip empty or invalid data
          if (!item || !Array.isArray(item) || item.length === 0) {
            console.warn('⚠️ [V3] Skipping invalid music record (empty data)');
            continue;
          }
          
          const id = safeNumber(safeExtractValue(item[0]));
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const owner = safeString(safeExtractValue(item[2]));
          const taskId = safeString(safeExtractValue(item[3]));
          const title = safeString(safeExtractValue(item[4]));
          const audioUrl = safeString(safeExtractValue(item[5]));
          const imageUrl = safeString(safeExtractValue(item[6]));
          const prompt = safeString(safeExtractValue(item[7]));
          const style = safeString(safeExtractValue(item[8]));
          const lyrics = safeString(safeExtractValue(item[9]));
          const status = safeNumber(safeExtractValue(item[10]), GeneratedMusicStatus.COMPLETED);
          
          // Debug log untuk music pertama
          if (idx === 0) {
            console.log('🔍 [V3] First music decoded:', {
              id,
              timestamp,
              owner: owner.substring(0, 10) + '...',
              taskId,
              title,
              audioUrl: audioUrl.substring(0, 50) + '...',
              imageUrl: imageUrl.substring(0, 50) + '...',
              status
            });
          }
          
          musicList.push({
            id,
            timestamp,
            owner,
            taskId,
            title,
            audioUrl,
            imageUrl,
            prompt,
            style,
            lyrics,
            status: status as GeneratedMusicStatus,
          });
        } catch (decodeError: any) {
          console.warn('⚠️ [V3] Failed to decode music record, skipping:', decodeError.message);
          continue;
        }
      }

      // Sort by timestamp (newest first)
      musicList.sort((a, b) => b.timestamp - a.timestamp);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Loaded ${musicList.length} generated music in ${loadTime}ms`);

      // Cache result
      this.dataCache.set(cacheKey, { data: musicList, timestamp: Date.now() });

      return musicList;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No generated music found (NoData)');
        return [];
      }
      console.error('❌ [V3] Failed to load generated music:', error);
      throw error;
    }
  }

  /**
   * Get unminted music (status = COMPLETED)
   */
  async getUnmintedMusic(): Promise<GeneratedMusicData[]> {
    const allMusic = await this.getAllGeneratedMusic();
    const { getUnmintedMusic } = await import('@/config/somniaDataStreams.v3');
    return getUnmintedMusic(allMusic);
  }

  /**
   * Update music status (e.g., after successful mint)
   */
  async updateMusicStatus(musicId: number, newStatus: number, musicData: GeneratedMusicData): Promise<void> {
    await this.ensureInitialized();

    try {
      console.log('🔄 [V3] Updating music status...', { musicId, newStatus });

      const schemaId = await this.getSchemaIdCached('generatedMusic');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.generatedMusic);

      // Encode data with updated status (keep all other fields the same)
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: musicId.toString(), type: 'uint256' },
        { name: 'timestamp', value: musicData.timestamp.toString(), type: 'uint256' },
        { name: 'owner', value: musicData.owner, type: 'address' },
        { name: 'taskId', value: musicData.taskId, type: 'string' },
        { name: 'title', value: musicData.title, type: 'string' },
        { name: 'audioUrl', value: musicData.audioUrl, type: 'string' },
        { name: 'imageUrl', value: musicData.imageUrl, type: 'string' },
        { name: 'prompt', value: musicData.prompt, type: 'string' },
        { name: 'style', value: musicData.style, type: 'string' },
        { name: 'lyrics', value: musicData.lyrics, type: 'string' },
        { name: 'status', value: newStatus.toString(), type: 'uint8' },
      ]);

      const musicIdHex = numberToBytes32(musicId);

      console.log('📤 [V3] Writing status update to blockchain...');
      
      await transactionQueue.enqueue(async () => {
        const txHash = await this.sdk.streams.set([{
          schemaId,
          id: musicIdHex,
          data: encodedData,
        }]);
        
        console.log('✅ [V3] Music status updated on blockchain!', {
          txHash,
          musicId,
          newStatus
        });
        
        // Clear cache
        this.dataCache.delete('all_generated_music');
        return txHash;
      });
    } catch (error) {
      console.error('❌ [V3] Failed to update music status:', error);
      throw error;
    }
  }

  /**
   * Get generated music by task ID
   */
  async getGeneratedMusicByTaskId(taskId: string): Promise<GeneratedMusicData | null> {
    const allMusic = await this.getAllGeneratedMusic();
    return allMusic.find(m => m.taskId === taskId) || null;
  }

  // ===== PLAY EVENTS OPERATIONS =====

  /**
   * Record a play event
   */
  async recordPlayEvent(eventData: Partial<PlayEventData>, immediate: boolean = true): Promise<number> {
    await this.ensureInitialized();
    
    const { validatePlayEventData, createPlayEventId } = await import('@/config/somniaDataStreams.v3');
    
    if (!validatePlayEventData(eventData)) {
      throw new Error('Invalid play event data');
    }

    try {
      console.log('🎵 [V3] Recording play event...', {
        tokenId: eventData.tokenId,
        listener: eventData.listener?.substring(0, 10) + '...',
        duration: eventData.duration,
        source: eventData.source
      });

      const schemaId = await this.getSchemaIdCached('playEvents');
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.playEvents);

      // Generate ID if not provided
      const timestamp = eventData.timestamp || Date.now();
      const eventId = eventData.id || createPlayEventId();

      // Encode data (6 fields)
      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: eventId.toString(), type: 'uint256' },
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'tokenId', value: (eventData.tokenId || 0).toString(), type: 'uint32' },
        { name: 'listener', value: eventData.listener || '', type: 'address' },
        { name: 'duration', value: (eventData.duration || 0).toString(), type: 'uint32' },
        { name: 'source', value: eventData.source || 'app', type: 'string' },
      ]);

      const eventIdHex = numberToBytes32(eventId);

      if (immediate) {
        // Immediate write
        await transactionQueue.enqueue(async () => {
          const txHash = await this.sdk.streams.set([{
            schemaId,
            id: eventIdHex,
            data: encodedData,
          }]);
          
          console.log('✅ [V3] Play event recorded!', { txHash, eventId });
          this.dataCache.delete('all_play_events');
          return txHash;
        });
        
        return eventId;
      } else {
        // Add to batch
        this.addToBatch(schemaId, eventIdHex, encodedData);
        console.log('✅ [V3] Play event added to batch');
        return eventId;
      }
    } catch (error) {
      console.error('❌ [V3] Failed to record play event:', error);
      throw error;
    }
  }

  /**
   * Get all play events
   */
  async getAllPlayEvents(): Promise<PlayEventData[]> {
    await this.ensureInitialized();

    const cacheKey = 'all_play_events';
    
    // Check cache
    const cached = this.dataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      console.log('⚡ [V3] Using cached play events');
      return cached.data as PlayEventData[];
    }

    try {
      const startTime = Date.now();
      console.log('🎵 [V3] Loading all play events...');

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('playEvents');
      const rawData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!rawData || rawData.length === 0) {
        console.log('📭 [V3] No play events found');
        return [];
      }

      // Helper functions
      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      // Decode data (6 fields)
      const events: PlayEventData[] = [];
      
      for (let idx = 0; idx < rawData.length; idx++) {
        try {
          const item = rawData[idx];
          
          if (!item || !Array.isArray(item) || item.length === 0) {
            console.warn('⚠️ [V3] Skipping invalid play event (empty data)');
            continue;
          }
          
          const id = safeNumber(safeExtractValue(item[0]));
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const tokenId = safeNumber(safeExtractValue(item[2]));
          const listener = safeString(safeExtractValue(item[3]));
          const duration = safeNumber(safeExtractValue(item[4]));
          const source = safeString(safeExtractValue(item[5]), 'app');
          
          events.push({
            id,
            timestamp,
            tokenId,
            listener,
            duration,
            source,
          });
        } catch (decodeError: any) {
          console.warn('⚠️ [V3] Failed to decode play event, skipping:', decodeError.message);
          continue;
        }
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => b.timestamp - a.timestamp);

      const loadTime = Date.now() - startTime;
      console.log(`✅ [V3] Loaded ${events.length} play events in ${loadTime}ms`);

      // Cache result
      this.dataCache.set(cacheKey, { data: events, timestamp: Date.now() });

      return events;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No play events found (NoData)');
        return [];
      }
      console.error('❌ [V3] Failed to load play events:', error);
      throw error;
    }
  }

  /**
   * Get play count for a song
   */
  async getPlayCount(tokenId: number): Promise<number> {
    const events = await this.getAllPlayEvents();
    return events.filter(e => e.tokenId === tokenId).length;
  }

  /**
   * Get trending songs
   */
  async getTrendingSongs(limit: number = 10, timeWindow?: number): Promise<Array<{ tokenId: number; score: number; plays: number; uniqueListeners: number }>> {
    const events = await this.getAllPlayEvents();
    
    // Get all unique token IDs
    const tokenIds = [...new Set(events.map(e => e.tokenId))];
    
    const { getTrendingSongs } = await import('@/config/somniaDataStreams.v3');
    return getTrendingSongs(events, tokenIds, limit, timeWindow);
  }

  /**
   * Get play counts for specific token IDs
   */
  async getPlayCountsForTokens(tokenIds: number[]): Promise<Map<number, number>> {
    const allEvents = await this.getAllPlayEvents();
    const { aggregatePlayCounts } = await import('@/config/somniaDataStreams.v3');
    
    // Filter events for requested tokens
    const relevantEvents = allEvents.filter(e => tokenIds.includes(e.tokenId));
    
    return aggregatePlayCounts(relevantEvents);
  }

  /**
   * Get best song in album (highest play count)
   */
  async getBestSongInAlbum(tokenIds: number[]): Promise<{ tokenId: number; playCount: number } | null> {
    if (tokenIds.length === 0) return null;
    
    const playCounts = await this.getPlayCountsForTokens(tokenIds);
    
    let bestSong: { tokenId: number; playCount: number } | null = null;
    
    for (const tokenId of tokenIds) {
      const playCount = playCounts.get(tokenId) || 0;
      if (!bestSong || playCount > bestSong.playCount) {
        bestSong = { tokenId, playCount };
      }
    }
    
    return bestSong;
  }

  // ===== BOOKMARK FUNCTIONS =====

  /**
   * Bookmark a post
   */
  async bookmarkPost(postId: number, userAddress: string): Promise<string> {
    console.log('🔖 [V3] Bookmarking post:', postId, 'by user:', userAddress);
    
    await this.ensureInitialized();
    
    const interactionData: Partial<InteractionDataV3> = {
      interactionType: InteractionType.BOOKMARK,
      targetId: postId,
      targetType: TargetType.POST,
      fromUser: userAddress,
      content: '',
      parentId: 0,
      tipAmount: 0,
    };

    try {
      const result = await this.createInteraction(interactionData, true); // Immediate write
      console.log('✅ [V3] Bookmark created:', result);
      return result;
    } catch (error) {
      console.error('❌ [V3] Failed to bookmark:', error);
      throw error;
    }
  }

  /**
   * Unbookmark a post
   */
  async unbookmarkPost(postId: number, userAddress: string): Promise<string> {
    console.log('🔖 [V3] Unbookmarking post:', postId, 'by user:', userAddress);
    
    await this.ensureInitialized();
    
    const interactionData: Partial<InteractionDataV3> = {
      interactionType: InteractionType.UNBOOKMARK,
      targetId: postId,
      targetType: TargetType.POST,
      fromUser: userAddress,
      content: '',
      parentId: 0,
      tipAmount: 0,
    };

    try {
      const result = await this.createInteraction(interactionData, true); // Immediate write
      console.log('✅ [V3] Unbookmark created:', result);
      return result;
    } catch (error) {
      console.error('❌ [V3] Failed to unbookmark:', error);
      throw error;
    }
  }

  /**
   * Get bookmarked posts for a user
   */
  async getBookmarkedPosts(userAddress: string): Promise<PostDataV3[]> {
    console.log('🔖 [V3] Getting bookmarked posts for:', userAddress);
    
    try {
      // Get all interactions
      const interactions = await this.getAllInteractions();
      
      // Filter bookmark interactions for this user
      const bookmarkInteractions = interactions.filter(
        i => i.fromUser.toLowerCase() === userAddress.toLowerCase() &&
             (i.interactionType === InteractionType.BOOKMARK || 
              i.interactionType === InteractionType.UNBOOKMARK)
      );
      
      // Track bookmark state per post (handle bookmark/unbookmark)
      const bookmarkState = new Map<number, boolean>();
      
      // Sort by timestamp (oldest first) to process chronologically
      bookmarkInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const interaction of bookmarkInteractions) {
        if (interaction.interactionType === InteractionType.BOOKMARK) {
          bookmarkState.set(interaction.targetId, true);
        } else if (interaction.interactionType === InteractionType.UNBOOKMARK) {
          bookmarkState.set(interaction.targetId, false);
        }
      }
      
      // Get post IDs that are currently bookmarked
      const bookmarkedPostIds = Array.from(bookmarkState.entries())
        .filter(([_, isBookmarked]) => isBookmarked)
        .map(([postId, _]) => postId);
      
      console.log('🔖 [V3] Found', bookmarkedPostIds.length, 'bookmarked posts');
      
      // Get all posts
      const allPosts = await this.getAllPosts();
      
      // Filter posts that are bookmarked
      const bookmarkedPosts = allPosts.filter(post => 
        bookmarkedPostIds.includes(post.id)
      );
      
      // Sort by bookmark timestamp (most recent first)
      bookmarkedPosts.sort((a, b) => {
        const aBookmark = bookmarkInteractions.find(
          i => i.targetId === a.id && i.interactionType === InteractionType.BOOKMARK
        );
        const bBookmark = bookmarkInteractions.find(
          i => i.targetId === b.id && i.interactionType === InteractionType.BOOKMARK
        );
        return (bBookmark?.timestamp || 0) - (aBookmark?.timestamp || 0);
      });
      
      return bookmarkedPosts;
    } catch (error) {
      console.error('❌ [V3] Failed to get bookmarked posts:', error);
      return [];
    }
  }

  /**
   * Check if a post is bookmarked by user
   */
  async isPostBookmarked(postId: number, userAddress: string): Promise<boolean> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Filter bookmark interactions for this user and post
      const bookmarkInteractions = interactions.filter(
        i => i.fromUser.toLowerCase() === userAddress.toLowerCase() &&
             i.targetId === postId &&
             (i.interactionType === InteractionType.BOOKMARK || 
              i.interactionType === InteractionType.UNBOOKMARK)
      );
      
      // Sort by timestamp (oldest first)
      bookmarkInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      // Get last interaction
      const lastInteraction = bookmarkInteractions[bookmarkInteractions.length - 1];
      
      return lastInteraction?.interactionType === InteractionType.BOOKMARK;
    } catch (error) {
      console.error('❌ [V3] Failed to check bookmark status:', error);
      return false;
    }
  }

  // ===== FOLLOW/UNFOLLOW OPERATIONS (NEW) =====

  /**
   * Follow a user
   */
  async followUser(targetUserAddress: string, fromUserAddress: string): Promise<string> {
    console.log('👥 [V3] Following user:', targetUserAddress, 'by:', fromUserAddress);
    
    await this.ensureInitialized();
    
    // Convert address to number for targetId (use first 16 hex chars)
    const targetId = parseInt(targetUserAddress.slice(2, 18), 16);
    
    const interactionData: Partial<InteractionDataV3> = {
      interactionType: InteractionType.FOLLOW,
      targetId,
      targetType: TargetType.USER,
      fromUser: fromUserAddress,
      content: targetUserAddress, // Store full address in content
      parentId: 0,
      tipAmount: 0,
    };

    try {
      const result = await this.createInteraction(interactionData, true); // Immediate write
      console.log('✅ [V3] Follow created:', result);
      
      // Clear cache to force refresh
      this.clearCacheFor('all_interactions');
      
      return result;
    } catch (error) {
      console.error('❌ [V3] Failed to follow user:', error);
      throw error;
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(targetUserAddress: string, fromUserAddress: string): Promise<string> {
    console.log('👥 [V3] Unfollowing user:', targetUserAddress, 'by:', fromUserAddress);
    
    await this.ensureInitialized();
    
    // Convert address to number for targetId (use first 16 hex chars)
    const targetId = parseInt(targetUserAddress.slice(2, 18), 16);
    
    const interactionData: Partial<InteractionDataV3> = {
      interactionType: InteractionType.UNFOLLOW,
      targetId,
      targetType: TargetType.USER,
      fromUser: fromUserAddress,
      content: targetUserAddress, // Store full address in content
      parentId: 0,
      tipAmount: 0,
    };

    try {
      const result = await this.createInteraction(interactionData, true); // Immediate write
      console.log('✅ [V3] Unfollow created:', result);
      
      // Clear cache to force refresh
      this.clearCacheFor('all_interactions');
      
      return result;
    } catch (error) {
      console.error('❌ [V3] Failed to unfollow user:', error);
      throw error;
    }
  }

  /**
   * Check if user is following another user
   */
  async isFollowing(followerAddress: string, targetAddress: string): Promise<boolean> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Convert target address to targetId
      const targetId = parseInt(targetAddress.slice(2, 18), 16);
      
      // Filter follow interactions for this user and target
      const followInteractions = interactions.filter(
        i => i.fromUser.toLowerCase() === followerAddress.toLowerCase() &&
             i.targetId === targetId &&
             i.targetType === TargetType.USER &&
             (i.interactionType === InteractionType.FOLLOW || 
              i.interactionType === InteractionType.UNFOLLOW)
      );
      
      // Sort by timestamp (oldest first)
      followInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      // Get last interaction
      const lastInteraction = followInteractions[followInteractions.length - 1];
      
      return lastInteraction?.interactionType === InteractionType.FOLLOW;
    } catch (error) {
      console.error('❌ [V3] Failed to check follow status:', error);
      return false;
    }
  }

  /**
   * Get follower count for a user
   */
  async getFollowerCount(userAddress: string): Promise<number> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Convert address to targetId
      const targetId = parseInt(userAddress.slice(2, 18), 16);
      
      // Filter follow/unfollow interactions for this user
      const followInteractions = interactions.filter(
        i => i.targetId === targetId &&
             i.targetType === TargetType.USER &&
             (i.interactionType === InteractionType.FOLLOW || 
              i.interactionType === InteractionType.UNFOLLOW)
      );
      
      // Track follow state per follower
      const followState = new Map<string, boolean>();
      
      // Sort by timestamp (oldest first)
      followInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const interaction of followInteractions) {
        const follower = interaction.fromUser.toLowerCase();
        if (interaction.interactionType === InteractionType.FOLLOW) {
          followState.set(follower, true);
        } else if (interaction.interactionType === InteractionType.UNFOLLOW) {
          followState.set(follower, false);
        }
      }
      
      // Count active followers
      const count = Array.from(followState.values()).filter(isFollowing => isFollowing).length;
      
      console.log('👥 [V3] Follower count for', userAddress, ':', count);
      return count;
    } catch (error) {
      console.error('❌ [V3] Failed to get follower count:', error);
      return 0;
    }
  }

  /**
   * Get following count for a user
   */
  async getFollowingCount(userAddress: string): Promise<number> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Filter follow/unfollow interactions by this user
      const followInteractions = interactions.filter(
        i => i.fromUser.toLowerCase() === userAddress.toLowerCase() &&
             i.targetType === TargetType.USER &&
             (i.interactionType === InteractionType.FOLLOW || 
              i.interactionType === InteractionType.UNFOLLOW)
      );
      
      // Track follow state per target
      const followState = new Map<number, boolean>();
      
      // Sort by timestamp (oldest first)
      followInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const interaction of followInteractions) {
        if (interaction.interactionType === InteractionType.FOLLOW) {
          followState.set(interaction.targetId, true);
        } else if (interaction.interactionType === InteractionType.UNFOLLOW) {
          followState.set(interaction.targetId, false);
        }
      }
      
      // Count active follows
      const count = Array.from(followState.values()).filter(isFollowing => isFollowing).length;
      
      console.log('👥 [V3] Following count for', userAddress, ':', count);
      return count;
    } catch (error) {
      console.error('❌ [V3] Failed to get following count:', error);
      return 0;
    }
  }

  /**
   * Get list of followers for a user
   */
  async getFollowers(userAddress: string): Promise<string[]> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Convert address to targetId
      const targetId = parseInt(userAddress.slice(2, 18), 16);
      
      // Filter follow/unfollow interactions for this user
      const followInteractions = interactions.filter(
        i => i.targetId === targetId &&
             i.targetType === TargetType.USER &&
             (i.interactionType === InteractionType.FOLLOW || 
              i.interactionType === InteractionType.UNFOLLOW)
      );
      
      // Track follow state per follower
      const followState = new Map<string, boolean>();
      
      // Sort by timestamp (oldest first)
      followInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const interaction of followInteractions) {
        const follower = interaction.fromUser.toLowerCase();
        if (interaction.interactionType === InteractionType.FOLLOW) {
          followState.set(follower, true);
        } else if (interaction.interactionType === InteractionType.UNFOLLOW) {
          followState.set(follower, false);
        }
      }
      
      // Get active followers
      const followers = Array.from(followState.entries())
        .filter(([_, isFollowing]) => isFollowing)
        .map(([follower, _]) => follower);
      
      console.log('👥 [V3] Followers for', userAddress, ':', followers.length);
      return followers;
    } catch (error) {
      console.error('❌ [V3] Failed to get followers:', error);
      return [];
    }
  }

  /**
   * Get list of users that a user is following
   */
  async getFollowing(userAddress: string): Promise<string[]> {
    try {
      const interactions = await this.getAllInteractions();
      
      // Filter follow/unfollow interactions by this user
      const followInteractions = interactions.filter(
        i => i.fromUser.toLowerCase() === userAddress.toLowerCase() &&
             i.targetType === TargetType.USER &&
             (i.interactionType === InteractionType.FOLLOW || 
              i.interactionType === InteractionType.UNFOLLOW)
      );
      
      // Track follow state per target (use content field which stores full address)
      const followState = new Map<string, boolean>();
      
      // Sort by timestamp (oldest first)
      followInteractions.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const interaction of followInteractions) {
        const targetAddress = interaction.content.toLowerCase(); // Full address stored in content
        if (interaction.interactionType === InteractionType.FOLLOW) {
          followState.set(targetAddress, true);
        } else if (interaction.interactionType === InteractionType.UNFOLLOW) {
          followState.set(targetAddress, false);
        }
      }
      
      // Get active follows
      const following = Array.from(followState.entries())
        .filter(([_, isFollowing]) => isFollowing)
        .map(([target, _]) => target);
      
      console.log('👥 [V3] Following for', userAddress, ':', following.length);
      return following;
    } catch (error) {
      console.error('❌ [V3] Failed to get following:', error);
      return [];
    }
  }

  // ===== ACTIVITY HISTORY OPERATIONS (NEW) =====

  /**
   * Record activity to history
   */
  async recordActivity(activityData: Partial<ActivityHistoryData>): Promise<string> {
    await this.ensureInitialized();
    
    try {
      console.log('📝 [V3] Recording activity:', activityData);

      const schemaId = await this.getSchemaIdCached('activityHistory' as any);
      const schemaEncoder = new SchemaEncoder(SOMNIA_CONFIG_V3.schemaStrings.activityHistory);

      const timestamp = activityData.timestamp || Date.now();
      const activityId = activityData.id || timestamp;

      const encodedData = schemaEncoder.encodeData([
        { name: 'id', value: activityId.toString(), type: 'uint256' },
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'user', value: activityData.user || '', type: 'address' },
        { name: 'activityType', value: (activityData.activityType ?? 0).toString(), type: 'uint8' },
        { name: 'title', value: activityData.title || '', type: 'string' },
        { name: 'description', value: activityData.description || '', type: 'string' },
        { name: 'targetId', value: (activityData.targetId || 0).toString(), type: 'uint256' },
        { name: 'targetAddress', value: activityData.targetAddress || '0x0000000000000000000000000000000000000000', type: 'address' },
        { name: 'txHash', value: activityData.txHash || '', type: 'string' },
        { name: 'metadata', value: activityData.metadata || '{}', type: 'string' },
      ]);

      const activityIdHex = numberToBytes32(activityId);

      await transactionQueue.enqueue(async () => {
        const txHash = await this.sdk.streams.set([{
          schemaId,
          id: activityIdHex,
          data: encodedData,
        }]);
        
        console.log('✅ [V3] Activity recorded:', txHash);
        return txHash;
      });
      
      return activityId.toString();
    } catch (error) {
      console.error('❌ [V3] Failed to record activity:', error);
      throw error;
    }
  }

  /**
   * Get activity history for a user
   */
  async getActivityHistory(userAddress: string, limit: number = 50): Promise<ActivityHistoryData[]> {
    await this.ensureInitialized();

    try {
      console.log('📚 [V3] Loading activity history for:', userAddress);

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      const schemaId = await this.getSchemaIdCached('activityHistory' as any);
      const rawData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);

      if (!rawData || rawData.length === 0) {
        console.log('📭 [V3] No activity found');
        return [];
      }

      const safeExtractValue = (item: any, defaultValue: any = '') => {
        if (!item) return defaultValue;
        if (item.value !== undefined) {
          if (typeof item.value === 'object' && item.value.value !== undefined) {
            return item.value.value;
          }
          return item.value;
        }
        return item;
      };

      const safeString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') return defaultValue;
        return String(value);
      };

      const safeNumber = (value: any, defaultValue: number = 0): number => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'number') return value;
        if (typeof value === 'bigint') return Number(value);
        if (typeof value === 'object') return defaultValue;
        const num = Number(value);
        return isNaN(num) ? defaultValue : num;
      };

      const activities: ActivityHistoryData[] = rawData
        .map((item: any) => {
          const id = safeNumber(safeExtractValue(item[0]));
          const timestamp = safeNumber(safeExtractValue(item[1]));
          const user = safeString(safeExtractValue(item[2]));
          const activityType = safeNumber(safeExtractValue(item[3]), 0);
          const title = safeString(safeExtractValue(item[4]));
          const description = safeString(safeExtractValue(item[5]));
          const targetId = safeNumber(safeExtractValue(item[6]), 0);
          const targetAddress = safeString(safeExtractValue(item[7]), '0x0000000000000000000000000000000000000000');
          const txHash = safeString(safeExtractValue(item[8]));
          const metadata = safeString(safeExtractValue(item[9]), '{}');
          
          return {
            id,
            timestamp,
            user,
            activityType: activityType as ActivityHistoryType,
            title,
            description,
            targetId,
            targetAddress,
            txHash,
            metadata,
          };
        })
        .filter((activity: ActivityHistoryData) => 
          activity.user.toLowerCase() === userAddress.toLowerCase()
        )
        .sort((a: ActivityHistoryData, b: ActivityHistoryData) => b.timestamp - a.timestamp)
        .slice(0, limit);

      console.log(`✅ [V3] Loaded ${activities.length} activities`);
      return activities;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No activity found (NoData)');
        return [];
      }
      console.error('❌ [V3] Failed to load activity:', error);
      return [];
    }
  }

  // ===== GENERIC DATA METHODS (for BXP and Quest systems) =====

  /**
   * Generic write data method
   * Note: This is a simplified implementation for BXP/Quest systems
   * For production use, implement proper schema encoding
   */
  async writeData(schemaId: Hex, data: Record<string, any>): Promise<void> {
    await this.ensureInitialized();
    
    if (!this.sdk || !this.walletClient) {
      throw new Error('SDK or wallet not initialized');
    }

    try {
      console.log(`📝 [V3] Writing data to schema ${schemaId}...`);
      console.warn('⚠️ [V3] Generic writeData not fully implemented - data may not be written correctly');
      
      // TODO: Implement proper schema encoding based on schema definition
      // For now, just log the data
      console.log('Data to write:', data);
      
      console.log(`✅ [V3] Data write skipped (not implemented)`);
    } catch (error) {
      console.error('❌ [V3] Failed to write data:', error);
      throw error;
    }
  }

  /**
   * Generic query data method
   */
  async queryData(
    schemaId: Hex,
    filter?: Record<string, any>
  ): Promise<any[]> {
    await this.ensureInitialized();
    
    if (!this.sdk) {
      throw new Error('SDK not initialized');
    }

    try {
      console.log(`🔍 [V3] Querying data from schema ${schemaId}...`);
      
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const publisher = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!publisher) {
        throw new Error('Publisher address not found');
      }

      // Get all data for this schema
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(schemaId, publisher);
      
      // If no filter, return all
      if (!filter) {
        console.log(`✅ [V3] Found ${allData.length} records`);
        return allData;
      }

      // Apply filter (simple implementation)
      const filtered = allData.filter((item: any) => {
        for (const [key, value] of Object.entries(filter)) {
          if (item[key] !== value) {
            return false;
          }
        }
        return true;
      });

      console.log(`✅ [V3] Found ${filtered.length} filtered records`);
      return filtered;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 [V3] No data found');
        return [];
      }
      console.error('❌ [V3] Failed to query data:', error);
      return [];
    }
  }
}

// Export singleton instance
export const somniaDatastreamServiceV3 = new SomniaDatastreamServiceV3();
export default somniaDatastreamServiceV3;
