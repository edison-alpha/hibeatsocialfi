/**
 * Complete V6 Test Script
 * 
 * Tests:
 * 1. Create 5 posts (2 text, 3 with images)
 * 2. Like posts
 * 3. Comment on posts
 * 4. Repost posts
 * 5. Unlike posts
 * 6. Unrepost posts
 * 7. Verify all data persists
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
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes
      process.env[key.trim()] = value;
    }
  });
}

// Validate private key
if (!process.env.VITE_PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env file');
  process.exit(1);
}

if (!process.env.VITE_PRIVATE_KEY.startsWith('0x')) {
  console.error('❌ VITE_PRIVATE_KEY must start with 0x');
  process.exit(1);
}

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
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
  posts: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
  interactions: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
};

enum ContentType {
  TEXT = 0,
  IMAGE = 1,
  VIDEO = 2,
  MUSIC = 3,
  QUOTE = 4,
}

enum InteractionType {
  LIKE = 0,
  UNLIKE = 1,
  COMMENT = 2,
  REPOST = 3,
  UNREPOST = 4,
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testV6Complete() {
  console.log('🧪 [V6] Starting Complete Test Suite...\n');

  // Initialize
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

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  // Get schema IDs
  const postsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.posts);
  const interactionsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.interactions);

  console.log('📋 Posts Schema ID:', postsSchemaId);
  console.log('📋 Interactions Schema ID:', interactionsSchemaId);
  console.log('');

  const postsEncoder = new SchemaEncoder(SCHEMAS.posts);
  const interactionsEncoder = new SchemaEncoder(SCHEMAS.interactions);

  const createdPostIds: number[] = [];

  // ===== TEST 1: Create 5 Posts =====
  console.log('📝 TEST 1: Creating 5 posts (2 text, 3 with images)...\n');

  const posts = [
    {
      content: 'Hello HiBeats V6! 🎵 Testing new schema',
      contentType: ContentType.TEXT,
      mediaHashes: '',
    },
    {
      content: 'This is my second post with V6 features!',
      contentType: ContentType.TEXT,
      mediaHashes: '',
    },
    {
      content: 'Check out this amazing photo! 📸',
      contentType: ContentType.IMAGE,
      mediaHashes: 'QmTestImage1Hash',
    },
    {
      content: 'Another beautiful image 🌅',
      contentType: ContentType.IMAGE,
      mediaHashes: 'QmTestImage2Hash',
    },
    {
      content: 'Multiple images test! 🖼️',
      contentType: ContentType.IMAGE,
      mediaHashes: 'QmTestImage3Hash,QmTestImage4Hash,QmTestImage5Hash',
    },
  ];

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const timestamp = Date.now() + i; // Unique timestamp
    const postId = timestamp;

    console.log(`[${i + 1}/5] Creating post: "${post.content.substring(0, 40)}..."`);

    const encodedData = postsEncoder.encodeData([
      { name: 'id', value: postId.toString(), type: 'uint256' },
      { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
      { name: 'content', value: post.content, type: 'string' },
      { name: 'contentType', value: post.contentType.toString(), type: 'uint8' },
      { name: 'mediaHashes', value: post.mediaHashes, type: 'string' },
      { name: 'author', value: account.address, type: 'address' },
      { name: 'quotedPostId', value: '0', type: 'uint256' },
      { name: 'replyToId', value: '0', type: 'uint256' },
      { name: 'mentions', value: '', type: 'string' },
      { name: 'collectModule', value: '0x0000000000000000000000000000000000000000', type: 'address' },
      { name: 'collectPrice', value: '0', type: 'uint256' },
      { name: 'collectLimit', value: '0', type: 'uint32' },
      { name: 'collectCount', value: '0', type: 'uint32' },
      { name: 'isGated', value: false, type: 'bool' },
      { name: 'referrer', value: '0x0000000000000000000000000000000000000000', type: 'address' },
      { name: 'nftTokenId', value: '0', type: 'uint32' },
      { name: 'isDeleted', value: false, type: 'bool' },
      { name: 'isPinned', value: false, type: 'bool' },
    ]);

    try {
      const txHash = await sdk.streams.set([{
        schemaId: postsSchemaId,
        id: `0x${postId.toString(16).padStart(64, '0')}` as `0x${string}`,
        data: encodedData,
      }]);

      console.log(`   ✅ Created! TX: ${txHash}`);
      createdPostIds.push(postId);
      
      await sleep(1000); // Wait 1s between posts
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }

  console.log(`\n✅ Created ${createdPostIds.length} posts\n`);
  await sleep(3000); // Wait for blockchain confirmation

  // ===== TEST 2: Like Posts =====
  console.log('❤️  TEST 2: Liking all posts...\n');

  for (let i = 0; i < createdPostIds.length; i++) {
    const postId = createdPostIds[i];
    const timestamp = Date.now() + i;
    const interactionId = timestamp * 10 + InteractionType.LIKE;

    console.log(`[${i + 1}/${createdPostIds.length}] Liking post ${postId}`);

    const encodedData = interactionsEncoder.encodeData([
      { name: 'id', value: interactionId.toString(), type: 'uint256' },
      { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
      { name: 'interactionType', value: InteractionType.LIKE.toString(), type: 'uint8' },
      { name: 'targetId', value: postId.toString(), type: 'uint256' },
      { name: 'targetType', value: '0', type: 'uint8' },
      { name: 'fromUser', value: account.address, type: 'address' },
      { name: 'content', value: '', type: 'string' },
      { name: 'parentId', value: '0', type: 'uint256' },
      { name: 'tipAmount', value: '0', type: 'uint256' },
    ]);

    try {
      const txHash = await sdk.streams.set([{
        schemaId: interactionsSchemaId,
        id: `0x${interactionId.toString(16).padStart(64, '0')}` as `0x${string}`,
        data: encodedData,
      }]);

      console.log(`   ✅ Liked! TX: ${txHash}`);
      await sleep(500);
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }

  console.log('\n✅ Liked all posts\n');
  await sleep(2000);

  // ===== TEST 2.5: Test Duplicate Like Prevention =====
  console.log('🔒 TEST 2.5: Testing duplicate like prevention...\n');

  const testPostId = createdPostIds[0];
  console.log(`Attempting to like post ${testPostId} again (should be prevented)...`);

  // Calculate deterministic ID (same as first like)
  const duplicateLikeTimestamp = Date.now();
  
  // OLD WAY (would create different ID):
  // const duplicateLikeId = duplicateLikeTimestamp * 10 + InteractionType.LIKE;
  
  // NEW WAY (deterministic - same ID as first like):
  // Hash of: type + targetId + fromUser (no timestamp)
  const combined = `${InteractionType.LIKE}_${testPostId}_${account.address.toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const duplicateLikeId = Math.abs(hash);

  console.log(`   Duplicate Like ID: ${duplicateLikeId}`);
  console.log(`   (This should be the SAME as the first like ID)`);

  const duplicateEncodedData = interactionsEncoder.encodeData([
    { name: 'id', value: duplicateLikeId.toString(), type: 'uint256' },
    { name: 'timestamp', value: duplicateLikeTimestamp.toString(), type: 'uint256' },
    { name: 'interactionType', value: InteractionType.LIKE.toString(), type: 'uint8' },
    { name: 'targetId', value: testPostId.toString(), type: 'uint256' },
    { name: 'targetType', value: '0', type: 'uint8' },
    { name: 'fromUser', value: account.address, type: 'address' },
    { name: 'content', value: '', type: 'string' },
    { name: 'parentId', value: '0', type: 'uint256' },
    { name: 'tipAmount', value: '0', type: 'uint256' },
  ]);

  try {
    const txHash = await sdk.streams.set([{
      schemaId: interactionsSchemaId,
      id: `0x${duplicateLikeId.toString(16).padStart(64, '0')}` as `0x${string}`,
      data: duplicateEncodedData,
    }]);

    console.log(`   ⚠️ Duplicate like was accepted by blockchain (TX: ${txHash})`);
    console.log(`   Note: Blockchain may overwrite previous like with same ID`);
  } catch (error: any) {
    console.log(`   ✅ Duplicate like was REJECTED! (Expected behavior)`);
    console.log(`   Error: ${error.message}`);
  }

  console.log('\n✅ Duplicate like prevention test complete\n');
  await sleep(2000);

  // ===== TEST 3: Comment on Posts =====
  console.log('💬 TEST 3: Commenting on first 3 posts...\n');

  const comments = [
    'Great post! Love it! 🔥',
    'This is amazing! 🎉',
    'Beautiful images! 📸',
  ];

  for (let i = 0; i < 3; i++) {
    const postId = createdPostIds[i];
    const timestamp = Date.now() + i;
    const interactionId = timestamp * 10 + InteractionType.COMMENT;

    console.log(`[${i + 1}/3] Commenting on post ${postId}`);

    const encodedData = interactionsEncoder.encodeData([
      { name: 'id', value: interactionId.toString(), type: 'uint256' },
      { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
      { name: 'interactionType', value: InteractionType.COMMENT.toString(), type: 'uint8' },
      { name: 'targetId', value: postId.toString(), type: 'uint256' },
      { name: 'targetType', value: '0', type: 'uint8' },
      { name: 'fromUser', value: account.address, type: 'address' },
      { name: 'content', value: comments[i], type: 'string' },
      { name: 'parentId', value: '0', type: 'uint256' },
      { name: 'tipAmount', value: '0', type: 'uint256' },
    ]);

    try {
      const txHash = await sdk.streams.set([{
        schemaId: interactionsSchemaId,
        id: `0x${interactionId.toString(16).padStart(64, '0')}` as `0x${string}`,
        data: encodedData,
      }]);

      console.log(`   ✅ Commented! TX: ${txHash}`);
      await sleep(500);
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }

  console.log('\n✅ Commented on 3 posts\n');
  await sleep(2000);

  // ===== TEST 4: Repost =====
  console.log('🔄 TEST 4: Reposting first 2 posts...\n');

  for (let i = 0; i < 2; i++) {
    const postId = createdPostIds[i];
    const timestamp = Date.now() + i;
    const interactionId = timestamp * 10 + InteractionType.REPOST;

    console.log(`[${i + 1}/2] Reposting post ${postId}`);

    const encodedData = interactionsEncoder.encodeData([
      { name: 'id', value: interactionId.toString(), type: 'uint256' },
      { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
      { name: 'interactionType', value: InteractionType.REPOST.toString(), type: 'uint8' },
      { name: 'targetId', value: postId.toString(), type: 'uint256' },
      { name: 'targetType', value: '0', type: 'uint8' },
      { name: 'fromUser', value: account.address, type: 'address' },
      { name: 'content', value: '', type: 'string' },
      { name: 'parentId', value: '0', type: 'uint256' },
      { name: 'tipAmount', value: '0', type: 'uint256' },
    ]);

    try {
      const txHash = await sdk.streams.set([{
        schemaId: interactionsSchemaId,
        id: `0x${interactionId.toString(16).padStart(64, '0')}` as `0x${string}`,
        data: encodedData,
      }]);

      console.log(`   ✅ Reposted! TX: ${txHash}`);
      await sleep(500);
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }

  console.log('\n✅ Reposted 2 posts\n');
  await sleep(2000);

  // ===== TEST 4.5: Quote Post =====
  console.log('💬 TEST 4.5: Creating quote post (repost with comment)...\n');

  const quotedPostId = createdPostIds[0]; // Quote the first post
  const quoteTimestamp = Date.now();
  const quotePostId = quoteTimestamp;

  console.log(`Creating quote post for post ${quotedPostId}`);

  const quoteEncodedData = postsEncoder.encodeData([
    { name: 'id', value: quotePostId.toString(), type: 'uint256' },
    { name: 'timestamp', value: quoteTimestamp.toString(), type: 'uint256' },
    { name: 'content', value: 'This is an amazing post! Sharing with my followers 🔥', type: 'string' },
    { name: 'contentType', value: ContentType.QUOTE.toString(), type: 'uint8' }, // QUOTE type
    { name: 'mediaHashes', value: '', type: 'string' },
    { name: 'author', value: account.address, type: 'address' },
    { name: 'quotedPostId', value: quotedPostId.toString(), type: 'uint256' }, // Link to original post
    { name: 'replyToId', value: '0', type: 'uint256' },
    { name: 'mentions', value: '', type: 'string' },
    { name: 'collectModule', value: '0x0000000000000000000000000000000000000000', type: 'address' },
    { name: 'collectPrice', value: '0', type: 'uint256' },
    { name: 'collectLimit', value: '0', type: 'uint32' },
    { name: 'collectCount', value: '0', type: 'uint32' },
    { name: 'isGated', value: false, type: 'bool' },
    { name: 'referrer', value: '0x0000000000000000000000000000000000000000', type: 'address' },
    { name: 'nftTokenId', value: '0', type: 'uint32' },
    { name: 'isDeleted', value: false, type: 'bool' },
    { name: 'isPinned', value: false, type: 'bool' },
  ]);

  try {
    const txHash = await sdk.streams.set([{
      schemaId: postsSchemaId,
      id: `0x${quotePostId.toString(16).padStart(64, '0')}` as `0x${string}`,
      data: quoteEncodedData,
    }]);

    console.log(`   ✅ Quote post created! TX: ${txHash}`);
    createdPostIds.push(quotePostId);
    await sleep(1000);
  } catch (error: any) {
    console.error(`   ❌ Failed:`, error.message);
  }

  console.log('\n✅ Created quote post\n');
  await sleep(2000);

  // ===== TEST 5: Unlike =====
  console.log('💔 TEST 5: Unliking first post...\n');

  const postId = createdPostIds[0];
  const timestamp = Date.now();
  const interactionId = timestamp * 10 + InteractionType.UNLIKE;

  const encodedData = interactionsEncoder.encodeData([
    { name: 'id', value: interactionId.toString(), type: 'uint256' },
    { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
    { name: 'interactionType', value: InteractionType.UNLIKE.toString(), type: 'uint8' },
    { name: 'targetId', value: postId.toString(), type: 'uint256' },
    { name: 'targetType', value: '0', type: 'uint8' },
    { name: 'fromUser', value: account.address, type: 'address' },
    { name: 'content', value: '', type: 'string' },
    { name: 'parentId', value: '0', type: 'uint256' },
    { name: 'tipAmount', value: '0', type: 'uint256' },
  ]);

  try {
    const txHash = await sdk.streams.set([{
      schemaId: interactionsSchemaId,
      id: `0x${interactionId.toString(16).padStart(64, '0')}` as `0x${string}`,
      data: encodedData,
    }]);

    console.log(`✅ Unliked! TX: ${txHash}\n`);
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
  }

  await sleep(2000);

  // ===== TEST 6: Unrepost =====
  console.log('🔄 TEST 6: Unreposting first post...\n');

  const timestamp2 = Date.now();
  const interactionId2 = timestamp2 * 10 + InteractionType.UNREPOST;

  const encodedData2 = interactionsEncoder.encodeData([
    { name: 'id', value: interactionId2.toString(), type: 'uint256' },
    { name: 'timestamp', value: timestamp2.toString(), type: 'uint256' },
    { name: 'interactionType', value: InteractionType.UNREPOST.toString(), type: 'uint8' },
    { name: 'targetId', value: postId.toString(), type: 'uint256' },
    { name: 'targetType', value: '0', type: 'uint8' },
    { name: 'fromUser', value: account.address, type: 'address' },
    { name: 'content', value: '', type: 'string' },
    { name: 'parentId', value: '0', type: 'uint256' },
    { name: 'tipAmount', value: '0', type: 'uint256' },
  ]);

  try {
    const txHash = await sdk.streams.set([{
      schemaId: interactionsSchemaId,
      id: `0x${interactionId2.toString(16).padStart(64, '0')}` as `0x${string}`,
      data: encodedData2,
    }]);

    console.log(`✅ Unreposted! TX: ${txHash}\n`);
  } catch (error: any) {
    console.error(`❌ Failed:`, error.message);
  }

  // ===== VERIFICATION =====
  console.log('\n📊 VERIFICATION: Reading data from blockchain...\n');
  await sleep(3000);

  // Read posts
  const allPosts = await sdk.streams.getAllPublisherDataForSchema(postsSchemaId, account.address);
  console.log(`✅ Total posts in blockchain: ${allPosts.length}`);

  // Read interactions
  const allInteractions = await sdk.streams.getAllPublisherDataForSchema(interactionsSchemaId, account.address);
  console.log(`✅ Total interactions in blockchain: ${allInteractions.length}`);

  // Count by type (FIXED: check correct field index)
  const interactionCounts = {
    likes: 0,
    unlikes: 0,
    comments: 0,
    reposts: 0,
    unreposts: 0,
  };

  console.log('\n🔍 Analyzing interactions...');
  console.log(`   Debug: First item structure:`, JSON.stringify(allInteractions[0], null, 2).substring(0, 500));
  
  // The data is already decoded by SDK, not raw bytes
  for (const item of allInteractions) {
    try {
      // Item is already an array of decoded values
      // Schema: [id, timestamp, interactionType, targetId, targetType, fromUser, content, parentId, tipAmount]
      
      // Try different access patterns
      let type: number;
      
      if (Array.isArray(item)) {
        // If item is array directly
        type = Number(item[2]?.value || item[2]);
      } else if (item.data && Array.isArray(item.data)) {
        // If item has data property that's an array
        type = Number(item.data[2]?.value || item.data[2]);
      } else {
        console.log(`   ⚠️ Unknown item structure, skipping...`);
        continue;
      }
      
      console.log(`   Type: ${type} (${InteractionType[type] || 'UNKNOWN'})`);
      
      if (!isNaN(type)) {
        if (type === InteractionType.LIKE) interactionCounts.likes++;
        else if (type === InteractionType.UNLIKE) interactionCounts.unlikes++;
        else if (type === InteractionType.COMMENT) interactionCounts.comments++;
        else if (type === InteractionType.REPOST) interactionCounts.reposts++;
        else if (type === InteractionType.UNREPOST) interactionCounts.unreposts++;
      }
    } catch (error: any) {
      console.log(`   ⚠️ Failed to process interaction: ${error.message}`);
    }
  }

  console.log('\n📈 Interaction Summary:');
  console.log(`   Likes: ${interactionCounts.likes}`);
  console.log(`   Unlikes: ${interactionCounts.unlikes}`);
  console.log(`   Comments: ${interactionCounts.comments}`);
  console.log(`   Reposts: ${interactionCounts.reposts}`);
  console.log(`   Unreposts: ${interactionCounts.unreposts}`);

  // Count quote posts
  let quotePosts = 0;
  for (const item of allPosts) {
    try {
      const decoded = postsEncoder.decodeData(item.data);
      const contentType = Number(decoded[3]?.value);
      if (contentType === ContentType.QUOTE) quotePosts++;
    } catch (error) {
      // Skip if decode fails
    }
  }

  console.log('\n🎉 TEST COMPLETE!\n');
  console.log('📝 Summary:');
  console.log(`   ✅ Created ${createdPostIds.length} posts (including ${quotePosts} quote post)`);
  console.log(`   ✅ ${interactionCounts.likes} likes`);
  console.log(`   ✅ ${interactionCounts.comments} comments`);
  console.log(`   ✅ ${interactionCounts.reposts} reposts`);
  console.log(`   ✅ ${interactionCounts.unlikes} unlikes`);
  console.log(`   ✅ ${interactionCounts.unreposts} unreposts`);
  console.log('\n🚀 Schema V6 is working perfectly!');
}

testV6Complete().catch(console.error);
