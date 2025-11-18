import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { getOptimizedIPFSUrl, getCachedImage } from '@/utils/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  loading?: 'lazy' | 'eager';
  showPlaceholder?: boolean;
}

/**
 * Optimized Image Component
 * - Lazy loading
 * - IPFS gateway fallback
 * - Caching
 * - Loading placeholder
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  onClick,
  loading = 'lazy',
  showPlaceholder = true
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isInView, setIsInView] = useState(false);

  // Extract IPFS hash if present
  const getIPFSHash = (url: string): string | null => {
    if (!url) return null;
    
    // Check if it's an IPFS URL
    if (url.includes('ipfs://')) {
      return url.replace('ipfs://', '');
    }
    
    // Check if it's already an IPFS gateway URL
    const ipfsMatch = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (ipfsMatch) {
      return ipfsMatch[1];
    }
    
    return null;
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading === 'eager') {
      setIsInView(true);
      return;
    }

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
        rootMargin: '200px' // Start loading 200px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [loading]);

  // Load optimized image URL
  useEffect(() => {
    if (!isInView || !src) return;

    const loadImage = async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        const ipfsHash = getIPFSHash(src);
        
        if (ipfsHash) {
          // Check cache first
          const cached = getCachedImage(ipfsHash);
          if (cached) {
            setImageSrc(cached);
            setIsLoading(false);
            return;
          }

          // Get optimized IPFS URL (tries multiple gateways)
          const optimizedUrl = await getOptimizedIPFSUrl(ipfsHash);
          setImageSrc(optimizedUrl);
        } else {
          // Not an IPFS URL, use as-is
          setImageSrc(src);
        }
      } catch (error) {
        console.error('Failed to load image:', error);
        setHasError(true);
        // Fallback to original src
        setImageSrc(src);
      }
    };

    loadImage();
  }, [src, isInView]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Try fallback gateway if IPFS
    const ipfsHash = getIPFSHash(src);
    if (ipfsHash && imageSrc.includes('gateway.pinata.cloud')) {
      // Try ipfs.io as fallback
      setImageSrc(`https://ipfs.io/ipfs/${ipfsHash}`);
    } else if (ipfsHash && imageSrc.includes('ipfs.io')) {
      // Try cloudflare as fallback
      setImageSrc(`https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
    }
  };

  return (
    <div className={`relative ${className}`} ref={imgRef}>
      {/* Loading placeholder */}
      {isLoading && showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onClick={onClick}
          onLoad={handleLoad}
          onError={handleError}
          loading={loading}
        />
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 rounded-lg">
          <span className="text-xs text-muted-foreground">Failed to load image</span>
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
