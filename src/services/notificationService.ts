// Real-Time Notification Service for HiBeats
// Twitter-like notification system using Somnia Datastream
// Uses existing somniaDatastreamService for consistency

import { somniaDatastreamService } from '@/services/somniaDatastreamService';

// Notification types (similar to Twitter + NFT/Crypto features)
export type NotificationType = 
  // Social interactions
  | 'like' | 'comment' | 'repost' | 'follow' | 'mention' | 'reply'
  // Financial transactions
  | 'tip' | 'received_somi' | 'sent_somi'
  // NFT activities
  | 'nft_minted' | 'nft_sold' | 'nft_bought' | 'nft_listed' | 'nft_unlisted' | 'nft_offer'
  // Music activities
  | 'music_generated' | 'music_played' | 'music_added_playlist'
  // Music milestones
  | 'music_milestone_plays' | 'music_milestone_listeners' | 'music_trending' | 'music_top_chart' | 'music_viral'
  // System notifications
  | 'achievement' | 'reward' | 'announcement';

export interface Notification {
  id: string;
  timestamp: number;
  notificationType: NotificationType;
  fromUser: string;
  toUser: string;
  postId?: string;
  content?: string;
  metadata?: string;
  isRead: boolean;
  blockNumber?: number;
  transactionHash?: string;
}

interface NotificationMetadata {
  fromUsername?: string;
  fromAvatar?: string;
  postContent?: string;
  postImage?: string;
  amount?: string;
}

const NOTIFICATION_SCHEMA_ID = 'hibeats_notifications_v1';

class NotificationService {
  private activeSubscriptions: Map<string, any> = new Map();
  private notificationCallbacks: Map<string, (notification: Notification) => void> = new Map();
  private notificationCache: Map<string, Notification[]> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 2000; // 2 seconds cache (very fast refresh)
  private readonly POLL_INTERVAL = 3000; // 3 seconds polling (very frequent for real-time feel)
  private readonly RECENT_THRESHOLD = 180000; // 3 minutes for "recent" notifications (longer window)

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

