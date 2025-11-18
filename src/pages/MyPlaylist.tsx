import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Play,
  Pause,
  Plus,
  Search,
  MoreHorizontal,
  Heart,
  Share2,
  Edit,
  Trash2,
  Music,
  Clock,
  User
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import { useAudio } from "@/contexts/AudioContext";
import { useAccount } from "wagmi";
import { recordMusicPlay } from "@/utils/playCountHelper";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import { useLocation } from "react-router-dom";

const MyPlaylist = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudio();
  const { address } = useAccount();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'playlist') {
      setIsCreateModalOpen(true);
    }
  }, [location.search]);

  const [playlists, setPlaylists] = useState([
    {
      id: 1,
      title: "My Electronic Collection",
      description: "A curated collection of electronic tracks",
      cover: album1,
      tracks: [
        {
          id: 1,
          title: "Neon Dreams",
          artist: "Synthwave Collective",
          duration: "3:42",
          genre: "Electronic",
          cover: album1
        },
        {
          id: 2,
          title: "Digital Horizon",
          artist: "Cyber Punk",
          duration: "4:15",
          genre: "Electronic",
          cover: album2
        },
        {
          id: 3,
          title: "Urban Pulse",
          artist: "Beat Masters",
          duration: "2:58",
          genre: "Hip Hop",
          cover: album4
        }
      ],
      createdAt: "2 days ago",
      isPublic: true,
      likes: 45,
      plays: 1234
    },
    {
      id: 2,
      title: "Chill Vibes Only",
      description: "Perfect for relaxation and focus",
      cover: album3,
      tracks: [
        {
          id: 4,
          title: "Ocean Waves",
          artist: "Ambient Sounds",
          duration: "5:20",
          genre: "Ambient",
          cover: album1
        },
        {
          id: 5,
          title: "Midnight Groove",
          artist: "Jazz Fusion",
          duration: "4:15",
          genre: "Jazz",
          cover: album3
        }
      ],
      createdAt: "1 week ago",
      isPublic: false,
      likes: 23,
      plays: 567
    },
    {
      id: 3,
      title: "Workout Mix",
      description: "High energy tracks for training",
      cover: album2,
      tracks: [
        {
          id: 6,
          title: "Power Beat",
          artist: "Gym Masters",
          duration: "3:15",
          genre: "Electronic",
          cover: album2
        }
      ],
      createdAt: "3 days ago",
      isPublic: true,
      likes: 67,
      plays: 890
    }
  ]);

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlaylist = (playlistData: any) => {
    const newPlaylist = {
      id: Date.now(),
      ...playlistData,
      tracks: playlistData.tracks || [],
      createdAt: "Just now",
      isPublic: playlistData.isPublic,
      likes: 0,
      plays: 0
    };
    setPlaylists(prev => [newPlaylist, ...prev]);
    setIsCreateModalOpen(false);
  };

  const totalTracks = playlists.reduce((sum, playlist) => sum + playlist.tracks.length, 0);
  const totalDuration = playlists.reduce((sum, playlist) => {
    return sum + playlist.tracks.reduce((trackSum, track) => {
      const [minutes, seconds] = track.duration.split(':').map(Number);
      return trackSum + minutes * 60 + seconds;
    }, 0);
  }, 0);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-clash font-semibold text-3xl mb-2">My Playlists</h1>
              <p className="text-muted-foreground">
                {playlists.length} playlists • {totalTracks} tracks • {formatDuration(totalDuration)} total
              </p>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Playlist
                </Button>
              </DialogTrigger>
              <CreatePlaylistModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCreate={handleCreatePlaylist}
              />
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search playlists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Playlists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlaylists.map((playlist) => (
              <Card
                key={playlist.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300"
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={playlist.cover}
                      alt={playlist.title}
                      className="w-full aspect-square object-cover rounded-t-lg"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-t-lg">
                      <Button
                        size="lg"
                        className="rounded-full w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                      >
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 border-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle more options
                        }}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 truncate">{playlist.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{playlist.description}</p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span>{playlist.tracks.length} tracks</span>
                      <span>{playlist.createdAt}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{playlist.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Play className="w-3 h-3" />
                          <span>{playlist.plays.toLocaleString()}</span>
                        </div>
                      </div>
                      <Badge variant={playlist.isPublic ? "default" : "secondary"} className="text-xs">
                        {playlist.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredPlaylists.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No playlists found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search terms" : "Create your first playlist to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Playlist
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Playlist Detail Modal */}
      <Dialog open={!!selectedPlaylist} onOpenChange={() => setSelectedPlaylist(null)}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <img
                src={selectedPlaylist?.cover}
                alt={selectedPlaylist?.title}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{selectedPlaylist?.title}</DialogTitle>
                <p className="text-muted-foreground mb-2">{selectedPlaylist?.description}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{selectedPlaylist?.tracks.length} tracks</span>
                  <span>•</span>
                  <span>{selectedPlaylist?.createdAt}</span>
                  <span>•</span>
                  <Badge variant={selectedPlaylist?.isPublic ? "default" : "secondary"}>
                    {selectedPlaylist?.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button size="sm" className="gap-2">
                  <Play className="w-4 h-4" />
                  Play All
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedPlaylist?.tracks.map((track: any, index: number) => (
              <Card key={track.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-sm text-muted-foreground w-6 text-center">
                        {index + 1}
                      </span>
                      <img
                        src={track.cover}
                        alt={track.title}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{track.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="text-xs">
                        {track.genre}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{track.duration}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0"
                        onClick={() => {
                          if (currentTrack?.id === track.id && isPlaying) {
                            pauseTrack();
                          } else {
                            playTrack(track);
                            // Record play event
                            const duration = typeof track.duration === 'string' 
                              ? parseInt(track.duration.split(':')[0]) * 60 + parseInt(track.duration.split(':')[1] || '0')
                              : track.duration || 180;
                            recordMusicPlay(track, address, duration, 'playlist');
                          }
                        }}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {selectedPlaylist?.tracks.length === 0 && (
              <div className="text-center py-8">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No tracks in this playlist yet</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2">
                  <Plus className="w-4 h-4" />
                  Add Tracks
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyPlaylist;