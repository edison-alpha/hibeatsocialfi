/**
 * Test 100 Users Interaction - Like, Comment, Repost
 * 
 * Script untuk test interaksi dari 100 user berbeda pada satu postingan
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import {
  InteractionType,
  TargetType,
  createInteractionId,
  aggregateInteractions,
} from '../src/config/somniaDataStreams.v3';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, defineChain } from 'viem';
import { ethers } from 'ethers';

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
    },
    public: {
      http: [process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'],
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

async function testLikes(users: TestUser[], postId: string) {
  console.log('\n🔥 Testing LIKES from 100 users...\n');
  
  const promises = users.map(async (user, index) => {
    try {
      // Create wallet client for this user
      const account = privateKeyToAccount(user.wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http(process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
      });
      
      // Set wallet client
      somniaDatastreamServiceV3.setWalletClient(walletClient);
      
      // Create like interaction
      await somniaDatastreamServiceV3.createInteraction({
        id: createInteractionId(InteractionType.LIKE, user.address),
        interactionType: InteractionType.LIKE,
        targetId: postId,
        targetType: TargetType.POST,
        fromUser: user.address,
        content: '',
        parentId: '',
        timestamp: Date.now(),
      }, true);
      
      console.log(`✅ User ${index + 1} (${user.username}) liked post`);
      return { success: true, user: user.username, action: 'like' };
    } catch (error: any) {
      console.error(`❌ User ${index + 1} (${user.username}) failed to like:`, error.message);
      return { success: false, user: user.username, action: 'like', error: error.message };
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
      const account = privateKeyToAccount(user.wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http(process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
      });
      
      // Set wallet client
      somniaDatastreamServiceV3.setWalletClient(walletClient);
      
      const commentText = `Great post! This is comment #${index + 1} from ${user.username} 🎵`;
      
      // Create comment interaction
      await somniaDatastreamServiceV3.createInteraction({
        id: createInteractionId(InteractionType.COMMENT, user.address),
        interactionType: InteractionType.COMMENT,
        targetId: postId,
        targetType: TargetType.POST,
        fromUser: user.address,
        content: commentText,
        parentId: '',
        timestamp: Date.now(),
      }, true);
      
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
      const account = privateKeyToAccount(user.wallet.privateKey as `0x${string}`);
      const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http(process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'),
      });
      
      // Set wallet client
      somniaDatastreamServiceV3.setWalletClient(walletClient);
      
      // Create repost interaction
      await somniaDatastreamServiceV3.createInteraction({
        id: createInteractionId(InteractionType.REPOST, user.address),
        interactionType: InteractionType.REPOST,
        targetId: postId,
        targetType: TargetType.POST,
        fromUser: user.address,
        content: '',
        parentId: '',
        timestamp: Date.now(),
      }, true);
      
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
    // Load all interactions
    const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
    
    // Aggregate stats for this post
    const statsMap = aggregateInteractions(allInteractions, '0x0000000000000000000000000000000000000000');
    const stats = statsMap.get(postId);
    
    console.log('Post Statistics:');
    console.log(`- Post ID: ${postId}`);
    console.log(`- Likes: ${stats?.likes || 0}`);
    console.log(`- Comments: ${stats?.comments || 0}`);
    console.log(`- Reposts: ${stats?.reposts || 0}`);
    console.log(`- Total Interactions: ${(stats?.likes || 0) + (stats?.comments || 0) + (stats?.reposts || 0)}`);
    
    return stats;
  } catch (error: any) {
    console.error('❌ Failed to verify post stats:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting 100 Users Interaction Test (V3)\n');
  console.log(`Target Post: ${POST_ID}`);
  console.log(`Number of Users: ${NUM_USERS}\n`);
  console.log('=' .repeat(60));
  
  try {
    // Connect to SDK
    console.log('\n🔌 Connecting to SDK...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ SDK connected\n');
    
    // Generate test users
    console.log('👥 Generating test users...');
    const users = generateTestUsers(NUM_USERS);
    console.log(`✅ Generated ${users.length} test users\n`);
    
    const startTime = Date.now();
    
    // Test all interactions
    const likeResults = await testLikes(users, POST_ID);
    const commentResults = await testComments(users, POST_ID);
    const repostResults = await testReposts(users, POST_ID);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Wait for data to propagate
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
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
