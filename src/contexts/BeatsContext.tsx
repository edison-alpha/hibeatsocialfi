import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { subgraphService, SubgraphSong } from '@/services/subgraphService';
import { getIpfsUrl } from '@/lib/ipfs';

interface BeatsContextType {
  // Data
  allSongs: Song[];
  currentSong: Song | null;
  
  // Filters
  currentGenre: string | null;
  searchTerm: string;
  
  // Loading states
  isLoading: boolean;
  isLoadingMore: boolean;
  
  // Pagination
  hasMore: boolean;
  currentPage: number;
  
  // Actions
  loadAllSongs: (reset?: boolean) => Promise<void>;
  loadSongById: (songId: string) => Promise<Song | null>;
  loadSongsByGenre: (genre: string) => Promise<void>;
  searchSongs: (term: string) => Promise<void>;
  loadMoreSongs: () => Promise<void>;
  setCurrentSong: (song: Song | null) => void;
  clearFilters: () => void;
}

interface Song {
  id: string;
  tokenId: string;
  title: string;
  description?: string;
  genre: string;
  audioUrl: string;
  coverUrl: string;
  duration: number;
  price: string;
  playCount: number;
  likeCount: number;
  createdAt: number;
  isListed: boolean;
  artist: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
  };
  owner?: {
    id: string;
    username: string;
    displayName: string;
  };
}

const BeatsContext = createContext<BeatsContextType | undefined>(undefined);

export const useBeats = () => {
  const context = useContext(BeatsContext);
  if (context === undefined) {
    throw new Error('useBeats must be used within a BeatsProvider');
  }
  return context;
};

interface BeatsProviderProps {
  children: ReactNode;
}

const ITEMS_PER_PAGE = 20;

export const BeatsProvider = ({ children }: BeatsProviderProps) => {
  // State
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentGenre, setCurrentGenre] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Transform SubgraphSong to Song
  const transformSong = (subgraphSong: SubgraphSong): Song => {
    return {
      id: subgraphSong.id,
      tokenId: subgraphSong.tokenId,
      title: subgraphSong.title,
      description: subgraphSong.description,
      genre: subgraphSong.genre,
      audioUrl: getIpfsUrl(subgraphSong.audioHash),
      coverUrl: getIpfsUrl(subgraphSong.coverHash),
      duration: parseInt(subgraphSong.duration),
      price: subgraphSong.price,
      playCount: parseInt(subgraphSong.playCount),
      likeCount: parseInt(subgraphSong.likeCount),
      createdAt: parseInt(subgraphSong.createdAt) * 1000,
      isListed: subgraphSong.isListed,
      artist: {
        id: subgraphSong.artist.id,
        username: subgraphSong.artist.username,
        displayName: subgraphSong.artist.displayName,
        avatarUrl: getIpfsUrl(subgraphSong.artist.avatarHash),
        isVerified: subgraphSong.artist.isVerified,
      },
      owner: subgraphSong.owner ? {
        id: subgraphSong.owner.id,
        username: subgraphSong.owner.username,
        displayName: subgraphSong.owner.displayName,
      } : undefined,
    };
  };

  // Load all songs
  const loadAllSongs = useCallback(async (reset: boolean = false) => {
    setIsLoading(true);
    try {
      const page = reset ? 0 : currentPage;
      console.log('[Beats] Loading songs, page:', page);
      
      const songs = await subgraphService.getAllSongs(
        ITEMS_PER_PAGE,
        page * ITEMS_PER_PAGE,
        'createdAt',
        'desc'
      );
      
      const transformedSongs = songs.map(transformSong);
      
      if (reset) {
        setAllSongs(transformedSongs);
        setCurrentPage(0);
      } else {
        setAllSongs(prev => [...prev, ...transformedSongs]);
      }
      
      setHasMore(songs.length === ITEMS_PER_PAGE);
      console.log(`[Beats] Loaded ${songs.length} songs`);
    } catch (error) {
      console.error('[Beats] Failed to load songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  // Load song by ID
  const loadSongById = useCallback(async (songId: string): Promise<Song | null> => {
    try {
      console.log('[Beats] Loading song by ID:', songId);
      const song = await subgraphService.getSongById(songId);
      
      if (song) {
        const transformedSong = transformSong(song);
        setCurrentSong(transformedSong);
        return transformedSong;
      }
      
      return null;
    } catch (error) {
      console.error('[Beats] Failed to load song:', error);
      return null;
    }
  }, []);

  // Load songs by genre
  const loadSongsByGenre = useCallback(async (genre: string) => {
    setIsLoading(true);
    setCurrentGenre(genre);
    setCurrentPage(0);
    try {
      console.log('[Beats] Loading songs by genre:', genre);
      const songs = await subgraphService.getSongsByGenre(genre, ITEMS_PER_PAGE, 0);
      setAllSongs(songs.map(transformSong));
      setHasMore(songs.length === ITEMS_PER_PAGE);
      console.log(`[Beats] Loaded ${songs.length} songs for genre`);
    } catch (error) {
      console.error('[Beats] Failed to load songs by genre:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search songs
  const searchSongs = useCallback(async (term: string) => {
    setIsLoading(true);
    setSearchTerm(term);
    setCurrentPage(0);
    try {
      console.log('[Beats] Searching songs:', term);
      
      if (!term || term.trim() === '') {
        await loadAllSongs(true);
        return;
      }
      
      const songs = await subgraphService.searchSongs(term, ITEMS_PER_PAGE);
      setAllSongs(songs.map(transformSong));
      setHasMore(false); // Search doesn't support pagination
      console.log(`[Beats] Found ${songs.length} songs`);
    } catch (error) {
      console.error('[Beats] Failed to search songs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadAllSongs]);

  // Load more songs
  const loadMoreSongs = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      console.log('[Beats] Loading more songs, page:', nextPage);
      
      let songs: SubgraphSong[] = [];
      
      if (currentGenre) {
        songs = await subgraphService.getSongsByGenre(
          currentGenre,
          ITEMS_PER_PAGE,
          nextPage * ITEMS_PER_PAGE
        );
      } else {
        songs = await subgraphService.getAllSongs(
          ITEMS_PER_PAGE,
          nextPage * ITEMS_PER_PAGE,
          'createdAt',
          'desc'
        );
      }
      
      setAllSongs(prev => [...prev, ...songs.map(transformSong)]);
      setCurrentPage(nextPage);
      setHasMore(songs.length === ITEMS_PER_PAGE);
      
      console.log(`[Beats] Loaded ${songs.length} more songs`);
    } catch (error) {
      console.error('[Beats] Failed to load more songs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, currentPage, currentGenre]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setCurrentGenre(null);
    setSearchTerm('');
    setCurrentPage(0);
    loadAllSongs(true);
  }, [loadAllSongs]);

  // Load initial data
  useEffect(() => {
    loadAllSongs(true);
  }, []);

  const value: BeatsContextType = {
    allSongs,
    currentSong,
    currentGenre,
    searchTerm,
    isLoading,
    isLoadingMore,
    hasMore,
    currentPage,
    loadAllSongs,
    loadSongById,
    loadSongsByGenre,
    searchSongs,
    loadMoreSongs,
    setCurrentSong,
    clearFilters,
  };

  return (
    <BeatsContext.Provider value={value}>
      {children}
    </BeatsContext.Provider>
  );
};
