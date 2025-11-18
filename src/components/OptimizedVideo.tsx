import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Play } from 'lucide-react';
import { getOptimizedIPFSUrl, getCachedImage } from '@/utils/imageOptimizer';

interface OptimizedVideoProps {
  src: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  controls?: boolean;
  preload?: 'none' | 'metadata' | 'auto';
  autoPlay?: boolean;
}

/**
 * Optimized Video Component
 * - Lazy loading
 * - IPFS gateway fallback
 * - Loading placeholder
 * - Click to play
 */
export const OptimizedVideo: React.FC<OptimizedVideoProps> = ({
  src,
  className = '',
  onClick,
  controls = true,
  preload = 'metadata',
  autoPlay = false
}) => {
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Extract IPFS hash if present
  const getIPFSHash = (url: string): string | null => {
    if (!url) return null;
    
    if (url.includes('ipfs://')) {
      return url.replace('ipfs://', '');
    }
    
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch) {
      return ipfsMatch[1];
    }
    
    return null;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px'
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Load optimized video URL
  useEffect(() => {
    if (!isInView || !src) return;

    const loadVideo = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const ipfsHash = getIPFSHash(src);
        
        if (ipfsHash) {
          // Check cache first
          const cached = getCachedImage(ipfsHash);
          if (cached) {
            setVideoSrc(cached);
            setIsLoading(false);
            return;
          }

          // Get optimized IPFS URL
          const optimizedUrl = await getOptimizedIPFSUrl(ipfsHash);
          setVideoSrc(optimizedUrl);
        } else {
          setVideoSrc(src);
        }
      } catch (error) {
        console.error('Failed to load video:', error);
        setHasError(true);
        setVideoSrc(src);
      }
    };

    loadVideo();
  }, [src, isInView]);

  const handleLoadedMetadata = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback gateway
    const ipfsHash = getIPFSHash(src);
    if (ipfsHash && videoSrc.includes('gateway.pinata.cloud')) {
      setVideoSrc(`https://ipfs.io/ipfs/${ipfsHash}`);
    } else if (ipfsHash && videoSrc.includes('ipfs.io')) {
      setVideoSrc(`https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (onClick) {
      onClick(e);
      return;
    }

    // Toggle play/pause
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg z-10">
          <Loader2 className="w-8 h-8 animate-spin text-white" />
        </div>
      )}

      {/* Play button overlay (when paused) */}
      {!isPlaying && !isLoading && videoSrc && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg cursor-pointer z-10 hover:bg-black/40 transition-colors"
          onClick={handleVideoClick}
        >
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-8 h-8 text-black ml-1" />
          </div>
        </div>
      )}

      {/* Actual video */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          controls={controls}
          controlsList="nodownload"
          preload={preload}
          autoPlay={autoPlay}
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          onPlay={handlePlay}
          onPause={handlePause}
          onClick={handleVideoClick}
        >
          Your browser does not support the video tag.
        </video>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <span className="text-xs text-muted-foreground">Failed to load video</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedVideo;
