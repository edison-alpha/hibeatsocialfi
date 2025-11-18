import React, { useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { 
  Users, 
  Music, 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  Activity,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';

const RealTimeDashboard = React.memo(() => {
  const {
    isConnected,
    isConnecting,
    connectionError,
    recentEvents,
    liveUserCount,
    activeSongs,
    trendingPlaylists,
    getFeedUpdates,
    getNotifications,
    getLiveStats,
    readAllUserProfiles,
    readAllPosts,
    readMusicEvents,
    readSocialInteractions,
    reconnect
  } = useSomniaDatastream();

  // Load initial data when connected
  useEffect(() => {
    const loadInitialData = async () => {
      if (isConnected) {
        try {
          console.log('📊 Loading initial data from Somnia DataStream...');

          // Load user profiles for stats
          const profiles = await readAllUserProfiles();
          console.log(`👥 Loaded ${profiles.length} user profiles`);

          // Load recent posts
          const posts = await readAllPosts();
          console.log(`📝 Loaded ${posts.length} posts`);

          // Load music events
          const musicEvents = await readMusicEvents();
          console.log(`🎵 Loaded ${musicEvents.length} music events`);

          // Load social interactions
          const interactions = await readSocialInteractions();
          console.log(`🤝 Loaded ${interactions.length} social interactions`);

        } catch (error) {
          console.error('Error loading initial data:', error);
        }
      }
    };

    loadInitialData();
  }, [isConnected, readAllUserProfiles, readAllPosts, readMusicEvents, readSocialInteractions]);
  const feedUpdates = useMemo(() => getFeedUpdates().slice(0, 10), [getFeedUpdates]); // Limit to 10 items
  const notifications = useMemo(() => getNotifications().slice(0, 10), [getNotifications]); // Limit to 10 items

  // Memoized helper functions to prevent recreation
  const getEventIcon = useCallback((eventType: string) => {
    switch (eventType) {
      case 'post_created':
        return <MessageCircle className="w-4 h-4" />;
      case 'post_liked':
        return <Heart className="w-4 h-4" />;
      case 'user_followed':
        return <Users className="w-4 h-4" />;
      case 'song_minted':
        return <Music className="w-4 h-4" />;
      case 'playlist_created':
        return <Music className="w-4 h-4" />;
      case 'tip_sent':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  }, []);

  const getEventColor = useCallback((eventType: string) => {
    switch (eventType) {
      case 'post_created':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'post_liked':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'user_followed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'song_minted':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'playlist_created':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'tip_sent':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  }, []);

  const formatEventType = useCallback((eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  const formatAddress = useCallback((address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const formatTimeAgo = useCallback((timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            {isConnected ? (
              <>
                <Wifi className="w-5 h-5 text-green-500" />
                Real-time Data Stream
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-500" />
                Datastream Disconnected
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Disconnected"}
              </Badge>
              {connectionError && (
                <span className="text-sm text-red-500">{connectionError}</span>
              )}
            </div>
            {!isConnected && (
              <Button
                onClick={reconnect}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Users</p>
                <p className="text-2xl font-bold">{liveUserCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Music className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Songs</p>
                <p className="text-2xl font-bold">{activeSongs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trending Playlists</p>
                <p className="text-2xl font-bold">{trendingPlaylists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Events</p>
                <p className="text-2xl font-bold">{recentEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed Updates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Feed Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {feedUpdates.length > 0 ? (
                feedUpdates.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`p-1.5 rounded-full ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {formatEventType(event.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        User {formatAddress(event.data.user)} {event.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent feed updates
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className={`p-1.5 rounded-full ${getEventColor(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {formatEventType(event.type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {event.type === 'user_followed' && 'Someone followed you'}
                        {event.type === 'post_liked' && 'Someone liked your post'}
                        {event.type === 'tip_sent' && 'You received a tip'}
                        {event.type === 'message_sent' && 'New message received'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No new notifications
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Songs & Trending Playlists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Songs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Currently Playing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeSongs.length > 0 ? (
                activeSongs.map((song) => (
                  <div key={song.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{song.title}</p>
                      <p className="text-sm text-muted-foreground">{song.artist}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{song.listeners} listeners</p>
                      <div className="flex items-center gap-1 text-xs text-green-500">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Live
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No songs currently playing
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trending Playlists */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trending Playlists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trendingPlaylists.length > 0 ? (
                trendingPlaylists.map((playlist) => (
                  <div key={playlist.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground">by {playlist.creator}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{playlist.followers} followers</p>
                      <div className="flex items-center gap-1 text-xs text-orange-500">
                        <TrendingUp className="w-3 h-3" />
                        Trending
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No trending playlists
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

RealTimeDashboard.displayName = 'RealTimeDashboard';

export default RealTimeDashboard;