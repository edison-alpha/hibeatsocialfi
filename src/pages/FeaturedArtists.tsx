import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  Music,
  Users,
  TrendingUp,
  Search,
  Filter,
  Star,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useAudio } from "@/contexts/AudioContext";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import avatarImage from "@/assets/8.png";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { profileService } from "@/services/profileService";
import { readContract } from '@wagmi/core';
import { wagmiConfig, CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { USER_PROFILE_ABI } from '@/lib/abis/UserProfile';
import { somniaDatastreamServiceV3 } from "@/services/somniaDatastreamService.v3";

interface ArtistData {
  address: string;
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  isVerified: boolean;
  isArtist: boolean;
  followerCount: number;
  followingCount: number;
}

const FeaturedArtists = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudio();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [artists, setArtists] = useState<ArtistData[]>([]);
  const [loading, setLoading] = useState(true);

  // Load verified artists from blockchain
  useEffect(() => {
    const loadVerifiedArtists = async () => {
      try {
        setLoading(true);
        console.log('🎨 [FeaturedArtists] Loading verified artists...');
        
        // Get verified artists addresses from contract
        const verifiedArtistsAddresses = await readContract(wagmiConfig, {
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getVerifiedArtists',
        } as any) as string[];
        
        console.log('✅ [FeaturedArtists] Found', verifiedArtistsAddresses.length, 'verified artists');
        
        if (verifiedArtistsAddresses.length === 0) {
          setArtists([]);
          setLoading(false);
          return;
        }
        
        // Load profiles for all verified artists
        const artistProfiles = await Promise.all(
          verifiedArtistsAddresses.map(async (address) => {
            try {
              const profile = await profileService.getProfile(address);
              if (profile && profile.isArtist) {
                return {
                  address: profile.userAddress,
                  username: profile.username || 'Unknown',
                  displayName: profile.displayName || 'Unknown Artist',
                  bio: profile.bio || 'No bio available',
                  avatarHash: profile.avatarHash || '',
                  isVerified: profile.isVerified,
                  isArtist: profile.isArtist,
                  followerCount: profile.followerCount || 0,
                  followingCount: profile.followingCount || 0,
                };
              }
              return null;
            } catch (error) {
              console.error('❌ Failed to load profile for', address, error);
              return null;
            }
          })
        );
        
        // Filter out null values
        const validArtists = artistProfiles.filter(artist => artist !== null) as ArtistData[];
        
        console.log('✅ [FeaturedArtists] Loaded', validArtists.length, 'artist profiles');
        setArtists(validArtists);
        
      } catch (error) {
        console.error('❌ [FeaturedArtists] Error loading verified artists:', error);
        setArtists([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadVerifiedArtists();
  }, []);

  const genres = [
    { id: "all", name: "All Artists", count: artists.length },
    { id: "verified", name: "Verified", count: artists.filter(a => a.isVerified).length },
  ];

  const mockArtists = [
    {
      id: 1,
      name: "Synthwave Collective",
      avatar: "SC",
      followers: "45.2K",
      tracks: 24,
      verified: true,
      bio: "Pioneering the future of synthwave music with AI-enhanced production",
      genre: "electronic",
      monthlyListeners: "2.1M",
      topTrack: "Cyber Dreams",
      cover: album1,
      isFollowing: false,
      featured: true
    },
    {
      id: 2,
      name: "Jazz Fusion",
      avatar: "JF",
      followers: "32.1K",
      tracks: 18,
      verified: false,
      bio: "Blending traditional jazz with modern electronic elements",
      genre: "jazz",
      monthlyListeners: "1.8M",
      topTrack: "Midnight Groove",
      cover: album2,
      isFollowing: true,
      featured: true
    },
    {
      id: 3,
      name: "Beat Masters",
      avatar: "BM",
      followers: "67.8K",
      tracks: 31,
      verified: true,
      bio: "Urban beat creators pushing the boundaries of hip-hop production",
      genre: "hip-hop",
      monthlyListeners: "3.2M",
      topTrack: "Urban Pulse",
      cover: album3,
      isFollowing: false,
      featured: true
    },
    {
      id: 4,
      name: "Ambient Sounds",
      avatar: "AS",
      followers: "23.4K",
      tracks: 15,
      verified: false,
      bio: "Creating immersive soundscapes for meditation and focus",
      genre: "ambient",
      monthlyListeners: "1.2M",
      topTrack: "Ocean Waves",
      cover: album4,
      isFollowing: true,
      featured: false
    },
    {
      id: 5,
      name: "Digital Artists",
      avatar: "DA",
      followers: "18.9K",
      tracks: 12,
      verified: false,
      bio: "Exploring the intersection of technology and musical creativity",
      genre: "electronic",
      monthlyListeners: "950K",
      topTrack: "Neon Nights",
      cover: album1,
      isFollowing: false,
      featured: false
    },
    {
      id: 6,
      name: "Neon Collective",
      avatar: "NC",
      followers: "41.5K",
      tracks: 22,
      verified: true,
      bio: "Cyberpunk-inspired electronic music for the digital age",
      genre: "electronic",
      monthlyListeners: "2.8M",
      topTrack: "Digital Horizon",
      cover: album2,
      isFollowing: false,
      featured: true
    },
    {
      id: 7,
      name: "Urban Flow",
      avatar: "UF",
      followers: "28.7K",
      tracks: 19,
      verified: false,
      bio: "Street-inspired hip-hop beats with soulful melodies",
      genre: "hip-hop",
      monthlyListeners: "1.5M",
      topTrack: "City Lights",
      cover: album3,
      isFollowing: true,
      featured: false
    },
    {
      id: 8,
      name: "Tranquil Waves",
      avatar: "TW",
      followers: "15.3K",
      tracks: 11,
      verified: false,
      bio: "Peaceful ambient compositions for relaxation and mindfulness",
      genre: "ambient",
      monthlyListeners: "780K",
      topTrack: "Serene Waters",
      cover: album4,
      isFollowing: false,
      featured: false
    },
    {
      id: 9,
      name: "Fusion Labs",
      avatar: "FL",
      followers: "52.1K",
      tracks: 27,
      verified: true,
      bio: "Experimental music blending multiple genres into unique soundscapes",
      genre: "electronic",
      monthlyListeners: "2.4M",
      topTrack: "Genre Bender",
      cover: album1,
      isFollowing: false,
      featured: true
    },
    {
      id: 10,
      name: "Soul Syndicate",
      avatar: "SS",
      followers: "36.8K",
      tracks: 21,
      verified: false,
      bio: "Contemporary jazz with soulful vocals and modern production",
      genre: "jazz",
      monthlyListeners: "1.9M",
      topTrack: "Soulful Nights",
      cover: album2,
      isFollowing: true,
      featured: false
    },
    {
      id: 11,
      name: "Rock Revolution",
      avatar: "RR",
      followers: "29.4K",
      tracks: 16,
      verified: false,
      bio: "Modern rock anthems with electronic twists",
      genre: "rock",
      monthlyListeners: "1.3M",
      topTrack: "Electric Heart",
      cover: album3,
      isFollowing: false,
      featured: false
    },
    {
      id: 12,
      name: "Pop Phenomena",
      avatar: "PP",
      followers: "44.6K",
      tracks: 25,
      verified: true,
      bio: "Catchy pop melodies with innovative production techniques",
      genre: "pop",
      monthlyListeners: "3.1M",
      topTrack: "Viral Dreams",
      cover: album4,
      isFollowing: false,
      featured: true
    }
  ];

  const filteredArtists = artists.filter(artist => {
    const matchesSearch = artist.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artist.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         artist.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === "all" || 
                        (selectedGenre === "verified" && artist.isVerified);
    return matchesSearch && matchesGenre;
  });

  const formatNumber = (num: string) => {
    const number = parseFloat(num.replace('K', '000').replace('M', '000000'));
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-clash font-semibold text-3xl mb-1">Featured Artists</h1>
            <p className="text-muted-foreground text-base">Discover talented creators and musicians in our community</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Genre Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  onClick={() => setSelectedGenre(genre.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 ${
                    selectedGenre === genre.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span className="text-sm font-medium">{genre.name}</span>
                  <Badge variant={selectedGenre === genre.id ? "secondary" : "outline"} className="text-xs ml-1">
                    {genre.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center mb-4">
                      <div className="w-20 h-20 mb-3 rounded-full bg-muted animate-pulse" />
                      <div className="h-5 w-32 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-12 bg-muted animate-pulse rounded mb-4" />
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 bg-muted animate-pulse rounded-full" />
                      <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Artists Grid */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredArtists.map((artist) => (
                <Link 
                  key={artist.address} 
                  to={`/profile/${artist.username}`}
                  className="block"
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl h-full">
                    <CardContent className="p-6">
                      {/* Artist Avatar and Basic Info */}
                      <div className="flex flex-col items-center text-center mb-4">
                        <Avatar className="w-20 h-20 mb-3">
                          {artist.avatarHash ? (
                            <AvatarImage src={`https://ipfs.io/ipfs/${artist.avatarHash}`} />
                          ) : (
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.address}`} />
                          )}
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xl">
                            {artist.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg truncate">{artist.displayName}</h3>
                          {artist.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                        <p className="text-muted-foreground text-sm">@{artist.username}</p>
                        <p className="text-muted-foreground text-xs mt-1">{artist.followerCount} followers</p>
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3 text-center min-h-[60px]">
                        {artist.bio || 'No bio available'}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {artist.followerCount} followers
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {artist.followingCount} following
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 rounded-full text-xs h-8"
                          onClick={(e) => {
                            e.preventDefault();
                            // TODO: Implement follow functionality
                          }}
                        >
                          Follow
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full w-8 h-8 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            // TODO: Implement play artist's music
                          }}
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredArtists.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No artists found</h3>
              <p className="text-muted-foreground">
                {artists.length === 0 
                  ? 'No verified artists yet. Be the first to become a verified artist!'
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default FeaturedArtists;