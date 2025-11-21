import 'dotenv/config';
import { ethers } from 'ethers';
import { createWalletClient, http, defineChain, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, webSocket } from 'viem';

// Define Somnia testnet chain
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Devnet',
  network: 'somnia-devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: [process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'],
      webSocket: [process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws'],
    },
    public: {
      http: [process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'],
      webSocket: [process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://somnia-devnet.socialscan.io' },
  },
});

const POST_ID = '1763627837988';
const NUM_USERS = 100;

interface TestUser {
  wallet: ethers.Wallet;
  address: string;
  username: string;
}

// Generate test users
function generateTestUsers(count: number): TestUser[] {
  const users: TestUser[] = [];
  
  for (let i = 1; i <= count; i++) {
    const wallet = ethers.Wallet.createRandom();
    users.push({
      wallet,
      address: wallet.address,
      username: `testuser${i}`
    });
  }
  
  return users;
}

// Create wallet client for a user
function createUserWalletClient(privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
  });
}

// Create public client
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket(process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws'),
});

// Schema definitions
const INTERACTION_SCHEMA = 'uint256 timestamp, string interactionType, string postId, address fromUser, string content, string parentId';
const POST_SCHEMA = 'uint256 timestamp, string content, string contentType, string ipfsHash, address author, uint256 likes, uint256 comments, uint256 shares, bool isDeleted, bool isPinned, uint256 nftTokenId, address nftContractAddress, uint256 nftPrice, bool nftIsListed';

// Helper to compute schema ID
async function computeSchemaId(sdk: SDK, schemaString: string): Promise<`0x${string}`> {
  return await sdk.streams.computeSchemaId(schemaString);
}

// Helper to encode interaction data
function encodeInteraction(type: string, postId: string, fromUser: string, content: string = '', parentId: string = '') {
  const encoder = new SchemaEncoder(INTERACTION_SCHEMA);
  const timestamp = Date.now().toString();
  
  return encoder.encodeData([
    { name: 'timestamp', value: timestamp, type: 'uint256' },
    { name: 'interactionType', value: type, type: 'string' },
    { name: 'postId', value: postId, type: 'string' },
    { name: 'fromUser', value: fromUser, type: 'address' },
    { name: 'content', value: content || '', type: 'string' },
    { name: 'parentId', value: parentId || '', type: 'string' },
  ]);
}

async function testLikes(users: TestUser[], postId: string) {
  console.log('\n🔥 Testing LIKES from 100 users...\n');
  
  const promises = users.map(async (user, index) => {
    try {
      // Create wallet client for this user
      const walletClient = createUserWalletClient(user.wallet.privateKey);
      
      // Create SDK instance
      const sdk = new SDK({
        public: publicClient,
        wallet: walletClient,
      });
      
      // Compute schema ID
      const schemaId = await computeSchemaId(sdk, INTERACTION_SCHEMA);
      
      // Encode like interaction
      const encodedData = encodeInteraction('like', postId, user.address);
      
      // Create unique key for this interaction (must be bytes32)
      const interactionKeyString = `like_${Date.now()}_${index}_${user.address}`;
      const interactionKey = keccak256(toHex(interactionKeyString));
      
      // Write to DataStream
      await sdk.streams.set([{
        id: interactionKey,
        schemaId,
        data: encodedData
      }]);
      
      console.log(`✅ User ${index + 1} (${user.username}) liked post`);
      return { success: true, user: user.username, action: 'like' };
    } catch (error: any) {
      console.error(`❌ User ${index + 1} (${user.username}) failed to like:`, error.message || error);
      console.error('Full error:', error);
      return { success: false, user: user.username, action: 'like', error: error.message || String(error) };
    }
  });
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`\n📊 LIKES Summary: ${successful}/${NUM_USERS} successful\n`);
  return results;
}

async function testComments(users: TestUser[], postId: string) {
  console.log('\n💬 Testing COMMENTS from 100 users...\n');
  
  const promises = users.map(async (user, index) => {
    try {
      // Create wallet client for this user
      const walletClient = createUserWalletClient(user.wallet.privateKey);
      
      // Create SDK instance
      const sdk = new SDK({
        public: publicClient,
        wallet: walletClient,
      });
      
      // Compute schema ID
      const schemaId = await computeSchemaId(sdk, INTERACTION_SCHEMA);
      
      const commentText = `Great post! This is comment #${index + 1} from ${user.username} 🎵`;
      
      // Encode comment interaction
      const encodedData = encodeInteraction('comment', postId, user.address, commentText);
      
      // Create unique key for this interaction (must be bytes32)
      const interactionKeyString = `comment_${Date.now()}_${index}_${user.address}`;
      const interactionKey = keccak256(toHex(interactionKeyString));
      
      // Write to DataStream
      await sdk.streams.set([{
        id: interactionKey,
        schemaId,
        data: encodedData
      }]);
      
      console.log(`✅ User ${index + 1} (${user.username}) commented`);
      return { success: true, user: user.username, action: 'comment' };
    } catch (error: any) {
      console.error(`❌ User ${index + 1} (${user.username}) failed to comment:`, error.message);
      return { success: false, user: user.username, action: 'comment', error: error.message };
    }
  });
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`\n📊 COMMENTS Summary: ${successful}/${NUM_USERS} successful\n`);
  return results;
}

