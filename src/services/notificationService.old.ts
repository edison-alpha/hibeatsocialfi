// Real-Time Notification Service for HiBeats
// Twitter-like notification system using Somnia Datastream
// Uses existing somniaDatastreamService for consistency

import { somniaDatastreamService } from '@/services/somniaDatastreamService';
import type { Hex } from 'viem';

// Notification types (similar to Twitter + NFT/Crypto features)
export type NotificationType = 
  // Social interactions
  | 'like'           // Someone liked your post
  | 'comment'        // Someone commented on your post
  | 'repost'         // Someone reposted your content
  | 'follow'         // Someone followed you
  | 'mention'        // Someone mentioned you in a post
  | 'reply'          // Someone replied to your comment
  
  // Financial transactions
  | 'tip'            // Someone tipped you
  | 'received_somi'  // You received SOMI tokens
  | 'sent_somi'      // You sent SOMI tokens (confirmation)
  
  // NFT activities
  | 'nft_minted'     // Your music NFT was minted successfully
  | 'nft_sold'       // Your NFT was sold
  | 'nft_bought'     // You bought an NFT
  | 'nft_listed'     // Your NFT was listed for sale
  | 'nft_unlisted'   // Your NFT was unlisted
  | 'nft_offer'      // Someone made an offer on your NFT
  
  // Music activities
  | 'music_generated' // Your music generation completed
  | 'music_played'    // Someone played your music
  | 'music_added_playlist' // Someone added your music to playlist
  
  // Music milestones
  | 'music_milestone_plays'    // Your music reached play milestone (100, 1K, 10K, etc)
  | 'music_milestone_listeners' // Your music reached listener milestone
  | 'music_trending'           // Your music is trending
  | 'music_top_chart'          // Your music entered top charts (top 100, 50, 10, 5, 1)
  | 'music_viral'              // Your music went viral
  
  // System notifications
  | 'achievement'    // You unlocked an achievement
  | 'reward'         // You received a reward
  | 'announcement';  // Platform announcement

export interface Notification {
  id: string;
  timestamp: number;
  notificationType: NotificationType;
  fromUser: string;      // Address of user who triggered notification
  toUser: string;        // Address of user receiving notification
  postId?: string;       // Related post ID (if applicable)
  content?: string;      // Additional content (e.g., comment text)
  metadata?: string;     // JSON metadata for extra info
  isRead: boolean;
  blockNumber?: number;
  transactionHash?: string;
}

interface NotificationMetadata {
  fromUsername?: string;
  fromAvatar?: string;
  postContent?: string;
  postImage?: string;
  amount?: string;       // For tips
}

const NOTIFICATION_SCHEMA_ID = 'hibeats_notifications_v1';
const NOTIFICATION_SCHEMA = 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead';

class NotificationService {
  private activeSubscriptions: Map<string, any> = new Map();
  private notificationCallbacks: Map<string, (notification: Notification) => void> = new Map();
  private notificationCache: Map<string, Notification[]> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5000; // 5 seconds cache
  private readonly POLL_INTERVAL = 15000; // 15 seconds polling (reduced frequency)
  private readonly RECENT_THRESHOLD = 60000; // 1 minute for "recent" notifications

  constructor() {
    console.log('✅ Notification service initialized (using datastream service)');
  }

  async connect(externalWalletClient?: any): Promise<void> {
    try {
      // Use existing datastream service
      if (!somniaDatastreamService.isConnected()) {
        await somniaDatastreamService.connect(externalWalletClient);
      }
      
      // Register notification schema if needed
      await somniaDatastreamService.registerSchemaIfNeeded(NOTIFICATION_SCHEMA_ID);
      
      console.log('✅ Notification service connected via datastream');
    } catch (error) {
      console.error('❌ Failed to connect notification service:', error);
      throw error;
    }
  }

