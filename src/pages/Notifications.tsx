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
import { useState } from "react";
import CreateSongModal from "@/components/CreateSongModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import Navbar from "@/components/Navbar";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";

const Notifications = () => {
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const notifications = [
    {
      id: 1,
      type: "like",
      user: "Jazz Fusion",
      avatar: "JF",
      action: "liked your track",
      target: "Midnight Groove",
      time: "2m ago",
      read: false,
      cover: album2
    },
    {
      id: 2,
      type: "follow",
      user: "Beat Masters",
      avatar: "BM",
      action: "followed you",
      time: "15m ago",
      read: false
    },
    {
      id: 3,
      type: "comment",
      user: "Synthwave Collective",
      avatar: "SC",
      action: "commented on your post",
      target: "\"Amazing beats! 🔥\"",
      time: "1h ago",
      read: false,
      cover: album1
    },
    {
      id: 4,
      type: "mention",
      user: "Ambient Sounds",
      avatar: "AS",
      action: "mentioned you in a post",
      target: "@yourusername check this out!",
      time: "2h ago",
      read: true
    },
    {
      id: 5,
      type: "purchase",
      user: "Music Lover",
      avatar: "ML",
      action: "purchased your track",
      target: "Neon Dreams",
      time: "3h ago",
      read: true,
      cover: album1
    },
    {
      id: 6,
      type: "tip",
      user: "Fan Club",
      avatar: "FC",
      action: "tipped you",
      target: "25 SOMI",
      time: "30m ago",
      read: false,
      cover: album1
    },
    {
      id: 7,
      type: "tip",
      user: "Beat Enthusiast",
      avatar: "BE",
      action: "tipped you",
      target: "10 SOMI",
      time: "1h ago",
      read: false,
      cover: album2
    },
    {
      id: 8,
      type: "like",
      user: "Urban Beats",
      avatar: "UB",
      action: "liked your post",
      time: "5h ago",
      read: true
    }
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-4 h-4 text-red-500" />;
      case "follow":
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case "comment":
        return <MessageCircle className="w-4 h-4 text-green-500" />;
      case "mention":
        return <AtSign className="w-4 h-4 text-purple-500" />;
      case "purchase":
        return <ShoppingCart className="w-4 h-4 text-orange-500" />;
      case "tip":
        return <DollarSign className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const markAsRead = (id: number) => {
    // Handle mark as read
    console.log("Mark as read:", id);
  };

  const markAllAsRead = () => {
    // Handle mark all as read
    console.log("Mark all as read");
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

              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="mentions">Mentions</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {/* All Notifications */}
                <TabsContent value="all" className="space-y-3">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                        !notification.read ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Notification Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* User Avatar */}
                          <Avatar className="w-10 h-10 flex-shrink-0">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {notification.avatar}
                            </AvatarFallback>
                          </Avatar>

                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm leading-relaxed">
                                  <span className="font-semibold text-foreground">
                                    {notification.user}
                                  </span>
                                  {" "}
                                  <span className="text-muted-foreground">
                                    {notification.action}
                                  </span>
                                  {notification.target && (
                                    <>
                                      {" "}
                                      <span className="font-medium text-foreground">
                                        {notification.target}
                                      </span>
                                    </>
                                  )}
                                </p>

                                {/* Track Cover for music-related notifications */}
                                {(notification.type === "like" || notification.type === "comment" || notification.type === "purchase" || notification.type === "tip") && notification.cover && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <img
                                      src={notification.cover}
                                      alt="Track cover"
                                      className="w-8 h-8 rounded object-cover"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      {notification.target}
                                    </span>
                                  </div>
                                )}

                                <p className="text-xs text-muted-foreground mt-1">
                                  {notification.time}
                                </p>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 ml-4">
                                {!notification.read && (
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
                  ))}
                </TabsContent>

                {/* Mentions Tab */}
                <TabsContent value="mentions" className="space-y-3">
                  {notifications
                    .filter(notification => notification.type === "mention")
                    .map((notification) => (
                      <Card
                        key={notification.id}
                        className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                          !notification.read ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>

                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {notification.avatar}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">
                                      {notification.user}
                                    </span>
                                    {" "}
                                    <span className="text-muted-foreground">
                                      {notification.action}
                                    </span>
                                    {notification.target && (
                                      <>
                                        {" "}
                                        <span className="font-medium text-foreground">
                                          {notification.target}
                                        </span>
                                      </>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.time}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  {!notification.read && (
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
                    ))}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-3">
                  {notifications
                    .filter(notification => ["like", "comment", "follow", "purchase", "tip"].includes(notification.type))
                    .map((notification) => (
                      <Card
                        key={notification.id}
                        className={`border-border/50 hover:shadow-md transition-all duration-300 ${
                          !notification.read ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>

                            <Avatar className="w-10 h-10 flex-shrink-0">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                {notification.avatar}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm leading-relaxed">
                                    <span className="font-semibold text-foreground">
                                      {notification.user}
                                    </span>
                                    {" "}
                                    <span className="text-muted-foreground">
                                      {notification.action}
                                    </span>
                                    {notification.target && (
                                      <>
                                        {" "}
                                        <span className="font-medium text-foreground">
                                          {notification.target}
                                        </span>
                                      </>
                                    )}
                                  </p>

                                  {(notification.type === "like" || notification.type === "comment" || notification.type === "purchase" || notification.type === "tip") && notification.cover && (
                                    <div className="mt-2 flex items-center gap-2">
                                      <img
                                        src={notification.cover}
                                        alt="Track cover"
                                        className="w-8 h-8 rounded object-cover"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {notification.target}
                                      </span>
                                    </div>
                                  )}

                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.time}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 ml-4">
                                  {!notification.read && (
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
                    ))}
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