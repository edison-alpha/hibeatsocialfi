import { useState, useEffect, useCallback } from 'react';
import { useSequence } from '@/contexts/SequenceContext';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { profileService, type UserProfile } from '@/services/profileService';

// Use UserProfile type from service
type ProfileData = UserProfile;

interface UseRealTimeProfileOptions {
  address?: string;
  autoFetch?: boolean;
}

export const useRealTimeProfile = (options: UseRealTimeProfileOptions = {}) => {
  const { address, autoFetch = true } = options;
  const { getProfile, smartAccountAddress } = useSequence();
  const { recentEvents, isConnected: datastreamConnected } = useSomniaDatastream();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number>(0);

  const targetAddress = address || smartAccountAddress;

  // Fetch profile data using integrated service
  const fetchProfile = useCallback(async (userAddress?: string) => {
    const addr = userAddress || targetAddress;
    if (!addr) return null;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching real-time profile for:', addr);
      
      // Use integrated profile service with DataStream
      const profile = await profileService.getProfile(addr);
      
      if (profile) {
        setProfileData(profile);
        setLastUpdated(Date.now());
        console.log('✅ Profile fetched successfully:', profile.displayName || profile.username);
        return profile;
      } else {
        // Check if profile exists using fallback method
        const hasProfile = await profileService.hasProfile(addr);
        if (!hasProfile) {
          setError('Profile not found');
        } else {
          setError('Failed to load profile data');
        }
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      console.error('❌ Failed to fetch profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [targetAddress]);

  // Auto-fetch profile on mount
  useEffect(() => {
    if (autoFetch && targetAddress) {
      fetchProfile();
    }
  }, [autoFetch, targetAddress, fetchProfile]);

  // Listen for real-time profile events
  useEffect(() => {
    if (!targetAddress || !datastreamConnected || !recentEvents.length) return;

    // Filter profile events for target address
    const profileEvents = recentEvents.filter(event => 
      (event.type === 'profile_created' || event.type === 'profile_updated') &&
      event.data?.user?.toLowerCase() === targetAddress.toLowerCase()
    );

    // Filter follow/unfollow events that affect this user's follower count
    const followEvents = recentEvents.filter(event => 
      (event.type === 'user_followed' || event.type === 'user_unfollowed') &&
      (event.data?.followedUser?.toLowerCase() === targetAddress.toLowerCase() ||
       event.data?.follower?.toLowerCase() === targetAddress.toLowerCase())
    );

    if (profileEvents.length > 0 || followEvents.length > 0) {
      console.log('🔄 Real-time update detected for:', targetAddress, {
        profileEvents: profileEvents.length,
        followEvents: followEvents.length
      });
      
      // Refresh profile data
      fetchProfile().then(() => {
        console.log('✅ Profile refreshed from real-time event');
      });
    }
  }, [recentEvents, targetAddress, datastreamConnected, fetchProfile]);

  // Manual refresh function
  const refreshProfile = useCallback(() => {
    return fetchProfile();
  }, [fetchProfile]);

  // Get display name - no fallback defaults
  const getDisplayName = useCallback(() => {
    if (!profileData) return '';
    return profileData.displayName || profileData.username || '';
  }, [profileData]);

  // Get avatar URL with IPFS support
  const getAvatarUrl = useCallback(() => {
    if (!profileData?.avatarHash) return '';
    
    // If it's already a full URL, return as is
    if (profileData.avatarHash.startsWith('http')) {
      return profileData.avatarHash;
    }
    
    // If it's an IPFS hash, construct IPFS URL with multiple gateways for reliability
    if (profileData.avatarHash.startsWith('Qm') || 
        profileData.avatarHash.startsWith('baf') || 
        profileData.avatarHash.startsWith('ipfs://')) {
      
      const hash = profileData.avatarHash.replace('ipfs://', '');
      
      // Use multiple IPFS gateways for better reliability
      const ipfsGateways = [
        `https://ipfs.io/ipfs/${hash}`,
        `https://gateway.pinata.cloud/ipfs/${hash}`,
        `https://cloudflare-ipfs.com/ipfs/${hash}`,
        `https://dweb.link/ipfs/${hash}`
      ];
      
      // Return primary gateway, others can be used as fallbacks
      return ipfsGateways[0];
    }
    
    return profileData.avatarHash;
  }, [profileData]);

  // Check if profile is real-time connected
  const isRealTimeConnected = datastreamConnected;

  return {
    // Profile data
    profileData,
    displayName: getDisplayName(),
    avatarUrl: getAvatarUrl(),
    
    // State
    loading,
    error,
    lastUpdated,
    isRealTimeConnected,
    
    // Actions
    fetchProfile,
    refreshProfile,
    
    // Utilities
    hasProfile: !!profileData,
    isArtist: profileData?.isArtist || false,
    createdAt: profileData?.createdAt || 0
  };
};

// Specialized hook for current user profile
export const useCurrentUserProfile = () => {
  const { smartAccountAddress } = useSequence();
  
  return useRealTimeProfile({
    address: smartAccountAddress || undefined,
    autoFetch: true
  });
};

// Specialized hook for viewing other user profiles
export const useUserProfile = (address: string) => {
  return useRealTimeProfile({
    address,
    autoFetch: !!address
  });
};