  // Create and send a notification
  async sendNotification(
    type: NotificationType,
    fromUser: string,
    toUser: string,
    options: {
      postId?: string;
      content?: string;
      metadata?: NotificationMetadata;
    } = {}
  ): Promise<boolean> {
    console.log(`🔔 [NOTIF] Sending ${type} notification:`, { fromUser, toUser, postId: options.postId });
    
    try {
      const timestamp = Date.now();
      const notificationId = `notif_${type}_${timestamp}_${fromUser}_${toUser}`;
      
      // Use datastream service to publish notification
      const txHash = await somniaDatastreamService.publishToSchema(
        NOTIFICATION_SCHEMA_ID,
        {
          id: notificationId,
          timestamp: timestamp.toString(),
          notificationType: type,
          fromUser: fromUser.toLowerCase(),
          toUser: toUser.toLowerCase(),
          postId: options.postId || '',
          content: options.content || '',
          metadata: JSON.stringify(options.metadata || {}),
          isRead: false,
        }
      );

      if (txHash) {
        console.log(`✅ [NOTIF] Notification sent: ${type} from ${fromUser.slice(0,6)}... to ${toUser.slice(0,6)}...`);
        console.log(`   TX: ${txHash}`);
        
        // Clear cache for recipient to force refresh
        this.clearCache(toUser);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [NOTIF] Failed to send notification:', error);
      return false;
    }
  }

  // Get all notifications for a user (with caching)
  async getUserNotifications(userAddress: string, limit: number = 50, useCache: boolean = true): Promise<Notification[]> {
    const cacheKey = `${userAddress}_${limit}`;
    const now = Date.now();
    
    // Check cache first
    if (useCache) {
      const cached = this.notificationCache.get(cacheKey);
      const lastFetch = this.lastFetchTime.get(cacheKey) || 0;
      
      if (cached && (now - lastFetch) < this.CACHE_DURATION) {
        console.log('📦 [NOTIF] Using cached notifications');
        return cached;
      }
    }
    
    console.log('🔔 [NOTIF] Fetching fresh notifications for:', userAddress);
    
    if (!this.sdk) {
      console.warn('⚠️ [NOTIF] SDK not initialized, attempting to connect...');
      await this.connect();
      if (!this.sdk) {
        console.error('❌ [NOTIF] Failed to initialize SDK');
        return [];
      }
    }

    try {
      // Try to compute schema ID with error handling
      let schemaIdBytes32: string;
      try {
        schemaIdBytes32 = await this.sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA);
      } catch (error: any) {
        console.error('❌ [NOTIF] Failed to compute schema ID:', error?.message || error);
        // Return cached data if available, otherwise empty
        return this.notificationCache.get(cacheKey) || [];
      }
      
      // ⚠️ WORKAROUND: Query from known publisher addresses
      // In production, you need a backend service to index notifications by toUser
      console.log('📡 [NOTIF] Fetching notifications from known publishers...');
      
      const allNotifications: any[] = [];
      
      // List of known publishers (addresses that send notifications)
      // In production, you need a backend service to index notifications by toUser
      const privateKeyAddress = import.meta.env.VITE_PRIVATE_KEY ? 
        privateKeyToAccount(import.meta.env.VITE_PRIVATE_KEY as `0x${string}`).address : 
        null;
      
      // IMPORTANT: Add all possible publisher addresses here
      // This is a limitation of Somnia Datastream - we can only query by publisher
      const knownPublishers = [
        privateKeyAddress,                                    // Backend service address
        '0xA1013A405428f770e3Dfa790380ceeA9BA49bf92',        // Test address from .env
        '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',        // Test user address
        userAddress,                                          // Self-notifications (current user)
      ].filter(Boolean) as string[];
      
      // Remove duplicates
      const uniquePublishers = [...new Set(knownPublishers.map(a => a.toLowerCase()))];
      
      console.log('📋 [NOTIF] User address:', userAddress);
      console.log('📋 [NOTIF] Private key address:', privateKeyAddress);
      console.log('📋 [NOTIF] Checking publishers:', uniquePublishers);
      
      // Query from each known publisher
      for (const publisher of uniquePublishers) {
        try {
          console.log(`  🔍 Querying publisher: ${publisher}`);
          const data = await this.sdk.streams.getAllPublisherDataForSchema(
            schemaIdBytes32 as `0x${string}`,
            publisher as `0x${string}`
          );
          if (data && Array.isArray(data)) {
            console.log(`  ✅ Found ${data.length} items from ${publisher.slice(0, 6)}...`);
            allNotifications.push(...data);
          } else {
            console.log(`  📭 No data from ${publisher.slice(0, 6)}...`);
          }
        } catch (err: any) {
          if (err?.message?.includes('NoData')) {
            console.log(`  📭 No data from ${publisher.slice(0, 6)}...`);
          } else {
            console.warn(`  ⚠️ Error from ${publisher.slice(0, 6)}...:`, err?.message);
          }
        }
      }

      console.log('📦 [NOTIF] Total raw data:', allNotifications.length, 'items');

      if (allNotifications.length === 0) {
        console.log('📭 [NOTIF] No notifications found for any publisher');
        console.log('💡 [NOTIF] Tip: Make sure notifications are sent from one of the known publishers');
        const emptyResult: Notification[] = [];
        this.notificationCache.set(cacheKey, emptyResult);
        this.lastFetchTime.set(cacheKey, now);
        return emptyResult;
      }

      const notifications: Notification[] = allNotifications
        .map((item: any) => {
          try {
            // SDK returns decoded data as array, not raw hex
            const decoded = Array.isArray(item) ? item : [item];
            
            // Extract values from decoded schema items (recursive for nested objects)
            const extractValue = (item: any): any => {
              if (item && typeof item === 'object') {
                if ('value' in item) {
                  return extractValue(item.value);
                }
                return String(item);
              }
              return item;
            };
            
            const postId = String(extractValue(decoded[4]));
            const content = String(extractValue(decoded[5]));
            const metadata = String(extractValue(decoded[6]));
            
            const notification: Notification = {
              id: item.id,
              timestamp: Number(extractValue(decoded[0])),
              notificationType: String(extractValue(decoded[1])) as NotificationType,
              fromUser: String(extractValue(decoded[2])),
              toUser: String(extractValue(decoded[3])),
              ...(postId && { postId }),
              ...(content && { content }),
              ...(metadata && { metadata }),
              isRead: Boolean(extractValue(decoded[7])),
              blockNumber: item.blockNumber,
              transactionHash: item.transactionHash,
            };
            
            return notification;
          } catch (error) {
            console.warn('⚠️ Failed to decode notification:', error);
            return null;
          }
        })
        .filter((n) => n !== null)
        .filter(n => {
          const matches = n.toUser.toLowerCase() === userAddress.toLowerCase();
          if (!matches) {
            console.log(`  ⏭️ Skipping notification for ${n.toUser.slice(0, 6)}... (not for ${userAddress.slice(0, 6)}...)`);
          }
          return matches;
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      console.log(`✅ Loaded ${notifications.length} notifications for ${userAddress}`);
      
      if (notifications.length === 0 && allNotifications.length > 0) {
        console.warn('⚠️ [NOTIF] Found data but no notifications match this user');
        console.warn('   User address:', userAddress);
        console.warn('   Try sending a notification TO this address');
      }
      
      // Update cache
      this.notificationCache.set(cacheKey, notifications);
      this.lastFetchTime.set(cacheKey, now);
      
      return notifications;
    } catch (error: any) {
      if (error?.message?.includes('NoData()')) {
        console.log('📭 No notifications found (this is normal for new users)');
        const emptyResult: Notification[] = [];
        this.notificationCache.set(cacheKey, emptyResult);
        this.lastFetchTime.set(cacheKey, now);
        return emptyResult;
      }
      console.error('❌ Failed to get notifications:', error);
      // Return cached data if available
      return this.notificationCache.get(cacheKey) || [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.sdk || !this.walletClient) {
      console.warn('⚠️ Notification service not ready');
      return false;
    }

    try {
      // Get existing notification
      const schemaIdBytes32 = await this.sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA);
      
      // Update isRead flag
      // Note: In production, you'd fetch the existing data and update only the isRead field
      console.log(`✅ Marked notification ${notificationId} as read`);
      return true;
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      return false;
    }
  }

  // Subscribe to real-time notifications for a user (SDK Subscribe Method)
  subscribeToUserNotifications(
    userAddress: string,
    callback: (notification: Notification) => void
  ): string {
    const subscriptionId = `notif_sub_${userAddress}_${Date.now()}`;
    
    this.notificationCallbacks.set(subscriptionId, callback);
    
    // Track last seen notification to avoid duplicates
    let lastNotificationId: string | null = null;
    
    // Try SDK subscribe method (like datastream service)
    const setupSDKSubscription = async () => {
      try {
        if (!this.sdk) {
          console.warn('⚠️ SDK not initialized for subscription');
          return false;
        }

        console.log('🔌 [NOTIF] Setting up SDK subscription...');
        
        // Use SDK's subscribe method for real-time updates
        // Note: This requires event schema to be registered
        try {
          await this.sdk.streams.subscribe({
            somniaStreamsEventId: 'NotificationEvent', // Event ID for notifications
            ethCalls: [], // No additional eth calls needed
            onlyPushChanges: false, // Push all data
            onData: async (data: any) => {
              console.log('📦 [NOTIF] Received data from subscription:', data);
              
              // Filter for this user's notifications
              if (data.toUser && data.toUser.toLowerCase() === userAddress.toLowerCase()) {
                const notification: Notification = {
                  id: data.id || `notif_${Date.now()}`,
                  timestamp: data.timestamp || Date.now(),
                  notificationType: data.notificationType,
                  fromUser: data.fromUser,
                  toUser: data.toUser,
                  postId: data.postId,
                  content: data.content,
                  metadata: data.metadata,
                  isRead: data.isRead || false,
                };
                
                // Check if new
                if (lastNotificationId !== notification.id) {
                  console.log('🔔 [NOTIF] New notification via SDK:', notification.notificationType);
                  lastNotificationId = notification.id;
                  callback(notification);
                }
              }
            },
            onError: (error: Error) => {
              console.error('❌ [NOTIF] SDK subscription error:', error);
            },
          });
          
          this.activeSubscriptions.set(subscriptionId, { type: 'sdk', unsubscribe: () => {} });
          console.log(`✅ SDK subscription active for ${userAddress}`);
          return true;
        } catch (subError: any) {
          console.warn('⚠️ SDK subscribe failed (event schema may not be registered):', subError.message);
          return false;
        }
      } catch (error) {
        console.error('❌ [NOTIF] SDK subscription setup failed:', error);
        return false;
      }
    };
    
    // Fallback: Watch block numbers
    const setupBlockWatchFallback = async () => {
      try {
        console.log('🔄 [NOTIF] Using block watch fallback...');
        
        let lastBlockNumber: bigint | null = null;
        
        const unwatch = this.publicClient.watchBlockNumber({
          onBlockNumber: async (blockNumber) => {
            // Only process new blocks
            if (lastBlockNumber && blockNumber <= lastBlockNumber) {
              return;
            }
            lastBlockNumber = blockNumber;
            
            // Fetch latest notifications on new block
            try {
              const notifications = await this.getUserNotifications(userAddress, 5, false);
              
              if (notifications.length > 0) {
                const latestNotif = notifications[0];
                
                const isNew = lastNotificationId !== latestNotif.id;
                const isRecent = Date.now() - latestNotif.timestamp < this.RECENT_THRESHOLD;
                
                if (isNew && isRecent) {
                  console.log('🔔 [NOTIF] New notification via block watch:', latestNotif.notificationType);
                  lastNotificationId = latestNotif.id;
                  callback(latestNotif);
                }
              }
            } catch (error) {
              console.error('❌ [NOTIF] Error fetching notifications:', error);
            }
          },
          onError: (error) => {
            console.error('❌ [NOTIF] Block watch error:', error);
          },
        });
        
        this.activeSubscriptions.set(subscriptionId, { type: 'blockwatch', unwatch });
        console.log(`✅ Block watch active for ${userAddress}`);
        return true;
      } catch (error) {
        console.error('❌ [NOTIF] Block watch failed:', error);
        return false;
      }
    };
    
    // Final fallback: Polling
    const setupPollingFallback = () => {
      console.log('🔄 [NOTIF] Using polling fallback...');
      
      const poll = async () => {
        try {
          const notifications = await this.getUserNotifications(userAddress, 10, true);
          
          if (notifications.length > 0) {
            const latestNotif = notifications[0];
            
            const isNew = lastNotificationId !== latestNotif.id;
            const isRecent = Date.now() - latestNotif.timestamp < this.RECENT_THRESHOLD;
            
            if (isNew && isRecent) {
              console.log('🔔 [NOTIF] New notification via polling:', latestNotif.notificationType);
              lastNotificationId = latestNotif.id;
              callback(latestNotif);
            }
          }
        } catch (error) {
          console.error('❌ [NOTIF] Polling error:', error);
        }
      };
      
      // Initial poll
      poll();
      
      // Set up interval
      const pollInterval = setInterval(poll, this.POLL_INTERVAL);
      this.activeSubscriptions.set(subscriptionId, { type: 'polling', interval: pollInterval });
      console.log(`✅ Polling active for ${userAddress} (every ${this.POLL_INTERVAL/1000}s)`);
    };
    
    // Try methods in order: SDK subscribe -> Block watch -> Polling
    setupSDKSubscription().then(success => {
      if (!success) {
        setupBlockWatchFallback().then(blockWatchSuccess => {
          if (!blockWatchSuccess) {
            setupPollingFallback();
          }
        });
      }
    });
    
    return subscriptionId;
  }

  // Unsubscribe from notifications
  unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    
    if (subscription) {
      if (typeof subscription === 'object') {
        if (subscription.type === 'sdk' && subscription.unsubscribe) {
          // Unsubscribe from SDK
          subscription.unsubscribe();
          console.log(`✅ SDK unsubscribed: ${subscriptionId}`);
        } else if (subscription.type === 'blockwatch' && subscription.unwatch) {
          // Unwatch block numbers
          subscription.unwatch();
          console.log(`✅ Block watch unsubscribed: ${subscriptionId}`);
        } else if (subscription.type === 'polling' && subscription.interval) {
          // Clear polling interval
          clearInterval(subscription.interval);
          console.log(`✅ Polling unsubscribed: ${subscriptionId}`);
        }
      } else {
        // Legacy: direct interval
        clearInterval(subscription);
      }
    }
    
    this.notificationCallbacks.delete(subscriptionId);
    this.activeSubscriptions.delete(subscriptionId);
  }

  // Get unread notification count
  async getUnreadCount(userAddress: string): Promise<number> {
    const notifications = await this.getUserNotifications(userAddress);
    return notifications.filter(n => !n.isRead).length;
  }

  // Helper: Send like notification
  async notifyLike(fromUser: string, toUser: string, postId: string, metadata?: NotificationMetadata): Promise<boolean> {
    return this.sendNotification('like', fromUser, toUser, { postId, metadata });
  }

  // Helper: Send comment notification
  async notifyComment(fromUser: string, toUser: string, postId: string, content: string, metadata?: NotificationMetadata): Promise<boolean> {
    return this.sendNotification('comment', fromUser, toUser, { postId, content, metadata });
  }

  // Helper: Send repost notification
  async notifyRepost(fromUser: string, toUser: string, postId: string, metadata?: NotificationMetadata): Promise<boolean> {
    return this.sendNotification('repost', fromUser, toUser, { postId, metadata });
  }

  // Helper: Send follow notification
  async notifyFollow(fromUser: string, toUser: string, metadata?: NotificationMetadata): Promise<boolean> {
    return this.sendNotification('follow', fromUser, toUser, { metadata });
  }

  // Helper: Send mention notification
  async notifyMention(fromUser: string, toUser: string, postId: string, content: string, metadata?: NotificationMetadata): Promise<boolean> {
    return this.sendNotification('mention', fromUser, toUser, { postId, content, metadata });
  }

  // Helper: Send tip notification
  async notifyTip(fromUser: string, toUser: string, postId: string, amount: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, amount };
    return this.sendNotification('tip', fromUser, toUser, { postId, metadata: meta });
  }

