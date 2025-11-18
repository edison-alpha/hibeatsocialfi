import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Heart,
  MessageCircle,
  UserPlus,
  Music,
  ShoppingCart,
  AtSign,
  Check,
  X,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";

interface NotificationDropdownProps {
  className?: string;
}

const NotificationDropdown = ({ className }: NotificationDropdownProps) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mentions' | 'activity'>('all');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: "like",
      user: "Jazz Fusion",
      avatar: "JF",
      action: "liked your track",
      target: "Midnight Groove",
      time: "2m ago",
      read: false,
      cover: "/assets/album-2.jpg"
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
      cover: "/assets/album-1.jpg"
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
      cover: "/assets/album-1.jpg"
    },
    {
      id: 6,
      type: "tip",
      user: "Music Fan",
      avatar: "MF",
      action: "tipped you",
      target: "25 SOMI",
      time: "5m ago",
      read: false,
      cover: "/assets/album-3.jpg"
    },
    {
      id: 7,
      type: "tip",
      user: "Beat Producer",
      avatar: "BP",
      action: "tipped you",
      target: "10 SOMI",
      time: "1h ago",
      read: false,
      cover: "/assets/album-4.jpg"
    }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="w-5 h-5 text-red-500" />;
      case "follow":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "comment":
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      case "mention":
        return <AtSign className="w-5 h-5 text-purple-500" />;
      case "purchase":
        return <ShoppingCart className="w-5 h-5 text-orange-500" />;
      case "tip":
        return <DollarSign className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'mentions':
        return notifications.filter(notification => notification.type === 'mention');
      case 'activity':
        return notifications.filter(notification => ['like', 'comment', 'follow', 'purchase', 'tip'].includes(notification.type));
      default:
        return notifications;
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

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {getFilteredNotifications().slice(0, 5).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 transition-colors ${!notification.read ? 'bg-primary/5' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {notification.avatar}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
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
                      <div className="mt-1 flex items-center gap-2">
                        <img
                          src={notification.cover}
                          alt="Track cover"
                          className="w-8 h-8 rounded object-cover"
                        />
                        <span className="text-xs text-muted-foreground truncate">
                          {notification.target}
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.time}
                    </p>
                  </div>

                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"></div>
                  )}
                </div>
              </DropdownMenuItem>
            ))}

            {getFilteredNotifications().length > 5 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="hover:bg-muted/50 focus:bg-muted/50 transition-colors">
                  <Link to="/notifications" className="w-full text-center">
                    View all notifications
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