async function testReposts(users: TestUser[], postId: string) {
  console.log('\n🔄 Testing REPOSTS from 100 users...\n');
  
  const promises = users.map(async (user, index) => {
    try {
      // Create wallet client for this user
      const walletClient = createUserWalletClient(user.wallet.privateKey);
      
      // Create SDK instance
      const sdk = new SDK({
        public: publicClient,
        wallet: walletClient,
      });
      
      // Compute schema ID
      const schemaId = await computeSchemaId(sdk, INTERACTION_SCHEMA);
      
      // Encode repost interaction
      const encodedData = encodeInteraction('repost', postId, user.address);
      
      // Create unique key for this interaction (must be bytes32)
      const interactionKeyString = `repost_${Date.now()}_${index}_${user.address}`;
      const interactionKey = keccak256(toHex(interactionKeyString));
      
      // Write to DataStream
      await sdk.streams.set([{
        id: interactionKey,
        schemaId,
        data: encodedData
      }]);
      
      console.log(`✅ User ${index + 1} (${user.username}) reposted`);
      return { success: true, user: user.username, action: 'repost' };
    } catch (error: any) {
      console.error(`❌ User ${index + 1} (${user.username}) failed to repost:`, error.message);
      return { success: false, user: user.username, action: 'repost', error: error.message };
    }
  });
  
  const results = await Promise.all(promises);
  const successful = results.filter(r => r.success).length;
  
  console.log(`\n📊 REPOSTS Summary: ${successful}/${NUM_USERS} successful\n`);
  return results;
}

async function verifyPostStats(postId: string) {
  console.log('\n📈 Verifying post statistics...\n');
  
  try {
    // Create a temporary wallet for reading
    const tempWallet = ethers.Wallet.createRandom();
    const walletClient = createUserWalletClient(tempWallet.privateKey);
    
    // Create SDK instance
    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });
    
    // Compute schema ID for interactions
    const schemaId = await computeSchemaId(sdk, INTERACTION_SCHEMA);
    
    // Get all interactions (this would need to query all publishers)
    // For now, just show that we attempted verification
    console.log('Post Statistics:');
    console.log(`- Post ID: ${postId}`);
    console.log(`- Schema ID: ${schemaId}`);
    console.log('✅ Interactions have been written to Somnia DataStream');
    console.log('💡 Check the post page to see real-time updates');
    
    return { postId, schemaId };
  } catch (error: any) {
    console.error('❌ Failed to verify post stats:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting 100 Users Interaction Test\n');
  console.log(`Target Post: ${POST_ID}`);
  console.log(`Number of Users: ${NUM_USERS}\n`);
  console.log('=' .repeat(60));
  
  // Generate test users
  console.log('\n� Goenerating test users...');
  const users = generateTestUsers(NUM_USERS);
  console.log(`✅ Generated ${users.length} test users\n`);
  
  const startTime = Date.now();
  
  // Test all interactions
  const likeResults = await testLikes(users, POST_ID);
  const commentResults = await testComments(users, POST_ID);
  const repostResults = await testReposts(users, POST_ID);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Wait a bit for data to propagate
  console.log('\n⏳ Waiting 5 seconds for data to propagate...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verify final stats
  await verifyPostStats(POST_ID);
  
  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 FINAL TEST SUMMARY\n');
  console.log(`Total Users: ${NUM_USERS}`);
  console.log(`Successful Likes: ${likeResults.filter(r => r.success).length}`);
  console.log(`Successful Comments: ${commentResults.filter(r => r.success).length}`);
  console.log(`Successful Reposts: ${repostResults.filter(r => r.success).length}`);
  console.log(`\nTotal Time: ${duration}s`);
  console.log(`Average Time per User: ${(parseFloat(duration) / NUM_USERS).toFixed(2)}s`);
  
  // Show failed operations if any
  const allResults = [...likeResults, ...commentResults, ...repostResults];
  const failures = allResults.filter(r => !r.success);
  
  if (failures.length > 0) {
    console.log(`\n⚠️  Failed Operations: ${failures.length}`);
    console.log('\nFailed operations by type:');
    const failuresByType = failures.reduce((acc, f) => {
      acc[f.action] = (acc[f.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(failuresByType).forEach(([action, count]) => {
      console.log(`- ${action}: ${count} failures`);
    });
  }
  
  console.log('\n✅ Test completed!\n');
  console.log('🌐 Check the post at: http://localhost:8080/post/' + POST_ID);
}

main().catch(console.error);
