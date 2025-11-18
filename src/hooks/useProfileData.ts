// Hook untuk menggunakan Profile Service dengan real-time updates
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { profileService, type UserProfile } from '@/services/profileService';
import { useSomniaDatastream } from '@/hooks/useSomniaDatastream';

interface UseProfileDataOptions {
  userAddress?: string;
  autoLoad?: boolean;
  enableRealTime?: boolean;
  cacheTimeout?: number;
}

interface UseProfileDataReturn {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  hasProfile: boolean;
  refetch: () => Promise<void>;
  clearCache: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  // Additional data from DataStream
  socialLinks: UserProfile['socialLinks'] | null;
  reputationScore: number;
  isVerified: boolean;
}

export const useProfileData = (options: UseProfileDataOptions = {}): UseProfileDataReturn => {
  const { 
    userAddress, 
    autoLoad = true, 
    enableRealTime = true,
    cacheTimeout = 5 * 60 * 1000 // 5 menit default
  } = options;

  const { address: connectedAddress } = useAccount();
  const targetAddress = userAddress || connectedAddress;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  // Use ref to prevent unnecessary re-renders
  const lastFetchTime = useRef<number>(0);
  const isMountedRef = useRef(true);

  // DataStream untuk real-time updates
  const { events: datastreamEvents } = useSomniaDatastream({
    eventTypes: ['profile'],
    autoConnect: enableRealTime
  });

  // Load profile data
  const loadProfile = useCallback(async (address: string) => {
    if (!address || isLoading) return;

    // Check cache timeout
    const now = Date.now();
    if (now - lastFetchTime.current < cacheTimeout && profile) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Loading profile for: ${address}`);
      
      // Check if profile exists
      const profileExists = await profileService.hasProfile(address);
      setHasProfile(profileExists);

      if (profileExists) {
        // Get profile data
        const profileData = await profileService.getProfile(address);
        
        if (isMountedRef.current) {
          setProfile(profileData);
          lastFetchTime.current = now;
          console.log(`✅ Profile loaded successfully for: ${address}`);
        }
      } else {
        if (isMountedRef.current) {
          setProfile(null);
          console.log(`ℹ️ No profile found for: ${address}`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile';
      if (isMountedRef.current) {
        setError(errorMessage);
        console.error(`❌ Error loading profile for ${address}:`, err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isLoading, cacheTimeout, profile]);

  // Refetch profile data
  const refetch = useCallback(async () => {
    if (!targetAddress) return;
    
    // Clear cache untuk force reload
    profileService.clearProfileCache(targetAddress);
    lastFetchTime.current = 0;
    
    await loadProfile(targetAddress);
  }, [targetAddress, loadProfile]);

  // Clear cache
  const clearCache = useCallback(() => {
    if (targetAddress) {
      profileService.clearProfileCache(targetAddress);
      lastFetchTime.current = 0;
    }
  }, [targetAddress]);

  // Update profile locally (optimistic updates)
  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    if (profile && targetAddress) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      
      // Update cache
      profileService.updateProfileFromDataStream(targetAddress, updates);
    }
  }, [profile, targetAddress]);

  // Auto-load profile when address changes
  useEffect(() => {
    if (autoLoad && targetAddress) {
      loadProfile(targetAddress);
    }
  }, [targetAddress, autoLoad, loadProfile]);

  // Handle real-time updates dari DataStream
  useEffect(() => {
    if (!enableRealTime || !targetAddress || !datastreamEvents.length) return;

    // Filter events untuk address yang sedang di-track
    const relevantEvents = datastreamEvents.filter(event => {
      try {
        const eventData = JSON.parse(event.data);
        return eventData.user?.toLowerCase() === targetAddress.toLowerCase();
      } catch {
        return false;
      }
    });

    if (relevantEvents.length > 0) {
      console.log(`🔄 Real-time profile update detected for: ${targetAddress}`);
      
      // Debounce multiple events
      const timeoutId = setTimeout(() => {
        refetch();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [datastreamEvents, targetAddress, enableRealTime, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    profile,
    isLoading,
    error,
    hasProfile,
    refetch,
    clearCache,
    updateProfile,
    // Additional data
    socialLinks: profile?.socialLinks || null,
    reputationScore: profile?.reputationScore || 0,
    isVerified: profile?.isVerified || false
  };
};

// Hook khusus untuk current user profile
export const useCurrentUserProfile = () => {
  const { address } = useAccount();
  
  return useProfileData({
    userAddress: address,
    autoLoad: true,
    enableRealTime: true
  });
};

// Hook untuk multiple profiles (batch loading)
export const useMultipleProfiles = (addresses: string[]) => {
  const [profiles, setProfiles] = useState<(UserProfile | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    if (!addresses.length || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Loading ${addresses.length} profiles...`);
      const profileData = await profileService.getMultipleProfiles(addresses);
      setProfiles(profileData);
      console.log(`✅ Loaded ${profileData.filter(p => p !== null).length} profiles`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profiles';
      setError(errorMessage);
      console.error('❌ Error loading multiple profiles:', err);
    } finally {
      setIsLoading(false);
    }
  }, [addresses, isLoading]);

  useEffect(() => {
    if (addresses.length > 0) {
      loadProfiles();
    }
  }, [addresses.join(','), loadProfiles]);

  return {
    profiles,
    isLoading,
    error,
    refetch: loadProfiles
  };
};

// Hook untuk profile search
export const useProfileSearch = () => {
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchProfiles = useCallback(async (query: string, limit: number = 10) => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);

    try {
      console.log(`🔍 Searching profiles for: "${query}"`);
      const searchResults = await profileService.searchProfiles(query, limit);
      setResults(searchResults);
      console.log(`✅ Found ${searchResults.length} profiles`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('❌ Profile search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [isSearching]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    isSearching,
    error,
    searchProfiles,
    clearResults
  };
};