// Somnia Data Streams SDK Setup
// Optimized for browser usage with Sequence wallet

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, http, fallback, type WalletClient } from 'viem';
import { somniaTestnet } from './web3-config';
import { getAllRpcUrls } from './rpc-fallback';

// Create fallback transport for reliability
const createFallbackTransport = () => {
  const rpcUrls = getAllRpcUrls();
  const transports = rpcUrls.map(url => http(url, {
    timeout: 5_000,
    retryCount: 2,
    retryDelay: 100,
  }));
  
  return fallback(transports, {
    rank: false,
    retryCount: 2,
    retryDelay: 100,
  });
};

// Public client for reads (no wallet needed) with multiple RPC fallback
export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: createFallbackTransport(),
});

// Initialize SDK with public client only (for reads)
export const sdkReadOnly = new SDK({
  public: publicClient,
});

// Function to create SDK with wallet client (for writes)
export function createSDKWithWallet(walletClient: WalletClient) {
  return new SDK({
    public: publicClient,
    wallet: walletClient, // From useWalletClient() wagmi
  });
}

// Schema definitions
export const SCHEMAS = {
  posts: `
    uint64 timestamp,
    string content,
    string metadata,
    address author
  `,
  interactions: `
    uint64 timestamp,
    string interactionType,
    string targetId,
    string content,
    address fromUser
  `,
  profiles: `
    uint64 timestamp,
    string username,
    string displayName,
    string bio,
    string avatarHash,
    address userAddress
  `,
  follows: `
    address follower,
    address following,
    bool isFollowing,
    uint64 timestamp
  `,
} as const;

// Compute schema IDs (cached)
let schemaIdCache: Record<string, string> = {};

export async function getSchemaId(schemaName: keyof typeof SCHEMAS): Promise<string> {
  if (schemaIdCache[schemaName]) {
    return schemaIdCache[schemaName];
  }

  const schemaId = await sdkReadOnly.streams.computeSchemaId(SCHEMAS[schemaName]);
  schemaIdCache[schemaName] = schemaId;
  return schemaId;
}
