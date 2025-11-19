// React Hook for Notifications
import { useState, useEffect, useCallback } from 'react';
import { notificationService, type Notification, type NotificationType } from '@/services/notificationService';
import { useAccount } from 'wagmi';

export function useNotifications() {
  const { address } = useAccount();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Connect notification service on mount
  useEffect(() => {
    const connectService = async () => {
      try {
        console.log('🔔 [HOOK] Connecting notification service...');
        await notificationService.connect();
        setIsConnected(true);
        console.log('✅ [HOOK] Notification service connected');
      } catch (error) {
        console.error('❌ [HOOK] Failed to connect notification service:', error);
      }
    };

    connectService();
  }, []);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!address || !isConnected) {
      console.log('🔔 [HOOK] Skipping load - address:', !!address, 'connected:', isConnected);
      return;
    }

    console.log('🔔 [HOOK] Loading notifications for:', address.slice(0, 10) + '...');
    setLoading(true);
    try {
      const data = await notificationService.getUserNotifications(address);
      console.log('🔔 [HOOK] Loaded notifications:', data.length);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('❌ [HOOK] Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!address || !isConnected) return;

    console.log('🔔 [HOOK] Setting up real-time subscription...');
    loadNotifications();

    const subscriptionId = notificationService.subscribeToUserNotifications(
      address,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification('HiBeats', {
            body: getNotificationText(newNotification),
            icon: '/favicon.ico',
          });
        }
      }
    );

    return () => {
      notificationService.unsubscribe(subscriptionId);
    };
  }, [address, loadNotifications]);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!address) return;
    
    await notificationService.markAllAsRead(address);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // Send notification helpers - Social
  const sendLikeNotification = async (toUser: string, postId: string) => {
    if (!address) return false;
    return notificationService.notifyLike(address, toUser, postId);
  };

  const sendCommentNotification = async (toUser: string, postId: string, content: string) => {
    if (!address) return false;
    return notificationService.notifyComment(address, toUser, postId, content);
  };

  const sendRepostNotification = async (toUser: string, postId: string) => {
    if (!address) return false;
    return notificationService.notifyRepost(address, toUser, postId);
  };

  const sendFollowNotification = async (toUser: string) => {
    if (!address) return false;
    return notificationService.notifyFollow(address, toUser);
  };

  const sendMentionNotification = async (toUser: string, postId: string, content: string) => {
    if (!address) return false;
    return notificationService.notifyMention(address, toUser, postId, content);
  };

  const sendTipNotification = async (toUser: string, postId: string, amount: string) => {
    if (!address) return false;
    return notificationService.notifyTip(address, toUser, postId, amount);
  };

  // Send notification helpers - Financial
  const sendReceivedSomiNotification = async (fromUser: string, amount: string, txHash?: string) => {
    if (!address) return false;
    return notificationService.notifyReceivedSomi(fromUser, address, amount, txHash);
  };

  // Send notification helpers - NFT
  const sendNftMintedNotification = async (tokenId: string, metadata?: any) => {
    if (!address) return false;
    return notificationService.notifyNftMinted(address, tokenId, metadata);
  };

  const sendNftSoldNotification = async (buyer: string, tokenId: string, price: string) => {
    if (!address) return false;
    return notificationService.notifyNftSold(address, buyer, tokenId, price);
  };

  const sendNftBoughtNotification = async (seller: string, tokenId: string, price: string) => {
    if (!address) return false;
    return notificationService.notifyNftBought(address, seller, tokenId, price);
  };

  const sendNftOfferNotification = async (toUser: string, tokenId: string, offerAmount: string) => {
    if (!address) return false;
    return notificationService.notifyNftOffer(address, toUser, tokenId, offerAmount);
  };

  // Send notification helpers - Music
  const sendMusicGeneratedNotification = async (taskId: string, title: string) => {
    if (!address) return false;
    return notificationService.notifyMusicGenerated(address, taskId, title);
  };

  const sendMusicPlayedNotification = async (artist: string, tokenId: string) => {
    if (!address) return false;
    return notificationService.notifyMusicPlayed(address, artist, tokenId);
  };

  // Send notification helpers - Music Milestones
  const sendMusicMilestonePlaysNotification = async (tokenId: string, playCount: number, milestone: string) => {
    if (!address) return false;
    return notificationService.notifyMusicMilestonePlays(address, tokenId, playCount, milestone);
  };

  const sendMusicMilestoneListenersNotification = async (tokenId: string, listenerCount: number, milestone: string) => {
    if (!address) return false;
    return notificationService.notifyMusicMilestoneListeners(address, tokenId, listenerCount, milestone);
  };

  const sendMusicTrendingNotification = async (tokenId: string, rank: number) => {
    if (!address) return false;
    return notificationService.notifyMusicTrending(address, tokenId, rank);
  };

  const sendMusicTopChartNotification = async (tokenId: string, rank: number, chartType: string = 'Top 100') => {
    if (!address) return false;
    return notificationService.notifyMusicTopChart(address, tokenId, rank, chartType);
  };

  const sendMusicViralNotification = async (tokenId: string, viralScore: number) => {
    if (!address) return false;
    return notificationService.notifyMusicViral(address, tokenId, viralScore);
  };

  return {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    requestNotificationPermission,
    
    // Social notifications
    sendLikeNotification,
    sendCommentNotification,
    sendRepostNotification,
    sendFollowNotification,
    sendMentionNotification,
    sendTipNotification,
    
    // Financial notifications
    sendReceivedSomiNotification,
    
    // NFT notifications
    sendNftMintedNotification,
    sendNftSoldNotification,
    sendNftBoughtNotification,
    sendNftOfferNotification,
    
    // Music notifications
    sendMusicGeneratedNotification,
    sendMusicPlayedNotification,
    
    // Music milestone notifications
    sendMusicMilestonePlaysNotification,
    sendMusicMilestoneListenersNotification,
    sendMusicTrendingNotification,
    sendMusicTopChartNotification,
    sendMusicViralNotification,
  };
}

