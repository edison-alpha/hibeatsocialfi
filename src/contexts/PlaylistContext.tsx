import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { subgraphService, SubgraphPlaylist, SubgraphPlaylistSong } from '@/services/subgraphService';
import { getIpfsUrl } from '@/lib/ipfs';

interface PlaylistContextType {
  // Data
  allPlaylists: Playlist[];
  userPlaylists: Playlist[];
  currentPlaylist: Playlist | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingUser: boolean;
  isLoadingMore: boolean;
  
  // Pagination
  hasMore: boolean;
  
  // Actions
  loadAllPlaylists: (reset?: boolean) => Promise<void>;
  loadUserPlaylists: (userId: string) => Promise<void>;
  loadPlaylistById: (playlistId: string) => Promise<Playlist | null>;
  loadMorePlaylists: () => Promise<void>;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  refreshPlaylists: () => Promise<void>;
}

interface Song {
  id: string;
  tokenId: string;
  title: string;
  genre: string;
  audioUrl: string;
  coverUrl: string;
  duration: number;
  price: string;
  artist: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  };
}

interface PlaylistSong {
  id: string;
  position: number;
  addedAt: number;
  addedBy: {
    id: string;
    username: string;
  };
  song: Song;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl: string;
  isPublic: boolean;
  songCount: number;
  createdAt: number;
  updatedAt: number;
  owner: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
  songs: PlaylistSong[];
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylist = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return context;
};

interface PlaylistProviderProps {
  children: ReactNode;
}

const ITEMS_PER_PAGE = 20;

export const PlaylistProvider = ({ children }: PlaylistProviderProps) => {
  const { address } = useAccount();
  
  // State
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Transform SubgraphPlaylist to Playlist
  const transformPlaylist = (subgraphPlaylist: SubgraphPlaylist): Playlist => {
    const songs: PlaylistSong[] = subgraphPlaylist.songs?.map((playlistSong: SubgraphPlaylistSong) => ({
      id: playlistSong.id,
      position: parseInt(playlistSong.position),
      addedAt: parseInt(playlistSong.addedAt) * 1000,
      addedBy: {
        id: playlistSong.addedBy.id,
        username: playlistSong.addedBy.username,
      },
      song: {
        id: playlistSong.song.id,
        tokenId: playlistSong.song.tokenId,
        title: playlistSong.song.title,
        genre: playlistSong.song.genre,
        audioUrl: getIpfsUrl(playlistSong.song.audioHash),
        coverUrl: getIpfsUrl(playlistSong.song.coverHash),
        duration: parseInt(playlistSong.song.duration),
        price: playlistSong.song.price,
        artist: {
          id: playlistSong.song.artist.id,
          username: playlistSong.song.artist.username,
          displayName: playlistSong.song.artist.displayName,
          avatarUrl: getIpfsUrl(playlistSong.song.artist.avatarHash),
        },
      },
    })) || [];

    return {
      id: subgraphPlaylist.id,
      name: subgraphPlaylist.name,
      description: subgraphPlaylist.description,
      coverUrl: getIpfsUrl(subgraphPlaylist.coverHash),
      isPublic: subgraphPlaylist.isPublic,
      songCount: parseInt(subgraphPlaylist.songCount),
      createdAt: parseInt(subgraphPlaylist.createdAt) * 1000,
      updatedAt: parseInt(subgraphPlaylist.updatedAt) * 1000,
      owner: {
        id: subgraphPlaylist.owner.id,
        username: subgraphPlaylist.owner.username,
        displayName: subgraphPlaylist.owner.displayName,
        avatarUrl: getIpfsUrl(subgraphPlaylist.owner.avatarHash),
        isVerified: subgraphPlaylist.owner.isVerified || false,
      },
      songs,
    };
  };

  // Load all public playlists
  const loadAllPlaylists = useCallback(async (reset: boolean = false) => {
    setIsLoading(true);
    try {
      const page = reset ? 0 : currentPage;
      console.log('[Playlist] Loading all playlists, page:', page);
      
      const playlists = await subgraphService.getAllPlaylists(
        ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE
      );
      
      const transformedPlaylists = playlists.map(transformPlaylist);
      
      if (reset) {
        setAllPlaylists(transformedPlaylists);
        setCurrentPage(0);
      } else {
        setAllPlaylists(prev => [...prev, ...transformedPlaylists]);
      }
      
      setHasMore(playlists.length === ITEMS_PER_PAGE);
      console.log(`[Playlist] Loaded ${playlists.length} playlists`);
    } catch (error) {
      console.error('[Playlist] Failed to load playlists:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Load user's playlists
  const loadUserPlaylists = useCallback(async (userId: string) => {
    setIsLoadingUser(true);
    try {
      console.log('[Playlist] Loading playlists for user:', userId);
      
      const playlists = await subgraphService.getUserPlaylists(userId, 100, 0);
      setUserPlaylists(playlists.map(transformPlaylist));
      
      console.log(`[Playlist] Loaded ${playlists.length} user playlists`);
    } catch (error) {
      console.error('[Playlist] Failed to load user playlists:', error);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Load playlist by ID
  const loadPlaylistById = useCallback(async (playlistId: string): Promise<Playlist | null> => {
    try {
      console.log('[Playlist] Loading playlist by ID:', playlistId);
      const playlist = await subgraphService.getPlaylistById(playlistId);
      
      if (playlist) {
        const transformedPlaylist = transformPlaylist(playlist);
        setCurrentPlaylist(transformedPlaylist);
        return transformedPlaylist;
      }
      
      return null;
    } catch (error) {
      console.error('[Playlist] Failed to load playlist:', error);
      return null;
    }
  }, []);

  // Load more playlists
  const loadMorePlaylists = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log('[Playlist] Loading more playlists, page:', nextPage);
      
      const playlists = await subgraphService.getAllPlaylists(
        ITEMS_PER_PAGE,
        nextPage * ITEMS_PER_PAGE
      );
      
      setAllPlaylists(prev => [...prev, ...playlists.map(transformPlaylist)]);
      setCurrentPage(nextPage);
      setHasMore(playlists.length === ITEMS_PER_PAGE);
      
      console.log(`[Playlist] Loaded ${playlists.length} more playlists`);
    } catch (error) {
      console.error('[Playlist] Failed to load more playlists:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, currentPage]);

  // Refresh playlists
  const refreshPlaylists = useCallback(async () => {
    await loadAllPlaylists(true);
    if (address) {
      await loadUserPlaylists(address);
    }
  }, [loadAllPlaylists, loadUserPlaylists, address]);

  // Load initial data
  useEffect(() => {
    loadAllPlaylists(true);
  }, []);

  // Load user playlists when address changes
  useEffect(() => {
    if (address) {
      loadUserPlaylists(address);
    }
  }, [address, loadUserPlaylists]);

  const value: PlaylistContextType = {
    allPlaylists,
    userPlaylists,
    currentPlaylist,
    isLoading,
    isLoadingUser,
    isLoadingMore,
    hasMore,
    loadAllPlaylists,
    loadUserPlaylists,
    loadPlaylistById,
    loadMorePlaylists,
    setCurrentPlaylist,
    refreshPlaylists,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};
