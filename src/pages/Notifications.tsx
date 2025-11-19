import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Music,
  ShoppingCart,
  AtSign,
  Home,
  Search,
  Mail,
  User,
  Plus,
  MoreHorizontal,
  Check,
  X,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import CreateSongModal from "@/components/CreateSongModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import Navbar from "@/components/Navbar";
import { notificationService, type Notification } from "@/services/notificationService";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";

const Notifications = () => {
  const { address } = useAccount();
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, any>>(new Map());

  // Connect notification service on mount
  useEffect(() => {
    const connectService = async () => {
      try {
        console.log('🔔 [NOTIF PAGE] Connecting notification service...');
        await notificationService.connect();
        setIsConnected(true);
        console.log('✅ [NOTIF PAGE] Notification service connected');
      } catch (error) {
        console.error('❌ [NOTIF PAGE] Failed to connect notification service:', error);
      }
    };

    connectService();
  }, []);

  // Load notifications from blockchain
  useEffect(() => {
    if (!address || !isConnected) {
      console.log('🔔 [NOTIF PAGE] Skipping load - address:', !!address, 'connected:', isConnected);
      return;
    }

    console.log('🔔 [NOTIF PAGE] Loading notifications...');
    loadNotifications();

    // Subscribe to real-time updates
    const subscriptionId = notificationService.subscribeToUserNotifications(
      address,
      (newNotification) => {
        setNotifications(prev => [newNotification, ...prev]);
      }
    );

    return () => {
      notificationService.unsubscribe(subscriptionId);
    };
  }, [address, isConnected]);

  const loadNotifications = async (forceRefresh: boolean = false) => {
    if (!address) return;

    console.log('🔔 [NOTIF PAGE] Loading notifications for:', address);
    setLoading(true);
    try {
      const data = forceRefresh 
        ? await notificationService.refreshNotifications(address, 100)
        : await notificationService.getUserNotifications(address, 100);
      console.log('🔔 [NOTIF PAGE] Received:', data?.length || 0, 'notifications');
      setNotifications(data);
      
      // Load profiles for notification senders
      if (data.length > 0) {
        loadUserProfiles(data);
      }
    } catch (error) {
      console.error('❌ [NOTIF PAGE] Failed to load:', error);
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
      console.log('✅ [NOTIF PAGE] Loaded', profiles.size, 'user profiles');
    } catch (error) {
      console.error('❌ [NOTIF PAGE] Failed to load user profiles:', error);
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

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!address) return;
    
    await notificationService.markAllAsRead(address);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'mentions') {
      return notifications.filter(n => n.notificationType === 'mention');
    }
    return notifications;
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

  // Real notifications loaded from blockchain

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case "comment":
      case "reply":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case "repost":
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case "purchase":
      case "nft_sold":
      case "nft_bought":
        return <ShoppingCart className="w-4 h-4 text-orange-500" />;
      case "tip":
      case "received_somi":
        return <DollarSign className="w-4 h-4 text-green-600" />;
      case "music_generated":
      case "music_milestone_plays":
      case "music_top_chart":
        return <Music className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };
  
  const getNotificationAction = (type: string): string => {
    switch (type) {
      case "like": return "liked your post";
      case "comment": return "commented on your post";
      case "repost": return "reposted your content";
      case "follow": return "started following you";
      case "mention": return "mentioned you";
      case "reply": return "replied to your comment";
      case "tip": return "tipped you";
      case "received_somi": return "sent you SOMI";
      case "nft_minted": return "Your NFT was minted";
      case "nft_sold": return "Your NFT was sold";
      case "nft_bought": return "You bought an NFT";
      case "music_generated": return "Your music is ready";
      case "music_milestone_plays": return "Your music reached a milestone";
      case "music_top_chart": return "Your music entered the charts";
      default: return "sent you a notification";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Notifications */}
            <div className="lg:col-span-2">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-clash font-semibold text-2xl">Notifications</h1>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadNotifications(true)}
                    disabled={loading}
                    className="gap-2"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark all read
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mentions">Mentions</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* All Notifications */}
                <TabsContent value="all" className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    getFilteredNotifications().map((notification) => (
                    <Card
                      key={notification.id}
                      className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                        !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Notification Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.notificationType)}
                          </div>

                          {/* User Avatar */}
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src={getUserAvatar(notification.fromUser)} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {notification.fromUser.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed">
                                  <span className="font-semibold text-foreground">
                                    {getUserDisplayName(notification.fromUser)}
                                  </span>
                                  {" "}
                                  <span className="text-muted-foreground">
                                    {getNotificationAction(notification.notificationType)}
                                  </span>
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

                              {/* Actions */}
                              <div className="flex items-center gap-2 ml-4">
                                {!notification.isRead && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="w-6 h-6 p-0"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    ))
                  )}
                </TabsContent>

                {/* Mentions Tab - Uses same structure as All tab */}
                <TabsContent value="mentions" className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.filter(n => n.notificationType === 'mention').length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No mentions yet</p>
                    </div>
                  ) : (
                    notifications.filter(n => n.notificationType === 'mention').map((notification) => (
                      <Card
                        key={notification.id}
                        className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                          !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.notificationType)}
                            </div>

                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src={getUserAvatar(notification.fromUser)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {notification.fromUser.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">
                                      {getUserDisplayName(notification.fromUser)}
                                    </span>
                                    {" "}
                                    <span className="text-muted-foreground">
                                      {getNotificationAction(notification.notificationType)}
                                    </span>
                                  </p>

                                  {notification.content && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      "{notification.content}"
                                    </p>
                                  )}

                                  <p className="text-xs text-muted-foreground mt-1">
                                    {formatTime(notification.timestamp)}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markAsRead(notification.id)}
                                      className="w-6 h-6 p-0"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                                    <MoreHorizontal className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* Activity Tab - Uses same structure as All tab */}
                <TabsContent value="activity" className="space-y-3">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.filter(n => ['like', 'comment', 'follow', 'tip', 'repost'].includes(n.notificationType)).length === 0 ? (
                    <div className="text-center py-8">
                      <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No activity yet</p>
                    </div>
                  ) : (
                    notifications.filter(n => ['like', 'comment', 'follow', 'tip', 'repost'].includes(n.notificationType)).map((notification) => (
                      <Card
                        key={notification.id}
                        className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                          !notification.isRead ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.notificationType)}
                            </div>

                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src={getUserAvatar(notification.fromUser)} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {notification.fromUser.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">
                                      {getUserDisplayName(notification.fromUser)}
                                    </span>
                                    {" "}
                                    <span className="text-muted-foreground">
                                      {getNotificationAction(notification.notificationType)}
                                    </span>
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

                                <div className="flex items-center gap-2 ml-4">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => markAsRead(notification.id)}
                                      className="w-6 h-6 p-0"
                                    >
                                      <Check className="w-3 h-3" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                                    <MoreHorizontal className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>

              {/* Empty State */}
              {notifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No notifications yet</h3>
                  <p className="text-muted-foreground">
                    When someone interacts with your content, you'll see it here.
                  </p>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 space-y-6">
                {/* Notification Stats */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-clash font-semibold text-lg mb-3">This Week</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">New followers</span>
                        <span className="font-semibold text-primary">+12</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Likes received</span>
                        <span className="font-semibold text-green-600">+47</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Comments</span>
                        <span className="font-semibold text-blue-600">+23</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tips received</span>
                        <span className="font-semibold text-yellow-600">+35 SOMI</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Track sales</span>
                        <span className="font-semibold text-orange-600">+3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-clash font-semibold text-lg mb-3">Notification Settings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Email notifications</span>
                        <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                          ✓
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Push notifications</span>
                        <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                          ✓
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Mention alerts</span>
                        <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                          ✓
                        </Button>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Manage Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Interactions */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-clash font-semibold text-lg mb-3">Recent Interactions</h3>
                    <div className="space-y-3">
                      {[
                        { user: "Jazz Fusion", action: "liked your post", time: "2m ago" },
                        { user: "Beat Masters", action: "followed you", time: "15m ago" },
                        { user: "Synthwave Collective", action: "commented", time: "1h ago" }
                      ].map((interaction, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {interaction.user.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">
                              <span className="font-medium">{interaction.user}</span>
                              {" "}
                              <span className="text-muted-foreground">{interaction.action}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{interaction.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/20 lg:hidden">
        <div className="flex items-center justify-around py-2">
          <Link to="/feed" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/explore" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Search className="w-5 h-5" />
            <span className="text-xs">Explore</span>
          </Link>
          <Link to="/feed" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Plus className="w-5 h-5" />
            <span className="text-xs">Create Song</span>
          </Link>
          <Link to="/notifications" className="flex flex-col items-center gap-1 p-2 text-primary">
            <Bell className="w-5 h-5" />
            <span className="text-xs">Alerts</span>
          </Link>
          <Link to="/messages" className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
            <Mail className="w-5 h-5" />
            <span className="text-xs">Messages</span>
          </Link>
        </div>
      </div>

      {/* Floating Create Song Button */}
      <Button
        onClick={() => setIsCreateSongModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 lg:flex hidden items-center justify-center gap-2 px-6"
        size="lg"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Create Song with AI</span>
      </Button>

      {/* Create Song Modal */}
      <CreateSongModal
        isOpen={isCreateSongModalOpen}
        onClose={() => setIsCreateSongModalOpen(false)}
      />
    </div>
  );
};

export default Notifications;