  // ✅ Helper: Get publisher address (the account that writes notifications)
  private async getPublisherAddress(): Promise<string> {
    // Notifications are published by the private key account
    const privateKey = import.meta.env.VITE_PRIVATE_KEY;
    if (privateKey) {
      try {
        const { privateKeyToAccount } = await import('viem/accounts');
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        return account.address;
      } catch (error) {
        console.warn('Could not get private key address:', error);
      }
    }
    return '';
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
        console.log('📦 [NOTIF] Using cached notifications:', cached.length);
        return cached;
      }
    }
    
    console.log('🔔 [NOTIF] Fetching fresh notifications for:', userAddress);
    
    try {
      // ✅ FIX: Read notifications from the publisher address (private key account)
      const publisherAddress = await this.getPublisherAddress();
      
      if (!publisherAddress) {
        console.error('❌ [NOTIF] No publisher address found - cannot read notifications');
        console.error('💡 Make sure VITE_PRIVATE_KEY is set in .env');
        return [];
      }
      
      console.log('📡 [NOTIF] Reading from publisher:', publisherAddress.slice(0, 10) + '...');
      
      // Use getAllPublisherDataForSchema to read from specific publisher
      const allData = await somniaDatastreamService.getAllPublisherDataForSchema(
        NOTIFICATION_SCHEMA_ID,
        publisherAddress
      );
      
      console.log('🔍 [NOTIF] Raw data from datastream:', {
        hasData: !!allData,
        isArray: Array.isArray(allData),
        length: allData?.length || 0,
        firstItemType: allData?.[0] ? typeof allData[0] : 'undefined',
        firstItemKeys: allData?.[0] && typeof allData[0] === 'object' ? Object.keys(allData[0]) : [],
        firstItemSample: allData?.[0], // ✅ ADD: Log actual first item
        userAddress: userAddress.toLowerCase()
      });
      
      if (!allData || allData.length === 0) {
        console.log('📭 [NOTIF] No notifications found in datastream');
        const emptyResult: Notification[] = [];
        this.notificationCache.set(cacheKey, emptyResult);
        this.lastFetchTime.set(cacheKey, now);
        return emptyResult;
      }

      // ✅ FIX: Filter and map to Notification type with better error handling
      const notifications: Notification[] = allData
        .map((item: any) => {
          try {
            // Helper to extract value from nested structure
            const extractValue = (val: any): any => {
              if (val && typeof val === 'object' && 'value' in val) {
                return extractValue(val.value);
              }
              return val;
            };
            
            // ✅ Handle different data formats from datastream
            // Format 1: Already decoded object with properties (from somniaDatastreamService)
            // This is the most common format after our fix
            if (item.toUser && item.fromUser && item.notificationType) {
              return {
                id: item.id || `notif_${item.timestamp}_${item.fromUser}`,
                timestamp: Number(item.timestamp) || Date.now(),
                notificationType: (item.notificationType || 'like') as NotificationType,
                fromUser: item.fromUser || '',
                toUser: item.toUser || '',
                postId: item.postId || '',
                content: item.content || '',
                metadata: item.metadata || '',
                isRead: Boolean(item.isRead),
                blockNumber: item.blockNumber,
                transactionHash: item.transactionHash,
              };
            }
            
            // Format 2: Array of objects with name/value (from SDK - rare)
            // Example: [{name: 'timestamp', value: {value: 123}}, {name: 'notificationType', value: {value: 'like'}}, ...]
            if (Array.isArray(item) && item.length >= 8 && item[0]?.name === 'timestamp') {
              const timestamp = extractValue(item[0].value);
              const notificationType = extractValue(item[1].value);
              const fromUser = extractValue(item[2].value);
              const toUser = extractValue(item[3].value);
              const postId = extractValue(item[4].value);
              const content = extractValue(item[5].value);
              const metadata = extractValue(item[6].value);
              const isRead = extractValue(item[7].value);
              
              return {
                id: `notif_${timestamp}_${fromUser}`,
                timestamp: Number(timestamp) || Date.now(),
                notificationType: (notificationType || 'like') as NotificationType,
                fromUser: String(fromUser || ''),
                toUser: String(toUser || ''),
                postId: String(postId || ''),
                content: String(content || ''),
                metadata: String(metadata || ''),
                isRead: Boolean(isRead),
              };
            }
            
            // Format 3: Simple array format [timestamp, notificationType, fromUser, toUser, postId, content, metadata, isRead]
            if (Array.isArray(item) && item.length >= 8 && typeof item[0] !== 'object') {
              return {
                id: `notif_${extractValue(item[0])}_${extractValue(item[2])}`,
                timestamp: Number(extractValue(item[0])) || Date.now(),
                notificationType: (extractValue(item[1]) || 'like') as NotificationType,
                fromUser: extractValue(item[2]) || '',
                toUser: extractValue(item[3]) || '',
                postId: extractValue(item[4]) || '',
                content: extractValue(item[5]) || '',
                metadata: extractValue(item[6]) || '',
                isRead: Boolean(extractValue(item[7])),
              };
            }
            
            // ✅ FIX: Log full item structure for debugging (only first time)
            if (notifications.length === 0) {
              console.warn('⚠️ [NOTIF] Unknown data format - Full item:', item);
              console.warn('⚠️ [NOTIF] Item keys:', Object.keys(item));
              console.warn('⚠️ [NOTIF] Item values:', Object.values(item));
            }
            return null;
          } catch (error) {
            console.error('❌ [NOTIF] Failed to map notification:', error, item);
            return null;
          }
        })
        .filter((n) => n !== null)
        .filter((n: any) => {
          // Filter by toUser
          const matches = n.toUser.toLowerCase() === userAddress.toLowerCase();
          
          // if (matches) {
          //   console.log('✅ [NOTIF] Match found:', {
          //     type: n.notificationType,
          //     from: n.fromUser.slice(0, 10),
          //     to: n.toUser.slice(0, 10),
          //     timestamp: new Date(n.timestamp).toLocaleString()
          //   });
          // }
          
          return matches;
        })
        .sort((a: any, b: any) => b.timestamp - a.timestamp)
        .slice(0, limit) as Notification[];

      console.log(`✅ [NOTIF] Loaded ${notifications.length} notifications for ${userAddress.slice(0, 10)}...`);
      
      // Log first few notifications for debugging
      if (notifications.length > 0) {
        console.log('📋 [NOTIF] First 3 notifications:', notifications.slice(0, 3).map(n => ({
          type: n.notificationType,
          from: n.fromUser.slice(0, 10),
          timestamp: new Date(n.timestamp).toLocaleString()
        })));
      }
      
      // Update cache
      this.notificationCache.set(cacheKey, notifications);
      this.lastFetchTime.set(cacheKey, now);
      
      return notifications;
    } catch (error: any) {
      console.error('❌ [NOTIF] Failed to get notifications:', error);
      console.error('Error details:', error?.message, error?.stack);
      // Return cached data if available
      return this.notificationCache.get(cacheKey) || [];
    }
  }

  // Create and send a notification (✅ MULTI-PUBLISHER SUPPORT)
  async sendNotification(
    type: NotificationType,
    fromUser: string,
    toUser: string,
    options: {
      postId?: string;
      content?: string;
      metadata?: NotificationMetadata;
      walletClient?: any; // ✅ NEW: Optional wallet client for user wallet
    } = {}
  ): Promise<boolean> {
    console.log(`🔔 [NOTIF] Sending ${type} notification:`, { fromUser, toUser, postId: options.postId });
    
    try {
      const timestamp = Date.now();
      const notificationId = `notif_${type}_${timestamp}_${fromUser}_${toUser}`;
      
      // ✅ Determine which wallet to use
      const useUserWallet = !!options.walletClient;
      const walletType = useUserWallet ? 'USER' : 'SERVER';
      
      console.log(`🔔 [NOTIF] Using ${walletType} wallet for notification`);
      
      // ✅ FIX: Use correct data format matching schema
      // Schema: uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead
      const notificationData = {
        id: notificationId,
        timestamp: timestamp, // Keep as number, will be converted to string by publishToSchema
        notificationType: type,
        fromUser: fromUser.toLowerCase(),
        toUser: toUser.toLowerCase(),
        postId: options.postId || '',
        content: options.content || '',
        metadata: JSON.stringify(options.metadata || {}),
        isRead: false,
      };
      
      console.log('📤 [NOTIF] Publishing notification data:', notificationData);
      
      // ✅ Use datastream service with wallet client if provided
      let txHash: string | undefined;
      
      if (useUserWallet) {
        // Use v3 service for user wallet
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        txHash = await somniaDatastreamServiceV3.publishToSchema(
          NOTIFICATION_SCHEMA_ID,
          notificationData,
          options.walletClient
        );
      } else {
        // Use regular service for server wallet
        txHash = await somniaDatastreamService.publishToSchema(
          NOTIFICATION_SCHEMA_ID,
          notificationData
        );
      }

      if (txHash) {
        console.log(`✅ [NOTIF] Notification sent: ${type} from ${fromUser.slice(0,6)}... to ${toUser.slice(0,6)}...`);
        console.log(`   TX: ${txHash}`);
        console.log(`   Wallet: ${walletType}`);
        
        // Clear cache for recipient to force refresh
        this.clearCache(toUser);
        
        return true;
      }
      
      console.warn('⚠️ [NOTIF] No transaction hash returned');
      return false;
    } catch (error) {
      console.error('❌ [NOTIF] Failed to send notification:', error);
      return false;
    }
  }

  // Mark notification as read (update in blockchain)
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      console.log(`🔔 [NOTIF] Marking notification as read: ${notificationId}`);
      
      // Find the notification in cache
      let targetNotification: Notification | null = null;
      for (const [_, notifications] of this.notificationCache) {
        const found = notifications.find(n => n.id === notificationId);
        if (found) {
          targetNotification = found;
          break;
        }
      }
      
      if (!targetNotification) {
        console.warn('⚠️ [NOTIF] Notification not found in cache:', notificationId);
        return false;
      }
      
      // Update notification with isRead = true
      const updatedNotification = {
        ...targetNotification,
        isRead: true,
      };
      
      // Publish updated notification to blockchain
      const txHash = await somniaDatastreamService.publishToSchema(
        NOTIFICATION_SCHEMA_ID,
        updatedNotification
      );
      
      if (txHash) {
        console.log(`✅ [NOTIF] Notification marked as read on blockchain: ${notificationId}`);
        // Clear cache to force refresh
        this.clearCache(targetNotification.toUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [NOTIF] Failed to mark as read:', error);
      return false;
    }
  }

  async markAllAsRead(userAddress: string): Promise<void> {
    try {
      console.log(`🔔 [NOTIF] Marking all notifications as read for: ${userAddress}`);
      
      const notifications = await this.getUserNotifications(userAddress, 100, true);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      console.log(`📝 [NOTIF] Found ${unreadNotifications.length} unread notifications`);
      
      // Update all unread notifications
      const updatePromises = unreadNotifications.map(async (notif) => {
        const updatedNotification = {
          ...notif,
          isRead: true,
        };
        
        return somniaDatastreamService.publishToSchema(
          NOTIFICATION_SCHEMA_ID,
          updatedNotification
        );
      });
      
      await Promise.all(updatePromises);
      
      console.log(`✅ [NOTIF] All notifications marked as read`);
      // Clear cache to force refresh
      this.clearCache(userAddress);
    } catch (error) {
      console.error('❌ [NOTIF] Failed to mark all as read:', error);
    }
  }

  // Subscribe to real-time notifications (WebSocket + polling fallback)
  subscribeToUserNotifications(
    userAddress: string,
    callback: (notification: Notification) => void
  ): string {
    const subscriptionId = `notif_sub_${userAddress}_${Date.now()}`;
    
    this.notificationCallbacks.set(subscriptionId, callback);
    
    let lastNotificationId: string | null = null;
    let websocketActive = false;
    
    // Try WebSocket first with timeout
    const setupWebSocket = async () => {
      try {
        console.log('🔌 [NOTIF] Setting up WebSocket subscription...');
        
        const publisherAddress = await this.getPublisherAddress();
        if (!publisherAddress) {
          console.warn('⚠️ [NOTIF] No publisher address, falling back to polling');
          setupPolling();
          return;
        }
        
        // Set timeout for WebSocket setup (3 seconds)
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn('⚠️ [NOTIF] WebSocket setup timeout, falling back to polling');
            resolve(null);
          }, 3000);
        });
        
        // Subscribe to datastream events
        const subscribePromise = somniaDatastreamService.subscribeToSchemaUpdates(
          NOTIFICATION_SCHEMA_ID,
          publisherAddress,
          (data: any) => {
            try {
              console.log('🔔 [NOTIF] WebSocket event received:', data);
              
              // Parse notification from event data
              const notification = this.parseNotificationFromEvent(data);
              
              if (notification && notification.toUser.toLowerCase() === userAddress.toLowerCase()) {
                const isNew = lastNotificationId !== notification.id;
                const isRecent = Date.now() - notification.timestamp < this.RECENT_THRESHOLD;
                
                if (isNew && isRecent) {
                  console.log('🔔 [NOTIF] New notification via WebSocket:', notification.notificationType);
                  lastNotificationId = notification.id;
                  callback(notification);
                  
                  // Play notification sound
                  this.playNotificationSound();
                }
              }
            } catch (error) {
              console.error('❌ [NOTIF] WebSocket event parsing error:', error);
            }
          }
        );
        
        const unsubscribe = await Promise.race([subscribePromise, timeoutPromise]);
        
        if (unsubscribe) {
          websocketActive = true;
          this.activeSubscriptions.set(subscriptionId, { 
            type: 'websocket', 
            unsubscribe 
          });
          console.log(`✅ [NOTIF] WebSocket active for ${userAddress}`);
          
          // Still do initial poll to get existing notifications
          const notifications = await this.getUserNotifications(userAddress, 10, true);
          if (notifications.length > 0) {
            lastNotificationId = notifications[0].id;
          }
        } else {
          console.warn('⚠️ [NOTIF] WebSocket setup failed or timed out, falling back to polling');
          setupPolling();
        }
      } catch (error) {
        console.error('❌ [NOTIF] WebSocket setup error:', error);
        setupPolling();
      }
    };
    
    // Optimized polling with visibility detection
    const setupPolling = () => {
      let isTabVisible = !document.hidden;
      
      // Listen for visibility changes
      const handleVisibilityChange = () => {
        isTabVisible = !document.hidden;
        if (isTabVisible) {
          console.log('👁️ [NOTIF] Tab visible, resuming active polling');
          // Immediate poll when tab becomes visible
          poll();
        } else {
          console.log('👁️ [NOTIF] Tab hidden, reducing polling frequency');
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      const poll = async () => {
        try {
          // Skip polling if tab is hidden (save resources)
          if (!isTabVisible) {
            return;
          }
          
          // Use fresh data (bypass cache) for polling to ensure we get latest
          const notifications = await this.getUserNotifications(userAddress, 10, false);
          
          if (notifications.length > 0) {
            const latestNotif = notifications[0];
            
            const isNew = lastNotificationId !== latestNotif.id;
            const isRecent = Date.now() - latestNotif.timestamp < this.RECENT_THRESHOLD;
            
            if (isNew && isRecent) {
              console.log('🔔 [NOTIF] New notification (polling):', latestNotif.notificationType);
              lastNotificationId = latestNotif.id;
              callback(latestNotif);
              
              // Play notification sound
              this.playNotificationSound();
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
      this.activeSubscriptions.set(subscriptionId, { 
        type: 'polling', 
        interval: pollInterval,
        cleanup: () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      });
      console.log(`✅ [NOTIF] Smart polling active for ${userAddress} (every ${this.POLL_INTERVAL/1000}s when visible)`);
    };
    
    // Start with polling (more reliable for now)
    // WebSocket will be enabled once we have correct contract address from Somnia
    setupPolling();
    
    // TODO: Enable WebSocket when contract address is confirmed
    // setupWebSocket();
    
    return subscriptionId;
  }
  
  // Helper to parse notification from WebSocket event
  private parseNotificationFromEvent(data: any): Notification | null {
    try {
      // Handle different event formats
      if (data.toUser && data.fromUser && data.notificationType) {
        return {
          id: data.id || `notif_${data.timestamp}_${data.fromUser}`,
          timestamp: Number(data.timestamp) || Date.now(),
          notificationType: data.notificationType as NotificationType,
          fromUser: data.fromUser,
          toUser: data.toUser,
          postId: data.postId || '',
          content: data.content || '',
          metadata: data.metadata || '',
          isRead: Boolean(data.isRead),
        };
      }
      return null;
    } catch (error) {
      console.error('❌ [NOTIF] Failed to parse event:', error);
      return null;
    }
  }
  
  // Play notification sound
  private playNotificationSound(): void {
    try {
      // Use Web Audio API to generate notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for the main tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set frequency (E6 note - 1318.51 Hz - pleasant notification sound)
      oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime);
      
      // Create envelope (attack-decay-sustain-release)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3); // Decay
      
      // Start and stop
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Clean up
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
      };
      
      console.log('🔔 [NOTIF] Sound played');
    } catch (error) {
      console.warn('⚠️ [NOTIF] Sound playback error:', error);
    }
  }

  // Unsubscribe from notifications
  unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    
    if (subscription) {
      if (subscription.type === 'polling' && subscription.interval) {
        clearInterval(subscription.interval);
        // Cleanup visibility listener if exists
        if (subscription.cleanup) {
          subscription.cleanup();
        }
        console.log(`✅ Unsubscribed (polling): ${subscriptionId}`);
      } else if (subscription.type === 'websocket' && subscription.unsubscribe) {
        subscription.unsubscribe();
        console.log(`✅ Unsubscribed (websocket): ${subscriptionId}`);
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

  // Clear cache for a user
  clearCache(userAddress?: string): void {
    if (userAddress) {
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
    this.activeSubscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });
    
    this.activeSubscriptions.clear();
    this.notificationCallbacks.clear();
    this.notificationCache.clear();
    this.lastFetchTime.clear();
    console.log('🔌 Notification service disconnected');
  }

  // Helper methods for specific notification types (✅ MULTI-PUBLISHER SUPPORT)
  async notifyLike(fromUser: string, toUser: string, postId: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    return this.sendNotification('like', fromUser, toUser, { postId, metadata, walletClient });
  }

  async notifyComment(fromUser: string, toUser: string, postId: string, content: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    return this.sendNotification('comment', fromUser, toUser, { postId, content, metadata, walletClient });
  }

  async notifyRepost(fromUser: string, toUser: string, postId: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    return this.sendNotification('repost', fromUser, toUser, { postId, metadata, walletClient });
  }

  async notifyFollow(fromUser: string, toUser: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    return this.sendNotification('follow', fromUser, toUser, { metadata, walletClient });
  }

  async notifyMention(fromUser: string, toUser: string, postId: string, content: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    return this.sendNotification('mention', fromUser, toUser, { postId, content, metadata, walletClient });
  }

  async notifyTip(fromUser: string, toUser: string, postId: string, amount: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, amount };
    return this.sendNotification('tip', fromUser, toUser, { postId, metadata: meta, walletClient });
  }

  async notifyReceivedSomi(fromUser: string, toUser: string, amount: string, txHash?: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, amount, txHash };
    return this.sendNotification('received_somi', fromUser, toUser, { metadata: meta, walletClient });
  }

  async notifyNftMinted(owner: string, tokenId: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId };
    return this.sendNotification('nft_minted', owner, owner, { metadata: meta, walletClient });
  }

  async notifyMusicGenerated(owner: string, taskId: string, title: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, taskId, title };
    return this.sendNotification('music_generated', owner, owner, { metadata: meta, walletClient });
  }

  async notifyMusicMilestonePlays(artist: string, tokenId: string, playCount: number, milestone: string, metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId, playCount: playCount.toString(), milestone };
    return this.sendNotification('music_milestone_plays', artist, artist, { 
      content: `${playCount} plays`, 
      metadata: meta,
      walletClient
    });
  }

  async notifyMusicTopChart(artist: string, tokenId: string, rank: number, chartType: string = 'Top 100', metadata?: NotificationMetadata, walletClient?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId, rank: rank.toString(), chartType };
    return this.sendNotification('music_top_chart', artist, artist, { 
      content: `${chartType} - Rank #${rank}`, 
      metadata: meta,
      walletClient
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

// ✅ DEBUG: Expose to window for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).debugNotifications = async (userAddress?: string) => {
    console.log('🔧 [DEBUG] Starting notification debug...\n');
    
    try {
      // Step 1: Connect
      console.log('📋 Step 1: Connect notification service');
      await notificationService.connect();
      console.log('✅ Connected\n');
      
      // Step 2: Get publisher address
      console.log('📋 Step 2: Get publisher address');
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      if (!privateKey) {
        console.error('❌ VITE_PRIVATE_KEY not found!');
        return;
      }
      
      const { privateKeyToAccount } = await import('viem/accounts');
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      console.log('✅ Publisher:', account.address, '\n');
      
      // Step 3: Get user address
      console.log('📋 Step 3: Get user address');
      const targetAddress = userAddress || account.address;
      console.log('✅ Target user:', targetAddress, '\n');
      
      // Step 4: Fetch notifications
      console.log('📋 Step 4: Fetch notifications');
      const notifications = await notificationService.getUserNotifications(targetAddress, 50, false);
      console.log('✅ Found:', notifications.length, 'notifications\n');
      
      if (notifications.length > 0) {
        console.log('📊 First 5 notifications:');
        notifications.slice(0, 5).forEach((n, i) => {
          console.log(`  ${i + 1}. [${n.notificationType}] from ${n.fromUser.slice(0, 10)}... to ${n.toUser.slice(0, 10)}...`);
          console.log(`     at ${new Date(n.timestamp).toLocaleString()}`);
          if (n.content) console.log(`     content: "${n.content}"`);
        });
      } else {
        console.log('📭 No notifications found for this user');
        console.log('💡 Try test user: debugNotifications("0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1")');
      }
      
      console.log('\n✅ Debug completed!');
      return notifications;
      
    } catch (error: any) {
      console.error('❌ Debug failed:', error);
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  };
  
  console.log('💡 Debug function available: window.debugNotifications(userAddress?)');
}
