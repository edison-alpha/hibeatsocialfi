import React from 'react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X
} from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";

interface MiniAudioPlayerProps {
  onExpand?: () => void;
  onClose?: () => void;
}

const MiniAudioPlayer: React.FC<MiniAudioPlayerProps> = ({ onExpand, onClose }) => {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
  } = useAudio();

  if (!currentTrack) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-background/95 backdrop-blur-md border border-border/50 rounded-full px-4 py-2 shadow-lg hover:shadow-xl transition-all duration-300 max-w-sm w-full">
      <div className="flex items-center gap-3">
        {/* Track Info */}
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          onClick={onExpand}
        >
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-full"
            onClick={previousTrack}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="default"
            size="sm"
            className="w-8 h-8 rounded-full p-0"
            onClick={() => {
              if (isPlaying) {
                pauseTrack();
              } else {
                playTrack(currentTrack);
              }
            }}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-full"
            onClick={nextTrack}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Close Button */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0 rounded-full"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default MiniAudioPlayer;