// React Hook for Notifications with Real-Time Support (✅ MULTI-PUBLISHER SUPPORT)
import { useState, useEffect, useCallback } from 'react';
import { notificationService, type Notification, type NotificationType } from '@/services/notificationService';
import { realtimeNotificationService } from '@/services/notificationService.realtime';
import { useAccount } from 'wagmi';
import { useSequence } from '@/contexts/SequenceContext';

// Use real-time service if available, fallback to regular service
const activeNotificationService = realtimeNotificationService || notificationService;

export function useNotifications() {
  const { address } = useAccount();
  const { walletClient, smartAccountAddress } = useSequence(); // ✅ Get wallet client for multi-publisher
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Connect notification service on mount
  useEffect(() => {
    const connectService = async () => {
      try {
        await activeNotificationService.connect();
        setIsConnected(true);
        console.log('✅ [HOOK] Real-time notification service connected');
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

    setLoading(true);
    try {
      const data = await activeNotificationService.getUserNotifications(address);
      console.log(`🔔 [HOOK] Loaded ${data.length} notifications (${data.filter(n => !n.isRead).length} unread)`);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('❌ [HOOK] Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  // Subscribe to real-time updates (WebSocket, not polling!)
  useEffect(() => {
    if (!address || !isConnected) return;

    loadNotifications();

    const subscriptionId = activeNotificationService.subscribeToUserNotifications(
      address,
      (newNotification) => {
        console.log('🔔 [HOOK] Real-time notification received:', newNotification.notificationType);
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Browser notification is handled by service
      }
    );

    return () => {
      activeNotificationService.unsubscribe(subscriptionId);
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
    await activeNotificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!address) return;
    
    await activeNotificationService.markAllAsRead(address);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  // Send notification helpers - Social (✅ MULTI-PUBLISHER SUPPORT)
  const sendLikeNotification = async (toUser: string, postId: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyLike(smartAccountAddress, toUser, postId, undefined, walletClient);
  };

  const sendCommentNotification = async (toUser: string, postId: string, content: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyComment(smartAccountAddress, toUser, postId, content, undefined, walletClient);
  };

  const sendRepostNotification = async (toUser: string, postId: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyRepost(smartAccountAddress, toUser, postId, undefined, walletClient);
  };

  const sendFollowNotification = async (toUser: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyFollow(smartAccountAddress, toUser, undefined, walletClient);
  };

  const sendMentionNotification = async (toUser: string, postId: string, content: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyMention(smartAccountAddress, toUser, postId, content, undefined, walletClient);
  };

  const sendTipNotification = async (toUser: string, postId: string, amount: string) => {
    if (!smartAccountAddress) return false;
    return activeNotificationService.notifyTip(smartAccountAddress, toUser, postId, amount, undefined, walletClient);
  };

  // Send notification helpers - Financial (✅ MULTI-PUBLISHER SUPPORT)
  const sendReceivedSomiNotification = async (fromUser: string, amount: string, txHash?: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyReceivedSomi(fromUser, smartAccountAddress, amount, txHash, undefined, walletClient);
  };

  // Send notification helpers - NFT (✅ MULTI-PUBLISHER SUPPORT)
  const sendNftMintedNotification = async (tokenId: string, metadata?: any) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyNftMinted(smartAccountAddress, tokenId, metadata, walletClient);
  };

  const sendNftSoldNotification = async (buyer: string, tokenId: string, price: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyNftSold(smartAccountAddress, buyer, tokenId, price, undefined, walletClient);
  };

  const sendNftBoughtNotification = async (seller: string, tokenId: string, price: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyNftBought(smartAccountAddress, seller, tokenId, price, undefined, walletClient);
  };

  const sendNftOfferNotification = async (toUser: string, tokenId: string, offerAmount: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyNftOffer(smartAccountAddress, toUser, tokenId, offerAmount, undefined, walletClient);
  };

  // Send notification helpers - Music (✅ MULTI-PUBLISHER SUPPORT)
  const sendMusicGeneratedNotification = async (taskId: string, title: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicGenerated(smartAccountAddress, taskId, title, undefined, walletClient);
  };

  const sendMusicPlayedNotification = async (artist: string, tokenId: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicPlayed(smartAccountAddress, artist, tokenId, undefined, walletClient);
  };

  // Send notification helpers - Music Milestones (✅ MULTI-PUBLISHER SUPPORT)
  const sendMusicMilestonePlaysNotification = async (tokenId: string, playCount: number, milestone: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicMilestonePlays(smartAccountAddress, tokenId, playCount, milestone, undefined, walletClient);
  };

  const sendMusicMilestoneListenersNotification = async (tokenId: string, listenerCount: number, milestone: string) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicMilestoneListeners(smartAccountAddress, tokenId, listenerCount, milestone, undefined, walletClient);
  };

  const sendMusicTrendingNotification = async (tokenId: string, rank: number) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicTrending(smartAccountAddress, tokenId, rank, undefined, walletClient);
  };

  const sendMusicTopChartNotification = async (tokenId: string, rank: number, chartType: string = 'Top 100') => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicTopChart(smartAccountAddress, tokenId, rank, chartType, undefined, walletClient);
  };

  const sendMusicViralNotification = async (tokenId: string, viralScore: number) => {
    if (!smartAccountAddress) return false;
    return notificationService.notifyMusicViral(smartAccountAddress, tokenId, viralScore, undefined, walletClient);
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
