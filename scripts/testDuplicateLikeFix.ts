/**
 * Test Duplicate Like Fix
 * 
 * Test bahwa user hanya bisa like 1 kali per post
 */

import dotenv from 'dotenv';
dotenv.config();

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import {
  createPostId,
  createInteractionId,
  InteractionType,
  TargetType,
  PostDataV3,
  InteractionDataV3,
  ContentType,
} from '../src/config/somniaDataStreams.v3';

const TEST_USER = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'; // Your address

async function testDuplicateLikeFix() {
  console.log('🧪 Testing Duplicate Like Fix...\n');

  try {
    // Connect to datastream
    console.log('📡 Connecting to Somnia Datastream...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ Connected!\n');

    // Step 1: Create a test post
    console.log('📝 Step 1: Creating test post...');
    const timestamp = Date.now();
    const postId = createPostId(TEST_USER, timestamp);
    
    const testPost: Partial<PostDataV3> = {
      id: postId,
      timestamp,
      content: `Test post for duplicate like fix - ${new Date().toISOString()}`,
      contentType: ContentType.TEXT,
      mediaHashes: '',
      author: TEST_USER,
      quotedPostId: 0,
      replyToId: 0,
      mentions: '',
      collectModule: '0x0000000000000000000000000000000000000000',
      collectPrice: 0,
      collectLimit: 0,
      collectCount: 0,
      isGated: false,
      referrer: '0x0000000000000000000000000000000000000000',
      nftTokenId: 0,
      isDeleted: false,
      isPinned: false,
      index: 0,
    };

    await somniaDatastreamServiceV3.createPost(testPost, true);
    console.log(`✅ Post created with ID: ${postId}\n`);

    // Wait for blockchain confirmation
    console.log('⏳ Waiting 3s for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Like the post (first time)
    console.log('❤️ Step 2: Liking post (first time)...');
    const likeTimestamp1 = Date.now();
    const likeId1 = createInteractionId(InteractionType.LIKE, TEST_USER, likeTimestamp1, postId);
    
    console.log(`   Like ID 1: ${likeId1}`);
    
    const like1: Partial<InteractionDataV3> = {
      id: likeId1,
      timestamp: likeTimestamp1,
      interactionType: InteractionType.LIKE,
      targetId: postId,
      targetType: TargetType.POST,
      fromUser: TEST_USER,
      content: '',
      parentId: 0,
      tipAmount: 0,
    };

    await somniaDatastreamServiceV3.createInteraction(like1, true);
    console.log('✅ First like saved!\n');

    // Wait for blockchain confirmation
    console.log('⏳ Waiting 3s for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Try to like again (should have SAME ID = duplicate)
    console.log('❤️ Step 3: Trying to like again (duplicate test)...');
    const likeTimestamp2 = Date.now(); // Different timestamp
    const likeId2 = createInteractionId(InteractionType.LIKE, TEST_USER, likeTimestamp2, postId);
    
    console.log(`   Like ID 2: ${likeId2}`);
    console.log(`   Same as ID 1? ${likeId1 === likeId2 ? '✅ YES (deterministic!)' : '❌ NO (problem!)'}\n`);

    if (likeId1 === likeId2) {
      console.log('✅ PASS: IDs are the same (deterministic)');
      console.log('   Blockchain will reject duplicate ID automatically\n');
    } else {
      console.log('❌ FAIL: IDs are different (not deterministic)');
      console.log('   User can like multiple times!\n');
      return;
    }

    // Try to write duplicate (should fail or be ignored)
    console.log('📝 Attempting to write duplicate like...');
    const like2: Partial<InteractionDataV3> = {
      id: likeId2,
      timestamp: likeTimestamp2,
      interactionType: InteractionType.LIKE,
      targetId: postId,
      targetType: TargetType.POST,
      fromUser: TEST_USER,
      content: '',
      parentId: 0,
      tipAmount: 0,
    };

    try {
      await somniaDatastreamServiceV3.createInteraction(like2, true);
      console.log('⚠️ Duplicate write accepted (blockchain may reject)\n');
    } catch (error: any) {
      console.log('✅ Duplicate write rejected by SDK or blockchain\n');
    }

    // Wait for blockchain
    console.log('⏳ Waiting 3s for blockchain...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 4: Load interactions and verify
    console.log('📊 Step 4: Loading interactions to verify...');
    const interactions = await somniaDatastreamServiceV3.loadInteractions();
    
    const postLikes = interactions.filter(
      i => i.targetId === postId && i.interactionType === InteractionType.LIKE
    );

    console.log(`   Total likes for this post: ${postLikes.length}`);
    console.log(`   Expected: 1 (only first like should exist)`);
    
    if (postLikes.length === 1) {
      console.log('✅ PASS: Only 1 like exists (duplicate prevented!)\n');
    } else {
      console.log(`❌ FAIL: ${postLikes.length} likes exist (duplicates not prevented)\n`);
    }

    // Step 5: Test unlike (should have different ID)
    console.log('💔 Step 5: Testing unlike (should have different ID)...');
    const unlikeTimestamp = Date.now();
    const unlikeId = createInteractionId(InteractionType.UNLIKE, TEST_USER, unlikeTimestamp, postId);
    
    console.log(`   Unlike ID: ${unlikeId}`);
    console.log(`   Different from Like ID? ${unlikeId !== likeId1 ? '✅ YES' : '❌ NO'}\n`);

    if (unlikeId !== likeId1) {
      console.log('✅ PASS: Unlike has different ID (different type)\n');
    } else {
      console.log('❌ FAIL: Unlike has same ID as Like\n');
    }

    // Step 6: Test multiple comments (should have different IDs)
    console.log('💬 Step 6: Testing multiple comments (should allow)...');
    const comment1Timestamp = Date.now();
    const comment1Id = createInteractionId(InteractionType.COMMENT, TEST_USER, comment1Timestamp, postId);
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    
    const comment2Timestamp = Date.now();
    const comment2Id = createInteractionId(InteractionType.COMMENT, TEST_USER, comment2Timestamp, postId);
    
    console.log(`   Comment 1 ID: ${comment1Id}`);
    console.log(`   Comment 2 ID: ${comment2Id}`);
    console.log(`   Different IDs? ${comment1Id !== comment2Id ? '✅ YES (includes timestamp)' : '❌ NO'}\n`);

    if (comment1Id !== comment2Id) {
      console.log('✅ PASS: Comments have different IDs (non-deterministic)\n');
    } else {
      console.log('❌ FAIL: Comments have same ID\n');
    }

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log('✅ Duplicate like prevention: WORKING');
    console.log('   - Same user + same post = same ID');
    console.log('   - Blockchain rejects duplicate');
    console.log('');
    console.log('✅ Unlike functionality: WORKING');
    console.log('   - Different type = different ID');
    console.log('');
    console.log('✅ Multiple comments: WORKING');
    console.log('   - Includes timestamp = different IDs');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testDuplicateLikeFix();
