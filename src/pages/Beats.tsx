import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Filter,
  ChevronRight,
  Headphones,
  Calendar,
  DollarSign
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import NotificationDropdown from "@/components/NotificationDropdown";
import Navbar from "@/components/Navbar";
import { useAudio } from "@/contexts/AudioContext";
import { useAccount } from "wagmi";
import { recordMusicPlay } from "@/utils/playCountHelper";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import hibeatsLogo from "@/assets/hibeats.png";

const Beats = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudio();
  const { address } = useAccount();
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const tags = [
    { id: "all", name: "All Beats", count: 247, icon: Music },
    { id: "electronic", name: "Electronic", count: 89, icon: TrendingUp },
    { id: "hip-hop", name: "Hip Hop", count: 67, icon: Headphones },
    { id: "jazz", name: "Jazz", count: 45, icon: Music },
    { id: "ambient", name: "Ambient", count: 32, icon: Clock },
    { id: "rock", name: "Rock", count: 28, icon: Star },
    { id: "pop", name: "Pop", count: 21, icon: Heart },
    { id: "classical", name: "Classical", count: 15, icon: Music },
  ];

  const releasedBeats = [
    {
      id: 1,
      title: "Cyber Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      cover: album1,
      genre: "Electronic",
      releaseDate: "2025-01-15",
      duration: "3:42",
      price: "0.5 ETH",
      likes: 1247,
      plays: 45200,
      tags: ["electronic", "synthwave"],
      description: "A journey through cyberpunk nights and electric dreams",
      bpm: 128,
      key: "C Minor"
    },
    {
      id: 2,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      avatar: "JF",
      cover: album2,
      genre: "Jazz",
      releaseDate: "2025-01-12",
      duration: "4:15",
      price: "0.3 ETH",
      likes: 892,
      plays: 32100,
      tags: ["jazz", "fusion"],
      description: "Smooth jazz vibes for your late night sessions",
      bpm: 95,
      key: "F Major"
    },
    {
      id: 3,
      title: "Urban Pulse",
      artist: "Beat Masters",
      avatar: "BM",
      cover: album3,
      genre: "Hip Hop",
      releaseDate: "2025-01-10",
      duration: "2:58",
      price: "0.7 ETH",
      likes: 2156,
      plays: 67800,
      tags: ["hip-hop", "urban"],
      description: "City beats that make you move",
      bpm: 90,
      key: "A Minor"
    },
    {
      id: 4,
      title: "Ocean Waves",
      artist: "Ambient Sounds",
      avatar: "AS",
      cover: album4,
      genre: "Ambient",
      releaseDate: "2025-01-08",
      duration: "5:20",
      price: "0.2 ETH",
      likes: 634,
      plays: 23400,
      tags: ["ambient", "chill"],
      description: "Relaxing ambient tracks for meditation and focus",
      bpm: 60,
      key: "D Major"
    },
    {
      id: 5,
      title: "Neon Nights",
      artist: "Digital Artists",
      avatar: "DA",
      cover: album1,
      genre: "Electronic",
      releaseDate: "2025-01-05",
      duration: "3:15",
      price: "0.4 ETH",
      likes: 987,
      plays: 18900,
      tags: ["electronic", "dance"],
      description: "High-energy electronic beats for the dance floor",
      bpm: 135,
      key: "G Minor"
    },
    {
      id: 6,
      title: "Soulful Rhythms",
      artist: "R&B Collective",
      avatar: "RC",
      cover: album2,
      genre: "R&B",
      releaseDate: "2025-01-03",
      duration: "4:02",
      price: "0.6 ETH",
      likes: 1456,
      plays: 41500,
      tags: ["rnb", "soul"],
      description: "Soulful rhythms that touch your heart",
      bpm: 85,
      key: "Bb Major"
    }
  ];

  const filteredBeats = releasedBeats.filter(beat => {
    const matchesTag = selectedTag === "all" || beat.tags.includes(selectedTag);
    return matchesTag;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-clash font-semibold text-3xl mb-1">Released Beats</h1>
            <p className="text-muted-foreground text-base">Discover and purchase the latest released tracks</p>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {tags.map((tag) => {
                const IconComponent = tag.icon;
                return (
                  <button
                    key={tag.id}
                    onClick={() => setSelectedTag(tag.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-200 ${
                      selectedTag === tag.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{tag.name}</span>
                    <Badge variant={selectedTag === tag.id ? "secondary" : "outline"} className="text-xs ml-1">
                      {tag.count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            {filteredBeats.map((beat) => (
              <Card key={beat.id} className="group hover:shadow-lg transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Album Cover */}
                    <div className="relative w-40 h-40 flex-shrink-0 rounded-l-2xl overflow-hidden">
                      <img
                        src={beat.cover}
                        alt={beat.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <Button
                          size="lg"
                          className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentTrack?.id === beat.id && isPlaying) {
                              pauseTrack();
                            } else {
                              playTrack(beat);
                              // Record play event
                              const duration = typeof beat.duration === 'string' 
                                ? parseInt(beat.duration.split(':')[0]) * 60 + parseInt(beat.duration.split(':')[1] || '0')
                                : beat.duration || 180;
                              recordMusicPlay(beat, address, duration, 'beats');
                            }
                          }}
                        >
                          {currentTrack?.id === beat.id && isPlaying ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          )}
                        </Button>
                      </div>
                      <Badge className="absolute top-3 left-3 bg-white/90 text-foreground text-xs px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 mr-1" />
                        Released
                      </Badge>
                    </div>

                    {/* Beat Details */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {beat.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-lg mb-1">{beat.title}</h3>
                              <p className="text-muted-foreground text-sm">{beat.artist}</p>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {beat.description}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(beat.releaseDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {beat.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Headphones className="w-3 h-3" />
                              {(beat.plays / 1000).toFixed(0)}K
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary" className="text-xs rounded-full px-2 py-0.5">
                              {beat.genre}
                            </Badge>
                            <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
                              {beat.bpm} BPM
                            </Badge>
                            <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
                              {beat.key}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xl font-semibold text-primary mb-1">
                            {beat.price}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Heart className="w-3 h-3" />
                            {beat.likes.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2">
                            <Heart className="w-3 h-3" />
                            <span className="text-xs">{beat.likes.toLocaleString()}</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2">
                            <MessageCircle className="w-3 h-3" />
                            <span className="text-xs">23</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2">
                            <Share2 className="w-3 h-3" />
                            <span className="text-xs">8</span>
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1 rounded-full h-8 px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentTrack?.id === beat.id && isPlaying) {
                                pauseTrack();
                              } else {
                                playTrack(beat);
                                // Record play event
                                const duration = typeof beat.duration === 'string' 
                                  ? parseInt(beat.duration.split(':')[0]) * 60 + parseInt(beat.duration.split(':')[1] || '0')
                                  : beat.duration || 180;
                                recordMusicPlay(beat, address, duration, 'beats');
                              }
                            }}
                          >
                            {currentTrack?.id === beat.id && isPlaying ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            Preview
                          </Button>
                          <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 px-3">
                            <ShoppingCart className="w-3 h-3" />
                            Buy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredBeats.length === 0 && (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No beats found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Beats;