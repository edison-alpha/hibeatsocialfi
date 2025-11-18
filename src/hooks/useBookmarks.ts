/**
 * useBookmarks Hook
 * 
 * Custom hook untuk mengelola bookmark posts
 * - Bookmark/unbookmark posts
 * - Get bookmarked posts
 * - Check bookmark status
 */

import { useState, useEffect, useCallback } from 'react';
import { useSequence } from '@/contexts/SequenceContext';
import { somniaDatastreamServiceV3 } from '@/services/somniaDatastreamService.v3';
import { PostDataV3 } from '@/config/somniaDataStreams.v3';
import { toast } from 'sonner';

export function useBookmarks() {
  const { smartAccountAddress } = useSequence();
  const [bookmarkedPosts, setBookmarkedPosts] = useState<PostDataV3[]>([]);
  const [bookmarkStates, setBookmarkStates] = useState<Map<number, boolean>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Load bookmarked posts
  const loadBookmarkedPosts = useCallback(async () => {
    if (!smartAccountAddress) return;

    setIsLoading(true);
    try {
      const posts = await somniaDatastreamServiceV3.getBookmarkedPosts(smartAccountAddress);
      setBookmarkedPosts(posts);
      
      // Update bookmark states
      const states = new Map<number, boolean>();
      posts.forEach(post => states.set(post.id, true));
      setBookmarkStates(states);
      
      console.log('✅ [Bookmarks] Loaded', posts.length, 'bookmarked posts');
    } catch (error) {
      console.error('❌ [Bookmarks] Failed to load:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setIsLoading(false);
    }
  }, [smartAccountAddress]);

  // Check if a post is bookmarked
  const isBookmarked = useCallback((postId: number): boolean => {
    return bookmarkStates.get(postId) || false;
  }, [bookmarkStates]);

  // Bookmark a post
  const bookmarkPost = useCallback(async (postId: number) => {
    if (!smartAccountAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    console.log('🔖 [Hook] Bookmarking post:', postId);

    try {
      // Optimistic update
      setBookmarkStates(prev => {
        const newMap = new Map(prev);
        newMap.set(postId, true);
        console.log('🔖 [Hook] Updated bookmark state to true for post:', postId);
        return newMap;
      });
      
      const result = await somniaDatastreamServiceV3.bookmarkPost(postId, smartAccountAddress);
      console.log('✅ [Hook] Bookmark result:', result);
      
      // No toast - visual feedback only (like Twitter)
      
      // Don't reload immediately - state is already updated optimistically
      // Reload in background after a delay
      setTimeout(() => {
        loadBookmarkedPosts().catch(err => {
          console.error('Failed to reload bookmarks:', err);
        });
      }, 2000);
    } catch (error: any) {
      console.error('❌ [Bookmarks] Failed to bookmark:', error);
      console.error('❌ [Bookmarks] Error details:', {
        message: error?.message,
        stack: error?.stack,
        error
      });
      // Revert optimistic update
      setBookmarkStates(prev => {
        const newMap = new Map(prev);
        newMap.set(postId, false);
        console.log('🔖 [Hook] Reverted bookmark state to false for post:', postId);
        return newMap;
      });
      toast.error(error?.message || 'Failed to bookmark post');
    }
  }, [smartAccountAddress, loadBookmarkedPosts]);

  // Unbookmark a post
  const unbookmarkPost = useCallback(async (postId: number) => {
    if (!smartAccountAddress) {
      toast.error('Please connect your wallet');
      return;
    }

    console.log('🔖 [Hook] Unbookmarking post:', postId);

    try {
      // Optimistic update
      setBookmarkStates(prev => {
        const newMap = new Map(prev);
        newMap.set(postId, false);
        console.log('🔖 [Hook] Updated bookmark state to false for post:', postId);
        return newMap;
      });
      
      const result = await somniaDatastreamServiceV3.unbookmarkPost(postId, smartAccountAddress);
      console.log('✅ [Hook] Unbookmark result:', result);
      
      // No toast - visual feedback only (like Twitter)
      
      // Don't reload immediately - state is already updated optimistically
      // Reload in background after a delay
      setTimeout(() => {
        loadBookmarkedPosts().catch(err => {
          console.error('Failed to reload bookmarks:', err);
        });
      }, 2000);
    } catch (error: any) {
      console.error('❌ [Bookmarks] Failed to unbookmark:', error);
      console.error('❌ [Bookmarks] Error details:', {
        message: error?.message,
        stack: error?.stack,
        error
      });
      // Revert optimistic update
      setBookmarkStates(prev => {
        const newMap = new Map(prev);
        newMap.set(postId, true);
        console.log('🔖 [Hook] Reverted bookmark state to true for post:', postId);
        return newMap;
      });
      toast.error(error?.message || 'Failed to remove bookmark');
    }
  }, [smartAccountAddress, loadBookmarkedPosts]);

  // Toggle bookmark
  const toggleBookmark = useCallback(async (postId: number) => {
    const currentState = isBookmarked(postId);
    if (currentState) {
      await unbookmarkPost(postId);
    } else {
      await bookmarkPost(postId);
    }
  }, [isBookmarked, bookmarkPost, unbookmarkPost]);

  // Load bookmarks on mount
  useEffect(() => {
    if (smartAccountAddress) {
      loadBookmarkedPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [smartAccountAddress]);

  return {
    bookmarkedPosts,
    isBookmarked,
    bookmarkPost,
    unbookmarkPost,
    toggleBookmark,
    loadBookmarkedPosts,
    isLoading,
  };
}
