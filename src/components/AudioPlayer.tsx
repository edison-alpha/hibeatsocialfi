import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  MoreHorizontal,
  Repeat,
  Shuffle,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { useAudio } from "@/contexts/AudioContext";
import { AudioVisualizer } from "./AudioVisualizer";

const AudioPlayer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    currentIndex,
    audioData,
    visualizerUpdate,
    playTrack,
    pauseTrack,
    resumeTrack,
    setVolume,
    seekTo,
    nextTrack,
    previousTrack,
  } = useAudio();

  const [isMiniMode, setIsMiniMode] = useState(false);
  const [miniPosition, setMiniPosition] = useState({ x: 50, y: 20 }); // Start more centered and lower
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const miniPlayerRef = useRef<HTMLDivElement>(null);

  // Auto-switch to mini mode after 5 seconds of playing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentTrack && !isMiniMode) {
      timer = setTimeout(() => {
        setIsMiniMode(true);
      }, 5000); // 5 seconds
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isPlaying, currentTrack, isMiniMode]);

  // Reset to full player when track changes or stops
  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      setIsMiniMode(false);
    }
  }, [isPlaying, currentTrack]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseTrack();
    } else if (currentTrack) {
      // On mobile, if audio is ready but not playing, this will trigger playback
      resumeTrack();
    }
  };

  const handleProgressChange = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0] / 100);
  };

  const toggleMiniMode = () => {
    setIsMiniMode(!isMiniMode);
  };

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (miniPosition.x / 100) * window.innerWidth,
      y: e.clientY - (miniPosition.y / 100) * window.innerHeight
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = ((e.clientX - dragStart.x) / window.innerWidth) * 100;
    const newY = ((e.clientY - dragStart.y) / window.innerHeight) * 100;

    // Allow free movement across the entire screen with minimal margin
    const constrainedX = Math.max(2, Math.min(98, newX)); // Small margin from edges
    const constrainedY = Math.max(2, Math.min(95, newY)); // Allow more vertical movement

    setMiniPosition({ x: constrainedX, y: constrainedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  if (!currentTrack) {
    return null;
  }

  // Mini mode - Dynamic Island style
  if (isMiniMode) {
    return (
      <div
        ref={miniPlayerRef}
        className="fixed z-50 bg-black/20 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl hover:shadow-3xl transition-all duration-300 max-w-md w-full cursor-move select-none overflow-hidden"
        style={{
          left: `${miniPosition.x}%`,
          top: `${miniPosition.y}%`,
          transform: 'translateX(-50%) translateY(-100%)',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* Audio Visualizer Background */}
        <div className="absolute inset-0 opacity-30">
          <AudioVisualizer
            audioData={audioData}
            isPlaying={isPlaying}
            visualizerUpdate={visualizerUpdate}
            className="w-full h-full"
          />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-base truncate">{currentTrack.title}</h4>
              <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                previousTrack();
              }}
              disabled={currentIndex <= 0}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              variant="default"
              size="sm"
              className="w-10 h-10 rounded-full p-0"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-9 h-9 p-0 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                nextTrack();
              }}
              disabled={currentIndex >= playlist.length - 1}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          {/* Expand Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-9 h-9 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              toggleMiniMode();
            }}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Full mode - Bottom player
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black/20 backdrop-blur-xl border border-white/10 px-4 py-3 z-50 rounded-lg shadow-2xl mx-auto max-w-7xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      {/* Audio Visualizer Background */}
      <div className="absolute inset-0 opacity-20">
        <AudioVisualizer
          audioData={audioData}
          isPlaying={isPlaying}
          visualizerUpdate={visualizerUpdate}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img
            src={currentTrack.cover}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-md object-cover flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 flex-shrink-0">
            <Heart className="w-4 h-4" />
          </Button>
        </div>

        {/* Player Controls */}
        <div className="flex flex-col items-center gap-2 flex-1 max-w-md">
          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full"
              onClick={previousTrack}
              disabled={currentIndex <= 0}
            >
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="default"
              size="sm"
              className="w-10 h-10 rounded-full p-0"
              onClick={handlePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full"
              onClick={nextTrack}
              disabled={currentIndex >= playlist.length - 1}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-muted-foreground w-10 text-right">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={1}
              onValueChange={handleProgressChange}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground w-10">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Volume & Additional Controls */}
        <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Shuffle className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
              <Repeat className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
            >
              {volume > 0 ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              className="w-20"
            />
          </div>

          {/* Mini Mode Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            onClick={toggleMiniMode}
          >
            <ChevronUp className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;