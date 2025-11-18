import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAudio, Track } from "@/contexts/AudioContext";
import { useAccount } from "wagmi";
import { recordMusicPlay } from "@/utils/playCountHelper";
import { Plus, X, Play, Pause } from "lucide-react";

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist?: (name: string, description: string, tracks: Track[]) => void;
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist
}) => {
  const { playlist, currentTrack, isPlaying, playTrack, pauseTrack, removeFromPlaylist } = useAudio();
  const { address } = useAccount();
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');

  const handleCreatePlaylist = () => {
    if (playlistName.trim() && onCreatePlaylist) {
      onCreatePlaylist(playlistName, playlistDescription, playlist);
      setPlaylistName('');
      setPlaylistDescription('');
      onClose();
    }
  };

  const handlePlayTrack = (track: Track) => {
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create Playlist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Playlist Info */}
          <div className="space-y-2">
            <Label htmlFor="playlist-name">Playlist Name</Label>
            <Input
              id="playlist-name"
              placeholder="Enter playlist name..."
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="playlist-description">Description (Optional)</Label>
            <Textarea
              id="playlist-description"
              placeholder="Describe your playlist..."
              value={playlistDescription}
              onChange={(e) => setPlaylistDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Current Playlist Tracks */}
          <div className="space-y-2">
            <Label>Tracks in Playlist ({playlist.length})</Label>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {playlist.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Plus className="w-8 h-8 mx-auto mb-2" />
                  <p>No tracks added yet</p>
                  <p className="text-sm">Add tracks to create your playlist</p>
                </div>
              ) : (
                playlist.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="text-sm text-muted-foreground w-6">
                      {index + 1}
                    </span>

                    <img
                      src={track.cover}
                      alt={track.title}
                      className="w-10 h-10 rounded object-cover"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{track.title}</h4>
                      <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePlayTrack(track)}
                      >
                        {currentTrack?.id === track.id && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromPlaylist(track)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePlaylist}
            disabled={!playlistName.trim() || playlist.length === 0}
          >
            Create Playlist
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PlaylistModal;