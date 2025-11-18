import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react/hooks';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { GET_POSTS } from '@/graphql/queries';

interface Post {
  id: string;
  author: string;
  content: string;
  contentType: 'text' | 'music' | 'image' | 'video';
  ipfsHash?: string;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  authorProfile?: {
    username: string;
    displayName: string;
    avatarHash?: string;
    isVerified?: boolean;
    isArtist?: boolean;
  };
  blockNumber?: number;
  transactionHash?: string;
}

interface UseHybridFeedOptions {
  postsPerPage?: number;
  filter?: 'all' | 'following' | 'trending' | 'music';
  enableRealtime?: boolean;
}

interface UseHybridFeedResult {
  posts: Post[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  totalPosts: number;
}

/**
 * Hybrid Feed Hook - Combines Subgraph (historical) + DataStream (real-time)
 * 
 * This hook provides the best of both worlds:
 * - Subgraph: Historical data, pagination, search
 * - DataStream: Real-time updates (0 latency)
 */
export const useHybridFeed = ({
  postsPerPage = 20,
  filter = 'all',
  enableRealtime = true
}: UseHybridFeedOptions = {}): UseHybridFeedResult => {
  
  const [page, setPage] = useState(0);
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  // Get real-time events from DataStream
  const { recentEvents, getFeedUpdates, isConnected: datastreamConnected } = useSomniaDatastream();

  // Get historical posts from Subgraph
  const { data, loading, error, fetchMore, refetch } = useQuery(GET_POSTS, {
    variables: {
      first: postsPerPage,
      skip: 0,
      orderBy: 'timestamp',
      orderDirection: 'desc',
      where: filter === 'music' ? { contentType: 'music' } : {}
    },
    skip: false, // Always fetch from subgraph
    pollInterval: 30000, // Refresh every 30 seconds
  });

  // Convert DataStream events to Post format
  const realtimePosts = useMemo(() => {
    if (!enableRealtime || !datastreamConnected) return [];

    // Get recent events from DataStream (last 30 seconds)
    const now = Date.now() / 1000;
    const recentThreshold = now - 30; // Last 30 seconds

    return recentEvents
      .filter(event => 
        event.type === 'post_created' && 
        event.timestamp >= recentThreshold
      )
      .map(event => ({
        id: event.id,
        author: event.data.author || event.data.user || '0x0',
        content: event.data.content || 'New post from real-time stream',
        contentType: (event.data.contentType || 'text') as 'text' | 'music' | 'image' | 'video',
        ipfsHash: event.data.ipfsHash,
        timestamp: event.timestamp,
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        authorProfile: {
          username: event.data.username || 'Unknown',
          displayName: event.data.displayName || 'Anonymous',
          avatarHash: event.data.avatarHash,
          isVerified: false,
          isArtist: false
        }
      }));
  }, [enableRealtime, datastreamConnected, recentEvents]);

  // Convert Subgraph data to Post format
  const subgraphPosts = useMemo(() => {
    if (!data?.posts) return [];

    return data.posts.map((post: any) => ({
      id: post.id,
      author: post.author.id,
      content: post.content,
      contentType: post.contentType || 'text',
      ipfsHash: post.ipfsHash,
      timestamp: parseInt(post.timestamp),
      likes: parseInt(post.likes),
      comments: parseInt(post.comments),
      shares: parseInt(post.shares),
      isLiked: false,
      authorProfile: {
        username: post.author.username,
        displayName: post.author.displayName,
        avatarHash: post.author.avatarHash,
        isVerified: post.author.isVerified,
        isArtist: post.author.isArtist
      },
      blockNumber: parseInt(post.blockNumber),
      transactionHash: post.transactionHash
    }));
  }, [data]);

  // Merge real-time and historical posts with smart deduplication
  const mergedPosts = useMemo(() => {
    // Strategy:
    // 1. Real-time posts (0-30 seconds) - from DataStream
    // 2. Historical posts (>30 seconds) - from Subgraph
    // 3. Merge and deduplicate by transaction hash or ID
    
    const postMap = new Map<string, Post>();

    // Add subgraph posts first (they have complete data)
    subgraphPosts.forEach(post => {
      const key = post.transactionHash || post.id;
      postMap.set(key, post);
    });

    // Add real-time posts (override if newer/same)
    realtimePosts.forEach(post => {
      const key = post.transactionHash || post.id;
      const existing = postMap.get(key);
      
      // Only add if:
      // - Post doesn't exist yet (brand new from DataStream)
      // - Or it's from same transaction but has less data (upgrade from DataStream)
      if (!existing || !existing.authorProfile) {
        postMap.set(key, post);
      }
    });

    // Convert map to array and sort by timestamp (newest first)
    const uniquePosts = Array.from(postMap.values());
    return uniquePosts.sort((a, b) => b.timestamp - a.timestamp);
  }, [realtimePosts, subgraphPosts]);

  // Update allPosts when merged data changes
  useEffect(() => {
    setAllPosts(mergedPosts);
  }, [mergedPosts]);

  // Auto-refresh when new real-time events arrive
  useEffect(() => {
    if (enableRealtime && datastreamConnected && recentEvents.length > 0) {
      // When new events arrive, trigger a state update
      // This ensures UI refreshes with latest DataStream data
      setAllPosts(prev => {
        // Force re-render by creating new array reference
        return [...mergedPosts];
      });
    }
  }, [recentEvents.length, enableRealtime, datastreamConnected, mergedPosts]);

  // Load more posts (pagination)
  const loadMore = useCallback(async () => {
    if (!fetchMore || loading) return;

    try {
      await fetchMore({
        variables: {
          skip: (page + 1) * postsPerPage,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult || !fetchMoreResult.posts.length) {
            return prev;
          }

          return {
            ...prev,
            posts: [...prev.posts, ...fetchMoreResult.posts]
          };
        },
      });

      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Error loading more posts:', err);
    }
  }, [fetchMore, loading, page, postsPerPage]);

  // Refresh feed
  const refresh = useCallback(() => {
    setPage(0);
    refetch();
  }, [refetch]);

  // Check if there are more posts to load
  const hasMore = useMemo(() => {
    if (!data?.posts) return true;
    return data.posts.length >= postsPerPage;
  }, [data, postsPerPage]);

  return {
    posts: allPosts,
    loading,
    error: error || null,
    hasMore,
    loadMore,
    refresh,
    totalPosts: allPosts.length
  };
};

export default useHybridFeed;
