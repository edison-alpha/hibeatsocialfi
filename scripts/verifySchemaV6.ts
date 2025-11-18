/**
 * Verify Schema V6 Registration
 * 
 * Check if all V6 schemas are properly registered on blockchain
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env
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

const SCHEMAS = {
  posts_v6: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
  interactions_v6: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
  profiles_v6: 'address userAddress, string username, string displayName, string bio, string avatarHash, uint32 followerCount, uint32 followingCount, bool isVerified, bool isArtist',
};

async function verifySchemas() {
  console.log('🔍 [V6] Verifying schema registration...\n');

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

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('👤 Account:', account.address);
  console.log('');

  let allRegistered = true;

  for (const [key, schemaString] of Object.entries(SCHEMAS)) {
    try {
      console.log(`📋 Checking: ${key}`);
      
      // Compute schema ID
      const schemaId = await sdk.streams.computeSchemaId(schemaString);
      console.log(`   Schema ID: ${schemaId}`);
      
      // Check if registered
      const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
      
      if (isRegistered) {
        console.log(`   ✅ Status: REGISTERED`);
        
        // Try to get schema info
        try {
          const schemaInfo = await sdk.streams.getSchemaFromSchemaId(schemaId);
          console.log(`   📊 Schema Info:`, schemaInfo);
        } catch (e) {
          console.log(`   ℹ️  Schema info not available (this is normal)`);
        }
      } else {
        console.log(`   ❌ Status: NOT REGISTERED`);
        allRegistered = false;
      }
      
      console.log('');
      
    } catch (error: any) {
      console.error(`   ❌ Error checking schema:`, error.message);
      console.log('');
      allRegistered = false;
    }
  }

  if (allRegistered) {
    console.log('✅ All schemas are registered and ready to use!');
    console.log('');
    console.log('🚀 Next steps:');
    console.log('   1. Update config to use V6 schemas ✅ (already done)');
    console.log('   2. Update service encoding/decoding');
    console.log('   3. Test creating posts');
    console.log('   4. Test interactions');
  } else {
    console.log('⚠️  Some schemas are not registered!');
    console.log('   Run: npx tsx scripts/registerSchemaV6.ts');
  }
}

verifySchemas().catch(console.error);
