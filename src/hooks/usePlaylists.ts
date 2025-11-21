// React Hook for Playlists
// Manages playlist state with Somnia Data Streams

import { useState, useEffect, useCallback } from 'react';
import { playlistService, type Playlist } from '@/services/playlistService';
import { useWalletClient, useAccount } from 'wagmi';
import { toast } from 'sonner';

export function usePlaylists() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize service (auto-initializes, just update wallet if needed)
  useEffect(() => {
    const init = async () => {
      if (isInitialized) return;

      try {
        console.log('🔧 [PLAYLISTS-HOOK] Waiting for service initialization...');
        // ✅ Service auto-initializes, just connect wallet if available
        if (walletClient) {
          await playlistService.connect(walletClient);
        }
        setIsInitialized(true);
        console.log('✅ [PLAYLISTS-HOOK] Service ready');
      } catch (error) {
        console.error('❌ [PLAYLISTS-HOOK] Failed to initialize:', error);
        // ✅ Still mark as initialized to prevent infinite loop
        setIsInitialized(true);
      }
    };

    init();
  }, [walletClient, isInitialized]);

  // Load user playlists
  useEffect(() => {
    const loadPlaylists = async () => {
      if (!address) {
        console.log('⏳ [PLAYLISTS-HOOK] Waiting for wallet connection...');
        setIsLoading(false);
        return;
      }

      if (!isInitialized) {
        console.log('⏳ [PLAYLISTS-HOOK] Waiting for service initialization...');
        return;
      }

      setIsLoading(true);
      try {
        console.log(`📥 [PLAYLISTS-HOOK] Loading playlists for ${address.slice(0, 10)}...`);
        const userPlaylists = await playlistService.getUserPlaylists(address);
        setPlaylists(userPlaylists);
        console.log(`✅ [PLAYLISTS-HOOK] Loaded ${userPlaylists.length} playlists`);
      } catch (error) {
        console.error('❌ [PLAYLISTS-HOOK] Failed to load playlists:', error);
        toast.error('Failed to load playlists');
        setPlaylists([]); // ✅ Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadPlaylists();
  }, [address, isInitialized]);

  // Create playlist (✅ MULTI-PUBLISHER SUPPORT)
  const createPlaylist = useCallback(async (
    title: string,
    description: string,
    coverHash: string,
    trackIds: string[],
    isPublic: boolean
  ): Promise<Playlist | null> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return null;
    }

    try {
      console.log(`📝 [PLAYLISTS-HOOK] Creating playlist: ${title} (USER wallet)`);
      
      const playlist = await playlistService.createPlaylist(
        address,
        title,
        description,
        coverHash,
        trackIds,
        isPublic,
        walletClient  // ✅ Pass wallet client for USER wallet
      );

      // ⚡ Optimistic update - add to local state immediately
      setPlaylists(prev => [playlist, ...prev]);
      
      console.log('✅ [PLAYLISTS-HOOK] Playlist created on blockchain');

      return playlist;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to create playlist:', error);
      toast.error('Failed to create playlist');
      return null;
    }
  }, [address, isInitialized, walletClient]);

  // Update playlist (✅ MULTI-PUBLISHER SUPPORT)
  const updatePlaylist = useCallback(async (
    playlistId: string,
    updates: Partial<Omit<Playlist, 'id' | 'owner' | 'timestamp'>>
  ): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`📝 [PLAYLISTS-HOOK] Updating playlist ${playlistId.slice(0, 10)}... (USER wallet)`);
      
      const updatedPlaylist = await playlistService.updatePlaylist(playlistId, updates, walletClient);
      
      if (updatedPlaylist) {
        // ⚡ Optimistic update
        setPlaylists(prev => prev.map(p => 
          p.id === playlistId ? updatedPlaylist : p
        ));
        
        console.log('✅ [PLAYLISTS-HOOK] Playlist updated on blockchain');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to update playlist:', error);
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Delete playlist (✅ MULTI-PUBLISHER SUPPORT)
  const deletePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`🗑️ [PLAYLISTS-HOOK] Deleting playlist ${playlistId.slice(0, 10)}... (USER wallet)`);
      
      const success = await playlistService.deletePlaylist(playlistId, walletClient);
      
      if (success) {
        // ⚡ Optimistic update
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
        
        toast.success('Playlist deleted');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to delete playlist:', error);
      toast.error('Failed to delete playlist');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Add track to playlist (✅ MULTI-PUBLISHER SUPPORT)
  const addTrackToPlaylist = useCallback(async (
    playlistId: string,
    trackId: string
  ): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`➕ [PLAYLISTS-HOOK] Adding track to playlist (USER wallet)`);
      
      const updatedPlaylist = await playlistService.addTrackToPlaylist(playlistId, trackId, walletClient);
      
      if (updatedPlaylist) {
        // ⚡ Optimistic update
        setPlaylists(prev => prev.map(p => 
          p.id === playlistId ? updatedPlaylist : p
        ));
        
        toast.success('Track added to playlist');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to add track:', error);
      toast.error('Failed to add track');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Remove track from playlist (✅ MULTI-PUBLISHER SUPPORT)
  const removeTrackFromPlaylist = useCallback(async (
    playlistId: string,
    trackId: string
  ): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`➖ [PLAYLISTS-HOOK] Removing track from playlist (USER wallet)`);
      
      const updatedPlaylist = await playlistService.removeTrackFromPlaylist(playlistId, trackId, walletClient);
      
      if (updatedPlaylist) {
        // ⚡ Optimistic update
        setPlaylists(prev => prev.map(p => 
          p.id === playlistId ? updatedPlaylist : p
        ));
        
        toast.success('Track removed from playlist');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to remove track:', error);
      toast.error('Failed to remove track');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Refresh playlists (✅ FORCE RELOAD FROM BLOCKCHAIN)
  const refreshPlaylists = useCallback(async () => {
    if (!address || !isInitialized) return;

    setIsLoading(true);
    try {
      console.log('🔄 [PLAYLISTS-HOOK] Force refreshing from blockchain...');
      // ✅ Force refresh = true to bypass cache
      const userPlaylists = await playlistService.getUserPlaylists(address, true);
      setPlaylists(userPlaylists);
      console.log(`✅ [PLAYLISTS-HOOK] Refreshed ${userPlaylists.length} playlists from blockchain`);
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, [address, isInitialized]);

  // Follow playlist (✅ NEW: SOCIAL FEATURE)
  const followPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`👥 [PLAYLISTS-HOOK] Following playlist (USER wallet)`);
      
      const success = await playlistService.followPlaylist(playlistId, address, walletClient);
      
      if (success) {
        toast.success('Playlist followed!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to follow playlist:', error);
      toast.error('Failed to follow playlist');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Unfollow playlist (✅ NEW: SOCIAL FEATURE)
  const unfollowPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`👥 [PLAYLISTS-HOOK] Unfollowing playlist (USER wallet)`);
      
      const success = await playlistService.unfollowPlaylist(playlistId, address, walletClient);
      
      if (success) {
        toast.success('Playlist unfollowed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to unfollow playlist:', error);
      toast.error('Failed to unfollow playlist');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Like playlist (✅ NEW: SOCIAL FEATURE)
  const likePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`❤️ [PLAYLISTS-HOOK] Liking playlist (USER wallet)`);
      
      const success = await playlistService.likePlaylist(playlistId, address, walletClient);
      
      if (success) {
        toast.success('Playlist liked!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to like playlist:', error);
      toast.error('Failed to like playlist');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Unlike playlist (✅ NEW: SOCIAL FEATURE)
  const unlikePlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`❤️ [PLAYLISTS-HOOK] Unliking playlist (USER wallet)`);
      
      const success = await playlistService.unlikePlaylist(playlistId, address, walletClient);
      
      if (success) {
        toast.success('Playlist unliked');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to unlike playlist:', error);
      toast.error('Failed to unlike playlist');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Add collaborator (✅ NEW: COLLABORATION FEATURE)
  const addCollaborator = useCallback(async (playlistId: string, collaboratorAddress: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`🤝 [PLAYLISTS-HOOK] Adding collaborator (USER wallet)`);
      
      const success = await playlistService.addCollaborator(playlistId, collaboratorAddress, walletClient);
      
      if (success) {
        toast.success('Collaborator added!');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to add collaborator:', error);
      toast.error('Failed to add collaborator');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  // Remove collaborator (✅ NEW: COLLABORATION FEATURE)
  const removeCollaborator = useCallback(async (playlistId: string, collaboratorAddress: string): Promise<boolean> => {
    if (!address || !isInitialized) {
      toast.error('Please connect your wallet');
      return false;
    }

    try {
      console.log(`🤝 [PLAYLISTS-HOOK] Removing collaborator (USER wallet)`);
      
      const success = await playlistService.removeCollaborator(playlistId, collaboratorAddress, walletClient);
      
      if (success) {
        toast.success('Collaborator removed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [PLAYLISTS-HOOK] Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
      return false;
    }
  }, [address, isInitialized, walletClient]);

  return {
    playlists,
    isLoading,
    isInitialized,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    refreshPlaylists,
    // ✅ NEW: Social features
    followPlaylist,
    unfollowPlaylist,
    likePlaylist,
    unlikePlaylist,
    // ✅ NEW: Collaboration features
    addCollaborator,
    removeCollaborator,
  };
}
