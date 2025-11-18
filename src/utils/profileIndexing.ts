// Utility untuk indexing profile data menggunakan Somnia DataStream
import { somniaDatastreamService } from '@/services/somniaDatastreamService';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { profileService, type UserProfile } from '@/services/profileService';

interface ProfileIndexEntry {
  userAddress: string;
  username: string;
  displayName: string;
  isArtist: boolean;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
  blockNumber: number;
  transactionHash: string;
}

interface ProfileSearchIndex {
  [key: string]: ProfileIndexEntry[];
}

class ProfileIndexingService {
  private searchIndex: ProfileSearchIndex = {};
  private isIndexing = false;
  private lastIndexUpdate = 0;
  private readonly INDEX_UPDATE_INTERVAL = 60000; // 1 menit

  constructor() {
    this.initializeIndexing();
  }

  // Inisialisasi indexing dengan DataStream
  private async initializeIndexing() {
    try {
      // Subscribe ke profile events untuk real-time indexing
      await somniaDatastreamService.subscribeToProfileEvents();
      
      // Build initial index dari existing data
      await this.buildRealIndex();
      
      console.log('✅ Profile indexing service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize profile indexing:', error);
    }
  }

  // Build initial search index
  private async buildInitialIndex() {
    if (this.isIndexing) return;
    
    this.isIndexing = true;
    console.log('🔄 Building profile search index...');

    try {
      // Query real data dari blockchain events
      await this.buildRealIndex();
      
      this.lastIndexUpdate = Date.now();
      console.log('✅ Profile search index built successfully');
    } catch (error) {
      console.error('❌ Failed to build profile index:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  // Build index dari real blockchain data
  private async buildRealIndex() {
    try {
      // Query semua ProfileCreated events dari DataStream
      const profileEvents = await this.queryProfileEventsFromDataStream();
      
      console.log(`📋 Found ${profileEvents.length} profile events to index`);

      // Build index dari events
      for (const event of profileEvents) {
        await this.indexProfileFromEvent(event);
      }

      console.log(`✅ Indexed ${profileEvents.length} profiles`);
    } catch (error) {
      console.error('❌ Error building real index:', error);
    }
  }

  // Query profile events dari DataStream
  private async queryProfileEventsFromDataStream(): Promise<any[]> {
    // Implementasi real akan query ProfileCreated dan ProfileUpdated events
    // dari Somnia DataStream untuk semua profiles yang ada
    
    // Untuk sementara return empty array sampai DataStream query ready
    return [];
  }

  // Index profile dari event data
  private async indexProfileFromEvent(event: any) {
    try {
      // Extract profile data dari event
      const profileData = this.extractProfileDataFromEvent(event);
      
      if (profileData) {
        // Add to search index
        this.addToSearchIndex('username', profileData.username.toLowerCase(), profileData);
        this.addToSearchIndex('displayName', profileData.displayName.toLowerCase(), profileData);
        
        // Index words
        const words = profileData.displayName.toLowerCase().split(' ');
        for (const word of words) {
          if (word.length > 2) {
            this.addToSearchIndex('words', word, profileData);
          }
        }
      }
    } catch (error) {
      console.error('Error indexing profile from event:', error);
    }
  }

  // Extract profile data dari event
  private extractProfileDataFromEvent(event: any): ProfileIndexEntry | null {
    try {
      // Parse event data untuk extract profile information
      // Format akan tergantung pada struktur event dari contract
      
      return {
        userAddress: event.user || '',
        username: event.username || '',
        displayName: event.displayName || '',
        isArtist: event.isArtist || false,
        isVerified: false, // Will be determined separately
        createdAt: event.timestamp || Date.now(),
        updatedAt: event.timestamp || Date.now(),
        blockNumber: event.blockNumber || 0,
        transactionHash: event.transactionHash || ''
      };
    } catch (error) {
      console.error('Error extracting profile data from event:', error);
      return null;
    }
  }

  // Add entry to search index
  private addToSearchIndex(category: string, key: string, profile: ProfileIndexEntry) {
    const indexKey = `${category}:${key}`;
    if (!this.searchIndex[indexKey]) {
      this.searchIndex[indexKey] = [];
    }
    
    // Avoid duplicates
    const exists = this.searchIndex[indexKey].some(p => p.userAddress === profile.userAddress);
    if (!exists) {
      this.searchIndex[indexKey].push(profile);
    }
  }

  // Search profiles menggunakan index
  async searchProfiles(query: string, limit: number = 10): Promise<UserProfile[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    console.log(`🔍 Searching profiles for: "${query}"`);

    const results = new Map<string, ProfileIndexEntry>();
    
    // Search by username
    const usernameKey = `username:${normalizedQuery}`;
    if (this.searchIndex[usernameKey]) {
      for (const profile of this.searchIndex[usernameKey]) {
        results.set(profile.userAddress, profile);
      }
    }

    // Search by display name
    const displayNameKey = `displayName:${normalizedQuery}`;
    if (this.searchIndex[displayNameKey]) {
      for (const profile of this.searchIndex[displayNameKey]) {
        results.set(profile.userAddress, profile);
      }
    }

    // Search by words (partial matching)
    for (const [indexKey, profiles] of Object.entries(this.searchIndex)) {
      if (indexKey.startsWith('words:') && indexKey.includes(normalizedQuery)) {
        for (const profile of profiles) {
          results.set(profile.userAddress, profile);
        }
      }
    }

    // Convert to UserProfile format dan ambil data lengkap
    const searchResults: UserProfile[] = [];
    const resultArray = Array.from(results.values()).slice(0, limit);

    for (const indexEntry of resultArray) {
      try {
        // Get full profile data
        const fullProfile = await profileService.getProfile(indexEntry.userAddress);
        if (fullProfile) {
          searchResults.push(fullProfile);
        }
      } catch (error) {
        console.error(`Error getting full profile for ${indexEntry.userAddress}:`, error);
      }
    }

    console.log(`✅ Found ${searchResults.length} profiles for "${query}"`);
    return searchResults;
  }

  // Update index ketika ada profile baru atau update
  async updateProfileIndex(userAddress: string, profileData: Partial<UserProfile>) {
    try {
      // Remove old entries
      this.removeFromIndex(userAddress);

      // Add new entries jika profile complete
      if (profileData.username && profileData.displayName) {
        const indexEntry: ProfileIndexEntry = {
          userAddress,
          username: profileData.username,
          displayName: profileData.displayName,
          isArtist: profileData.isArtist || false,
          isVerified: profileData.isVerified || false,
          createdAt: profileData.createdAt || Date.now(),
          updatedAt: profileData.updatedAt || Date.now(),
          blockNumber: profileData.blockNumber || 0,
          transactionHash: profileData.transactionHash || ''
        };

        // Add to index
        this.addToSearchIndex('username', indexEntry.username.toLowerCase(), indexEntry);
        this.addToSearchIndex('displayName', indexEntry.displayName.toLowerCase(), indexEntry);
        
        // Index words
        const words = indexEntry.displayName.toLowerCase().split(' ');
        for (const word of words) {
          if (word.length > 2) {
            this.addToSearchIndex('words', word, indexEntry);
          }
        }

        console.log(`✅ Updated profile index for: ${userAddress}`);
      }
    } catch (error) {
      console.error(`❌ Error updating profile index for ${userAddress}:`, error);
    }
  }

  // Remove profile dari index
  private removeFromIndex(userAddress: string) {
    for (const [key, profiles] of Object.entries(this.searchIndex)) {
      this.searchIndex[key] = profiles.filter(p => p.userAddress !== userAddress);
      
      // Remove empty arrays
      if (this.searchIndex[key].length === 0) {
        delete this.searchIndex[key];
      }
    }
  }

  // Get popular profiles berdasarkan real metrics
  async getPopularProfiles(limit: number = 10): Promise<UserProfile[]> {
    try {
      console.log(`🔥 Getting ${limit} popular profiles from real data...`);
      
      // Query profiles dengan follower count tertinggi dari index
      const popularProfiles: UserProfile[] = [];
      
      // Sort profiles by follower count, reputation score, etc.
      for (const profiles of Object.values(this.searchIndex)) {
        for (const profile of profiles) {
          try {
            const fullProfile = await profileService.getProfile(profile.userAddress);
            if (fullProfile && (fullProfile.followerCount || 0) > 0) {
              popularProfiles.push(fullProfile);
            }
          } catch (error) {
            console.error(`Error getting popular profile ${profile.userAddress}:`, error);
          }
        }
      }

      // Sort by follower count descending
      popularProfiles.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
      
      const result = popularProfiles.slice(0, limit);
      console.log(`✅ Found ${result.length} popular profiles`);
      return result;
    } catch (error) {
      console.error('Error getting popular profiles:', error);
      return [];
    }
  }

  // Get artist profiles
  async getArtistProfiles(limit: number = 10): Promise<UserProfile[]> {
    const artists: UserProfile[] = [];
    
    // Search dalam index untuk artists
    for (const profiles of Object.values(this.searchIndex)) {
      for (const profile of profiles) {
        if (profile.isArtist && artists.length < limit) {
          try {
            const fullProfile = await profileService.getProfile(profile.userAddress);
            if (fullProfile) {
              artists.push(fullProfile);
            }
          } catch (error) {
            console.error(`Error getting artist profile ${profile.userAddress}:`, error);
          }
        }
      }
    }

    console.log(`🎵 Found ${artists.length} artist profiles`);
    return artists;
  }

  // Get verified profiles
  async getVerifiedProfiles(limit: number = 10): Promise<UserProfile[]> {
    const verified: UserProfile[] = [];
    
    for (const profiles of Object.values(this.searchIndex)) {
      for (const profile of profiles) {
        if (profile.isVerified && verified.length < limit) {
          try {
            const fullProfile = await profileService.getProfile(profile.userAddress);
            if (fullProfile) {
              verified.push(fullProfile);
            }
          } catch (error) {
            console.error(`Error getting verified profile ${profile.userAddress}:`, error);
          }
        }
      }
    }

    console.log(`✅ Found ${verified.length} verified profiles`);
    return verified;
  }

  // Get index statistics
  getIndexStats() {
    const totalEntries = Object.values(this.searchIndex).reduce(
      (sum, profiles) => sum + profiles.length, 0
    );
    
    return {
      totalIndexKeys: Object.keys(this.searchIndex).length,
      totalEntries,
      lastUpdate: this.lastIndexUpdate,
      isIndexing: this.isIndexing
    };
  }

  // Rebuild index (manual trigger)
  async rebuildIndex() {
    console.log('🔄 Manually rebuilding profile index...');
    this.searchIndex = {};
    await this.buildRealIndex();
  }

  // Cleanup resources
  cleanup() {
    this.searchIndex = {};
    this.isIndexing = false;
  }
}

// Export singleton instance
export const profileIndexingService = new ProfileIndexingService();

// Export utility functions
export const searchProfiles = (query: string, limit?: number) => 
  profileIndexingService.searchProfiles(query, limit);

export const getPopularProfiles = (limit?: number) => 
  profileIndexingService.getPopularProfiles(limit);

export const getArtistProfiles = (limit?: number) => 
  profileIndexingService.getArtistProfiles(limit);

export const getVerifiedProfiles = (limit?: number) => 
  profileIndexingService.getVerifiedProfiles(limit);

export default profileIndexingService;