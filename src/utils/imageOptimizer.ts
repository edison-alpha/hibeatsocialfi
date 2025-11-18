/**
 * Image Optimizer Utility
 * Handles image caching, lazy loading, and multiple IPFS gateways
 */

// Multiple IPFS gateways for fallback (fastest first)
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

// In-memory cache for loaded images
const imageCache = new Map<string, string>();

// LocalStorage cache key
const CACHE_KEY_PREFIX = 'hibeats_img_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get cached image URL from memory or localStorage
 */
export const getCachedImage = (hash: string): string | null => {
  // Check memory cache first (fastest)
  if (imageCache.has(hash)) {
    return imageCache.get(hash)!;
  }

  // Check localStorage cache
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + hash);
    if (cached) {
      const { url, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      if (age < CACHE_EXPIRY_MS) {
        // Still valid, add to memory cache
        imageCache.set(hash, url);
        return url;
      } else {
        // Expired, remove from localStorage
        localStorage.removeItem(CACHE_KEY_PREFIX + hash);
      }
    }
  } catch (error) {
    console.warn('Failed to read image cache:', error);
  }

  return null;
};

/**
 * Save image URL to cache
 */
export const cacheImage = (hash: string, url: string): void => {
  // Save to memory cache
  imageCache.set(hash, url);

  // Save to localStorage
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + hash, JSON.stringify({
      url,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to save image cache:', error);
  }
};

/**
 * Get IPFS URL with fastest gateway
 * Tries multiple gateways and returns the first one that loads
 */
export const getOptimizedIPFSUrl = async (hash: string): Promise<string> => {
  if (!hash) return '';

  // Clean hash
  const cleanHash = hash.replace('ipfs://', '');

  // Check cache first
  const cached = getCachedImage(cleanHash);
  if (cached) {
    return cached;
  }

  // Try all gateways in parallel, return first successful
  const promises = IPFS_GATEWAYS.map(async (gateway) => {
    const url = gateway + cleanHash;
    
    try {
      // Test if image loads (HEAD request would be better but not always supported)
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Gateway failed, try next
    }
    
    return null;
  });

  // Race all gateways, return first successful
  const results = await Promise.allSettled(promises);
  const successfulUrl = results
    .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)[0];

  if (successfulUrl) {
    // Cache the successful URL
    cacheImage(cleanHash, successfulUrl);
    return successfulUrl;
  }

  // Fallback to first gateway if all failed
  const fallbackUrl = IPFS_GATEWAYS[0] + cleanHash;
  return fallbackUrl;
};

/**
 * Preload image to browser cache
 */
export const preloadImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Batch preload multiple images
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => preloadImage(url).catch(() => {}));
  await Promise.all(promises);
};

/**
 * Clear old cache entries
 */
export const clearOldCache = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            const age = now - timestamp;
            
            if (age > CACHE_EXPIRY_MS) {
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.warn('Failed to clear old cache:', error);
  }
};

// Clear old cache on module load
clearOldCache();
