// ✅ REAL-TIME Notification Service with WebSocket Subscriptions
// Replaces polling with true real-time WebSocket subscriptions
// Implements notification grouping and browser push notifications

import { advancedDatastreamService } from '@/services/somniaDatastreamService.advanced';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';

export type NotificationType = 
  | 'like' | 'comment' | 'repost' | 'follow' | 'mention' | 'reply'
  | 'tip' | 'received_somi' | 'sent_somi'
  | 'nft_minted' | 'nft_sold' | 'nft_bought' | 'nft_listed' | 'nft_unlisted' | 'nft_offer'
  | 'music_generated' | 'music_played' | 'music_added_playlist'
  | 'music_milestone_plays' | 'music_milestone_listeners' | 'music_trending' | 'music_top_chart' | 'music_viral'
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

interface NotificationGroup {
  type: NotificationType;
  count: number;
  users: string[];
  latestTimestamp: number;
  postId?: string;
  notifications: Notification[];
}

interface NotificationPreferences {
  likes: boolean;
  comments: boolean;
  reposts: boolean;
  follows: boolean;
  mentions: boolean;
  tips: boolean;
  nft: boolean;
  music: boolean;
  milestones: boolean;
  browserPush: boolean;
}

const NOTIFICATION_SCHEMA_ID = 'hibeats_notifications_v1';

class RealtimeNotificationService {
  private activeSubscriptions: Map<string, any> = new Map();
  private notificationCache: Map<string, Notification[]> = new Map();
  private groupedNotifications: Map<string, NotificationGroup[]> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  
  private readonly CACHE_DURATION = 5000; // 5 seconds
  private readonly GROUP_WINDOW = 300000; // 5 minutes for grouping
  private readonly MAX_GROUP_SIZE = 10;

  constructor() {
    console.log('✅ [REALTIME-NOTIF] Service initialized');
    this.requestBrowserPermission();
  }

  async connect(externalWalletClient?: any): Promise<void> {
    try {
      await advancedDatastreamService.connect(externalWalletClient);
      await somniaDatastreamService.registerSchemaIfNeeded(NOTIFICATION_SCHEMA_ID);
      // Only log once on initial connection
      if (!this.isConnected) {
        console.log('✅ [REALTIME-NOTIF] Connected');
        this.isConnected = true;
      }
    } catch (error) {
      console.error('❌ [REALTIME-NOTIF] Failed to connect:', error);
      throw error;
    }
  }

  private isConnected = false;

  // ===== REAL-TIME SUBSCRIPTIONS (NO POLLING!) =====

  /**
   * Subscribe to real-time notifications using WebSocket
   * No polling - instant updates when new notifications arrive
   */
  subscribeToUserNotifications(
    userAddress: string,
    callback: (notification: Notification) => void
  ): string {
    const subscriptionId = `notif_realtime_${userAddress}_${Date.now()}`;
    
    console.log(`📡 [REALTIME-NOTIF] Setting up WebSocket subscription for ${userAddress.slice(0, 10)}...`);

    try {
      // Subscribe to notification events with user filter
      const subId = advancedDatastreamService.subscribeToEvents(
        'NotificationCreated',
        { fromUser: userAddress },
        {
          onData: (data) => {
            try {
              const notification = this.parseNotification(data);
              
              if (notification && notification.toUser.toLowerCase() === userAddress.toLowerCase()) {
                console.log(`🔔 [REALTIME-NOTIF] New notification via WebSocket:`, notification.notificationType);
                
                // Check preferences
                if (!this.shouldNotify(userAddress, notification.notificationType)) {
                  console.log(`🔕 [REALTIME-NOTIF] Notification filtered by preferences`);
                  return;
                }
                
                // Update cache
                this.addToCache(userAddress, notification);
                
                // Group notification if applicable
                const grouped = this.groupNotification(userAddress, notification);
                
                // Call callback
                callback(notification);
                
                // Show browser notification
                this.showBrowserNotification(notification);
                
                // Play sound
                this.playNotificationSound();
              }
            } catch (error) {
              console.error('❌ [REALTIME-NOTIF] Failed to process notification:', error);
            }
          },
          onError: (error) => {
            console.error('❌ [REALTIME-NOTIF] WebSocket error:', error);
            // Fallback to polling if WebSocket fails
            this.setupPollingFallback(userAddress, callback, subscriptionId);
          }
        }
      );

      this.activeSubscriptions.set(subscriptionId, { 
        type: 'websocket', 
        subId,
        userAddress 
      });

      console.log(`✅ [REALTIME-NOTIF] WebSocket subscription active for ${userAddress.slice(0, 10)}...`);
      
      // Load initial notifications
      this.getUserNotifications(userAddress, 20, false).then(notifications => {
        console.log(`📦 [REALTIME-NOTIF] Loaded ${notifications.length} initial notifications`);
      });

      return subscriptionId;
    } catch (error) {
      console.error('❌ [REALTIME-NOTIF] Failed to setup WebSocket, falling back to polling:', error);
      return this.setupPollingFallback(userAddress, callback, subscriptionId);
    }
  }

