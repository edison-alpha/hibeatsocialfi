/**
 * IPFS utility functions
 */

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

/**
 * Get IPFS URL from hash
 * @param ipfsHash - The IPFS hash (with or without ipfs:// prefix)
 * @param gatewayIndex - Index of gateway to use (default: 0 - Pinata)
 * @returns Full IPFS URL
 */
export function getIpfsUrl(ipfsHash: string, gatewayIndex: number = 0): string {
  if (!ipfsHash || ipfsHash.length === 0) {
    return '';
  }

  // Remove ipfs:// prefix if present
  const hash = ipfsHash.replace('ipfs://', '');
  
  // Use specified gateway or default to Pinata
  const gateway = IPFS_GATEWAYS[gatewayIndex] || IPFS_GATEWAYS[0];
  
  return `${gateway}${hash}`;
}

/**
 * Convert IPFS hash to ipfs:// URI format
 * @param ipfsHash - The IPFS hash
 * @returns IPFS URI
 */
export function toIpfsUri(ipfsHash: string): string {
  if (!ipfsHash || ipfsHash.length === 0) {
    return '';
  }

  // Remove ipfs:// prefix if already present
  const hash = ipfsHash.replace('ipfs://', '');
  
  return `ipfs://${hash}`;
}

/**
 * Extract hash from IPFS URI or URL
 * @param ipfsUrlOrUri - IPFS URL or URI
 * @returns IPFS hash
 */
export function extractIpfsHash(ipfsUrlOrUri: string): string {
  if (!ipfsUrlOrUri) {
    return '';
  }

  // Handle ipfs:// URI
  if (ipfsUrlOrUri.startsWith('ipfs://')) {
    return ipfsUrlOrUri.replace('ipfs://', '');
  }

  // Handle gateway URLs
  for (const gateway of IPFS_GATEWAYS) {
    if (ipfsUrlOrUri.startsWith(gateway)) {
      return ipfsUrlOrUri.replace(gateway, '');
    }
  }

  // Assume it's already a hash
  return ipfsUrlOrUri;
}

/**
 * Try multiple IPFS gateways in order until one succeeds
 * @param ipfsHash - The IPFS hash
 * @returns Promise that resolves to working URL or rejects if all fail
 */
export async function getWorkingIpfsUrl(ipfsHash: string): Promise<string> {
  const hash = extractIpfsHash(ipfsHash);
  
  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const url = getIpfsUrl(hash, i);
    
    try {
      const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      console.warn(`Gateway ${IPFS_GATEWAYS[i]} failed for ${hash}`);
    }
  }
  
  // If all gateways fail, return the first one anyway
  return getIpfsUrl(hash, 0);
}

/**
 * Check if a string is an IPFS hash or URI
 * @param str - String to check
 * @returns true if it's an IPFS hash or URI
 */
export function isIpfsHash(str: string): boolean {
  if (!str) return false;
  
  // Check for ipfs:// URI
  if (str.startsWith('ipfs://')) {
    return true;
  }
  
  // Check for gateway URL
  for (const gateway of IPFS_GATEWAYS) {
    if (str.startsWith(gateway)) {
      return true;
    }
  }
  
  // Check if it looks like a CID (starts with Qm or b)
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58})/.test(str);
}
