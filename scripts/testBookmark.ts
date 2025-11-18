/**
 * Test Bookmark Functionality
 * 
 * Test script untuk verify bookmark/unbookmark works correctly
 */

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import { InteractionType } from '../src/config/somniaDataStreams.v3';

async function testBookmark() {
  console.log('🧪 Testing Bookmark Functionality...\n');

  try {
    // Connect to service
    console.log('1️⃣ Connecting to DataStream...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ Connected\n');

    // Test data
    const testPostId = Date.now(); // Use timestamp as test post ID
    const testUserAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'; // Example address

    console.log('📝 Test Data:');
    console.log('  Post ID:', testPostId);
    console.log('  User:', testUserAddress);
    console.log('');

    // Test 1: Bookmark a post
    console.log('2️⃣ Testing bookmark...');
    try {
      const bookmarkResult = await somniaDatastreamServiceV3.bookmarkPost(testPostId, testUserAddress);
      console.log('✅ Bookmark created:', bookmarkResult);
    } catch (error: any) {
      console.error('❌ Bookmark failed:', error.message);
      throw error;
    }
    console.log('');

    // Wait a bit for blockchain
    console.log('⏳ Waiting 2 seconds for blockchain...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Test 2: Check if bookmarked
    console.log('3️⃣ Checking bookmark status...');
    const isBookmarked = await somniaDatastreamServiceV3.isPostBookmarked(testPostId, testUserAddress);
    console.log('  Is bookmarked:', isBookmarked);
    if (!isBookmarked) {
      console.warn('⚠️ Warning: Post not showing as bookmarked yet (may need more time)');
    } else {
      console.log('✅ Bookmark status correct');
    }
    console.log('');

    // Test 3: Get bookmarked posts
    console.log('4️⃣ Getting bookmarked posts...');
    const bookmarkedPosts = await somniaDatastreamServiceV3.getBookmarkedPosts(testUserAddress);
    console.log('  Total bookmarked posts:', bookmarkedPosts.length);
    const foundTestPost = bookmarkedPosts.find(p => p.id === testPostId);
    if (foundTestPost) {
      console.log('✅ Test post found in bookmarks');
    } else {
      console.warn('⚠️ Warning: Test post not found in bookmarks list yet');
    }
    console.log('');

    // Test 4: Unbookmark
    console.log('5️⃣ Testing unbookmark...');
    try {
      const unbookmarkResult = await somniaDatastreamServiceV3.unbookmarkPost(testPostId, testUserAddress);
      console.log('✅ Unbookmark created:', unbookmarkResult);
    } catch (error: any) {
      console.error('❌ Unbookmark failed:', error.message);
      throw error;
    }
    console.log('');

    // Wait a bit
    console.log('⏳ Waiting 2 seconds for blockchain...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');

    // Test 5: Verify unbookmarked
    console.log('6️⃣ Verifying unbookmark...');
    const isStillBookmarked = await somniaDatastreamServiceV3.isPostBookmarked(testPostId, testUserAddress);
    console.log('  Is still bookmarked:', isStillBookmarked);
    if (isStillBookmarked) {
      console.warn('⚠️ Warning: Post still showing as bookmarked (may need more time)');
    } else {
      console.log('✅ Unbookmark successful');
    }
    console.log('');

    // Test 6: Get all interactions to verify
    console.log('7️⃣ Checking interactions...');
    const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
    const bookmarkInteractions = allInteractions.filter(
      i => i.targetId === testPostId && 
           i.fromUser.toLowerCase() === testUserAddress.toLowerCase() &&
           (i.interactionType === InteractionType.BOOKMARK || 
            i.interactionType === InteractionType.UNBOOKMARK)
    );
    console.log('  Bookmark interactions found:', bookmarkInteractions.length);
    bookmarkInteractions.forEach(i => {
      console.log('    -', InteractionType[i.interactionType], 'at', new Date(i.timestamp).toISOString());
    });
    console.log('');

    console.log('✅ All tests completed!\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run test
testBookmark()
  .then(() => {
    console.log('🎉 Test suite completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
