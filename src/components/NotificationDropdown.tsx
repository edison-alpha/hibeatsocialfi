import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  ShoppingCart,
  AtSign,
  DollarSign,
  Repeat
} from "lucide-react";
import { Link } from "react-router-dom";
import { notificationService, type Notification } from "@/services/notificationService";
import { useAccount } from "wagmi";

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown = ({ className }: NotificationDropdownProps) => {
  const { address } = useAccount();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mentions' | 'activity'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

  // Connect notification service on mount
  useEffect(() => {
    const connectService = async () => {
      try {
        console.log('🔔 [DROPDOWN] Connecting notification service...');
        await notificationService.connect();
        setIsConnected(true);
        console.log('✅ [DROPDOWN] Notification service connected');
      } catch (error) {
        console.error('❌ [DROPDOWN] Failed to connect notification service:', error);
      }
    };

    connectService();
  }, []);

  // Load notifications when connected and address available
  useEffect(() => {
    if (!address || !isConnected) {
      console.log('🔔 [DROPDOWN] Skipping load - address:', !!address, 'connected:', isConnected);
      return;
    }

    console.log('🔔 [DROPDOWN] Loading notifications...');
    loadNotifications();

    // Subscribe to real-time updates
    const subscriptionId = notificationService.subscribeToUserNotifications(
      address,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification('HiBeats', {
            body: getNotificationText(newNotification),
            icon: '/favicon.ico',
          });
        }
      }
    );

    // Request notification permission on first load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      notificationService.unsubscribe(subscriptionId);
    };
  }, [address, isConnected]);

  const loadNotifications = async () => {
    if (!address) {
      console.log('🔔 [DROPDOWN] No address, skipping load');
      return;
    }

    console.log('🔔 [DROPDOWN] Loading notifications for:', address);
    setLoading(true);
    try {
      // Use cached data for dropdown (faster)
      const data = await notificationService.getUserNotifications(address, 50, true);
      console.log('🔔 [DROPDOWN] Received notifications:', data?.length || 0);
      setNotifications(data);
      
      // Load profiles for notification senders
      if (data.length > 0) {
        loadUserProfiles(data);
      }
    } catch (error) {
      console.error('❌ [DROPDOWN] Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadUserProfiles = async (notifs: Notification[]) => {
    try {
      const { profileService } = await import('@/services/profileService');
      const uniqueUsers = [...new Set(notifs.map(n => n.fromUser.toLowerCase()))];
      const profiles = new Map<string, any>();
      
      // Load profiles in parallel
      await Promise.all(
        uniqueUsers.map(async (userAddr) => {
          try {
            const profile = await profileService.getProfile(userAddr);
            if (profile) {
              profiles.set(userAddr, profile);
            }
          } catch (error) {
            console.warn('Failed to load profile for', userAddr);
          }
        })
      );
      
      setUserProfiles(profiles);
      console.log('✅ [DROPDOWN] Loaded', profiles.size, 'user profiles');
    } catch (error) {
      console.error('❌ [DROPDOWN] Failed to load user profiles:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Social
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case "mention":
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case "repost":
        return <Repeat className="w-5 h-5 text-blue-400" />;
      case "reply":
        return <MessageCircle className="w-5 h-5 text-indigo-500" />;
      
      // Financial
      case "tip":
      case "received_somi":
      case "sent_somi":
        return <DollarSign className="w-5 h-5 text-green-600" />;
      
      // NFT
      case "nft_minted":
      case "nft_listed":
        return <ShoppingCart className="w-5 h-5 text-blue-500" />;
      case "nft_sold":
      case "nft_bought":
        return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case "nft_offer":
        return <DollarSign className="w-5 h-5 text-orange-500" />;
      
      // Music
      case "music_generated":
      case "music_played":
        return <Bell className="w-5 h-5 text-purple-500" />;
      
      // Music Milestones
      case "music_milestone_plays":
      case "music_milestone_listeners":
        return <Bell className="w-5 h-5 text-purple-600" />;
      case "music_trending":
        return <Bell className="w-5 h-5 text-orange-500" />;
      case "music_top_chart":
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case "music_viral":
        return <Bell className="w-5 h-5 text-pink-500" />;
      
      // System
      case "achievement":
        return <Bell className="w-5 h-5 text-yellow-500" />;
      case "reward":
        return <DollarSign className="w-5 h-5 text-yellow-600" />;
      
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getNotificationText = (notif: Notification): string => {
    const fromUser = notif.fromUser.slice(0, 6) + '...' + notif.fromUser.slice(-4);
    
    switch (notif.notificationType) {
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
      case 'tip':
        const metadata = notif.metadata ? JSON.parse(notif.metadata) : {};
        return `${fromUser} tipped you ${metadata.amount || ''}`;
      case 'reply':
        return `${fromUser} replied to your comment`;
      default:
        return `New notification from ${fromUser}`;
    }
  };

  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const markAsRead = async (id: string) => {
    await notificationService.markAsRead(id);
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'mentions':
        return notifications.filter(notification => notification.notificationType === 'mention');
      case 'activity':
        return notifications.filter(notification => ['like', 'comment', 'follow', 'repost', 'tip', 'reply'].includes(notification.notificationType));
      default:
        return notifications;
    }
  };

  const getUserAvatar = (address: string): string => {
    const profile = userProfiles.get(address.toLowerCase());
    if (profile?.avatarHash) {
      return `https://ipfs.io/ipfs/${profile.avatarHash.replace('ipfs://', '')}`;
    }
    return '';
  };
  
  const getUserDisplayName = (address: string): string => {
    const profile = userProfiles.get(address.toLowerCase());
    if (profile?.displayName) return profile.displayName;
    if (profile?.username) return `@${profile.username}`;
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

  const getNotificationMessage = (notification: Notification): JSX.Element => {
    const displayName = getUserDisplayName(notification.fromUser);
    const metadata = notification.metadata ? JSON.parse(notification.metadata) : {};
    
    const renderUser = () => (
      <span className="font-semibold text-foreground">{displayName}</span>
    );
    
    switch (notification.notificationType) {
      // Social
      case 'like':
        return <>{renderUser()} <span className="text-muted-foreground">liked your post</span></>;
      case 'comment':
        return <>{renderUser()} <span className="text-muted-foreground">commented on your post</span></>;
      case 'repost':
        return <>{renderUser()} <span className="text-muted-foreground">reposted your content</span></>;
      case 'follow':
        return <>{renderUser()} <span className="text-muted-foreground">started following you</span></>;
      case 'mention':
        return <>{renderUser()} <span className="text-muted-foreground">mentioned you</span></>;
      case 'reply':
        return <>{renderUser()} <span className="text-muted-foreground">replied to your comment</span></>;
      
      // Financial
      case 'tip':
        return <>{renderUser()} <span className="text-muted-foreground">tipped you</span> <span className="font-semibold text-green-600">{metadata.amount || ''}</span></>;
      case 'received_somi':
        return <><span className="text-muted-foreground">Received</span> <span className="font-semibold text-green-600">{metadata.amount || ''} SOMI</span> <span className="text-muted-foreground">from</span> {renderUser()}</>;
      case 'sent_somi':
        return <><span className="text-muted-foreground">Sent</span> <span className="font-semibold">{metadata.amount || ''} SOMI</span> <span className="text-muted-foreground">to</span> {renderUser()}</>;
      
      // NFT
      case 'nft_minted':
        return <><span className="text-muted-foreground">Your music NFT</span> <span className="font-semibold">#{metadata.tokenId || ''}</span> <span className="text-muted-foreground">was minted!</span></>;
      case 'nft_sold':
        return <><span className="text-muted-foreground">Your NFT</span> <span className="font-semibold">#{metadata.tokenId || ''}</span> <span className="text-muted-foreground">sold for</span> <span className="font-semibold text-green-600">{metadata.price || ''} SOMI</span></>;
      case 'nft_bought':
        return <><span className="text-muted-foreground">You bought NFT</span> <span className="font-semibold">#{metadata.tokenId || ''}</span> <span className="text-muted-foreground">for</span> <span className="font-semibold">{metadata.price || ''} SOMI</span></>;
      case 'nft_listed':
        return <><span className="text-muted-foreground">Your NFT</span> <span className="font-semibold">#{metadata.tokenId || ''}</span> <span className="text-muted-foreground">is listed for</span> <span className="font-semibold">{metadata.price || ''} SOMI</span></>;
      case 'nft_offer':
        return <>{renderUser()} <span className="text-muted-foreground">offered</span> <span className="font-semibold text-orange-600">{metadata.offerAmount || ''} SOMI</span> <span className="text-muted-foreground">for NFT</span> <span className="font-semibold">#{metadata.tokenId || ''}</span></>;
      
      // Music
      case 'music_generated':
        return <><span className="text-muted-foreground">Your music</span> <span className="font-semibold">"{metadata.title || 'track'}"</span> <span className="text-muted-foreground">is ready!</span></>;
      case 'music_played':
        return <>{renderUser()} <span className="text-muted-foreground">played your music</span></>;
      
      // Music Milestones
      case 'music_milestone_plays':
        return <><span className="text-muted-foreground">🎉 Your music reached</span> <span className="font-semibold text-purple-600">{metadata.playCount || notification.content}</span> <span className="text-muted-foreground">plays!</span></>;
      case 'music_milestone_listeners':
        return <><span className="text-muted-foreground">🎧 Your music reached</span> <span className="font-semibold text-blue-600">{metadata.listenerCount || notification.content}</span> <span className="text-muted-foreground">unique listeners!</span></>;
      case 'music_trending':
        return <><span className="text-muted-foreground">🔥 Your music is trending at</span> <span className="font-semibold text-orange-600">#{metadata.rank || ''}</span>!</>;
      case 'music_top_chart':
        return <><span className="text-muted-foreground">🏆 Your music entered</span> <span className="font-semibold text-yellow-600">{metadata.chartType || 'Top 100'}</span> <span className="text-muted-foreground">at rank</span> <span className="font-semibold">#{metadata.rank || ''}</span>!</>;
      case 'music_viral':
        return <><span className="text-muted-foreground">🚀 Your music went</span> <span className="font-semibold text-pink-600">VIRAL</span>!</>;
      
      // System
      case 'achievement':
        return <><span className="text-muted-foreground">Achievement unlocked:</span> <span className="font-semibold text-yellow-600">{metadata.achievementName || notification.content}</span></>;
      case 'reward':
        return <><span className="text-muted-foreground">You earned</span> <span className="font-semibold text-yellow-600">{metadata.amount || ''} {metadata.rewardType || 'reward'}</span>!</>;
      
      default:
        return <>{renderUser()} <span className="text-muted-foreground">sent you a notification</span></>;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative w-8 h-8 p-0 ${className}`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-96 max-h-[500px] overflow-y-auto scrollbar-hide p-2"
        sideOffset={8}
      >
        <div className="p-3 border-b border-border/20">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-auto p-1"
              >
                Mark all read
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="text-xs h-7 px-2"
            >
              All
            </Button>
            <Button
              variant={activeFilter === 'mentions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('mentions')}
              className="text-xs h-7 px-2"
            >
              Mentions
            </Button>
            <Button
              variant={activeFilter === 'activity' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('activity')}
              className="text-xs h-7 px-2"
            >
              Activity
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {getFilteredNotifications().slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 transition-colors ${!notification.isRead ? 'bg-primary/5' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.notificationType)}
                  </div>

                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={getUserAvatar(notification.fromUser)} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {notification.fromUser.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      {getNotificationMessage(notification)}
                    </p>

                    {notification.content && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        "{notification.content}"
                      </p>
                    )}

                    {notification.metadata && notification.notificationType === 'tip' && (
                      <p className="text-xs font-semibold text-green-600 mt-1">
                        {JSON.parse(notification.metadata).amount || ''} SOMI
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}

            {getFilteredNotifications().length > 10 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="hover:bg-muted/50 focus:bg-muted/50 transition-colors">
                  <Link to="/notifications" className="w-full text-center">
                    View all {getFilteredNotifications().length} notifications
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;