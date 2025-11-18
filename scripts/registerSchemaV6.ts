/**
 * Register Somnia DataStream Schemas V6 - PRODUCTION READY
 * 
 * Full SocialFi features:
 * - Multiple media support
 * - Threading (replies)
 * - Mentions
 * - Monetization (collect, tips, gated)
 * - Smart contract integration
 * - Uint256 IDs for optimal gas
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

// V6 SCHEMAS - PRODUCTION READY
const SCHEMAS = {
  posts_v6: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
  
  interactions_v6: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
  
  profiles_v6: 'address userAddress, string username, string displayName, string bio, string avatarHash, uint32 followerCount, uint32 followingCount, bool isVerified, bool isArtist',
};

const SCHEMA_NAMES = {
  posts_v6: 'hibeats_posts_v6',
  interactions_v6: 'hibeats_interactions_v6',
  profiles_v6: 'hibeats_profiles_v6',
};

async function registerSchemas() {
  console.log('🚀 [V6] Starting schema registration...\n');
  console.log('📋 Schema V6 Features:');
  console.log('  ✅ Multiple media support');
  console.log('  ✅ Threading (replies)');
  console.log('  ✅ Mentions');
  console.log('  ✅ Monetization (collect, tips, gated)');
  console.log('  ✅ Smart contract integration');
  console.log('  ✅ Uint256 IDs (optimal gas)\n');

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

  // Import zeroBytes32 for parent schema
  const { zeroBytes32 } = await import('@somnia-chain/streams');

  // Register each schema
  for (const [key, schemaString] of Object.entries(SCHEMAS)) {
    try {
      const schemaName = SCHEMA_NAMES[key as keyof typeof SCHEMA_NAMES];
      
      console.log(`📋 Registering schema: ${schemaName}`);
      console.log(`   Type: ${key}`);
      console.log(`   Schema: ${schemaString.substring(0, 100)}...`);

      // Compute schema ID
      const schemaId = await sdk.streams.computeSchemaId(schemaString);
      console.log(`   Schema ID: ${schemaId}`);

      // Check if already registered
      const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
      if (isRegistered) {
        console.log(`   ⚠️  Schema already registered\n`);
        continue;
      }

      // Register schema (correct method)
      const txHash = await sdk.streams.registerDataSchemas([{
        id: schemaName,
        schema: schemaString,
        parentSchemaId: zeroBytes32 // root schema
      }], true); // ignore if already registered
      
      console.log(`   ✅ Registered! TX: ${txHash}\n`);

    } catch (error: any) {
      console.error(`   ❌ Failed to register:`, error.message, '\n');
    }
  }

  console.log('✅ Schema registration complete!\n');
  console.log('📝 Update your config file:');
  console.log('');
  console.log('// src/config/somniaDataStreams.v3.ts');
  console.log('schemas: {');
  console.log(`  posts: '${SCHEMA_NAMES.posts_v6}',`);
  console.log(`  interactions: '${SCHEMA_NAMES.interactions_v6}',`);
  console.log(`  profiles: '${SCHEMA_NAMES.profiles_v6}',`);
  console.log('}');
  console.log('');
  console.log('🎉 Ready to use Schema V6!');
}

registerSchemas().catch(console.error);
