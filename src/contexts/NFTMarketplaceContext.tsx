import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  SubgraphNFTCollection,
  SubgraphNFTItem,
  SubgraphNFTListing,
  SubgraphNFTActivity,
  SubgraphUserNFTStats,
  SubgraphGlobalMarketplaceStats,
  subgraphService,
} from '../services/subgraphService';

interface NFTMarketplaceContextType {
  // Collections
  collections: SubgraphNFTCollection[];
  selectedCollection: SubgraphNFTCollection | null;
  trendingCollections: SubgraphNFTCollection[];
  
  // Items
  items: SubgraphNFTItem[];
  selectedItem: SubgraphNFTItem | null;
  
  // Listings
  listings: SubgraphNFTListing[];
  
  // Activity
  activities: SubgraphNFTActivity[];
  
  // Stats
  userStats: SubgraphUserNFTStats | null;
  globalStats: SubgraphGlobalMarketplaceStats | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingCollections: boolean;
  isLoadingItems: boolean;
  isLoadingListings: boolean;
  isLoadingActivity: boolean;
  
  // Pagination
  hasMoreCollections: boolean;
  hasMoreItems: boolean;
  hasMoreListings: boolean;
  hasMoreActivity: boolean;
  
  // Methods
  loadCollections: (orderBy?: string, orderDirection?: 'asc' | 'desc') => Promise<void>;
  loadMoreCollections: () => Promise<void>;
  loadCollection: (id: string) => Promise<void>;
  loadTrendingCollections: (days?: number) => Promise<void>;
  
  loadItems: (collectionId?: string, isListed?: boolean) => Promise<void>;
  loadMoreItems: () => Promise<void>;
  loadItem: (id: string) => Promise<void>;
  searchItems: (searchTerm: string) => Promise<void>;
  
  loadListings: (isActive?: boolean) => Promise<void>;
  loadMoreListings: () => Promise<void>;
  
  loadActivity: (itemId?: string, activityTypes?: string[]) => Promise<void>;
  loadMoreActivity: () => Promise<void>;
  
  loadUserStats: (userId: string) => Promise<void>;
  loadGlobalStats: () => Promise<void>;
  
  resetFilters: () => void;
}

const NFTMarketplaceContext = createContext<NFTMarketplaceContextType | undefined>(undefined);

export const useNFTMarketplace = () => {
  const context = useContext(NFTMarketplaceContext);
  if (!context) {
    throw new Error('useNFTMarketplace must be used within NFTMarketplaceProvider');
  }
  return context;
};

interface NFTMarketplaceProviderProps {
  children: ReactNode;
}

const ITEMS_PER_PAGE = 20;

