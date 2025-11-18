// Profile Service dengan integrasi Somnia DataStream untuk indexing
import { readContract } from '@wagmi/core';
import { getAddress } from 'viem';
import { wagmiConfig, CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { USER_PROFILE_ABI } from '@/lib/abis/UserProfile';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';

export interface UserProfile {
  userAddress: string;
  beatsId: number; // BID - Unique numeric identifier (like Farcaster FID)
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  bannerHash?: string;
  location: string;
  website?: string;
  socialLinks?: {
    instagram: string;
    twitter: string;
    youtube: string;
    spotify: string;
    soundcloud: string;
    bandcamp: string;
    discord: string;
    telegram: string;
  };
  musicPreferences?: {
    favoriteGenres: string[];
  };
  artistData?: {
    artistName: string;
    genre: string;
    totalStreams: number;
    totalLikes: number;
    songCount: number;
    followerCount: number;
    isIndependent: boolean;
    recordLabel: string;
  };
  isVerified: boolean;
  isArtist: boolean;
  reputationScore: number;
  createdAt: number;
  updatedAt: number;
  // DataStream indexed fields
  followerCount?: number;
  followingCount?: number;
  blockNumber?: number;
  transactionHash?: string;
}

export interface ProfileCache {
  [address: string]: {
    profile: UserProfile;
    lastUpdated: number;
    ttl: number;
  };
}

class ProfileService {
  private profileCache: ProfileCache = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 menit
  private readonly MAX_CACHE_SIZE = 1000;

  constructor() {
    // No initialization needed - profiles read directly from smart contract
  }

  // ❌ REMOVED: DataStream subscription
  // Profile updates now come from blockchain events only

  // Emit profile update event untuk real-time UI updates
  private emitProfileUpdate(userAddress: string, updates: Partial<UserProfile>): void {
    // Emit custom event untuk React components
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('profileUpdate', {
        detail: { userAddress, updates }
      });
      window.dispatchEvent(event);
    }
  }

  // Mendapatkan profile HANYA dari smart contract (on-chain source of truth)
  async getProfile(userAddress: string): Promise<UserProfile | null> {
    if (!userAddress) {
      return null;
    }

    try {
      // Cek cache terlebih dahulu
      const cachedProfile = this.getCachedProfile(userAddress);
      if (cachedProfile) {
        return cachedProfile;
      }

      // ✅ ONLY SOURCE: Smart Contract UserProfile.sol
      const contractProfile = await this.getProfileFromContract(userAddress);

      if (contractProfile) {
        // Cache hasil
        this.cacheProfile(userAddress, contractProfile);
        return contractProfile;
      }

      // Jika tidak ada profile di contract, return null
      return null;

    } catch (error) {
      console.error('❌ Error getting profile:', error);
      return null;
    }
  }

  // Cek apakah user memiliki profile - menggunakan contract profileExists sebagai prioritas
  async hasProfile(userAddress: string): Promise<boolean> {
    if (!userAddress) return false;

    try {
      console.log('🔍 Checking profile existence for:', userAddress);

      // HANYA check contract profileExists function
      // Ini adalah satu-satunya sumber kebenaran untuk profile existence
      const contractResult = await readContract(wagmiConfig, {
        address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
        abi: USER_PROFILE_ABI,
        functionName: 'profileExists',
        args: [userAddress as `0x${string}`]
      } as any);

      const exists = Boolean(contractResult);
      console.log('✅ Contract profileExists result:', exists);

      return exists;

    } catch (error) {
      console.error('❌ Error checking profile existence:', error);
      // Jika ada error membaca contract, return false (profile tidak exist)
      // PENTING: Jangan return true pada error, karena bisa menyebabkan false positive
      return false;
    }
  }

  // ✅ Ambil data profile HANYA dari smart contract UserProfile.sol (on-chain source of truth)
  private async getProfileFromContract(userAddress: string): Promise<UserProfile | null> {
    if (!userAddress) return null;
    
    try {
      console.log('🔍 [ProfileService] Reading profile from contract:', userAddress);
      
      // Read profile from UserProfile.sol smart contract
      const profileData = await readContract(wagmiConfig, {
        address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
        abi: USER_PROFILE_ABI,
        functionName: 'getProfile',
        args: [userAddress as `0x${string}`]
      } as any);

      // getProfile returns a struct Profile
      const profileStruct = profileData as {
        userAddress: string;
        beatsId: bigint;
        username: string;
        displayName: string;
        bio: string;
        avatarHash: string;
        bannerHash: string;
        location: string;
        website: string;
        socialLinks: {
          instagram: string;
          twitter: string;
          youtube: string;
          spotify: string;
          soundcloud: string;
          bandcamp: string;
          discord: string;
          telegram: string;
        };
        isVerified: boolean;
        isArtist: boolean;
        reputationScore: bigint;
        createdAt: bigint;
        updatedAt: bigint;
      };
      
      // ✅ CHECK: If userAddress is zero address (0x00...00), profile doesn't exist
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
      if (!profileStruct.userAddress || 
          profileStruct.userAddress.toLowerCase() === ZERO_ADDRESS.toLowerCase()) {
        console.log('⚠️ [ProfileService] Profile does not exist (zero address)');
        return null;
      }
      
      // Build profile object from contract data
      const profile: UserProfile = {
        userAddress: profileStruct.userAddress || userAddress,
        beatsId: Number(profileStruct.beatsId) || 0,
        username: profileStruct.username || '',
        displayName: profileStruct.displayName || '',
        bio: profileStruct.bio || '',
        avatarHash: profileStruct.avatarHash || '',
        bannerHash: profileStruct.bannerHash || '',
        location: profileStruct.location || '',
        website: profileStruct.website || '',
        socialLinks: profileStruct.socialLinks || {
          instagram: '', twitter: '', youtube: '', spotify: '',
          soundcloud: '', bandcamp: '', discord: '', telegram: ''
        },
        isVerified: Boolean(profileStruct.isVerified),
        isArtist: Boolean(profileStruct.isArtist),
        reputationScore: Number(profileStruct.reputationScore) || 0,
        createdAt: Number(profileStruct.createdAt),
        updatedAt: Number(profileStruct.updatedAt) || Date.now(),
        // Social stats - will be calculated from DataStream
        followerCount: 0,
        followingCount: 0,
      };

      // ✅ Calculate follower/following count from DataStream
      try {
        const socialStats = await this.calculateSocialStats(userAddress);
        profile.followerCount = socialStats.followerCount;
        profile.followingCount = socialStats.followingCount;
      } catch (error) {
        console.warn('⚠️ [ProfileService] Failed to calculate social stats:', error);
        // Keep default 0 values
      }

      console.log('✅ [ProfileService] Profile loaded from contract:', {
        beatsId: profile.beatsId,
        username: profile.username,
        displayName: profile.displayName,
        isArtist: profile.isArtist,
        isVerified: profile.isVerified,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount
      });

      return profile;
      
    } catch (error) {
      console.error('❌ [ProfileService] Error reading from contract:', error);
      // Jika profile tidak exist di contract, return null (bukan fallback)
      return null;
    }
  }

  // ✅ Calculate social stats (follower/following) from DataStream
  private async calculateSocialStats(userAddress: string): Promise<{ followerCount: number; followingCount: number }> {
    try {
      // Import DataStream service V3
      const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
      
      // Use built-in functions from DataStream service
      const [followerCount, followingCount] = await Promise.all([
        somniaDatastreamServiceV3.getFollowerCount(userAddress),
        somniaDatastreamServiceV3.getFollowingCount(userAddress)
      ]);
      
      return {
        followerCount,
        followingCount
      };
      
    } catch (error) {
      console.error('❌ [ProfileService] Error calculating social stats:', error);
      return { followerCount: 0, followingCount: 0 };
    }
  }

  // Batch loading untuk multiple profiles
  async getMultipleProfiles(addresses: string[]): Promise<(UserProfile | null)[]> {
    const promises = addresses.map(address => this.getProfile(address));
    return Promise.all(promises);
  }

  // Search profiles berdasarkan username atau display name
  async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    try {
      // Import indexing service secara lazy untuk avoid circular dependency
      const { profileIndexingService } = await import('@/utils/profileIndexing');
      return await profileIndexingService.searchProfiles(query, limit);
    } catch (error) {
      return [];
    }
  }

  // Get cached profile
  private getCachedProfile(userAddress: string): UserProfile | null {
    const cached = this.profileCache[userAddress];
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.lastUpdated > cached.ttl) {
      delete this.profileCache[userAddress];
      return null;
    }

    return cached.profile;
  }

  // Cache profile dengan TTL
  private cacheProfile(userAddress: string, profile: UserProfile) {
    // Manage cache size
    if (Object.keys(this.profileCache).length >= this.MAX_CACHE_SIZE) {
      this.clearOldestCacheEntries();
    }

    this.profileCache[userAddress] = {
      profile,
      lastUpdated: Date.now(),
      ttl: this.CACHE_TTL
    };
  }

  // Clear oldest cache entries
  private clearOldestCacheEntries() {
    const entries = Object.entries(this.profileCache);
    entries.sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);
    
    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      delete this.profileCache[entries[i][0]];
    }
  }

  // Clear cache untuk specific address
  clearProfileCache(userAddress?: string) {
    if (userAddress) {
      delete this.profileCache[userAddress];
    } else {
      this.profileCache = {};
    }
  }

  // Update profile cache when profile changes on-chain
  updateProfileCache(userAddress: string, updates: Partial<UserProfile>) {
    const cached = this.profileCache[userAddress];
    if (cached) {
      cached.profile = { ...cached.profile, ...updates };
      cached.lastUpdated = Date.now();
    }
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: Object.keys(this.profileCache).length,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL
    };
  }

  // Cleanup resources
  cleanup() {
    // TODO: Unsubscribe when method is available
    // if (this.datastreamSubscriptionId) {
    //   somniaDatastreamService.unsubscribe(this.datastreamSubscriptionId);
    // }
    this.profileCache = {};
  }

  // ❌ REMOVED: publishProfileToDataStream
  // Profiles are now stored ONLY on-chain in UserProfile.sol smart contract
  // No need to publish to DataStream - contract is the single source of truth
}

// Export singleton instance
export const profileService = new ProfileService();
export default profileService;