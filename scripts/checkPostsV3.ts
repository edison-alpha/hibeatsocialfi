/**
 * Check Posts V3
 * 
 * Script untuk check posts di Somnia Datastream V3
 * Run: npx tsx scripts/checkPostsV3.ts
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Somnia testnet chain
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] }
  }
});

const SCHEMA_STRING = 'uint256 timestamp, string content, uint8 contentType, string mediaHash, address author, string quotedPostId, uint32 nftTokenId, bool isDeleted, bool isPinned';

// Load environment variables
const privateKey = process.env.VITE_PRIVATE_KEY;
if (!privateKey) {
  console.error('❌ VITE_PRIVATE_KEY not found');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);

async function main() {
  console.log('🔍 Checking posts in blockchain...\n');
  console.log('📝 Publisher:', account.address);

  // Initialize clients
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http('https://dream-rpc.somnia.network'),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http('https://dream-rpc.somnia.network'),
  });

  // Initialize SDK
  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Get schema ID
  const schemaId = await sdk.streams.computeSchemaId(SCHEMA_STRING);
  console.log('📦 Schema ID:', schemaId, '\n');

  // Get all posts
  try {
    console.log('📚 Loading all posts...');
    const rawData = await sdk.streams.getAllPublisherDataForSchema(schemaId, account.address);
    
    console.log(`\n✅ Found ${rawData.length} posts\n`);

    if (rawData.length > 0) {
      rawData.forEach((item: any, idx: number) => {
        // Data is already decoded by SDK - access nested value
        console.log(`Post ${idx + 1}:`);
        console.log(`  Timestamp: ${item[0]?.value?.value || item[0]?.value || item[0]}`);
        console.log(`  Content: ${item[1]?.value?.value || item[1]?.value || item[1]}`);
        console.log(`  Author: ${item[4]?.value?.value || item[4]?.value || item[4]}`);
        console.log('');
      });
    }

    // Try getBetweenRange
    console.log('\n📚 Testing getBetweenRange (0-5)...');
    try {
      const rangeData = await sdk.streams.getBetweenRange(schemaId, account.address, BigInt(0), BigInt(5));
      console.log(`✅ getBetweenRange returned ${rangeData.length} posts`);
    } catch (error: any) {
      console.log(`❌ getBetweenRange failed:`, error.message);
    }

  } catch (error) {
    console.error('❌ Failed to load posts:', error);
  }
}

main().catch(console.error);