export const NFTMarketplaceProvider: React.FC<NFTMarketplaceProviderProps> = ({ children }) => {
  // Collections state
  const [collections, setCollections] = useState<SubgraphNFTCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<SubgraphNFTCollection | null>(null);
  const [trendingCollections, setTrendingCollections] = useState<SubgraphNFTCollection[]>([]);
  const [collectionsPage, setCollectionsPage] = useState(0);
  const [hasMoreCollections, setHasMoreCollections] = useState(true);
  
  // Items state
  const [items, setItems] = useState<SubgraphNFTItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SubgraphNFTItem | null>(null);
  const [itemsPage, setItemsPage] = useState(0);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [currentCollectionFilter, setCurrentCollectionFilter] = useState<string | undefined>(undefined);
  const [currentListedFilter, setCurrentListedFilter] = useState<boolean | undefined>(undefined);
  
  // Listings state
  const [listings, setListings] = useState<SubgraphNFTListing[]>([]);
  const [listingsPage, setListingsPage] = useState(0);
  const [hasMoreListings, setHasMoreListings] = useState(true);
  
  // Activity state
  const [activities, setActivities] = useState<SubgraphNFTActivity[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(0);
  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [currentActivityItemFilter, setCurrentActivityItemFilter] = useState<string | undefined>(undefined);
  const [currentActivityTypesFilter, setCurrentActivityTypesFilter] = useState<string[] | undefined>(undefined);
  
  // Stats state
  const [userStats, setUserStats] = useState<SubgraphUserNFTStats | null>(null);
  const [globalStats, setGlobalStats] = useState<SubgraphGlobalMarketplaceStats | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isLoadingListings, setIsLoadingListings] = useState(false);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // ============================================================
  // COLLECTIONS
  // ============================================================

  const loadCollections = useCallback(async (
    orderBy: string = 'totalVolume',
    orderDirection: 'asc' | 'desc' = 'desc'
  ) => {
    setIsLoadingCollections(true);
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTCollections(
        ITEMS_PER_PAGE,
        0,
        orderBy,
        orderDirection
      );
      
      setCollections(data);
      setCollectionsPage(0);
      setHasMoreCollections(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded collections:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading collections:', error);
    } finally {
      setIsLoadingCollections(false);
      setIsLoading(false);
    }
  }, []);

  const loadMoreCollections = useCallback(async () => {
    if (!hasMoreCollections || isLoadingCollections) return;
    
    setIsLoadingCollections(true);
    
    try {
      const nextPage = collectionsPage + 1;
      const data = await subgraphService.getNFTCollections(
        ITEMS_PER_PAGE,
        nextPage * ITEMS_PER_PAGE,
        'totalVolume',
        'desc'
      );
      
      setCollections(prev => [...prev, ...data]);
      setCollectionsPage(nextPage);
      setHasMoreCollections(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded more collections:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading more collections:', error);
    } finally {
      setIsLoadingCollections(false);
    }
  }, [collectionsPage, hasMoreCollections, isLoadingCollections]);

  const loadCollection = useCallback(async (id: string) => {
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTCollection(id);
      setSelectedCollection(data);
      
      console.log('[NFT Marketplace] Loaded collection:', data?.name);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading collection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTrendingCollections = useCallback(async (days: number = 7) => {
    setIsLoadingCollections(true);
    
    try {
      const data = await subgraphService.getTrendingNFTCollections(10, days);
      setTrendingCollections(data);
      
      console.log('[NFT Marketplace] Loaded trending collections:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading trending collections:', error);
    } finally {
      setIsLoadingCollections(false);
    }
  }, []);

  // ============================================================
  // ITEMS
  // ============================================================

  const loadItems = useCallback(async (
    collectionId?: string,
    isListed?: boolean
  ) => {
    setIsLoadingItems(true);
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTItems(
        collectionId,
        ITEMS_PER_PAGE,
        0,
        isListed
      );
      
      setItems(data);
      setItemsPage(0);
      setHasMoreItems(data.length === ITEMS_PER_PAGE);
      setCurrentCollectionFilter(collectionId);
      setCurrentListedFilter(isListed);
      
      console.log('[NFT Marketplace] Loaded items:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading items:', error);
    } finally {
      setIsLoadingItems(false);
      setIsLoading(false);
    }
  }, []);

  const loadMoreItems = useCallback(async () => {
    if (!hasMoreItems || isLoadingItems) return;
    
    setIsLoadingItems(true);
    
    try {
      const nextPage = itemsPage + 1;
      const data = await subgraphService.getNFTItems(
        currentCollectionFilter,
        ITEMS_PER_PAGE,
        nextPage * ITEMS_PER_PAGE,
        currentListedFilter
      );
      
      setItems(prev => [...prev, ...data]);
      setItemsPage(nextPage);
      setHasMoreItems(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded more items:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading more items:', error);
    } finally {
      setIsLoadingItems(false);
    }
  }, [itemsPage, hasMoreItems, isLoadingItems, currentCollectionFilter, currentListedFilter]);

  const loadItem = useCallback(async (id: string) => {
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTItem(id);
      setSelectedItem(data);
      
      console.log('[NFT Marketplace] Loaded item:', data?.name);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading item:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchItems = useCallback(async (searchTerm: string) => {
    setIsLoadingItems(true);
    setIsLoading(true);
    
    try {
      const data = await subgraphService.searchNFTItems(searchTerm, ITEMS_PER_PAGE);
      
      setItems(data);
      setItemsPage(0);
      setHasMoreItems(false); // Search results don't support pagination
      
      console.log('[NFT Marketplace] Search results:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error searching items:', error);
    } finally {
      setIsLoadingItems(false);
      setIsLoading(false);
    }
  }, []);

  // ============================================================
  // LISTINGS
  // ============================================================

  const loadListings = useCallback(async (isActive?: boolean) => {
    setIsLoadingListings(true);
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTListings(
        isActive,
        ITEMS_PER_PAGE,
        0
      );
      
      setListings(data);
      setListingsPage(0);
      setHasMoreListings(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded listings:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading listings:', error);
    } finally {
      setIsLoadingListings(false);
      setIsLoading(false);
    }
  }, []);

  const loadMoreListings = useCallback(async () => {
    if (!hasMoreListings || isLoadingListings) return;
    
    setIsLoadingListings(true);
    
    try {
      const nextPage = listingsPage + 1;
      const data = await subgraphService.getNFTListings(
        true, // Active listings only for pagination
        ITEMS_PER_PAGE,
        nextPage * ITEMS_PER_PAGE
      );
      
      setListings(prev => [...prev, ...data]);
      setListingsPage(nextPage);
      setHasMoreListings(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded more listings:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading more listings:', error);
    } finally {
      setIsLoadingListings(false);
    }
  }, [listingsPage, hasMoreListings, isLoadingListings]);

  // ============================================================
  // ACTIVITY
  // ============================================================

  const loadActivity = useCallback(async (
    itemId?: string,
    activityTypes?: string[]
  ) => {
    setIsLoadingActivity(true);
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getNFTActivity(
        itemId,
        activityTypes,
        ITEMS_PER_PAGE,
        0
      );
      
      setActivities(data);
      setActivitiesPage(0);
      setHasMoreActivity(data.length === ITEMS_PER_PAGE);
      setCurrentActivityItemFilter(itemId);
      setCurrentActivityTypesFilter(activityTypes);
      
      console.log('[NFT Marketplace] Loaded activity:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading activity:', error);
    } finally {
      setIsLoadingActivity(false);
      setIsLoading(false);
    }
  }, []);

  const loadMoreActivity = useCallback(async () => {
    if (!hasMoreActivity || isLoadingActivity) return;
    
    setIsLoadingActivity(true);
    
    try {
      const nextPage = activitiesPage + 1;
      const data = await subgraphService.getNFTActivity(
        currentActivityItemFilter,
        currentActivityTypesFilter,
        ITEMS_PER_PAGE,
        nextPage * ITEMS_PER_PAGE
      );
      
      setActivities(prev => [...prev, ...data]);
      setActivitiesPage(nextPage);
      setHasMoreActivity(data.length === ITEMS_PER_PAGE);
      
      console.log('[NFT Marketplace] Loaded more activity:', data.length);
    } catch (error) {
      console.error('[NFT Marketplace] Error loading more activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [activitiesPage, hasMoreActivity, isLoadingActivity, currentActivityItemFilter, currentActivityTypesFilter]);

  // ============================================================
  // STATS
  // ============================================================

  const loadUserStats = useCallback(async (userId: string) => {
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getUserNFTStats(userId);
      setUserStats(data);
      
      console.log('[NFT Marketplace] Loaded user stats');
    } catch (error) {
      console.error('[NFT Marketplace] Error loading user stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadGlobalStats = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const data = await subgraphService.getGlobalMarketplaceStats();
      setGlobalStats(data);
      
      console.log('[NFT Marketplace] Loaded global stats');
    } catch (error) {
      console.error('[NFT Marketplace] Error loading global stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ============================================================
  // UTILITIES
  // ============================================================

  const resetFilters = useCallback(() => {
    setCurrentCollectionFilter(undefined);
    setCurrentListedFilter(undefined);
    setCurrentActivityItemFilter(undefined);
    setCurrentActivityTypesFilter(undefined);
    
    console.log('[NFT Marketplace] Reset all filters');
  }, []);

  const value: NFTMarketplaceContextType = {
    // Collections
    collections,
    selectedCollection,
    trendingCollections,
    
    // Items
    items,
    selectedItem,
    
    // Listings
    listings,
    
    // Activity
    activities,
    
    // Stats
    userStats,
    globalStats,
    
    // Loading states
    isLoading,
    isLoadingCollections,
    isLoadingItems,
    isLoadingListings,
    isLoadingActivity,
    
    // Pagination
    hasMoreCollections,
    hasMoreItems,
    hasMoreListings,
    hasMoreActivity,
    
    // Methods
    loadCollections,
    loadMoreCollections,
    loadCollection,
    loadTrendingCollections,
    
    loadItems,
    loadMoreItems,
    loadItem,
    searchItems,
    
    loadListings,
    loadMoreListings,
    
    loadActivity,
    loadMoreActivity,
    
    loadUserStats,
    loadGlobalStats,
    
    resetFilters,
  };

  return (
    <NFTMarketplaceContext.Provider value={value}>
      {children}
    </NFTMarketplaceContext.Provider>
  );
};

export default NFTMarketplaceContext;
