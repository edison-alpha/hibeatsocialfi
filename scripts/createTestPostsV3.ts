/**
 * Create Test Posts V3
 * 
 * Script untuk create test posts ke Somnia Datastream V3
 * Run: npx tsx scripts/createTestPostsV3.ts
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, defineChain, type Hex } from 'viem';
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
  console.error('❌ VITE_PRIVATE_KEY not found in environment variables');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);

// Test posts
const TEST_POSTS = [
  'Hello from Somnia DataStream V3! 🚀',
  'Testing ultra-fast blockchain writes ⚡',
  'This is a test post with some content 📝',
  'Web2 speed on Web3! Amazing! 🎉',
  'Building the future of social media 🌟',
];

async function main() {
  console.log('🚀 Creating test posts...\n');
  console.log('📝 Publisher:', account.address, '\n');

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

  // Create encoder
  const encoder = new SchemaEncoder(SCHEMA_STRING);

  // Create posts
  for (let i = 0; i < TEST_POSTS.length; i++) {
    const content = TEST_POSTS[i];
    const timestamp = Date.now() + i * 1000; // Stagger timestamps
    
    // Create post ID
    const postId = `0x${Math.abs(
      `post_${timestamp}_${account.address}`.split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0)
    ).toString(16).padStart(64, '0')}` as Hex;

    // Encode data
    const encodedData = encoder.encodeData([
      { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
      { name: 'content', value: content, type: 'string' },
      { name: 'contentType', value: '0', type: 'uint8' }, // TEXT
      { name: 'mediaHash', value: '', type: 'string' },
      { name: 'author', value: account.address, type: 'address' },
      { name: 'quotedPostId', value: '', type: 'string' },
      { name: 'nftTokenId', value: '0', type: 'uint32' },
      { name: 'isDeleted', value: false, type: 'bool' },
      { name: 'isPinned', value: false, type: 'bool' },
    ]);

    console.log(`📝 Creating post ${i + 1}/${TEST_POSTS.length}...`);
    console.log(`   Content: ${content}`);
    console.log(`   Post ID: ${postId}`);

    try {
      const txHash = await sdk.streams.set([{
        schemaId,
        id: postId,
        data: encodedData,
      }]);

      console.log(`   ✅ Created! TX: ${txHash}\n`);
    } catch (error) {
      console.error(`   ❌ Failed:`, error);
    }

    // Wait a bit between posts
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Check total count
  const count = await sdk.streams.getPublisherDataCount(schemaId, account.address);
  console.log(`\n📊 Total posts in blockchain: ${count}`);
  console.log('\n🎉 Test posts created successfully!');
  console.log('\n🚀 You can now view them at:');
  console.log('   http://localhost:5173/test/datastream-social-v3');
}

main().catch(console.error);
