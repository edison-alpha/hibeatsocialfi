// 💾 Social Cache Management Hook
// Menggabungkan optimistic updates dengan cache management untuk operasi sosial
// - Instant UI feedback (optimistic updates)
// - Auto-sync dengan blockchain (cache refresh)
// - Prevent double-click
// - Rollback on error

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Types
export interface Post {
  id: string;
  author: string;
  content: string;
  contentType: string;
  ipfsHash?: string;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  isDeleted: boolean;
  isPinned: boolean;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarHash?: string;
  quotedPost?: Post;
}

export interface Comment {
  id: string;
  postId: string;
  fromUser: string;
  content: string;
  parentId?: string;
  timestamp: number;
  username?: string;
  displayName?: string;
  avatarHash?: string;
}

export interface Interaction {
  id: string;
  postId: string;
  fromUser: string;
  interactionType: 'like' | 'unlike' | 'repost' | 'unrepost' | 'comment';
  timestamp: number;
  username?: string;
  displayName?: string;
  avatarHash?: string;
}

interface CacheState {
  posts: Post[];
  comments: Record<string, Comment[]>;
  likes: Record<string, Interaction[]>;
  reposts: Record<string, Interaction[]>;
  userLikes: Set<string>;
  userReposts: Set<string>;
}

interface OptimisticUpdate {
  id: string;
  type: 'like' | 'unlike' | 'repost' | 'unrepost' | 'comment' | 'post';
  postId?: string;
  timestamp: number;
  rollback: () => void;
}

