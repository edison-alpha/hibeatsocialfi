// Real-Time Leaderboard Component
// Showcases Somnia Data Streams real-time updates with live rankings

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { advancedDatastreamService } from '@/services/somniaDatastreamService.advanced';

interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string;
  displayName: string;
  avatarHash?: string;
  score: number;
  previousRank?: number;
  change: 'up' | 'down' | 'same';
}

interface RealtimeLeaderboardProps {
  type: 'plays' | 'likes' | 'engagement' | 'earnings';
  limit?: number;
  refreshInterval?: number;
}

export function RealtimeLeaderboard({ 
  type, 
  limit = 10,
  refreshInterval = 5000 
}: RealtimeLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadLeaderboard();

    // Subscribe to real-time updates
    const interval = setInterval(() => {
      loadLeaderboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [type, limit, refreshInterval]);

  const loadLeaderboard = async () => {
    try {
      // Simulate loading leaderboard data
      // In production, this would fetch from Somnia Data Streams
      const mockData: LeaderboardEntry[] = Array.from({ length: limit }, (_, i) => ({
        rank: i + 1,
        address: `0x${Math.random().toString(16).slice(2, 42)}`,
        username: `user${i + 1}`,
        displayName: `User ${i + 1}`,
        score: Math.floor(Math.random() * 10000),
        previousRank: i + 1 + (Math.random() > 0.5 ? 1 : -1),
        change: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'same'
      }));

      setEntries(mockData);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setLoading(false);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'plays': return 'Most Played';
      case 'likes': return 'Most Liked';
      case 'engagement': return 'Top Engagement';
      case 'earnings': return 'Top Earners';
      default: return 'Leaderboard';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-orange-600" />;
      default: return null;
    }
  };

  const getChangeIcon = (change: 'up' | 'down' | 'same') => {
    switch (change) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'same': return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatScore = (score: number) => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{getTypeLabel()}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            </div>
            <span className="text-xs text-muted-foreground">
              Live • Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.address}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              {/* Rank */}
              <div className="flex items-center justify-center w-8 h-8">
                {getRankIcon(entry.rank) || (
                  <span className="text-sm font-semibold text-muted-foreground">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.avatarHash ? `https://ipfs.io/ipfs/${entry.avatarHash}` : undefined} />
                <AvatarFallback className="text-xs">
                  {entry.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{entry.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">@{entry.username}</p>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {formatScore(entry.score)}
                </Badge>
                
                {/* Change Indicator */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center"
                >
                  {getChangeIcon(entry.change)}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Performance Metrics Display
export function DatastreamPerformanceMetrics() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const perf = advancedDatastreamService.getPerformanceMetrics();
      setMetrics(perf);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Somnia Data Streams Performance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Avg Response Time</p>
            <p className="text-2xl font-bold text-green-500">
              {metrics.avgResponseTime.toFixed(0)}ms
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-blue-500">
              {metrics.cacheHitRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold">{metrics.activeSubs}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Fetch</p>
            <p className="text-2xl font-bold text-purple-500">
              {metrics.lastFetchTime}ms
            </p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Total Requests: {metrics.totalRequests} • 
            Cache Hits: {metrics.cacheHits} • 
            Cache Misses: {metrics.cacheMisses}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
