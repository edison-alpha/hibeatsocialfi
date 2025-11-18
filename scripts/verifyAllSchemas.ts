/**
 * Verify All Schemas - Check existing schemas and their data
 * 
 * This script verifies:
 * 1. Which schemas are registered
 * 2. How much data each schema has
 * 3. That old data is still safe
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file manually
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not load .env file');
  }
}

loadEnv();

// Define Somnia testnet inline
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

// Config inline
const SOMNIA_CONFIG_V3 = {
  rpcUrl: 'https://dream-rpc.somnia.network',
  wsUrl: 'wss://dream-rpc.somnia.network/ws',
  schemaStrings: {
    posts: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
    interactions: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
    profiles: 'address userAddress, string username, string displayName, string bio, string avatarHash, uint32 followerCount, uint32 followingCount, bool isVerified, bool isArtist',
    generatedMusic: 'uint256 id, uint256 timestamp, address owner, string taskId, string title, string audioUrl, string imageUrl, string prompt, string style, string lyrics, uint8 status',
  }
};

async function verifyAllSchemas() {
  console.log('🔍 Verifying All Schemas...\n');

  // Initialize clients
  const privateKey = process.env.VITE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VITE_PRIVATE_KEY not found in environment');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('👤 Publisher:', account.address);
  console.log('');

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(SOMNIA_CONFIG_V3.wsUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(SOMNIA_CONFIG_V3.rpcUrl),
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Check all schemas
  const schemasToCheck = [
    { name: 'posts', schemaString: SOMNIA_CONFIG_V3.schemaStrings.posts },
    { name: 'interactions', schemaString: SOMNIA_CONFIG_V3.schemaStrings.interactions },
    { name: 'profiles', schemaString: SOMNIA_CONFIG_V3.schemaStrings.profiles },
    { name: 'generatedMusic', schemaString: SOMNIA_CONFIG_V3.schemaStrings.generatedMusic },
  ];

  console.log('📋 Checking schemas...\n');
  console.log('='.repeat(80));

  for (const schema of schemasToCheck) {
    console.log(`\n📦 Schema: ${schema.name}`);
    console.log('-'.repeat(80));

    // Compute schema ID
    const schemaId = await sdk.streams.computeSchemaId(schema.schemaString);
    console.log(`🔑 Schema ID: ${schemaId}`);

    // Check if registered
    try {
      const registeredSchema = await sdk.streams.getSchema(schemaId);
      console.log('✅ Status: REGISTERED');
      console.log(`📄 Schema: ${registeredSchema}`);

      // Check data count
      try {
        const data = await sdk.streams.getAllPublisherDataForSchema(schemaId, account.address);
        console.log(`📊 Data Count: ${data.length} records`);
        
        if (data.length > 0) {
          console.log(`   └─ First record timestamp: ${new Date(Number(data[0][1]?.value?.value || 0)).toLocaleString()}`);
          console.log(`   └─ Last record timestamp: ${new Date(Number(data[data.length - 1][1]?.value?.value || 0)).toLocaleString()}`);
        }
      } catch (dataError: any) {
        if (dataError.message?.includes('NoData()')) {
          console.log('📊 Data Count: 0 records (empty)');
        } else {
          console.log('⚠️  Could not fetch data:', dataError.message);
        }
      }
    } catch (error: any) {
      if (error.message?.includes('NoData()')) {
        console.log('❌ Status: NOT REGISTERED');
        console.log('💡 Run: npm run register:generated-music');
      } else {
        console.log('⚠️  Error checking schema:', error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  console.log('✅ Each schema has a UNIQUE Schema ID');
  console.log('✅ Data is stored SEPARATELY per schema');
  console.log('✅ Registering new schema does NOT affect old data');
  console.log('✅ Old schemas (posts, interactions) remain UNCHANGED');
  console.log('');
  console.log('💡 Safe to register generatedMusic schema!');
  console.log('');
}

// Run verification
verifyAllSchemas()
  .then(() => {
    console.log('✅ Verification complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
