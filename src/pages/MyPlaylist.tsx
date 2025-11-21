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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  User,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import EditPlaylistModal from "@/components/EditPlaylistModal";
import { useAudio } from "@/contexts/AudioContext";
import { useAccount } from "wagmi";
import { recordMusicPlay } from "@/utils/playCountHelper";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import { useLocation } from "react-router-dom";
import { usePlaylists } from "@/hooks/usePlaylists";
import { toast } from "sonner";

const MyPlaylist = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudio();
  const { address } = useAccount();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playlistToEdit, setPlaylistToEdit] = useState<any>(null);

  // ✅ Use real playlist hook
  const {
    playlists: realPlaylists,
    isLoading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    refreshPlaylists
  } = usePlaylists();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'playlist') {
      setIsCreateModalOpen(true);
    }
  }, [location.search]);

  // ✅ Auto-refresh playlists when address changes
  useEffect(() => {
    if (address && !isLoading) {
      console.log('🔄 [MyPlaylist] Auto-refreshing playlists for address:', address);
      refreshPlaylists();
    }
  }, [address]);

  // ✅ Use ONLY real playlists from blockchain (no mock data)
  const playlists = realPlaylists.map(p => {
    // ✅ Safe cover URL handling with multiple fallbacks
    let coverUrl = album1; // Default fallback
    
    // ✅ Debug coverHash type
    console.log('🔍 [MyPlaylist] CoverHash debug:', {
      playlistId: p.id.slice(0, 10) + '...',
      title: p.title,
      coverHashType: typeof p.coverHash,
      coverHashValue: p.coverHash,
      isString: typeof p.coverHash === 'string'
    });
    
    // ✅ Convert coverHash to string if it's an object
    let hashString = '';
    if (p.coverHash) {
      if (typeof p.coverHash === 'string') {
        hashString = p.coverHash;
      } else if (typeof p.coverHash === 'object') {
        // Try to extract string value from object
        hashString = String(p.coverHash);
      }
    }
    
    if (hashString && hashString.trim() !== '' && hashString !== '[object Object]') {
      const hash = hashString.replace('ipfs://', '').trim();
      
      if (hash && hash !== '' && hash !== 'undefined' && hash !== 'null') {
        // Try multiple IPFS gateways for better reliability
        coverUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
        
        console.log('🖼️ [MyPlaylist] Cover URL:', {
          playlistId: p.id.slice(0, 10) + '...',
          title: p.title,
          coverHash: hash.slice(0, 20) + '...',
          coverUrl: coverUrl.slice(0, 50) + '...'
        });
      }
    }

    // ✅ Convert trackIds to track objects for display
    const tracks = p.trackIds.map((trackId, index) => ({
      id: trackId,
      title: `Track ${index + 1}`, // TODO: Load from music service
      artist: 'Unknown Artist',
      duration: '0:00',
      genre: 'Unknown',
      cover: coverUrl
    }));

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      cover: coverUrl,
      tracks, // ✅ Real track IDs from blockchain
      trackIds: p.trackIds,
      createdAt: new Date(p.timestamp).toLocaleDateString(),
      isPublic: p.isPublic,
      likes: p.likeCount || 0,
      plays: p.playCount || 0,
      trackCount: p.trackIds.length
    };
  });

  // ✅ Debug logging
  useEffect(() => {
    console.log('📊 [MyPlaylist] Current state:', {
      address,
      isLoading,
      realPlaylistsCount: realPlaylists.length,
      displayedPlaylistsCount: playlists.length,
      playlists: playlists.map(p => ({
        id: p.id.slice(0, 10) + '...',
        title: p.title,
        trackCount: p.trackCount,
        isPublic: p.isPublic
      }))
    });
  }, [realPlaylists, playlists, address, isLoading]);

  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePlaylist = async (playlistData: any) => {
    try {
      console.log('📝 [MyPlaylist] Creating playlist:', playlistData);
      
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }

      // ✅ Upload cover to IPFS if file provided
      let coverHash = '';
      if (playlistData.coverFile) {
        try {
          toast.info('Uploading cover to IPFS...');
          const { ipfsService } = await import('@/services/ipfsService');
          const uploadResult = await ipfsService.uploadFile(playlistData.coverFile);
          
          // ✅ Extract hash from Pinata response
          coverHash = uploadResult.IpfsHash || uploadResult.ipfsHash || uploadResult.Hash || uploadResult.hash || '';
          
          console.log('✅ [MyPlaylist] Cover uploaded to IPFS:', {
            uploadResult,
            extractedHash: coverHash,
            type: typeof coverHash,
            length: coverHash?.length || 0
          });
        } catch (error) {
          console.error('❌ Failed to upload cover:', error);
          toast.error('Failed to upload cover image');
        }
      } else if (playlistData.cover && playlistData.cover.startsWith('ipfs://')) {
        coverHash = playlistData.cover.replace('ipfs://', '');
      }
      
      // ✅ Debug before creating
      console.log('📝 [MyPlaylist] Creating with coverHash:', {
        coverHash,
        type: typeof coverHash,
        length: coverHash?.length || 0,
        isEmpty: coverHash === ''
      });
      
      // ✅ Create playlist using real service (on-chain)
      toast.info('Creating playlist on blockchain...');
      const result = await createPlaylist(
        playlistData.title,
        playlistData.description,
        coverHash,
        playlistData.trackIds || [],
        playlistData.isPublic
      );
      
      if (result) {
        setIsCreateModalOpen(false);
        // ✅ Force refresh to load from blockchain
        await refreshPlaylists();
        toast.success('Playlist created on blockchain!');
      }
    } catch (error) {
      console.error('❌ [MyPlaylist] Failed to create playlist:', error);
      toast.error('Failed to create playlist');
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      toast.info('Deleting playlist on blockchain...');
      const success = await deletePlaylist(playlistId);
      if (success) {
        setSelectedPlaylist(null);
        // ✅ Force refresh to load from blockchain
        await refreshPlaylists();
        toast.success('Playlist deleted on blockchain!');
      }
    } catch (error) {
      console.error('Failed to delete playlist:', error);
      toast.error('Failed to delete playlist');
    }
  };

  const handleTogglePrivacy = async (playlistId: string, currentIsPublic: boolean) => {
    try {
      toast.info('Updating privacy on blockchain...');
      await updatePlaylist(playlistId, { isPublic: !currentIsPublic });
      
      // ✅ Force refresh to load from blockchain
      await refreshPlaylists();
      toast.success(`Playlist is now ${!currentIsPublic ? 'public' : 'private'} on blockchain!`);
      
      // Close modal to show updated data
      setSelectedPlaylist(null);
    } catch (error) {
      console.error('Failed to update privacy:', error);
      toast.error('Failed to update privacy');
    }
  };

  const handleEditPlaylist = async (updates: {
    title?: string;
    description?: string;
    coverHash?: string;
  }) => {
    if (!playlistToEdit) return;

    try {
      const playlistUpdates: any = {};

      // Add updates (coverHash already uploaded in modal)
      if (updates.title) playlistUpdates.title = updates.title;
      if (updates.description !== undefined) playlistUpdates.description = updates.description;
      if (updates.coverHash) playlistUpdates.coverHash = updates.coverHash;

      if (Object.keys(playlistUpdates).length === 0) {
        toast.info('No changes to save');
        return;
      }

      toast.info('Updating playlist on blockchain...');
      await updatePlaylist(playlistToEdit.id, playlistUpdates);
      
      // Force refresh to load from blockchain
      await refreshPlaylists();
      toast.success('Playlist updated on blockchain!');
      
      // Close modal
      setIsEditModalOpen(false);
      setPlaylistToEdit(null);
    } catch (error) {
      console.error('Failed to update playlist:', error);
      toast.error('Failed to update playlist');
    }
  };

  const handleAddTrack = async (playlistId: string) => {
    const trackId = prompt('Enter track ID to add:');
    if (!trackId || !trackId.trim()) return;
    
    try {
      toast.info('Adding track on blockchain...');
      await addTrackToPlaylist(playlistId, trackId.trim());
      
      // ✅ Force refresh to load from blockchain
      await refreshPlaylists();
      toast.success('Track added on blockchain!');
      
      // Close modal to show updated data
      setSelectedPlaylist(null);
    } catch (error) {
      console.error('Failed to add track:', error);
      toast.error('Failed to add track');
    }
  };

  const handleRemoveTrack = async (playlistId: string, trackId: string) => {
    if (!confirm('Remove this track from playlist?')) return;
    
    try {
      toast.info('Removing track on blockchain...');
      await removeTrackFromPlaylist(playlistId, trackId);
      
      // ✅ Force refresh to load from blockchain
      await refreshPlaylists();
      toast.success('Track removed on blockchain!');
      
      // Close modal to show updated data
      setSelectedPlaylist(null);
    } catch (error) {
      console.error('Failed to remove track:', error);
      toast.error('Failed to remove track');
    }
  };

  // ✅ Calculate from real blockchain data
  const totalTracks = playlists.reduce((sum, playlist) => sum + (playlist.trackCount || 0), 0);
  const totalDuration = 0; // TODO: Calculate from actual track data when loaded

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

          {/* Edit Playlist Modal */}
          {playlistToEdit && (
            <EditPlaylistModal
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false);
                setPlaylistToEdit(null);
              }}
              onSave={handleEditPlaylist}
              playlist={{
                id: playlistToEdit.id,
                title: playlistToEdit.title,
                description: playlistToEdit.description,
                cover: playlistToEdit.cover
              }}
            />
          )}

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

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading playlists...</span>
            </div>
          )}

          {/* Playlists Grid */}
          {!isLoading && (
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
                      onError={(e) => {
                        // Fallback to default image if IPFS fails
                        console.warn('⚠️ [MyPlaylist] Failed to load cover:', playlist.cover);
                        (e.target as HTMLImageElement).src = album1;
                      }}
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-8 h-8 p-0 bg-black/50 hover:bg-black/70 border-0"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setPlaylistToEdit(playlist);
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Playlist
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTogglePrivacy(playlist.id, playlist.isPublic);
                            }}
                          >
                            {playlist.isPublic ? (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Make Private
                              </>
                            ) : (
                              <>
                                <User className="w-4 h-4 mr-2" />
                                Make Public
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlaylist(playlist.id);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Playlist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
          )}

          {!isLoading && filteredPlaylists.length === 0 && (
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
                onError={(e) => {
                  // Fallback to default image if IPFS fails
                  (e.target as HTMLImageElement).src = album1;
                }}
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
                <Button size="sm" className="gap-2">
                  <Play className="w-4 h-4" />
                  Play All
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Add Track Button */}
            <div className="flex justify-end mb-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2"
                onClick={() => handleAddTrack(selectedPlaylist.id)}
              >
                <Plus className="w-4 h-4" />
                Add Track
              </Button>
            </div>

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
                        onError={(e) => {
                          // Fallback to default image if IPFS fails
                          (e.target as HTMLImageElement).src = album1;
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{track.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTrack(selectedPlaylist.id, track.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!selectedPlaylist?.tracks || selectedPlaylist.tracks.length === 0) && (
              <div className="text-center py-8">
                <Music className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No tracks in this playlist yet</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 gap-2"
                  onClick={() => handleAddTrack(selectedPlaylist.id)}
                >
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