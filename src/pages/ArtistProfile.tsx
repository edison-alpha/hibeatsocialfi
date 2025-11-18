import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  MoreHorizontal,
  Music,
  Users,
  MapPin,
  Calendar,
  TrendingUp,
  Award,
  ShoppingCart,
  ExternalLink,
  ChevronLeft,
  Check
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import bgprofile from "@/assets/bgprofile.jpg";
import avatar8 from "@/assets/8.png";
import artistAvatar from "@/assets/8.png";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const ArtistProfile = () => {
  const { artistId } = useParams();
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'songs' | 'replies' | 'media' | 'likes'>('posts');
  const [musicTab, setMusicTab] = useState<'releases' | 'collections'>('releases');

  // Mock artist data - in real app this would come from API based on artistId
  const artist = {
    id: 1,
    name: "Synthwave Collective",
    username: "@synthwavecollective",
    avatar: "SC",
    bio: "Pioneering the future of synthwave music with AI-enhanced production. Creating immersive soundscapes that transport you to cyberpunk worlds. 🎵✨",
    location: "Los Angeles, CA",
    website: "synthwavecollective.com",
    joinedDate: "March 2023",
    followers: 45230,
    following: 892,
    isVerified: true,
    stats: {
      totalTracks: 47,
      totalPlays: "2.1M",
      totalLikes: 156789,
      monthlyListeners: 45230
    },
    genres: ["Synthwave", "Electronic", "Ambient"],
    achievements: ["Top Artist 2024", "100K+ Streams", "Featured Artist"]
  };

  const artistTracks = [
    {
      id: 1,
      title: "Neon Dreams",
      cover: album1,
      genre: "Synthwave",
      plays: "245K",
      likes: 1247,
      releaseDate: "2024-11-01",
      duration: "3:42",
      price: "0.5 ETH"
    },
    {
      id: 2,
      title: "Cyber Nights",
      cover: album2,
      genre: "Electronic",
      plays: "189K",
      likes: 892,
      releaseDate: "2024-10-15",
      duration: "4:15",
      price: "0.3 ETH"
    },
    {
      id: 3,
      title: "Digital Horizon",
      cover: album3,
      genre: "Synthwave",
      plays: "156K",
      likes: 756,
      releaseDate: "2024-09-28",
      duration: "2:58",
      price: "0.7 ETH"
    },
    {
      id: 4,
      title: "Retro Future",
      cover: album4,
      genre: "Electronic",
      plays: "134K",
      likes: 623,
      releaseDate: "2024-09-10",
      duration: "3:25",
      price: "0.4 ETH"
    },
    {
      id: 5,
      title: "Neon Pulse",
      cover: album1,
      genre: "Synthwave",
      plays: "98K",
      likes: 445,
      releaseDate: "2024-08-22",
      duration: "3:12",
      price: "0.6 ETH"
    },
    {
      id: 6,
      title: "Electric Dreams",
      cover: album2,
      genre: "Ambient",
      plays: "87K",
      likes: 398,
      releaseDate: "2024-08-05",
      duration: "4:02",
      price: "0.2 ETH"
    }
  ];

  const artistCollections = [
    {
      id: 1,
      title: "Synthwave Essentials",
      cover: album1,
      description: "A curated collection of the best synthwave tracks",
      trackCount: 12,
      totalPlays: "1.2M",
      price: "2.5 ETH",
      releaseDate: "2024-10-15"
    },
    {
      id: 2,
      title: "Cyber Dreams",
      cover: album2,
      description: "Immersive electronic soundscapes for late nights",
      trackCount: 8,
      totalPlays: "890K",
      price: "1.8 ETH",
      releaseDate: "2024-09-22"
    },
    {
      id: 3,
      title: "Retro Future",
      cover: album3,
      description: "Blending vintage synths with modern production",
      trackCount: 15,
      totalPlays: "756K",
      price: "3.2 ETH",
      releaseDate: "2024-08-30"
    },
    {
      id: 4,
      title: "Neon Nights",
      cover: album4,
      description: "High-energy tracks perfect for night drives",
      trackCount: 10,
      totalPlays: "654K",
      price: "2.1 ETH",
      releaseDate: "2024-08-10"
    }
  ];

  const togglePlay = (trackId: number) => {
    setPlayingTrack(playingTrack === trackId ? null : trackId);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Back Button */}
      <div className="pt-16 pb-4">
        <div className="container mx-auto px-6">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/feed">
              <ChevronLeft className="w-4 h-4" />
              Back to Feed
            </Link>
          </Button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="relative border-b border-border/20 overflow-hidden min-h-[400px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgprofile})` }}
        ></div>

        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background/80 to-secondary/5 backdrop-blur-sm"></div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-secondary/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-6 py-8 min-h-[400px] flex items-center">
          <div className="flex flex-col md:flex-row gap-8 items-start w-full">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-background/50 shadow-2xl">
                <AvatarImage src={artistAvatar} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-4xl md:text-5xl">
                  {artist.avatar}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-clash font-semibold text-3xl md:text-4xl text-foreground">{artist.name}</h1>
                  {artist.isVerified && <VerifiedBadge size="lg" />}
                </div>
                <p className="text-muted-foreground text-lg">{artist.username}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(artist.followers)}</p>
                  <p className="text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(artist.following)}</p>
                  <p className="text-muted-foreground">Following</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{artist.stats.totalTracks}</p>
                  <p className="text-muted-foreground">Tracks</p>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <p className="text-sm leading-relaxed max-w-2xl text-muted-foreground">{artist.bio}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {artist.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <ExternalLink className="w-4 h-4" />
                    <a href={`https://${artist.website}`} className="hover:text-primary transition-colors">
                      {artist.website}
                    </a>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {artist.joinedDate}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setIsFollowing(!isFollowing)}
                  className={`px-8 shadow-lg ${isFollowing ? 'bg-muted text-muted-foreground hover:bg-muted' : 'bg-primary hover:bg-primary/90 shadow-primary/25'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:bg-muted/50">
                  <MessageCircle className="w-4 h-4" />
                  Message
                </Button>
                <Button variant="outline" size="sm" className="border-border/50 hover:bg-muted/50">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section with Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="songs"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
            >
              <Music className="w-4 h-4" />
              Songs
            </TabsTrigger>
            <TabsTrigger
              value="replies"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              Replies
            </TabsTrigger>
            <TabsTrigger
              value="media"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              Media
            </TabsTrigger>
            <TabsTrigger
              value="likes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
            >
              Likes
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                Posts from {artist.name} will appear here
              </p>
            </div>
          </TabsContent>

          {/* Songs Tab */}
          <TabsContent value="songs" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="font-clash font-semibold text-2xl">Music</h2>
                  <div className="flex gap-2">
                    <Button
                      variant={musicTab === 'releases' ? 'outline' : 'ghost'}
                      size="sm"
                      className={musicTab === 'releases' ? 'border-border/50' : 'text-muted-foreground'}
                      onClick={() => setMusicTab('releases')}
                    >
                      Releases
                    </Button>
                    <Button
                      variant={musicTab === 'collections' ? 'outline' : 'ghost'}
                      size="sm"
                      className={musicTab === 'collections' ? 'border-border/50' : 'text-muted-foreground'}
                      onClick={() => setMusicTab('collections')}
                    >
                      Collections
                    </Button>
                  </div>
                </div>
                <Badge variant="outline" className="text-sm">
                  {musicTab === 'releases' ? `${artist.stats.totalTracks} tracks` : `${artistCollections.length} collections`}
                </Badge>
              </div>

              {/* Conditional Grid Content */}
              {musicTab === 'releases' ? (
              <div className="grid grid-cols-4 gap-6">
                {artistTracks.map((track, index) => (
                  <Card key={track.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden hover:scale-[1.02]">
                    <div className="relative">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="lg"
                          className="rounded-full w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                          onClick={() => togglePlay(track.id)}
                        >
                          {playingTrack === track.id ? (
                            <Pause className="w-6 h-6 text-white" />
                          ) : (
                            <Play className="w-6 h-6 text-white ml-0.5" />
                          )}
                        </Button>
                      </div>
                      <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground backdrop-blur-sm">
                        {track.genre}
                      </Badge>
                      <div className="absolute top-3 right-3">
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm">
                          <MoreHorizontal className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <Link to={`/album/${track.id}`}>
                            <h3 className="font-semibold text-lg mb-1 truncate hover:text-primary transition-colors cursor-pointer">{track.title}</h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mb-1">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">{track.duration}</p>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              {track.plays}
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {formatNumber(track.likes)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-lg font-semibold text-primary">{track.price}</span>
                          <Button className="gap-2 bg-primary hover:bg-primary/90" size="sm">
                            <ShoppingCart className="w-3 h-3" />
                            Buy Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-6">
                {artistCollections.map((collection, index) => (
                  <Card key={collection.id} className="group hover:shadow-xl transition-all duration-300 border-border/50 overflow-hidden hover:scale-[1.02]">
                    <div className="relative">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={collection.cover}
                          alt={collection.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="lg"
                          className="rounded-full w-14 h-14 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                        >
                          <Play className="w-6 h-6 text-white ml-0.5" />
                        </Button>
                      </div>
                      <Badge className="absolute top-3 left-3 bg-secondary/90 text-secondary-foreground backdrop-blur-sm">
                        Collection
                      </Badge>
                      <div className="absolute top-3 right-3">
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0 bg-black/20 hover:bg-black/40 backdrop-blur-sm">
                          <MoreHorizontal className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <Link to={`/album/${collection.id}`}>
                            <h3 className="font-semibold text-lg mb-1 truncate hover:text-primary transition-colors cursor-pointer">{collection.title}</h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mb-1">{artist.name}</p>
                          <p className="text-sm text-muted-foreground">{collection.trackCount} tracks</p>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Play className="w-3 h-3" />
                              {collection.totalPlays}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                          <span className="text-lg font-semibold text-primary">{collection.price}</span>
                          <Button className="gap-2 bg-primary hover:bg-primary/90" size="sm">
                            <ShoppingCart className="w-3 h-3" />
                            Buy Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            </div>
          </TabsContent>

          {/* Replies Tab */}
          <TabsContent value="replies" className="mt-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                Replies from {artist.name} will appear here
              </p>
            </div>
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="mt-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                Media posts from {artist.name} will appear here
              </p>
            </div>
          </TabsContent>

          {/* Likes Tab */}
          <TabsContent value="likes" className="mt-6">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center py-8">
                Posts liked by {artist.name} will appear here
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ArtistProfile;