// Helper function to format notification text
function getNotificationText(notif: Notification): string {
  const fromUser = notif.fromUser.slice(0, 6) + '...' + notif.fromUser.slice(-4);
  const metadata = notif.metadata ? JSON.parse(notif.metadata) : {};
  
  switch (notif.notificationType) {
    // Social
    case 'like':
      return `${fromUser} liked your post`;
    case 'comment':
      return `${fromUser} commented on your post`;
    case 'repost':
      return `${fromUser} reposted your content`;
    case 'follow':
      return `${fromUser} started following you`;
    case 'mention':
      return `${fromUser} mentioned you`;
    case 'reply':
      return `${fromUser} replied to your comment`;
    
    // Financial
    case 'tip':
      return `${fromUser} sent you ${metadata.amount || 'a tip'}`;
    case 'received_somi':
      return `You received ${metadata.amount || ''} SOMI from ${fromUser}`;
    case 'sent_somi':
      return `You sent ${metadata.amount || ''} SOMI to ${fromUser}`;
    
    // NFT
    case 'nft_minted':
      return `Your music NFT #${metadata.tokenId || ''} was minted successfully!`;
    case 'nft_sold':
      return `Your NFT #${metadata.tokenId || ''} was sold for ${metadata.price || ''} SOMI`;
    case 'nft_bought':
      return `You bought NFT #${metadata.tokenId || ''} for ${metadata.price || ''} SOMI`;
    case 'nft_listed':
      return `Your NFT #${metadata.tokenId || ''} is now listed for ${metadata.price || ''} SOMI`;
    case 'nft_unlisted':
      return `Your NFT #${metadata.tokenId || ''} was unlisted`;
    case 'nft_offer':
      return `${fromUser} offered ${metadata.offerAmount || ''} SOMI for your NFT #${metadata.tokenId || ''}`;
    
    // Music
    case 'music_generated':
      return `Your music "${metadata.title || 'track'}" is ready!`;
    case 'music_played':
      return `${fromUser} played your music`;
    case 'music_added_playlist':
      return `${fromUser} added your music to their playlist`;
    
    // Music Milestones
    case 'music_milestone_plays':
      return `🎉 Your music reached ${metadata.playCount || notif.content}!`;
    case 'music_milestone_listeners':
      return `🎧 Your music reached ${metadata.listenerCount || notif.content} unique listeners!`;
    case 'music_trending':
      return `🔥 Your music is trending at #${metadata.rank || ''}!`;
    case 'music_top_chart':
      return `🏆 Your music entered ${metadata.chartType || 'Top 100'} at rank #${metadata.rank || ''}!`;
    case 'music_viral':
      return `🚀 Your music went VIRAL!`;
    
    // System
    case 'achievement':
      return `Achievement unlocked: ${metadata.achievementName || notif.content}`;
    case 'reward':
      return `You earned ${metadata.amount || ''} ${metadata.rewardType || 'reward'}!`;
    case 'announcement':
      return notif.content || 'New platform announcement';
    
    default:
      return `New notification from ${fromUser}`;
  }
}