export function useSocialCache() {
  // Cache state
  const [cache, setCache] = useState<CacheState>({
    posts: [],
    comments: {},
    likes: {},
    reposts: {},
    userLikes: new Set(),
    userReposts: new Set(),
  });

  // Optimistic updates tracking
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
  const [pendingWrites, setPendingWrites] = useState<Set<string>>(new Set());
  const [lastWriteTime, setLastWriteTime] = useState<number>(0);

  // Prevent double-click
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  // Auto-refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 🔄 Initialize cache with blockchain data
   */
  const initializeCache = useCallback((
    posts: Post[],
    comments: Record<string, Comment[]>,
    likes: Record<string, Interaction[]>,
    reposts: Record<string, Interaction[]>,
    userLikes: Set<string>,
    userReposts: Set<string>
  ) => {
    console.log('💾 [CACHE] Initializing cache with blockchain data');
    setCache({
      posts,
      comments,
      likes,
      reposts,
      userLikes,
      userReposts,
    });
  }, []);

  /**
   * 🔄 Update cache with fresh blockchain data
   */
  const updateCache = useCallback((
    posts: Post[],
    comments: Record<string, Comment[]>,
    likes: Record<string, Interaction[]>,
    reposts: Record<string, Interaction[]>,
    userLikes: Set<string>,
    userReposts: Set<string>
  ) => {
    console.log('💾 [CACHE] Updating cache with fresh blockchain data');
    
    // Clear optimistic updates that are now confirmed
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      // Remove updates older than 30 seconds (should be confirmed by now)
      const now = Date.now();
      for (const [key, update] of newMap.entries()) {
        if (now - update.timestamp > 30000) {
          newMap.delete(key);
        }
      }
      return newMap;
    });

    setCache({
      posts,
      comments,
      likes,
      reposts,
      userLikes,
      userReposts,
    });
  }, []);

  /**
   * ⚡ Optimistic Like/Unlike
   */
  const optimisticToggleLike = useCallback((
    postId: string,
    currentUserAddress: string,
    onBlockchainWrite: () => Promise<string | null>
  ) => {
    const actionKey = `like_${postId}`;
    
    // Prevent double-click
    if (processingActions.has(actionKey)) {
      console.log('⏳ [OPTIMISTIC] Like already processing:', postId);
      return;
    }

    setProcessingActions(prev => new Set(prev).add(actionKey));

    const isLiked = cache.userLikes.has(postId);
    const optimisticId = `optimistic_${actionKey}_${Date.now()}`;

    // Store rollback function
    const previousState = {
      userLikes: new Set(cache.userLikes),
      likes: { ...cache.likes },
      posts: [...cache.posts],
    };

    const rollback = () => {
      console.log('🔄 [OPTIMISTIC] Rolling back like:', postId);
      setCache(prev => ({
        ...prev,
        userLikes: previousState.userLikes,
        likes: previousState.likes,
        posts: previousState.posts,
      }));
      // Silent rollback - no toast for clean UX
    };

    // Apply optimistic update
    console.log(`⚡ [OPTIMISTIC] ${isLiked ? 'Unliking' : 'Liking'} post:`, postId);
    
    setCache(prev => {
      const newUserLikes = new Set(prev.userLikes);
      const newLikes = { ...prev.likes };
      const newPosts = prev.posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: isLiked ? Math.max(0, p.likes - 1) : p.likes + 1,
          };
        }
        return p;
      });

      if (isLiked) {
        newUserLikes.delete(postId);
        // Remove from likes list
        if (newLikes[postId]) {
          newLikes[postId] = newLikes[postId].filter(
            like => like.fromUser.toLowerCase() !== currentUserAddress.toLowerCase()
          );
        }
      } else {
        newUserLikes.add(postId);
        // Add to likes list
        if (!newLikes[postId]) {
          newLikes[postId] = [];
        }
        newLikes[postId].push({
          id: optimisticId,
          postId,
          fromUser: currentUserAddress,
          interactionType: 'like',
          timestamp: Date.now(),
        });
      }

      return {
        ...prev,
        userLikes: newUserLikes,
        likes: newLikes,
        posts: newPosts,
      };
    });

    // Track optimistic update
    setOptimisticUpdates(prev => new Map(prev).set(optimisticId, {
      id: optimisticId,
      type: isLiked ? 'unlike' : 'like',
      postId,
      timestamp: Date.now(),
      rollback,
    }));

    // Write to blockchain
    onBlockchainWrite()
      .then(txHash => {
        if (txHash) {
          console.log('✅ [OPTIMISTIC] Like synced to blockchain:', txHash);
          setPendingWrites(prev => new Set(prev).add(txHash));
          setLastWriteTime(Date.now());
          
          // Remove optimistic update after confirmation
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev);
              newMap.delete(optimisticId);
              return newMap;
            });
          }, 10000);
        } else {
          rollback();
        }
      })
      .catch(error => {
        console.error('❌ [OPTIMISTIC] Failed to sync like:', error);
        rollback();
      })
      .finally(() => {
        setProcessingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(actionKey);
          return newSet;
        });
      });
  }, [cache]);

  /**
   * ⚡ Optimistic Repost/Unrepost
   */
  const optimisticToggleRepost = useCallback((
    postId: string,
    currentUserAddress: string,
    onBlockchainWrite: () => Promise<string | null>
  ) => {
    const actionKey = `repost_${postId}`;
    
    // Prevent double-click
    if (processingActions.has(actionKey)) {
      console.log('⏳ [OPTIMISTIC] Repost already processing:', postId);
      return;
    }

    setProcessingActions(prev => new Set(prev).add(actionKey));

    const isReposted = cache.userReposts.has(postId);
    const optimisticId = `optimistic_${actionKey}_${Date.now()}`;

    // Store rollback function
    const previousState = {
      userReposts: new Set(cache.userReposts),
      reposts: { ...cache.reposts },
      posts: [...cache.posts],
    };

    const rollback = () => {
      console.log('🔄 [OPTIMISTIC] Rolling back repost:', postId);
      setCache(prev => ({
        ...prev,
        userReposts: previousState.userReposts,
        reposts: previousState.reposts,
        posts: previousState.posts,
      }));
      // Silent rollback - no toast for clean UX
    };

    // Apply optimistic update
    console.log(`⚡ [OPTIMISTIC] ${isReposted ? 'Unreposting' : 'Reposting'} post:`, postId);
    
    setCache(prev => {
      const newUserReposts = new Set(prev.userReposts);
      const newReposts = { ...prev.reposts };
      const newPosts = prev.posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            shares: isReposted ? Math.max(0, p.shares - 1) : p.shares + 1,
          };
        }
        return p;
      });

      if (isReposted) {
        newUserReposts.delete(postId);
        // Remove from reposts list
        if (newReposts[postId]) {
          newReposts[postId] = newReposts[postId].filter(
            repost => repost.fromUser.toLowerCase() !== currentUserAddress.toLowerCase()
          );
        }
      } else {
        newUserReposts.add(postId);
        // Add to reposts list
        if (!newReposts[postId]) {
          newReposts[postId] = [];
        }
        newReposts[postId].push({
          id: optimisticId,
          postId,
          fromUser: currentUserAddress,
          interactionType: 'repost',
          timestamp: Date.now(),
        });
      }

      return {
        ...prev,
        userReposts: newUserReposts,
        reposts: newReposts,
        posts: newPosts,
      };
    });

    // Track optimistic update
    setOptimisticUpdates(prev => new Map(prev).set(optimisticId, {
      id: optimisticId,
      type: isReposted ? 'unrepost' : 'repost',
      postId,
      timestamp: Date.now(),
      rollback,
    }));

    // Write to blockchain
    onBlockchainWrite()
      .then(txHash => {
        if (txHash) {
          console.log('✅ [OPTIMISTIC] Repost synced to blockchain:', txHash);
          setPendingWrites(prev => new Set(prev).add(txHash));
          setLastWriteTime(Date.now());
          
          // Remove optimistic update after confirmation
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev);
              newMap.delete(optimisticId);
              return newMap;
            });
          }, 10000);
        } else {
          rollback();
        }
      })
      .catch(error => {
        console.error('❌ [OPTIMISTIC] Failed to sync repost:', error);
        rollback();
      })
      .finally(() => {
        setProcessingActions(prev => {
          const newSet = new Set(prev);
          newSet.delete(actionKey);
          return newSet;
        });
      });
  }, [cache]);

  /**
   * ⚡ Optimistic Comment
   */
  const optimisticAddComment = useCallback((
    postId: string,
    content: string,
    currentUserAddress: string,
    parentCommentId: string | undefined,
    onBlockchainWrite: () => Promise<string | null>
  ) => {
    const actionKey = `comment_${postId}_${Date.now()}`;
    const optimisticId = `optimistic_${actionKey}`;

    // Store rollback function
    const previousState = {
      comments: { ...cache.comments },
      posts: [...cache.posts],
    };

    const rollback = () => {
      console.log('🔄 [OPTIMISTIC] Rolling back comment:', postId);
      setCache(prev => ({
        ...prev,
        comments: previousState.comments,
        posts: previousState.posts,
      }));
      // Silent rollback - no toast for clean UX
    };

    // Apply optimistic update
    console.log('⚡ [OPTIMISTIC] Adding comment to post:', postId);
    
    const optimisticComment: Comment = {
      id: optimisticId,
      postId,
      fromUser: currentUserAddress,
      content,
      parentId: parentCommentId,
      timestamp: Date.now(),
    };

    setCache(prev => {
      const newComments = { ...prev.comments };
      if (!newComments[postId]) {
        newComments[postId] = [];
      }
      newComments[postId] = [...newComments[postId], optimisticComment];

      const newPosts = prev.posts.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments: p.comments + 1,
          };
        }
        return p;
      });

      return {
        ...prev,
        comments: newComments,
        posts: newPosts,
      };
    });

    // Track optimistic update
    setOptimisticUpdates(prev => new Map(prev).set(optimisticId, {
      id: optimisticId,
      type: 'comment',
      postId,
      timestamp: Date.now(),
      rollback,
    }));

    // Write to blockchain
    onBlockchainWrite()
      .then(txHash => {
        if (txHash) {
          console.log('✅ [OPTIMISTIC] Comment synced to blockchain:', txHash);
          setPendingWrites(prev => new Set(prev).add(txHash));
          setLastWriteTime(Date.now());
          
          // Remove optimistic update after confirmation
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev);
              newMap.delete(optimisticId);
              return newMap;
            });
          }, 10000);
        } else {
          rollback();
        }
      })
      .catch(error => {
        console.error('❌ [OPTIMISTIC] Failed to sync comment:', error);
        rollback();
      });
  }, [cache]);

  /**
   * ⚡ Optimistic Post Creation
   */
  const optimisticAddPost = useCallback((
    post: Post,
    onBlockchainWrite: () => Promise<string | null>
  ) => {
    const optimisticId = `optimistic_post_${Date.now()}`;

    // Store rollback function
    const previousState = {
      posts: [...cache.posts],
    };

    const rollback = () => {
      console.log('🔄 [OPTIMISTIC] Rolling back post creation');
      setCache(prev => ({
        ...prev,
        posts: previousState.posts,
      }));
      // Silent rollback - no toast for clean UX
    };

    // Apply optimistic update
    console.log('⚡ [OPTIMISTIC] Adding new post');
    
    const optimisticPost: Post = {
      ...post,
      id: optimisticId,
    };

    setCache(prev => ({
      ...prev,
      posts: [optimisticPost, ...prev.posts],
    }));

    // Track optimistic update
    setOptimisticUpdates(prev => new Map(prev).set(optimisticId, {
      id: optimisticId,
      type: 'post',
      timestamp: Date.now(),
      rollback,
    }));

    // Write to blockchain
    onBlockchainWrite()
      .then(txHash => {
        if (txHash) {
          console.log('✅ [OPTIMISTIC] Post synced to blockchain:', txHash);
          setPendingWrites(prev => new Set(prev).add(txHash));
          setLastWriteTime(Date.now());
          
          // Remove optimistic update after confirmation
          setTimeout(() => {
            setOptimisticUpdates(prev => {
              const newMap = new Map(prev);
              newMap.delete(optimisticId);
              return newMap;
            });
          }, 10000);
        } else {
          rollback();
        }
      })
      .catch(error => {
        console.error('❌ [OPTIMISTIC] Failed to sync post:', error);
        rollback();
      });
  }, [cache]);

  // Callback for auto-refresh (set by parent component)
  const onAutoRefreshRef = useRef<(() => void) | null>(null);

  const setAutoRefreshCallback = useCallback((callback: () => void) => {
    onAutoRefreshRef.current = callback;
  }, []);

  /**
   * 🔄 Auto-refresh when there are pending writes
   */
  useEffect(() => {
    if (pendingWrites.size === 0) return;

    const timeSinceLastWrite = Date.now() - lastWriteTime;
    
    // Wait 8 seconds after last write for blockchain to index
    if (timeSinceLastWrite < 8000) {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        console.log('💾 [CACHE] Auto-refreshing after pending writes...');
        // Trigger refresh callback (will be set by parent component)
        if (onAutoRefreshRef.current) {
          onAutoRefreshRef.current();
        }
        setPendingWrites(new Set());
      }, 8000 - timeSinceLastWrite);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [pendingWrites, lastWriteTime]);

  return {
    // Cache state
    cache,
    
    // Cache management
    initializeCache,
    updateCache,
    
    // Optimistic operations
    optimisticToggleLike,
    optimisticToggleRepost,
    optimisticAddComment,
    optimisticAddPost,
    
    // State
    optimisticUpdates,
    pendingWrites,
    processingActions,
    
    // Auto-refresh
    setAutoRefreshCallback,
  };
}
