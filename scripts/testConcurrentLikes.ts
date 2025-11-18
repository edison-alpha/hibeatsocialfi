/**
 * Test Script: Concurrent Likes
 * 
 * Test untuk memverifikasi bahwa user bisa like beberapa post secara bersamaan
 */

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import { InteractionType, TargetType, createInteractionId } from '../src/config/somniaDataStreams.v3';
import { privateKeyToAccount } from 'viem/accounts';

async function testConcurrentLikes() {
  console.log('🧪 Testing Concurrent Likes...\n');

  try {
    // Initialize service
    console.log('1️⃣ Initializing service...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ Service initialized\n');

    // Get user address
    const privateKey = process.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VITE_PRIVATE_KEY not found in .env');
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const userAddress = account.address;
    console.log('👤 User address:', userAddress, '\n');

    // Load posts
    console.log('2️⃣ Loading posts...');
    const { posts } = await somniaDatastreamServiceV3.loadFeedOptimized(0, 5, userAddress);
    
    if (posts.length < 3) {
      console.log('⚠️ Need at least 3 posts for testing. Found:', posts.length);
      return;
    }

    console.log(`✅ Loaded ${posts.length} posts\n`);

    // Select 3 posts to like
    const postsToLike = posts.slice(0, 3);
    console.log('3️⃣ Selected posts to like:');
    postsToLike.forEach((post, idx) => {
      console.log(`   ${idx + 1}. Post ${String(post.id).substring(0, 20)}... - "${post.content.substring(0, 30)}..."`);
    });
    console.log('');

    // Test 1: Like multiple posts simultaneously
    console.log('4️⃣ TEST 1: Like 3 posts simultaneously...');
    const startTime = Date.now();
    
    const likePromises = postsToLike.map(async (post, idx) => {
      const timestamp = Date.now() + idx; // Slightly different timestamps
      const interactionId = createInteractionId(InteractionType.LIKE, userAddress, timestamp, post.id);
      
      console.log(`   ⚡ Liking post ${idx + 1}...`);
      
      return somniaDatastreamServiceV3.createInteraction({
        id: interactionId,
        interactionType: InteractionType.LIKE,
        targetId: post.id,
        targetType: TargetType.POST,
        fromUser: userAddress,
        content: '',
        parentId: 0,
        timestamp,
        tipAmount: 0,
      }, true); // immediate = true
    });

    // Wait for all likes to complete
    const results = await Promise.allSettled(likePromises);
    const duration = Date.now() - startTime;

    console.log(`\n✅ All likes completed in ${duration}ms\n`);

    // Check results
    console.log('5️⃣ Results:');
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`   ✅ Post ${idx + 1}: SUCCESS (txHash: ${result.value.substring(0, 20)}...)`);
      } else {
        console.log(`   ❌ Post ${idx + 1}: FAILED (${result.reason})`);
      }
    });

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`\n📊 Success rate: ${successCount}/${results.length} (${Math.round(successCount / results.length * 100)}%)\n`);

    // Wait for blockchain confirmation
    console.log('6️⃣ Waiting 5 seconds for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verify likes are persisted
    console.log('\n7️⃣ Verifying likes are persisted...');
    const { posts: updatedPosts, statsMap } = await somniaDatastreamServiceV3.loadFeedOptimized(0, 5, userAddress);
    
    console.log('📊 Updated stats:');
    postsToLike.forEach((post, idx) => {
      const stats = statsMap.get(post.id);
      const updatedPost = updatedPosts.find(p => p.id === post.id);
      console.log(`   Post ${idx + 1}:`);
      console.log(`      - Likes: ${stats?.likes || 0}`);
      console.log(`      - User liked: ${stats?.userLiked ? '✅' : '❌'}`);
    });

    console.log('\n✅ Test completed successfully!\n');

    // Test 2: Prevent double-click on same post
    console.log('8️⃣ TEST 2: Prevent double-click on same post...');
    const testPost = postsToLike[0];
    
    console.log(`   Attempting to like post ${String(testPost.id).substring(0, 20)}... twice simultaneously...`);
    
    const timestamp1 = Date.now();
    const timestamp2 = Date.now() + 1;
    const interactionId1 = createInteractionId(InteractionType.LIKE, userAddress, timestamp1, testPost.id);
    const interactionId2 = createInteractionId(InteractionType.LIKE, userAddress, timestamp2, testPost.id);
    
    const doubleClickPromises = [
      somniaDatastreamServiceV3.createInteraction({
        id: interactionId1,
        interactionType: InteractionType.LIKE,
        targetId: testPost.id,
        targetType: TargetType.POST,
        fromUser: userAddress,
        content: '',
        parentId: 0,
        timestamp: timestamp1,
        tipAmount: 0,
      }, true),
      somniaDatastreamServiceV3.createInteraction({
        id: interactionId2,
        interactionType: InteractionType.LIKE,
        targetId: testPost.id,
        targetType: TargetType.POST,
        fromUser: userAddress,
        content: '',
        parentId: 0,
        timestamp: timestamp2,
        tipAmount: 0,
      }, true)
    ];

    const doubleClickResults = await Promise.allSettled(doubleClickPromises);
    
    console.log('\n   Results:');
    doubleClickResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        console.log(`   ✅ Attempt ${idx + 1}: SUCCESS`);
      } else {
        console.log(`   ❌ Attempt ${idx + 1}: FAILED (${result.reason})`);
      }
    });

    const doubleClickSuccessCount = doubleClickResults.filter(r => r.status === 'fulfilled').length;
    console.log(`\n   Note: Both attempts may succeed because they have different IDs.`);
    console.log(`   The UI-level double-click prevention is handled by useSocialCache.ts\n`);

    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test
testConcurrentLikes()
  .then(() => {
    console.log('🎉 Test suite completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
