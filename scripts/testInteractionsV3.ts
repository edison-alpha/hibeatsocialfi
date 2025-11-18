/**
 * Test Interactions V3 - Like/Unlike, Comment, Repost
 * 
 * Script untuk test fitur interactions:
 * - Like/Unlike dengan counting yang benar
 * - Comment dengan counting
 * - Repost/Unrepost dengan counting
 * - Quote counting dari posts
 */

import { readFileSync } from 'fs';
import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import {
  InteractionType,
  TargetType,
  createInteractionId,
  aggregateInteractions,
  countQuotes,
} from '../src/config/somniaDataStreams.v3';
import { privateKeyToAccount } from 'viem/accounts';

// Load environment variables from .env file
const envFile = readFileSync('.env', 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const privateKey = envVars.VITE_PRIVATE_KEY;

if (!privateKey) {
  console.error('❌ VITE_PRIVATE_KEY not found in environment');
  process.exit(1);
}

const account = privateKeyToAccount(privateKey as `0x${string}`);
const userAddress = account.address;

async function testInteractions() {
  console.log('🧪 Testing Interactions V3...\n');
  console.log('👤 User:', userAddress);
  console.log('');

  try {
    // Connect to SDK
    console.log('🔌 Connecting to SDK...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ SDK connected\n');

    // Load posts
    console.log('📚 Loading posts...');
    const posts = await somniaDatastreamServiceV3.getPostsPaginated(0, 10);
    console.log(`✅ Loaded ${posts.length} posts\n`);

    if (posts.length === 0) {
      console.log('❌ No posts found. Please create some posts first.');
      return;
    }

    // Get first post for testing
    const testPost = posts[0];
    console.log('🎯 Test post:', testPost.id);
    console.log('   Author:', testPost.author);
    console.log('   Content:', testPost.content.substring(0, 50) + '...');
    console.log('');

    // Load all interactions
    console.log('📊 Loading interactions...');
    const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
    console.log(`✅ Loaded ${allInteractions.length} interactions\n`);

    // Aggregate stats
    console.log('🔢 Aggregating stats...');
    const statsMap = aggregateInteractions(allInteractions, userAddress);
    const stats = statsMap.get(testPost.id);
    
    console.log('📈 Current stats for test post:');
    console.log('   Likes:', stats?.likes || 0);
    console.log('   Comments:', stats?.comments || 0);
    console.log('   Reposts:', stats?.reposts || 0);
    console.log('   User liked:', stats?.userLiked || false);
    console.log('   User reposted:', stats?.userReposted || false);
    console.log('');

    // Count quotes
    console.log('💬 Counting quotes...');
    const quoteCounts = countQuotes(posts);
    const quoteCount = quoteCounts.get(testPost.id) || 0;
    console.log(`   Quotes for test post: ${quoteCount}\n`);

    // Test 1: Like/Unlike
    console.log('🧪 TEST 1: Like/Unlike');
    console.log('─────────────────────');
    
    const isLiked = stats?.userLiked || false;
    const likeType = isLiked ? InteractionType.UNLIKE : InteractionType.LIKE;
    
    console.log(`   Current status: ${isLiked ? 'LIKED' : 'NOT LIKED'}`);
    console.log(`   Action: ${isLiked ? 'UNLIKE' : 'LIKE'}`);
    
    await somniaDatastreamServiceV3.createInteraction({
      id: createInteractionId(likeType, userAddress),
      interactionType: likeType,
      targetId: testPost.id,
      targetType: TargetType.POST,
      fromUser: userAddress,
      content: '',
      parentId: '',
      timestamp: Date.now(),
    }, true);
    
    console.log(`   ✅ ${isLiked ? 'Unliked' : 'Liked'} successfully!`);
    console.log('');

    // Wait for blockchain confirmation
    console.log('⏳ Waiting for blockchain confirmation (3s)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Reload and verify
    console.log('🔄 Reloading interactions...');
    const newInteractions = await somniaDatastreamServiceV3.getAllInteractions();
    const newStatsMap = aggregateInteractions(newInteractions, userAddress);
    const newStats = newStatsMap.get(testPost.id);
    
    console.log('📈 Updated stats:');
    console.log('   Likes:', newStats?.likes || 0);
    console.log('   User liked:', newStats?.userLiked || false);
    console.log('');

    // Verify
    const expectedLiked = !isLiked;
    const expectedLikes = (stats?.likes || 0) + (isLiked ? -1 : 1);
    
    if (newStats?.userLiked === expectedLiked) {
      console.log('   ✅ Like status correct!');
    } else {
      console.log('   ❌ Like status incorrect!');
      console.log('      Expected:', expectedLiked);
      console.log('      Got:', newStats?.userLiked);
    }
    
    if (newStats?.likes === expectedLikes) {
      console.log('   ✅ Like count correct!');
    } else {
      console.log('   ⚠️  Like count may be affected by other users');
      console.log('      Expected:', expectedLikes);
      console.log('      Got:', newStats?.likes);
    }
    console.log('');

    // Test 2: Comment
    console.log('🧪 TEST 2: Comment');
    console.log('─────────────────────');
    
    const commentContent = `Test comment at ${new Date().toISOString()}`;
    console.log('   Content:', commentContent);
    
    await somniaDatastreamServiceV3.createInteraction({
      id: createInteractionId(InteractionType.COMMENT, userAddress),
      interactionType: InteractionType.COMMENT,
      targetId: testPost.id,
      targetType: TargetType.POST,
      fromUser: userAddress,
      content: commentContent,
      parentId: '',
      timestamp: Date.now(),
    }, true);
    
    console.log('   ✅ Comment created successfully!');
    console.log('');

    // Test 3: Repost/Unrepost
    console.log('🧪 TEST 3: Repost/Unrepost');
    console.log('─────────────────────');
    
    const isReposted = newStats?.userReposted || false;
    const repostType = isReposted ? InteractionType.UNREPOST : InteractionType.REPOST;
    
    console.log(`   Current status: ${isReposted ? 'REPOSTED' : 'NOT REPOSTED'}`);
    console.log(`   Action: ${isReposted ? 'UNREPOST' : 'REPOST'}`);
    
    await somniaDatastreamServiceV3.createInteraction({
      id: createInteractionId(repostType, userAddress),
      interactionType: repostType,
      targetId: testPost.id,
      targetType: TargetType.POST,
      fromUser: userAddress,
      content: '',
      parentId: '',
      timestamp: Date.now(),
    }, true);
    
    console.log(`   ✅ ${isReposted ? 'Unreposted' : 'Reposted'} successfully!`);
    console.log('');

    // Final stats
    console.log('⏳ Waiting for final blockchain confirmation (3s)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('🔄 Loading final stats...');
    const finalInteractions = await somniaDatastreamServiceV3.getAllInteractions();
    const finalStatsMap = aggregateInteractions(finalInteractions, userAddress);
    const finalStats = finalStatsMap.get(testPost.id);
    
    console.log('');
    console.log('📊 FINAL STATS');
    console.log('═════════════════════');
    console.log('   Likes:', finalStats?.likes || 0);
    console.log('   Comments:', finalStats?.comments || 0);
    console.log('   Reposts:', finalStats?.reposts || 0);
    console.log('   Quotes:', quoteCount);
    console.log('   User liked:', finalStats?.userLiked || false);
    console.log('   User reposted:', finalStats?.userReposted || false);
    console.log('');

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testInteractions();
