// Playlist Interaction Service
// Handles playlist social features: follows, likes, plays
// Separate from main playlist service for scalability

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, keccak256, toBytes, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from '@/lib/web3-config';

// ===== TYPES =====

export type PlaylistInteractionType = 'follow' | 'unfollow' | 'like' | 'unlike' | 'play';

export interface PlaylistInteraction {
  id: string;
  playlistId: string;
  userAddress: string;
  interactionType: PlaylistInteractionType;
  timestamp: number;
}

export interface PlaylistStats {
  playlistId: string;
  followerCount: number;
  likeCount: number;
  playCount: number;
  followers: string[];
}

// ===== SERVICE =====

class PlaylistInteractionService {
  private sdk: SDK | null = null;
  private publicClient: any = null;
  private walletClient: any = null;
  private schemaId: Hex | null = null;
  
  // Cache
  private statsCache: Map<string, PlaylistStats> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor() {
    this.initializeClients();
  }

  // ===== INITIALIZATION =====

  private initializeClients(): void {
    try {
      const RPC_URL = import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

      this.publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(RPC_URL),
      });

      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account,
          chain: somniaTestnet,
          transport: http(RPC_URL),
        });
      }

      console.log('✅ [PLAYLIST-INTERACTION] Clients initialized');
    } catch (error) {
      console.error('❌ [PLAYLIST-INTERACTION] Failed to initialize clients:', error);
    }
  }

  async connect(externalWalletClient?: any): Promise<void> {
    try {
      if (externalWalletClient && !this.walletClient) {
        this.walletClient = externalWalletClient;
      }

      this.sdk = new SDK({
        public: this.publicClient,
        wallet: this.walletClient,
      });

      // Schema: uint64 timestamp, string playlistId, address userAddress, string interactionType
      const interactionSchema = 'uint64 timestamp, string playlistId, address userAddress, string interactionType';
      this.schemaId = await this.sdk.streams.computeSchemaId(interactionSchema);

      console.log('✅ [PLAYLIST-INTERACTION] SDK initialized');
      console.log(`🔑 [PLAYLIST-INTERACTION] Schema ID: ${this.schemaId}`);
    } catch (error) {
      console.error('❌ [PLAYLIST-INTERACTION] Failed to initialize SDK:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.sdk !== null && this.schemaId !== null;
  }

  // ===== HELPER METHODS =====

  private async getPublisherAddress(): Promise<string> {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (privateKey) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      return account.address;
    }
    return '';
  }

  private async getPrivateKeySDK(): Promise<SDK> {
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VITE_PRIVATE_KEY not found');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const wallet = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
    });

    return new SDK({
      public: this.publicClient,
      wallet: wallet,
    });
  }

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  // ===== RECORD INTERACTION =====

  async recordInteraction(
    playlistId: string,
    userAddress: string,
    interactionType: PlaylistInteractionType,
    walletClient?: any
  ): Promise<boolean> {
    if (!this.sdk || !this.schemaId) {
      throw new Error('SDK not initialized');
    }

    try {
      const timestamp = Date.now();
      
      // Use USER wallet if provided, otherwise SERVER wallet
      const sdk = walletClient 
        ? new SDK({ public: this.publicClient, wallet: walletClient })
        : await this.getPrivateKeySDK();

      const walletType = walletClient ? 'USER' : 'SERVER';
      console.log(`📝 [PLAYLIST-INTERACTION] Recording ${interactionType} (${walletType} wallet)`);

      const interactionSchema = 'uint64 timestamp, string playlistId, address userAddress, string interactionType';
      const encoder = new SchemaEncoder(interactionSchema);

      const streamId = keccak256(toBytes(`playlist_interaction_${playlistId}_${userAddress}_${timestamp}`));
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: timestamp.toString(), type: 'uint64' },
        { name: 'playlistId', value: playlistId, type: 'string' },
        { name: 'userAddress', value: userAddress, type: 'address' },
        { name: 'interactionType', value: interactionType, type: 'string' }
      ]);

      await sdk.streams.set([{
        id: streamId,
        schemaId: this.schemaId!,
        data: encodedData as Hex
      }]);

      console.log(`✅ [PLAYLIST-INTERACTION] ${interactionType} recorded`);
      
      // Clear cache for this playlist
      this.statsCache.delete(playlistId);
      
      return true;
    } catch (error) {
      console.error('❌ [PLAYLIST-INTERACTION] Failed to record:', error);
      return false;
    }
  }

  // ===== GET PLAYLIST STATS =====

  async getPlaylistStats(playlistId: string, forceRefresh: boolean = false): Promise<PlaylistStats> {
    if (!this.sdk || !this.schemaId) {
      throw new Error('SDK not initialized');
    }

    // Check cache
    if (!forceRefresh && this.isCacheValid() && this.statsCache.has(playlistId)) {
      return this.statsCache.get(playlistId)!;
    }

    try {
      const publisherAddress = await this.getPublisherAddress();
      const allData = await this.sdk.streams.getAllPublisherDataForSchema(
        this.schemaId,
        publisherAddress as `0x${string}`
      );

      const followers = new Set<string>();
      let likeCount = 0;
      let playCount = 0;

      if (allData && Array.isArray(allData)) {
        for (const item of allData) {
          try {
            const interaction = this.parseInteractionData(item);
            if (interaction && interaction.playlistId === playlistId) {
              switch (interaction.interactionType) {
                case 'follow':
                  followers.add(interaction.userAddress.toLowerCase());
                  break;
                case 'unfollow':
                  followers.delete(interaction.userAddress.toLowerCase());
                  break;
                case 'like':
                  likeCount++;
                  break;
                case 'unlike':
                  likeCount = Math.max(0, likeCount - 1);
                  break;
                case 'play':
                  playCount++;
                  break;
              }
            }
          } catch (error) {
            // Skip invalid records
          }
        }
      }

      const stats: PlaylistStats = {
        playlistId,
        followerCount: followers.size,
        likeCount,
        playCount,
        followers: Array.from(followers)
      };

      // Update cache
      this.statsCache.set(playlistId, stats);
      this.cacheTimestamp = Date.now();

      return stats;
    } catch (error) {
      console.error('❌ [PLAYLIST-INTERACTION] Failed to get stats:', error);
      return {
        playlistId,
        followerCount: 0,
        likeCount: 0,
        playCount: 0,
        followers: []
      };
    }
  }

  // ===== CHECK USER INTERACTIONS =====

  async isFollowing(playlistId: string, userAddress: string): Promise<boolean> {
    const stats = await this.getPlaylistStats(playlistId);
    return stats.followers.includes(userAddress.toLowerCase());
  }

  // ===== PARSE HELPER =====

  private parseInteractionData(item: any): PlaylistInteraction | null {
    try {
      const extractValue = (val: any): any => {
        if (val && typeof val === 'object' && 'value' in val) {
          return extractValue(val.value);
        }
        return val;
      };

      let timestampValue, playlistIdValue, userAddressValue, interactionTypeValue;

      const itemAny = item as any;

      if (itemAny.playlistId && itemAny.userAddress) {
        timestampValue = itemAny.timestamp;
        playlistIdValue = itemAny.playlistId;
        userAddressValue = itemAny.userAddress;
        interactionTypeValue = itemAny.interactionType;
      } else if (Array.isArray(itemAny)) {
        timestampValue = extractValue(itemAny.find((i: any) => i.name === 'timestamp')?.value);
        playlistIdValue = extractValue(itemAny.find((i: any) => i.name === 'playlistId')?.value);
        userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
        interactionTypeValue = extractValue(itemAny.find((i: any) => i.name === 'interactionType')?.value);
      }

      if (!playlistIdValue || !userAddressValue || !interactionTypeValue) {
        return null;
      }

      return {
        id: `${playlistIdValue}_${userAddressValue}_${timestampValue}`,
        playlistId: String(playlistIdValue),
        userAddress: String(userAddressValue),
        interactionType: String(interactionTypeValue) as PlaylistInteractionType,
        timestamp: Number(timestampValue) || Date.now()
      };
    } catch (error) {
      console.error('❌ [PLAYLIST-INTERACTION] Parse error:', error);
      return null;
    }
  }

  // ===== CLEAR CACHE =====

  clearCache(): void {
    this.statsCache.clear();
    this.cacheTimestamp = 0;
    console.log('🗑️ [PLAYLIST-INTERACTION] Cache cleared');
  }
}

// Export singleton
export const playlistInteractionService = new PlaylistInteractionService();
export default playlistInteractionService;
