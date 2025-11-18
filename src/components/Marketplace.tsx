import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Play, Pause, MoreHorizontal, TrendingUp, Music, ShoppingCart } from "lucide-react";
import { useState } from "react";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import BuyModal from "@/components/BuyModal";

const Marketplace = () => {
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedTrackForPurchase, setSelectedTrackForPurchase] = useState<typeof tracks[0] | null>(null);

  const tracks = [
    {
      id: 1,
      title: "Neon Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album1,
      genre: "Synthwave",
      likes: 1247,
      comments: 89,
      shares: 23,
      duration: "3:42",
      isLiked: false,
      isPlaying: false,
      timestamp: "2h ago",
      description: "A journey through cyberpunk nights and electric dreams 🎵"
    },
    {
      id: 2,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      avatar: "JF",
      cover: album2,
      genre: "Jazz",
      likes: 892,
      comments: 45,
      shares: 12,
      duration: "4:15",
      isLiked: true,
      isPlaying: false,
      timestamp: "4h ago",
      description: "Smooth jazz vibes for your late night sessions 🌙 #Jazz #Fusion"
    },
    {
      id: 3,
      title: "Urban Pulse",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album3,
      genre: "Hip Hop",
      likes: 2156,
      comments: 156,
      shares: 78,
      duration: "2:58",
      isLiked: false,
      isPlaying: false,
      timestamp: "6h ago",
      description: "City beats that make you move 🏙️ #HipHop #Urban"
    },
    {
      id: 4,
      title: "Ocean Waves",
      artist: "Ambient Sounds",
      avatar: "AS",
      cover: album4,
      genre: "Ambient",
      likes: 634,
      comments: 23,
      shares: 8,
      duration: "5:20",
      isLiked: true,
      isPlaying: false,
      timestamp: "8h ago",
      description: "Relaxing ambient tracks for meditation and focus 🧘‍♀️ #Ambient #Chill"
    },
  ];

  const togglePlay = (trackId: number) => {
    setPlayingTrack(playingTrack === trackId ? null : trackId);
  };

  const openBuyModal = (track: typeof tracks[0]) => {
    setSelectedTrackForPurchase(track);
    setIsBuyModalOpen(true);
  };

  const closeBuyModal = () => {
    setIsBuyModalOpen(false);
    setSelectedTrackForPurchase(null);
  };

  return (
    <div className="relative">
      <section className="pt-8 pb-16 md:pb-24 relative overflow-hidden border-t border-border/20">
      {/* Smooth transition background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background/50 to-background"></div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Music className="w-5 h-5 text-primary" />
            <h2 className="font-clash font-semibold text-2xl md:text-4xl lg:text-5xl leading-tight">
              Music Social Feed
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Discover, share, and connect through music. Like, comment, and share your favorite tracks with the community.
          </p>
        </div>

        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-clash font-semibold text-xl">Trending Now</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {tracks.slice(0, 4).map((track) => (
              <Card key={track.id} className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
                <CardContent className="p-3">
                  <div className="relative mb-2">
                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-full aspect-square object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-full w-8 h-8 p-0"
                        onClick={() => togglePlay(track.id)}
                      >
                        {playingTrack === track.id ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 ml-0.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-semibold text-xs truncate">{track.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                      {track.genre}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Social Feed - Left Side */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {tracks.map((track) => (
                <Card key={track.id} className="border-border/50 hover:border-primary/20 transition-all duration-300">
                  <CardContent className="p-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {track.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{track.artist}</span>
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {track.genre}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{track.timestamp}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="w-6 h-6 p-0">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </div>

                    {/* Track Description */}
                    <p className="text-sm mb-3 leading-relaxed">{track.description}</p>

                    {/* Music Player Card */}
                    <Card className="mb-3 border-border/30 bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={track.cover}
                            alt={track.title}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{track.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{track.duration}</span>
                              <div className="flex-1 bg-muted rounded-full h-1">
                                <div className="bg-primary h-1 rounded-full w-1/3"></div>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-8 h-8 p-0 rounded-full"
                            onClick={() => togglePlay(track.id)}
                          >
                            {playingTrack === track.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`gap-1.5 ${track.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'}`}
                        >
                          <Heart className={`w-4 h-4 ${track.isLiked ? 'fill-current' : ''}`} />
                          <span className="text-xs">{track.likes.toLocaleString()}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{track.comments}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                          <Share2 className="w-4 h-4" />
                          <span className="text-xs">{track.shares}</span>
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                          onClick={() => openBuyModal(track)}
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span className="text-xs font-semibold">Buy</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground w-6 h-6 p-0">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Side Content */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Featured Artist */}
              <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h3 className="font-clash font-semibold text-lg mb-3">Featured Artist</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        SC
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">Synthwave Collective</p>
                      <p className="text-sm text-muted-foreground">12.5K followers</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pioneering the future of electronic music with cutting-edge synthwave productions.
                  </p>
                  <Button className="w-full" size="sm">
                    Follow
                  </Button>
                </CardContent>
              </Card>

              {/* Music Genres */}
              <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h3 className="font-clash font-semibold text-lg mb-3">Explore Genres</h3>
                  <div className="space-y-2">
                    {['Electronic', 'Hip Hop', 'Jazz', 'Ambient', 'Rock', 'Pop'].map((genre) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="mr-2 mb-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trending Songs */}
              <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h3 className="font-clash font-semibold text-lg mb-3">Trending Songs</h3>
                  <div className="space-y-3">
                    {[
                      { title: 'Neon Dreams', artist: 'Synthwave Collective', plays: '12.5K' },
                      { title: 'Midnight Groove', artist: 'Jazz Fusion', plays: '8.9K' },
                      { title: 'Urban Pulse', artist: 'Beat Masters', plays: '21.6K' },
                      { title: 'Ocean Waves', artist: 'Ambient Sounds', plays: '6.3K' }
                    ].map((song, index) => (
                      <div key={song.title} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                        <span className="text-xs font-semibold text-muted-foreground w-4">{index + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{song.plays}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Community Stats */}
              <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <h3 className="font-clash font-semibold text-lg mb-3">Community</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Artists</span>
                      <span className="font-semibold">2,847</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tracks Shared</span>
                      <span className="font-semibold">15,632</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Active Users</span>
                      <span className="font-semibold">8,921</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements - Consistent with Hero */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
    </section>

    {/* Buy Modal */}
    <BuyModal
      isOpen={isBuyModalOpen}
      onClose={closeBuyModal}
      track={selectedTrackForPurchase}
    />
    </div>
  );
};

export default Marketplace;
