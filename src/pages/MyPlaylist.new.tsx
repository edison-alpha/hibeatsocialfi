import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Play,
  Plus,
  Search,
  MoreHorizontal,
  Heart,
  Edit,
  Trash2,
  Music,
  Users,
  Lock,
  Globe,
  Loader2
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useSequence } from "@/contexts/SequenceContext";
import { ipfsService } from "@/services/ipfsService";
import { toast } from "sonner";

const MyPlaylist = () => {
  const location = useLocation();
  const { smartAccountAddress, walletClient } = useSequence();
  const { 
    playlists, 
    isLoading, 
    isInitialized,
    createPlaylist,
    deletePlaylist,
    likePlaylist,
    followPlaylist,
    refreshPlaylists
  } = usePlaylists();

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Auto-open create modal from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'playlist') {
      setIsCreateModalOpen(true);
    }
  }, [location.search]);

  // Handle create playlist
  const handleCreatePlaylist = async (playlistData: any) => {
    try {
      console.log('📝 Creating playlist:', playlistData);

      // Upload cover to IPFS if it's a file
      let coverHash = playlistData.coverHash || '';
      
      if (playlistData.cover && playlistData.cover.startsWith('blob:')) {
        // Convert blob URL to file and upload
        toast.info('Uploading cover to IPFS...');
        // Cover already uploaded in modal, use the hash
        coverHash = playlistData.coverHash || 'ipfs://default';
      }

      // Create playlist
      await createPlaylist(
        playlistData.title,
        playlistData.description,
        coverHash,
        playlistData.trackIds || [],
        playlistData.isPublic
      );

      setIsCreateModalOpen(false);
      toast.success('Playlist created successfully!');
      
      // Refresh playlists
      setTimeout(() => refreshPlaylists(), 2000);
    } catch (error) {
      console.error('❌ Failed to create playlist:', error);
      toast.error('Failed to create playlist');
    }
  };

  // Handle delete playlist
  const handleDelete = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist?')) return;
    
    try {
      await deletePlaylist(playlistId);
      toast.success('Playlist deleted');
    } catch (error) {
      console.error('❌ Failed to delete:', error);
      toast.error('Failed to delete playlist');
    }
  };

  // Handle like playlist
  const handleLike = async (playlistId: string) => {
    try {
      await likePlaylist(playlistId);
    } catch (error) {
      console.error('❌ Failed to like:', error);
    }
  };

  // Filter playlists by search
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    playlist.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Music className="w-8 h-8" />
              My Playlists
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your music collections
            </p>
          </div>
          
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Playlist
          </Button>
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">Loading playlists...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredPlaylists.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No playlists match your search' : 'Create your first playlist to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Playlist
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Playlists Grid */}
        {!isLoading && filteredPlaylists.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlaylists.map((playlist) => (
              <Card key={playlist.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  {/* Cover Image */}
                  <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-muted">
                    {playlist.coverHash ? (
                      <img
                        src={playlist.coverHash.startsWith('ipfs://') 
                          ? playlist.coverHash.replace('ipfs://', 'https://ipfs.io/ipfs/')
                          : playlist.coverHash
                        }
                        alt={playlist.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="icon" className="rounded-full">
                        <Play className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>

                  {/* Playlist Info */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold line-clamp-1">{playlist.title}</h3>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 -mt-1"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {playlist.description || 'No description'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Music className="w-3 h-3" />
                        {playlist.trackCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {playlist.followerCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {playlist.likeCount || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {playlist.playCount || 0}
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2">
                      {playlist.isPublic ? (
                        <Badge variant="secondary" className="text-xs">
                          <Globe className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      )}
                      {playlist.isCollaborative && (
                        <Badge variant="secondary" className="text-xs">
                          Collaborative
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleLike(playlist.id)}
                      >
                        <Heart className="w-4 h-4 mr-1" />
                        Like
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(playlist.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreatePlaylist}
      />
    </div>
  );
};

export default MyPlaylist;