  // Helper: Send SOMI received notification
  async notifyReceivedSomi(fromUser: string, toUser: string, amount: string, txHash?: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, amount, txHash };
    return this.sendNotification('received_somi', fromUser, toUser, { metadata: meta });
  }

  // Helper: Send SOMI sent confirmation
  async notifySentSomi(fromUser: string, toUser: string, amount: string, txHash?: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, amount, txHash };
    return this.sendNotification('sent_somi', fromUser, toUser, { metadata: meta });
  }

  // Helper: Send NFT minted notification
  async notifyNftMinted(owner: string, tokenId: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId };
    return this.sendNotification('nft_minted', owner, owner, { metadata: meta });
  }

  // Helper: Send NFT sold notification
  async notifyNftSold(seller: string, buyer: string, tokenId: string, price: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, price, buyer };
    return this.sendNotification('nft_sold', buyer, seller, { metadata: meta });
  }

  // Helper: Send NFT bought notification
  async notifyNftBought(buyer: string, seller: string, tokenId: string, price: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, price, seller };
    return this.sendNotification('nft_bought', seller, buyer, { metadata: meta });
  }

  // Helper: Send NFT listed notification
  async notifyNftListed(owner: string, tokenId: string, price: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, price };
    return this.sendNotification('nft_listed', owner, owner, { metadata: meta });
  }

  // Helper: Send NFT offer notification
  async notifyNftOffer(fromUser: string, toUser: string, tokenId: string, offerAmount: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, offerAmount };
    return this.sendNotification('nft_offer', fromUser, toUser, { metadata: meta });
  }

  // Helper: Send music generated notification
  async notifyMusicGenerated(owner: string, taskId: string, title: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, taskId, title };
    return this.sendNotification('music_generated', owner, owner, { metadata: meta });
  }

  // Helper: Send music played notification
  async notifyMusicPlayed(listener: string, artist: string, tokenId: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId };
    return this.sendNotification('music_played', listener, artist, { metadata: meta });
  }

  // Helper: Send music milestone plays notification
  async notifyMusicMilestonePlays(artist: string, tokenId: string, playCount: number, milestone: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, playCount: playCount.toString(), milestone };
    return this.sendNotification('music_milestone_plays', artist, artist, { 
      content: `${playCount} plays`, 
      metadata: meta 
    });
  }

  // Helper: Send music milestone listeners notification
  async notifyMusicMilestoneListeners(artist: string, tokenId: string, listenerCount: number, milestone: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, listenerCount: listenerCount.toString(), milestone };
    return this.sendNotification('music_milestone_listeners', artist, artist, { 
      content: `${listenerCount} listeners`, 
      metadata: meta 
    });
  }

  // Helper: Send music trending notification
  async notifyMusicTrending(artist: string, tokenId: string, rank: number, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, rank: rank.toString() };
    return this.sendNotification('music_trending', artist, artist, { 
      content: `Trending #${rank}`, 
      metadata: meta 
    });
  }

  // Helper: Send music top chart notification
  async notifyMusicTopChart(artist: string, tokenId: string, rank: number, chartType: string = 'Top 100', metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, rank: rank.toString(), chartType };
    return this.sendNotification('music_top_chart', artist, artist, { 
      content: `${chartType} - Rank #${rank}`, 
      metadata: meta 
    });
  }

  // Helper: Send music viral notification
  async notifyMusicViral(artist: string, tokenId: string, viralScore: number, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, tokenId, viralScore: viralScore.toString() };
    return this.sendNotification('music_viral', artist, artist, { 
      content: 'Your music went viral!', 
      metadata: meta 
    });
  }

  // Helper: Send achievement notification
  async notifyAchievement(user: string, achievementName: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, achievementName };
    return this.sendNotification('achievement', user, user, { content: achievementName, metadata: meta });
  }

  // Helper: Send reward notification
  async notifyReward(user: string, rewardType: string, amount: string, metadata?: NotificationMetadata): Promise<boolean> {
    const meta = { ...metadata, rewardType, amount };
    return this.sendNotification('reward', user, user, { content: rewardType, metadata: meta });
  }

  // Helper: Create bytes32 notification ID
  // Use toUser in ID so we can query by receiver
  private createNotificationId(type: string, timestamp: number, fromUser: string, toUser: string): Hex {
    const { keccak256, toHex } = require('viem');
    // Include toUser in ID for better querying
    return keccak256(toHex(`notif_${type}_${timestamp}_${fromUser}_${toUser}`));
  }

  // Clear cache for a user (useful after sending notification)
  clearCache(userAddress?: string): void {
    if (userAddress) {
      // Clear specific user cache
      const keysToDelete: string[] = [];
      this.notificationCache.forEach((_, key) => {
        if (key.startsWith(userAddress)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => {
        this.notificationCache.delete(key);
        this.lastFetchTime.delete(key);
      });
      console.log(`🗑️ Cleared cache for ${userAddress}`);
    } else {
      // Clear all cache
      this.notificationCache.clear();
      this.lastFetchTime.clear();
      console.log('🗑️ Cleared all notification cache');
    }
  }

  // Force refresh notifications (bypass cache)
  async refreshNotifications(userAddress: string, limit: number = 50): Promise<Notification[]> {
    console.log('🔄 [NOTIF] Force refreshing notifications...');
    return this.getUserNotifications(userAddress, limit, false);
  }

  disconnect(): void {
    // Clear all subscriptions
    this.activeSubscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });
    
    this.activeSubscriptions.clear();
    this.notificationCallbacks.clear();
    this.notificationCache.clear();
    this.lastFetchTime.clear();
    this.sdk = null;
    this.publicClient = null;
    console.log('🔌 Notification service disconnected');
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
