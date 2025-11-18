// src/components/library/LibraryPanel.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Download,
  Share2,
  Trash2,
  Music,
  Clock,
  Cloud,
  Bot,
  User,
  Loader2,
  Sparkles
} from "lucide-react";
import { useGeneratedMusicContext } from '../../contexts/GeneratedMusicContext';
import { GeneratedMusic } from '../../types/music';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@/hooks/useRealTimeProfile';
import { useAccount } from 'wagmi';

interface LibraryPanelProps {
  onSongSelect?: (song: GeneratedMusic) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'generating';
  content: string;
  timestamp: Date;
  tracks?: GeneratedMusic[];
  progress?: {
    stage: string;
    percent: number;
  };
}

export const LibraryPanel: React.FC<LibraryPanelProps> = ({ onSongSelect }) => {
  const {
    generatedMusic,
    removeTrack,
    isGenerating,
    progress,
    lastPrompt
  } = useGeneratedMusicContext();

  const { address } = useAccount();
  const { profileData } = useCurrentUserProfile();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMusicCountRef = useRef(0);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Track generation progress
  useEffect(() => {
    if (isGenerating && lastPrompt) {
      setChatMessages(prev => {
        const hasUserMessage = prev.some(msg => 
          msg.type === 'user' && msg.content === lastPrompt
        );
        
        if (!hasUserMessage) {
          return [
            ...prev,
            {
              id: `user-${Date.now()}`,
              type: 'user',
              content: lastPrompt,
              timestamp: new Date()
            },
            {
              id: `gen-${Date.now()}`,
              type: 'generating',
              content: 'Generating your music...',
              timestamp: new Date(),
              progress: progress
            }
          ];
        }
        
        return prev.map(msg => 
          msg.type === 'generating' 
            ? { ...msg, progress: progress }
            : msg
        );
      });
    }
  }, [isGenerating, progress, lastPrompt]);

  // When generation completes
  useEffect(() => {
    if (!isGenerating && generatedMusic.length > prevMusicCountRef.current) {
      const newTracks = generatedMusic.slice(prevMusicCountRef.current);
      
      setChatMessages(prev => {
        const withoutGenerating = prev.filter(msg => msg.type !== 'generating');
        
        return [
          ...withoutGenerating,
          {
            id: `assistant-${Date.now()}`,
            type: 'assistant',
            content: `I've generated ${newTracks.length} track${newTracks.length > 1 ? 's' : ''} for you! 🎵`,
            timestamp: new Date(),
            tracks: newTracks
          }
        ];
      });
      
      prevMusicCountRef.current = generatedMusic.length;
    }
  }, [isGenerating, generatedMusic]);

  // Helper functions
  const togglePlay = (track: GeneratedMusic) => {
    const trackId = track.id;
    if (playingTrack === trackId) {
      const audio = audioElements.get(trackId);
      if (audio) audio.pause();
      setPlayingTrack(null);
    } else {
      if (playingTrack) {
        const currentAudio = audioElements.get(playingTrack);
        if (currentAudio) currentAudio.pause();
      }
      let audio = audioElements.get(trackId);
      if (!audio) {
        audio = new Audio(track.audioUrl);
        audio.addEventListener('ended', () => setPlayingTrack(null));
        setAudioElements(prev => new Map(prev.set(trackId, audio!)));
      }
      audio.play().catch(() => toast.error('Failed to play audio'));
      setPlayingTrack(trackId);
    }
  };

  const downloadTrack = (track: GeneratedMusic) => {
    try {
      const link = document.createElement('a');
      link.href = track.audioUrl;
      link.download = `${track.title}.mp3`;
      link.click();
      toast.success('Download started');
    } catch {
      toast.error('Failed to download');
    }
  };

  const shareTrack = async (track: GeneratedMusic) => {
    const shareData = {
      title: track.title,
      text: `Check out: ${track.title}`,
      url: track.audioUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        navigator.clipboard.writeText(track.audioUrl);
        toast.success('Link copied');
      }
    } else {
      navigator.clipboard.writeText(track.audioUrl);
      toast.success('Link copied');
    }
  };

  const handleDeleteTrack = (trackId: string, title: string) => {
    if (confirm(`Delete "${title}"?`)) {
      removeTrack(trackId);
      const audio = audioElements.get(trackId);
      if (audio) {
        audio.pause();
        audio.src = '';
        setAudioElements(prev => {
          const newMap = new Map(prev);
          newMap.delete(trackId);
          return newMap;
        });
      }
      if (playingTrack === trackId) setPlayingTrack(null);
      toast.success('Deleted');
    }
  };

  // Empty state
  if (chatMessages.length === 0 && !isGenerating) {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <Sparkles className="w-20 h-20 text-primary relative animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold mb-3">AI Music Generator</h3>
          <p className="text-muted-foreground max-w-md mb-6">
            Describe the music you want to create, and I'll generate it for you using advanced AI
          </p>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            <Badge variant="outline" className="text-xs">🎸 Rock</Badge>
            <Badge variant="outline" className="text-xs">🎹 Electronic</Badge>
            <Badge variant="outline" className="text-xs">🎺 Jazz</Badge>
            <Badge variant="outline" className="text-xs">🎵 Pop</Badge>
            <Badge variant="outline" className="text-xs">🎼 Classical</Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Avatar for assistant */}
            {message.type !== 'user' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}

            {/* Message Content */}
            <div className={`flex flex-col max-w-[80%] ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted border border-border'
                }`}
              >
                {message.type === 'generating' ? (
                  <div className="space-y-3 min-w-[300px]">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">{message.progress?.stage || 'Generating...'}</span>
                    </div>
                    <Progress value={message.progress?.percent || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {message.progress?.percent || 0}% complete
                    </p>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>

              {/* Generated Tracks */}
              {message.tracks && message.tracks.length > 0 && (
                <div className="mt-3 space-y-3 w-full">
                  {message.tracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      playingTrack={playingTrack}
                      onTogglePlay={() => togglePlay(track)}
                      onDownload={() => downloadTrack(track)}
                      onShare={() => shareTrack(track)}
                      onDelete={() => handleDeleteTrack(track.id, track.title)}
                    />
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground mt-1 px-2">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Avatar for user */}
            {message.type === 'user' && (
              <Avatar className="w-8 h-8 flex-shrink-0">
                {profileData?.avatarHash ? (
                  <AvatarImage src={`https://ipfs.io/ipfs/${profileData.avatarHash}`} />
                ) : null}
                <AvatarFallback className="bg-secondary">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

// TrackCard component
interface TrackCardProps {
  track: GeneratedMusic;
  playingTrack: string | null;
  onTogglePlay: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}

const TrackCard: React.FC<TrackCardProps> = ({
  track,
  playingTrack,
  onTogglePlay,
  onDownload,
  onShare,
  onDelete
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Cover Image */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted relative group">
              {track.imageUrl ? (
                <img
                  src={track.imageUrl}
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              
              {/* Play overlay */}
              <div 
                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={onTogglePlay}
              >
                {playingTrack === track.id ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate text-sm">{track.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDuration(track.duration)}
              </div>
              {track.ipfsHash && (
                <Badge variant="outline" className="text-xs h-5 px-1.5">
                  <Cloud className="w-3 h-3" />
                </Badge>
              )}
            </div>
            
            {/* Genre tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {track.genre.slice(0, 2).map((genre, index) => (
                <Badge key={index} variant="secondary" className="text-xs h-5 px-2">
                  {genre}
                </Badge>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 mt-3">
              <Button size="sm" variant="outline" onClick={onTogglePlay} className="h-7 px-2">
                {playingTrack === track.id ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={onDownload} className="h-7 px-2">
                <Download className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={onShare} className="h-7 px-2">
                <Share2 className="w-3 h-3" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onDelete} 
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        <audio
          controls
          src={track.audioUrl}
          className="w-full mt-3 h-8"
          preload="metadata"
        />
      </CardContent>
    </Card>
  );
};
