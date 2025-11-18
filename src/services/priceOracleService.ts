/**
 * Price Oracle Service
 * Fetches token prices from DIA Oracle on Somnia Mainnet
 */

import { createPublicClient, http, parseAbi, defineChain } from 'viem';

// Somnia Mainnet Chain Definition
const somniaMainnet = defineChain({
  id: 50311,
  name: 'Somnia',
  nativeCurrency: {
    decimals: 18,
    name: 'Somnia',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://somnia.network' },
  },
});

// DIA Oracle V2 Contract Address on Somnia Mainnet
const DIA_ORACLE_ADDRESS = '0xbA0E0750A56e995506CA458b2BdD752754CF39C4' as const;

// DIA Oracle V2 ABI
const DIA_ORACLE_ABI = parseAbi([
  'function getValue(string memory key) external view returns (uint128 price, uint128 timestamp)',
]);

// Create public client for reading from blockchain
const publicClient = createPublicClient({
  chain: somniaMainnet,
  transport: http(),
});

export interface TokenPrice {
  price: number;
  timestamp: number;
  key: string;
}

// Token pair keys for DIA Oracle
// Note: DIA Oracle uses specific key formats, common formats are:
// - "TOKEN/USD" (e.g., "ETH/USD")
// - "TOKEN-USD" (e.g., "ETH-USD")
// - Full token name (e.g., "Ethereum")
export const TOKEN_KEYS = {
  SOMI_USD: 'SOMI/USD',
  STT_USD: 'STT/USD', // Alternative key for Somnia token
  ETH_USD: 'ETH/USD',
  BTC_USD: 'BTC/USD',
  USDC_USD: 'USDC/USD',
} as const;

/**
 * Get token price from DIA Oracle
 * @param key - Token pair key (e.g., "SOMI/USD", "ETH/USD")
 * @returns Token price and metadata
 */
export async function getTokenPrice(key: string): Promise<TokenPrice> {
  try {
    // Get price data from DIA Oracle
    const result = await publicClient.readContract({
      address: DIA_ORACLE_ADDRESS,
      abi: DIA_ORACLE_ABI,
      functionName: 'getValue',
      args: [key],
    } as any);

    const [priceRaw, timestampRaw] = result as [bigint, bigint];

    // DIA returns price with 8 decimals
    const price = Number(priceRaw) / 1e8;
    const timestamp = Number(timestampRaw);

    return {
      price,
      timestamp,
      key,
    };
  } catch (error) {
    console.error(`Failed to fetch price for ${key}:`, error);
    throw error;
  }
}

/**
 * Get token price if not older than specified time
 * @param key - Token pair key
 * @param maxAgeSeconds - Maximum age of price in seconds
 * @returns Token price if fresh, null if too old
 */
export async function getTokenPriceIfFresh(
  key: string,
  maxAgeSeconds: number = 300 // 5 minutes default
): Promise<TokenPrice | null> {
  try {
    const priceData = await getTokenPrice(key);
    const now = Math.floor(Date.now() / 1000);
    const age = now - priceData.timestamp;

    if (age > maxAgeSeconds) {
      console.warn(`Price for ${key} is ${age}s old, exceeds max age of ${maxAgeSeconds}s`);
      return null;
    }

    return priceData;
  } catch (error) {
    console.error(`Failed to fetch fresh price for ${key}:`, error);
    return null;
  }
}

/**
 * Get multiple token prices in parallel
 * @param keys - Array of token pair keys
 * @returns Map of token prices
 */
export async function getMultipleTokenPrices(
  keys: string[]
): Promise<Map<string, TokenPrice>> {
  const priceMap = new Map<string, TokenPrice>();

  try {
    const promises = keys.map((key) =>
      getTokenPrice(key).catch((error) => {
        console.error(`Failed to fetch price for ${key}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);

    results.forEach((result, index) => {
      if (result) {
        priceMap.set(keys[index], result);
      }
    });

    return priceMap;
  } catch (error) {
    console.error('Failed to fetch multiple token prices:', error);
    return priceMap;
  }
}

/**
 * Calculate USD value of token balance
 * @param balance - Token balance
 * @param key - Token pair key
 * @returns USD value
 */
export async function calculateUSDValue(
  balance: number,
  key: string
): Promise<number> {
  try {
    const priceData = await getTokenPrice(key);
    return balance * priceData.price;
  } catch (error) {
    console.error(`Failed to calculate USD value for ${key}:`, error);
    return 0;
  }
}

/**
 * Get SOMI token price from DIA Data API
 * Uses official DIA oracle data from mainnet
 * @returns Token price data
 */
export async function getSOMIPrice(): Promise<(TokenPrice & { change24h?: number }) | null> {
  try {
    console.log('🔍 Fetching SOMI price from DIA Data API...');
    
    // DIA API endpoint for Somnia native token
    const response = await fetch(
      'https://api.diadata.org/v1/assetQuotation/Somnia/0x0000000000000000000000000000000000000000',
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );
    
    if (!response.ok) {
      throw new Error(`DIA API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 DIA Data API response:', data);
    
    if (data && typeof data.Price === 'number' && data.Price > 0) {
      const priceData = {
        price: data.Price,
        timestamp: data.Time ? new Date(data.Time).getTime() / 1000 : Math.floor(Date.now() / 1000),
        key: 'SOMI/USD',
        change24h: undefined, // DIA doesn't provide 24h change in this endpoint
      };
      
      console.log('✅ SOMI price from DIA Data API:', priceData.price, 'USD');
      return priceData;
    }
    
    throw new Error('Invalid price data from DIA API');
  } catch (error) {
    console.error('❌ Error fetching SOMI price from DIA Data API:', error);
    return null;
  }
}