  /**
   * Fallback to polling if WebSocket fails
   */
  private setupPollingFallback(
    userAddress: string,
    callback: (notification: Notification) => void,
    subscriptionId: string
  ): string {
    console.log(`⚠️ [REALTIME-NOTIF] Using polling fallback for ${userAddress.slice(0, 10)}...`);
    
    let lastNotificationId: string | null = null;
    
    const poll = async () => {
      try {
        const notifications = await this.getUserNotifications(userAddress, 10, false);
        
        if (notifications.length > 0) {
          const latestNotif = notifications[0];
          
          if (lastNotificationId !== latestNotif.id) {
            lastNotificationId = latestNotif.id;
            callback(latestNotif);
            this.showBrowserNotification(latestNotif);
            this.playNotificationSound();
          }
        }
      } catch (error) {
        console.error('❌ [REALTIME-NOTIF] Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Poll every 5 seconds (less frequent than before since WebSocket is primary)
    const interval = setInterval(poll, 5000);
    
    this.activeSubscriptions.set(subscriptionId, { 
      type: 'polling', 
      interval,
      userAddress 
    });

    return subscriptionId;
  }

  // ===== NOTIFICATION GROUPING =====

  /**
   * Group similar notifications (e.g., "10 people liked your post")
   */
  private groupNotification(userAddress: string, notification: Notification): NotificationGroup | null {
    const groups = this.groupedNotifications.get(userAddress) || [];
    
    // Find existing group for this type and post
    const existingGroup = groups.find(g => 
      g.type === notification.notificationType &&
      g.postId === notification.postId &&
      (Date.now() - g.latestTimestamp) < this.GROUP_WINDOW
    );

    if (existingGroup) {
      // Add to existing group
      existingGroup.count++;
      existingGroup.users.push(notification.fromUser);
      existingGroup.latestTimestamp = notification.timestamp;
      existingGroup.notifications.push(notification);
      
      // Limit group size
      if (existingGroup.users.length > this.MAX_GROUP_SIZE) {
        existingGroup.users = existingGroup.users.slice(-this.MAX_GROUP_SIZE);
      }
      
      console.log(`📦 [REALTIME-NOTIF] Grouped notification: ${existingGroup.count} ${notification.notificationType}s`);
      return existingGroup;
    } else {
      // Create new group
      const newGroup: NotificationGroup = {
        type: notification.notificationType,
        count: 1,
        users: [notification.fromUser],
        latestTimestamp: notification.timestamp,
        postId: notification.postId,
        notifications: [notification]
      };
      
      groups.push(newGroup);
      this.groupedNotifications.set(userAddress, groups);
      
      return newGroup;
    }
  }

  /**
   * Get grouped notifications for display
   */
  getGroupedNotifications(userAddress: string): NotificationGroup[] {
    return this.groupedNotifications.get(userAddress) || [];
  }

  // ===== NOTIFICATION PREFERENCES =====

  /**
   * Set notification preferences
   */
  setPreferences(userAddress: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.preferences.get(userAddress) || this.getDefaultPreferences();
    this.preferences.set(userAddress, { ...current, ...preferences });
    
    console.log(`⚙️ [REALTIME-NOTIF] Preferences updated for ${userAddress.slice(0, 10)}...`);
  }

  /**
   * Get notification preferences
   */
  getPreferences(userAddress: string): NotificationPreferences {
    return this.preferences.get(userAddress) || this.getDefaultPreferences();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      likes: true,
      comments: true,
      reposts: true,
      follows: true,
      mentions: true,
      tips: true,
      nft: true,
      music: true,
      milestones: true,
      browserPush: true
    };
  }

  private shouldNotify(userAddress: string, type: NotificationType): boolean {
    const prefs = this.getPreferences(userAddress);
    
    // Map notification types to preference keys
    const typeMap: Record<string, keyof NotificationPreferences> = {
      'like': 'likes',
      'comment': 'comments',
      'reply': 'comments',
      'repost': 'reposts',
      'follow': 'follows',
      'mention': 'mentions',
      'tip': 'tips',
      'nft_minted': 'nft',
      'nft_sold': 'nft',
      'nft_bought': 'nft',
      'music_generated': 'music',
      'music_played': 'music',
      'music_milestone_plays': 'milestones',
      'music_milestone_listeners': 'milestones',
      'music_trending': 'milestones',
      'music_top_chart': 'milestones',
      'music_viral': 'milestones'
    };

    const prefKey = typeMap[type];
    return prefKey ? prefs[prefKey] : true;
  }

  // ===== BROWSER PUSH NOTIFICATIONS =====

  /**
   * Request browser notification permission
   */
  async requestBrowserPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('⚠️ [REALTIME-NOTIF] Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if (Notification.permission !== 'granted') return;

    const prefs = this.getPreferences(notification.toUser);
    if (!prefs.browserPush) return;

    const title = this.getNotificationTitle(notification);
    const body = this.getNotificationBody(notification);
    const icon = '/favicon.ico';

    try {
      const browserNotif = new Notification(title, {
        body,
        icon,
        badge: icon,
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      browserNotif.onclick = () => {
        window.focus();
        browserNotif.close();
        
        // Navigate to relevant page
        if (notification.postId) {
          window.location.href = `/post/${notification.postId}`;
        }
      };

      // Auto-close after 5 seconds
      setTimeout(() => browserNotif.close(), 5000);
    } catch (error) {
      console.error('❌ [REALTIME-NOTIF] Failed to show browser notification:', error);
    }
  }

  private getNotificationTitle(notification: Notification): string {
    const fromUser = notification.fromUser.slice(0, 6) + '...' + notification.fromUser.slice(-4);
    
    switch (notification.notificationType) {
      case 'like': return `${fromUser} liked your post`;
      case 'comment': return `${fromUser} commented`;
      case 'repost': return `${fromUser} reposted`;
      case 'follow': return `${fromUser} followed you`;
      case 'mention': return `${fromUser} mentioned you`;
      case 'tip': return `${fromUser} sent you a tip`;
      case 'music_milestone_plays': return '🎉 Milestone Reached!';
      case 'music_trending': return '🔥 Your music is trending!';
      case 'music_viral': return '🚀 Your music went viral!';
      default: return 'New Notification';
    }
  }

  private getNotificationBody(notification: Notification): string {
    return notification.content || this.getNotificationTitle(notification);
  }

  // ===== SOUND =====

  private playNotificationSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
        audioContext.close();
      };
    } catch (error) {
      console.warn('⚠️ [REALTIME-NOTIF] Sound playback error:', error);
    }
  }

  // ===== CACHE HELPERS =====

  private addToCache(userAddress: string, notification: Notification): void {
    const cached = this.notificationCache.get(userAddress) || [];
    cached.unshift(notification);
    
    // Keep only last 100 notifications in cache
    if (cached.length > 100) {
      cached.pop();
    }
    
    this.notificationCache.set(userAddress, cached);
  }

  // ===== EXISTING METHODS (delegated to somniaDatastreamService) =====

  async getUserNotifications(userAddress: string, limit: number = 50, useCache: boolean = true): Promise<Notification[]> {
    return somniaDatastreamService.getUserNotifications(userAddress, limit, useCache);
  }

  async sendNotification(
    type: NotificationType,
    fromUser: string,
    toUser: string,
    options: { postId?: string; content?: string; metadata?: any } = {}
  ): Promise<boolean> {
    return somniaDatastreamService.sendNotification(type, fromUser, toUser, options);
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    return somniaDatastreamService.markAsRead(notificationId);
  }

  async markAllAsRead(userAddress: string): Promise<void> {
    return somniaDatastreamService.markAllAsRead(userAddress);
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    
    if (subscription) {
      if (subscription.type === 'websocket' && subscription.subId) {
        advancedDatastreamService.unsubscribe(subscription.subId);
      } else if (subscription.type === 'polling' && subscription.interval) {
        clearInterval(subscription.interval);
      }
      
      this.activeSubscriptions.delete(subscriptionId);
      console.log(`✅ [REALTIME-NOTIF] Unsubscribed: ${subscriptionId}`);
    }
  }

  private parseNotification(data: any): Notification | null {
    try {
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
      console.error('❌ [REALTIME-NOTIF] Failed to parse notification:', error);
      return null;
    }
  }

  disconnect(): void {
    this.activeSubscriptions.forEach((_, id) => this.unsubscribe(id));
    this.activeSubscriptions.clear();
    this.notificationCache.clear();
    this.groupedNotifications.clear();
    console.log('🔌 [REALTIME-NOTIF] Disconnected');
  }

  // Helper methods (delegated)
  async notifyLike(fromUser: string, toUser: string, postId: string, metadata?: any): Promise<boolean> {
    return this.sendNotification('like', fromUser, toUser, { postId, metadata });
  }

  async notifyComment(fromUser: string, toUser: string, postId: string, content: string, metadata?: any): Promise<boolean> {
    return this.sendNotification('comment', fromUser, toUser, { postId, content, metadata });
  }

  async notifyRepost(fromUser: string, toUser: string, postId: string, metadata?: any): Promise<boolean> {
    return this.sendNotification('repost', fromUser, toUser, { postId, metadata });
  }

  async notifyFollow(fromUser: string, toUser: string, metadata?: any): Promise<boolean> {
    return this.sendNotification('follow', fromUser, toUser, { metadata });
  }

  async notifyMention(fromUser: string, toUser: string, postId: string, content: string, metadata?: any): Promise<boolean> {
    return this.sendNotification('mention', fromUser, toUser, { postId, content, metadata });
  }

  async notifyMusicMilestonePlays(artist: string, tokenId: string, playCount: number, milestone: string, metadata?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId, playCount: playCount.toString(), milestone };
    return this.sendNotification('music_milestone_plays', artist, artist, { 
      content: `${playCount} plays`, 
      metadata: meta 
    });
  }

  async notifyMusicTrending(artist: string, tokenId: string, rank: number, metadata?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId, rank: rank.toString() };
    return this.sendNotification('music_trending', artist, artist, { 
      content: `Trending at #${rank}`, 
      metadata: meta 
    });
  }

  async notifyMusicViral(artist: string, tokenId: string, viralScore: number, metadata?: any): Promise<boolean> {
    const meta = { ...metadata, tokenId, viralScore: viralScore.toString() };
    return this.sendNotification('music_viral', artist, artist, { 
      content: `Viral score: ${viralScore}`, 
      metadata: meta 
    });
  }
}

// Export singleton
export const realtimeNotificationService = new RealtimeNotificationService();
export default realtimeNotificationService;
