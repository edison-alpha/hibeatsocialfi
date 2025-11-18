import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Play,
  Pause,
  Heart,
  MessageCircle,
  Share2,
  ShoppingCart,
  Music,
  TrendingUp,
  Clock,
  Star,
  Users,
  ChevronRight,
  Filter,
  Headphones,
  Check
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useAudio } from "@/contexts/AudioContext";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { useAccount } from "wagmi";
import { recordMusicPlay } from "@/utils/playCountHelper";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import { Link } from "react-router-dom";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import RightSidebar from "@/components/RightSidebar";
import { profileService } from "@/services/profileService";
import { readContract } from '@wagmi/core';
import { wagmiConfig, CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { USER_PROFILE_ABI } from '@/lib/abis/UserProfile';
import { useTrendingMusic } from '@/hooks/useTrendingMusic';
import { usePlayCounts } from '@/hooks/usePlayCounts';

interface ArtistData {
  address: string;
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  isVerified: boolean;
  isArtist: boolean;
  followerCount: number;
}

const Explore = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudio();
  const { profileData: currentUserProfile } = useCurrentUserProfile();
  const { address } = useAccount();
  const [featuredArtists, setFeaturedArtists] = useState<ArtistData[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  
  // 🔥 Load trending music from blockchain
  const { trendingTracks, isLoading: loadingTrending, error: trendingError } = useTrendingMusic(10);
  
  // 🔥 Use play counts hook for real-time updates
  const tokenIds = trendingTracks.map(t => t.tokenId);
  const { getPlayCount, recordPlay, playCounts } = usePlayCounts(tokenIds);
  
  // 🔥 Sort trending tracks by real-time play count (re-sort when play counts change)
  const sortedTrendingTracks = useMemo(() => {
    if (trendingTracks.length === 0) return [];
    
    // Create array with updated play counts
    const tracksWithUpdatedCounts = trendingTracks.map(track => ({
      ...track,
      currentPlayCount: getPlayCount(track.tokenId) || track.playCount
    }));
    
    // Sort by current play count (descending)
    const sorted = tracksWithUpdatedCounts.sort((a, b) => 
      b.currentPlayCount - a.currentPlayCount
    );
    
    console.log('🔄 [Explore] Re-sorted trending tracks:', sorted.map(t => ({
      title: t.title,
      playCount: t.currentPlayCount
    })));
    
    return sorted;
  }, [trendingTracks, playCounts, getPlayCount]);
  
  // Debug log
  useEffect(() => {
    console.log('🔍 [Explore] Trending state:', {
      loading: loadingTrending,
      tracksCount: trendingTracks.length,
      error: trendingError,
      tracks: trendingTracks
    });
  }, [loadingTrending, trendingTracks, trendingError]);
  
  // Helper function to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Helper function to format genre - show only first word + "+" if more attributes
  const formatGenre = (genre: string) => {
    if (!genre) return 'Unknown';
    
    // Split by comma or other separators
    const parts = genre.split(/[,;]/).map(part => part.trim()).filter(Boolean);
    
    if (parts.length === 0) return 'Unknown';
    if (parts.length === 1) {
      // If single part, check if it has multiple words
      const words = parts[0].split(/\s+/).filter(Boolean);
      return words.length > 1 ? `${words[0]} +` : words[0];
    }
    
    // Multiple parts - show first word of first part + "+"
    const firstWord = parts[0].split(/\s+/)[0];
    return `${firstWord} +`;
  };
  const catalogSelects = [
    {
      id: 1,
      title: "Cyber Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album1,
      genre: "Synthwave",
      duration: "3:42",
      price: "0.5 ETH",
      likes: 1247,
      plays: 2100000,
      featured: true
    },
    {
      id: 2,
      title: "Neon Nights",
      artist: "Digital Artists",
      avatar: "DA",
      cover: album2,
      genre: "Electronic",
      duration: "4:15",
      price: "0.3 ETH",
      likes: 892,
      plays: 1800000,
      featured: false
    },
    {
      id: 3,
      title: "Future Bass",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album3,
      genre: "Hip Hop",
      duration: "2:58",
      price: "0.7 ETH",
      likes: 2156,
      plays: 3200000,
      featured: true
    }
  ];

  const linerNotes = [
    {
      id: 1,
      title: "The Making of Cyber Dreams",
      artist: "Synthwave Collective",
      excerpt: "An intimate look into the creative process behind our latest synthwave masterpiece...",
      readTime: "5 min read",
      cover: album1,
      date: "2 days ago"
    },
    {
      id: 2,
      title: "Exploring AI Music Generation",
      artist: "HiBeats Team",
      excerpt: "How artificial intelligence is revolutionizing music creation and what it means for artists...",
      readTime: "8 min read",
      cover: album2,
      date: "1 week ago"
    }
  ];

  const recentlySupported = [
    {
      id: 1,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      cover: album2,
      amount: "0.2 ETH",
      supporter: "MusicLover123",
      time: "2h ago"
    },
    {
      id: 2,
      title: "Urban Pulse",
      artist: "Beat Masters",
      cover: album3,
      amount: "0.5 ETH",
      supporter: "CryptoFan",
      time: "5h ago"
    }
  ];

  const recentlyReleased = [
    {
      id: 1,
      title: "Digital Horizons",
      artist: "Ambient Sounds",
      avatar: "AS",
      cover: album4,
      genre: "Ambient",
      duration: "5:20",
      likes: 634,
      plays: 45200,
      releaseDate: "2 days ago"
    },
    {
      id: 2,
      title: "Electric Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album1,
      genre: "Synthwave",
      duration: "3:15",
      likes: 987,
      plays: 128000,
      releaseDate: "1 week ago"
    },
    {
      id: 3,
      title: "Urban Pulse",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album3,
      genre: "Hip Hop",
      duration: "2:58",
      likes: 2156,
      plays: 320000,
      releaseDate: "3 days ago"
    },
    {
      id: 4,
      title: "Neon Nights",
      artist: "Digital Artists",
      avatar: "DA",
      cover: album2,
      genre: "Electronic",
      duration: "4:15",
      likes: 892,
      plays: 180000,
      releaseDate: "5 days ago"
    },
    {
      id: 5,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      avatar: "JF",
      cover: album2,
      genre: "Jazz",
      duration: "4:45",
      likes: 1456,
      plays: 118000,
      releaseDate: "1 week ago"
    },
    {
      id: 6,
      title: "Cyber Punk",
      artist: "Neon Collective",
      avatar: "NC",
      cover: album3,
      genre: "Cyberpunk",
      duration: "4:12",
      likes: 1234,
      plays: 134000,
      releaseDate: "4 days ago"
    }
  ];

  const listeningNow = [
    {
      id: 1,
      title: "Ocean Waves",
      artist: "Ambient Sounds",
      avatar: "AS",
      cover: album4,
      genre: "Ambient",
      duration: "5:20",
      likes: 634,
      plays: 12500
    },
    {
      id: 2,
      title: "Neon Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album1,
      genre: "Synthwave",
      duration: "3:15",
      likes: 987,
      plays: 8900
    },
    {
      id: 3,
      title: "Urban Pulse",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album3,
      genre: "Hip Hop",
      duration: "2:58",
      likes: 2156,
      plays: 15200
    },
    {
      id: 4,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      avatar: "JF",
      cover: album2,
      genre: "Jazz",
      duration: "4:45",
      likes: 1456,
      plays: 11800
    },
    {
      id: 5,
      title: "Digital Horizon",
      artist: "Digital Artists",
      avatar: "DA",
      cover: album1,
      genre: "Electronic",
      duration: "3:30",
      likes: 892,
      plays: 9600
    },
    {
      id: 6,
      title: "Cyber Punk",
      artist: "Neon Collective",
      avatar: "NC",
      cover: album3,
      genre: "Cyberpunk",
      duration: "4:12",
      likes: 1234,
      plays: 13400
    },
    {
      id: 7,
      title: "Tranquil Waters",
      artist: "Ambient Sounds",
      avatar: "AS",
      cover: album4,
      genre: "Ambient",
      duration: "6:15",
      likes: 756,
      plays: 10200
    },
    {
      id: 8,
      title: "Retro Synth",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album2,
      genre: "Synthwave",
      duration: "3:45",
      likes: 1102,
      plays: 14200
    },
    {
      id: 9,
      title: "Street Beats",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album1,
      genre: "Hip Hop",
      duration: "2:30",
      likes: 1876,
      plays: 16800
    },
    {
      id: 10,
      title: "Smooth Jazz",
      artist: "Jazz Fusion",
      avatar: "JF",
      cover: album3,
      genre: "Jazz",
      duration: "5:02",
      likes: 1345,
      plays: 11200
    }
  ];

  // Load featured artists (verified artists from blockchain)
  useEffect(() => {
    const loadFeaturedArtists = async () => {
      try {
        setLoadingArtists(true);
        
        // Get verified artists addresses from contract
        const verifiedArtistsAddresses = await readContract(wagmiConfig, {
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getVerifiedArtists',
        } as any) as string[];
        
        if (verifiedArtistsAddresses.length === 0) {
          setFeaturedArtists([]);
          setLoadingArtists(false);
          return;
        }
        
        // Load profiles for verified artists (limit to 6 for Explore page)
        const artistProfiles = await Promise.all(
          verifiedArtistsAddresses.slice(0, 6).map(async (address) => {
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
                };
              }
              return null;
            } catch (error) {
              return null;
            }
          })
        );
        
        const validArtists = artistProfiles.filter(artist => artist !== null) as ArtistData[];
        setFeaturedArtists(validArtists);
        
      } catch (error) {
        console.error('❌ Error loading featured artists:', error);
        setFeaturedArtists([]);
      } finally {
        setLoadingArtists(false);
      }
    };
    
    loadFeaturedArtists();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="space-y-16">
            {/* Catalog Selects */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-clash font-semibold text-2xl mb-1">Catalog Selects</h2>
                  <p className="text-muted-foreground text-sm">Curated tracks from our featured artists</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {catalogSelects.map((track) => (
                  <Card key={track.id} className="group hover:shadow-lg transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden rounded-2xl">
                    <div className="relative">
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-full h-40 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="lg"
                          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentTrack?.id === track.id && isPlaying) {
                              pauseTrack();
                            } else {
                              playTrack(track);
                              // Record play event
                              const duration = typeof track.duration === 'string' 
                                ? parseInt(track.duration.split(':')[0]) * 60 + parseInt(track.duration.split(':')[1] || '0')
                                : track.duration || 180;
                              recordMusicPlay(track, address, duration, 'explore');
                            }
                          }}
                        >
                          {currentTrack?.id === track.id && isPlaying ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          )}
                        </Button>
                      </div>
                      {track.featured && (
                        <Badge className="absolute top-3 left-3 bg-white/90 text-foreground text-xs px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base mb-1 truncate">{track.title}</h3>
                          <p className="text-muted-foreground text-sm truncate">{track.artist}</p>
                          <Badge variant="secondary" className="text-xs mt-2 rounded-full px-2 py-0.5">
                            {track.genre}
                          </Badge>
                        </div>
                        <div className="text-right ml-3">
                          <p className="font-semibold text-primary text-sm">{track.price}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {track.likes.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Headphones className="w-3 h-3" />
                          {(track.plays / 1000000).toFixed(1)}M
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-full text-xs h-8">
                          <Play className="w-3 h-3 mr-1" />
                          Play
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-3">
                          <ShoppingCart className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Liner Notes */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-clash font-semibold text-2xl mb-1">Liner Notes</h2>
                  <p className="text-muted-foreground text-sm">Stories and insights from artists</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
                  <Link to="/liner-notes">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {linerNotes.map((note) => (
                  <Card key={note.id} className="hover:shadow-md transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex">
                        <img
                          src={note.cover}
                          alt={note.title}
                          className="w-20 h-20 object-cover rounded-l-2xl"
                        />
                        <div className="flex-1 p-4">
                          <h3 className="font-semibold text-base mb-2 line-clamp-2">{note.title}</h3>
                          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                            {note.excerpt}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{note.artist}</span>
                              <span>•</span>
                              <span>{note.readTime}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-3 rounded-full">
                              Read
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recently Supported */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-clash font-semibold text-2xl mb-1">Recently Supported</h2>
                  <p className="text-muted-foreground text-sm">Tracks that received community support</p>
                </div>
              </div>

              <div className="space-y-3">
                {recentlySupported.map((support) => (
                  <Card key={support.id} className="hover:shadow-sm transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={support.cover}
                          alt={support.title}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{support.supporter}</span>
                            {" "}supported{" "}
                            <span className="font-medium">{support.title}</span>
                            {" "}by{" "}
                            <span className="text-muted-foreground">{support.artist}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs rounded-full px-2 py-0.5">
                              {support.amount}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{support.time}</span>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="w-8 h-8 p-0 rounded-full">
                          <Heart className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recently Released */}
            <section>
              <div className="mb-8">
                <h2 className="font-clash font-semibold text-2xl mb-1">Recently Released</h2>
                <p className="text-muted-foreground text-sm">Fresh tracks from the HiBeats community</p>
              </div>

              <Carousel
                opts={{
                  align: "start",
                  loop: false,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {recentlyReleased.map((release) => (
                    <CarouselItem key={release.id} className="pl-2 md:pl-4 basis-1/2">
                      <Card className="hover:shadow-md transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={release.cover}
                              alt={release.title}
                              className="w-14 h-14 rounded-xl object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base truncate">{release.title}</h3>
                              <p className="text-muted-foreground text-sm truncate">{release.artist}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
                                  {release.genre}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {release.releaseDate}
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-xs text-muted-foreground mb-2">
                                {(release.plays / 1000).toFixed(0)}K plays
                              </p>
                              <Button
                                size="sm"
                                className="rounded-full text-xs h-8 px-4 gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (currentTrack?.id === release.id && isPlaying) {
                                    pauseTrack();
                                  } else {
                                    playTrack(release);
                                    // Record play event
                                    const duration = typeof release.duration === 'string' 
                                      ? parseInt(release.duration.split(':')[0]) * 60 + parseInt(release.duration.split(':')[1] || '0')
                                      : release.duration || 180;
                                    recordMusicPlay(release, address, duration, 'explore');
                                  }
                                }}
                              >
                                {currentTrack?.id === release.id && isPlaying ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                                Play
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-8" />
                <CarouselNext className="hidden md:flex -right-8" />
              </Carousel>
            </section>

            {/* What People Are Listening To - REAL DATA FROM BLOCKCHAIN */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-clash font-semibold text-2xl mb-1">Trending Now</h2>
                  <p className="text-muted-foreground text-sm">What people are listening to right now</p>
                </div>
                <Badge variant="secondary" className="text-xs rounded-full px-3 py-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Live Data
                </Badge>
              </div>

              {/* Loading State */}
              {loadingTrending && (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                          <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="w-16 h-8 bg-muted animate-pulse rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Trending Tracks from Blockchain */}
              {!loadingTrending && sortedTrendingTracks.length > 0 && (
                <div className="space-y-3">
                  {sortedTrendingTracks.map((track, index) => (
                    <Card key={track.tokenId} className="hover:shadow-sm transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                            index === 1 ? 'bg-gray-400/20 text-gray-600' :
                            index === 2 ? 'bg-orange-500/20 text-orange-600' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {index + 1}
                          </div>
                          <img
                            src={track.cover}
                            alt={track.title}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate">{track.title}</h3>
                            <p className="text-muted-foreground text-sm truncate">{track.artist}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs rounded-full px-2 py-0.5">
                                {formatGenre(track.genre)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              {track.currentPlayCount.toLocaleString()} listening
                            </span>
                            <Button
                              size="sm"
                              className="rounded-full text-xs h-8 px-4 gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentTrack?.id === track.tokenId && isPlaying) {
                                pauseTrack();
                              } else {
                                playTrack({
                                  id: track.tokenId,
                                  title: track.title,
                                  artist: track.artist,
                                  cover: track.cover,
                                  audioUrl: track.audioUrl,
                                  duration: track.duration.toString(),
                                  genre: track.genre,
                                  avatar: '',
                                  likes: track.likeCount || 0,
                                  plays: track.currentPlayCount
                                });
                                // Record play event with real-time update
                                recordPlay(track.tokenId, track.duration, 'explore');
                              }
                            }}
                          >
                              {currentTrack?.id === track.tokenId && isPlaying ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Play
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Error State */}
              {!loadingTrending && trendingError && (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2 text-red-600">Failed to load trending</h3>
                  <p className="text-muted-foreground mb-4">{trendingError}</p>
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Retry
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!loadingTrending && !trendingError && trendingTracks.length === 0 && (
                <div className="text-center py-12">
                  <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No music NFTs yet</h3>
                  <p className="text-muted-foreground">Mint some music NFTs to see them trending here</p>
                </div>
              )}
            </section>

            {/* Featured Artists */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="font-clash font-semibold text-2xl mb-1">Featured Artists</h2>
                  <p className="text-muted-foreground text-sm">Discover talented creators in our community</p>
                </div>
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" asChild>
                  <Link to="/featured-artists">
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>

              {/* Loading State */}
              {loadingArtists && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                          </div>
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
              {!loadingArtists && featuredArtists.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredArtists.map((artist) => (
                    <Link 
                      key={artist.address} 
                      to={`/profile/${artist.username}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm rounded-2xl h-full">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4 mb-4">
                            <Avatar className="w-14 h-14">
                              {artist.avatarHash ? (
                                <AvatarImage src={`https://ipfs.io/ipfs/${artist.avatarHash}`} />
                              ) : (
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${artist.address}`} />
                              )}
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-base">
                                {artist.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate">{artist.displayName}</h3>
                                {artist.isVerified && <VerifiedBadge size="sm" />}
                              </div>
                              <p className="text-muted-foreground text-sm">@{artist.username}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{artist.followerCount} followers</p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {artist.bio}
                          </p>

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

              {/* Empty State */}
              {!loadingArtists && featuredArtists.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No featured artists yet</h3>
                  <p className="text-muted-foreground">Check back soon for verified artists in our community</p>
                </div>
              )}
            </section>
              </div>
            </div>

            {/* Right Sidebar */}
            <RightSidebar 
              showTransactions={false}
              showProfile={true}
              showGenres={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Explore;