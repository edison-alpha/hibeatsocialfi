/**
 * Register Somnia DataStream Schemas V3 - FIXED
 * 
 * Schema dengan targetId dan parentId sebagai STRING (bukan bytes32)
 * untuk compatibility dengan SDK
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// Define Somnia testnet
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-devnet.socialscan.io' },
  },
  testnet: true,
});

const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const WS_URL = process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';

// V4 SCHEMAS: All IDs as STRING (timestamp_address format)
const SCHEMAS = {
  posts_v4: 'uint256 timestamp, string content, uint8 contentType, string mediaHash, address author, string quotedPostId, uint32 nftTokenId, bool isDeleted, bool isPinned',
  interactions_v4: 'uint256 timestamp, uint8 interactionType, string targetId, uint8 targetType, address fromUser, string content, string parentId',
  profiles_v4: 'address userAddress, string username, string displayName, string bio, string avatarHash, uint32 followerCount, uint32 followingCount, bool isVerified, bool isArtist',
};

const SCHEMA_NAMES = {
  posts_v4: 'hibeats_posts_v4',
  interactions_v4: 'hibeats_interactions_v4',
  profiles_v4: 'hibeats_profiles_v4',
};

async function registerSchemas() {
  console.log('🚀 [V3-FIXED] Starting schema registration...\n');

  // Initialize clients
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(WS_URL),
  });

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });

  console.log('👤 Account:', account.address);

  // Initialize SDK
  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Register each schema
  for (const [name, schemaString] of Object.entries(SCHEMAS)) {
    try {
      console.log(`📋 Registering schema: ${name}`);
      console.log(`   Schema: ${schemaString}`);

      // Compute schema ID
      const schemaId = await sdk.streams.computeSchemaId(schemaString);
      console.log(`   Schema ID: ${schemaId}`);

      // Register schema
      const txHash = await sdk.streams.registerSchema(schemaString);
      console.log(`   ✅ Registered! TX: ${txHash}\n`);

    } catch (error: any) {
      if (error?.message?.includes('AlreadyRegistered')) {
        console.log(`   ⚠️  Schema already registered\n`);
      } else {
        console.error(`   ❌ Failed to register:`, error.message, '\n');
      }
    }
  }

  console.log('✅ Schema registration complete!');
  console.log('\n📝 IMPORTANT: Update your .env with these schema names:');
  console.log('   VITE_SOMNIA_SCHEMA_POSTS=hibeats_posts_v3');
  console.log('   VITE_SOMNIA_SCHEMA_INTERACTIONS=hibeats_interactions_v3_fixed');
  console.log('   VITE_SOMNIA_SCHEMA_PROFILES=hibeats_profiles_v3');
}

registerSchemas().catch(console.error);
