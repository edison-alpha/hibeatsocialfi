import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import demoAudio from '@/assets/Akbar Ajie - Jingga.mp3';

export interface Track {
  id: number;
  title: string;
  artist: string;
  avatar: string;
  cover: string;
  genre: string;
  duration: string;
  audioUrl?: string; // URL to audio file
  likes: number;
  plays?: number;
  description?: string;
  bpm?: number;
  key?: string;
  price?: string;
}

interface AudioContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playlist: Track[];
  currentIndex: number;
  audioData: Uint8Array;
  visualizerUpdate: number;
  isAudioReady: boolean;
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  stopTrack: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (track: Track) => void;
  clearPlaylist: () => void;
  setPlaylist: (tracks: Track[]) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [playlist, setPlaylistState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const [isAudioReady, setIsAudioReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array<ArrayBuffer>>(new Uint8Array(0) as Uint8Array<ArrayBuffer>);
  const [visualizerUpdate, setVisualizerUpdate] = useState(0);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Initialize Web Audio API for visualizer
  const initializeAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.8;

        // Only create source if not already created
        if (!sourceRef.current) {
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          console.log('✅ Web Audio API initialized - audio routed through AudioContext');
        }

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;
        setAudioData(dataArray);
      } catch (error) {
        console.error('❌ Error initializing Web Audio API:', error);
        console.error('This might cause no audio output. Error:', error);
      }
    }
  };

  // Update audio data for visualizer
  const updateAudioData = useCallback(() => {
    if (analyserRef.current && audioData.length > 0) {
      analyserRef.current.getByteFrequencyData(audioData);
      // Force update by creating new array reference
      setAudioData(new Uint8Array(audioData) as Uint8Array<ArrayBuffer>);
    }
    animationRef.current = requestAnimationFrame(updateAudioData);
  }, [audioData]);

  // Start/stop visualizer animation
  useEffect(() => {
    if (isPlaying && analyserRef.current) {
      // Start animation loop
      if (!animationRef.current) {
        updateAudioData();
      }
    } else {
      // Stop animation loop
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying, updateAudioData]); // Include updateAudioData in dependencies

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;

      // Initialize Web Audio API for visualizer
      initializeAudioContext();

      // Audio event listeners
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });

      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      });

      audioRef.current.addEventListener('ended', () => {
        nextTrack();
      });

      audioRef.current.addEventListener('canplay', () => {
        // Audio is ready to play, but we handle playing in playTrack function
        console.log('Audio can play');
      });

      // Add user interaction handler to resume audio context
      const handleUserInteraction = async () => {
        setHasUserInteracted(true);

        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          try {
            await audioContextRef.current.resume();
            console.log('Audio context resumed');
          } catch (error) {
            console.error('Failed to resume audio context:', error);
          }
        }
      };

      // Add event listeners for user interactions - more comprehensive for mobile
      const events = ['click', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'keydown', 'scroll', 'focus'];
      events.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { passive: true });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const playTrack = async (track: Track) => {
    if (!audioRef.current || isLoadingTrack) return;

    console.log('🎵 [AudioContext] playTrack called with:', track);
    console.log('🎵 [AudioContext] Track audioUrl:', track.audioUrl);

    // Set user has interacted (important for mobile)
    setHasUserInteracted(true);

    // Resume audio context if suspended (required by modern browsers)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('Audio context resumed for track:', track.title);
      } catch (error) {
        console.error('Failed to resume audio context:', error);
        return;
      }
    }

    // If it's the same track, just resume
    if (currentTrack?.id === track.id) {
      console.log('🎵 [AudioContext] Same track, resuming');
      resumeTrack();
      return;
    }

    // Set loading state to prevent multiple calls
    setIsLoadingTrack(true);

    // Set new track
    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(0);

    // Always use the demo audio file for all tracks
    const demoAudioUrl = demoAudio;

    if (track.audioUrl && track.audioUrl.trim() !== '') {
      // For IPFS URLs, add crossorigin attribute
      if (track.audioUrl.includes('ipfs')) {
        audioRef.current.crossOrigin = 'anonymous';
        console.log('🌐 [AudioContext] Loading IPFS audio:', track.audioUrl);
      } else {
        console.log('🌐 [AudioContext] Loading audio from:', track.audioUrl);
      }
      audioRef.current.src = track.audioUrl;
    } else {
      // Use demo audio for tracks without audioUrl
      console.warn('⚠️ [AudioContext] No audioUrl provided, using demo audio');
      audioRef.current.src = demoAudioUrl;
    }

    // Add error handler for audio loading
    const handleLoadError = () => {
      console.error('❌ Failed to load audio from:', audioRef.current?.src);
      
      // Try alternative IPFS gateway
      if (audioRef.current && audioRef.current.src.includes('ipfs.io')) {
        const hash = audioRef.current.src.split('/ipfs/')[1];
        const altUrl = `https://gateway.pinata.cloud/ipfs/${hash}`;
        console.log('🔄 Trying alternative gateway:', altUrl);
        audioRef.current.src = altUrl;
        audioRef.current.load();
      }
    };
    
    audioRef.current.addEventListener('error', handleLoadError, { once: true });
    audioRef.current.load();

    // Always try to play - modern browsers handle autoplay policies
    try {
      // Ensure volume is set
      audioRef.current.volume = volume;
      console.log('🔊 Volume set to:', volume, 'Muted:', audioRef.current.muted);
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        await playPromise;
        setIsPlaying(true);
        setIsAudioReady(false); // Reset ready state
        console.log('✅ Audio playback started successfully for:', track.title);
        console.log('🔊 Current volume:', audioRef.current.volume, 'Muted:', audioRef.current.muted);
      } else {
        // Older browsers that don't return a promise
        setIsPlaying(true);
        setIsAudioReady(false);
        console.log('✅ Audio playback started (legacy) for:', track.title);
      }
    } catch (error) {
      console.error('❌ Audio playback failed:', error);
      setIsPlaying(false);
      setIsAudioReady(true); // Set ready for manual resume

      // On mobile, this is expected due to autoplay policies
      // The audio will play when user interacts with play button again
      console.log('⚠️ Autoplay prevented - audio ready for manual play');
    } finally {
      // Reset loading state
      setIsLoadingTrack(false);
    }

    // Update current index in playlist
    const index = playlist.findIndex(t => t.id === track.id);
    if (index !== -1) {
      setCurrentIndex(index);
    }
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  };

  const resumeTrack = async () => {
    if (audioRef.current && currentTrack) {
      try {
        // Ensure audio context is running
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Always try to play/resume - let browser handle autoplay policies
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlaying(true);
          setIsAudioReady(false); // Reset ready state
          console.log('Audio resumed successfully');
        } else {
          setIsPlaying(true);
          setIsAudioReady(false);
          console.log('Audio resumed (legacy)');
        }
      } catch (error) {
        console.error('Failed to resume audio:', error);
        setIsPlaying(false);
        setIsAudioReady(true); // Set ready for next attempt

        // This might happen due to autoplay policies
        console.log('Resume failed - audio ready for next interaction');
      }
    }
  };

  const stopTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const setVolume = (newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const nextTrack = () => {
    if (playlist.length > 0 && currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      playTrack(playlist[nextIndex]);
    } else {
      stopTrack();
    }
  };

  const previousTrack = () => {
    if (playlist.length > 0 && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      playTrack(playlist[prevIndex]);
    }
  };

  const addToPlaylist = (track: Track) => {
    setPlaylistState(prev => {
      if (!prev.find(t => t.id === track.id)) {
        return [...prev, track];
      }
      return prev;
    });
  };

  const removeFromPlaylist = (track: Track) => {
    setPlaylistState(prev => prev.filter(t => t.id !== track.id));
  };

  const clearPlaylist = () => {
    setPlaylistState([]);
    setCurrentIndex(-1);
  };

  const setPlaylist = (tracks: Track[]) => {
    setPlaylistState(tracks);
    setCurrentIndex(0);
  };

  const value: AudioContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    playlist,
    currentIndex,
    audioData,
    visualizerUpdate,
    isAudioReady,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    setVolume,
    seekTo,
    nextTrack,
    previousTrack,
    addToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    setPlaylist,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};