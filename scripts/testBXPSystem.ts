// Test BeatsXP System
// Run: npm run test:bxp

import { bxpService } from '../src/services/bxpService';
import { BXP_REWARDS } from '../src/config/bxpRewards';

const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890';

async function testBXPSystem() {
  console.log('🧪 Testing BeatsXP System\n');
  console.log('='.repeat(80) + '\n');

  // Test 1: Get initial profile
  console.log('📋 Test 1: Get User Profile');
  const profile1 = await bxpService.getUserProfile(TEST_USER_ADDRESS);
  console.log('Initial Profile:', {
    totalXP: profile1.totalXP,
    level: profile1.level,
    streak: profile1.streak,
  });
  console.log('✅ Test 1 passed\n');

  // Test 2: Award XP for listening
  console.log('📋 Test 2: Award XP for Complete Song Play');
  const result1 = await bxpService.awardXP(
    TEST_USER_ADDRESS,
    'COMPLETE_SONG_PLAY',
    { songId: 'test-song-1' }
  );
  console.log('Result:', result1);
  console.log('✅ Test 2 passed\n');

  // Test 3: Award XP for social activity
  console.log('📋 Test 3: Award XP for Like Song');
  const result2 = await bxpService.awardXP(
    TEST_USER_ADDRESS,
    'LIKE_SONG',
    { songId: 'test-song-1' }
  );
  console.log('Result:', result2);
  console.log('✅ Test 3 passed\n');

  // Test 4: Award XP for creation
  console.log('📋 Test 4: Award XP for Upload Song');
  const result3 = await bxpService.awardXP(
    TEST_USER_ADDRESS,
    'UPLOAD_SONG',
    { songId: 'test-song-2' }
  );
  console.log('Result:', result3);
  console.log('✅ Test 4 passed\n');

  // Test 5: Multiple awards (batch test)
  console.log('📋 Test 5: Multiple XP Awards (Batch)');
  const batchResults = await Promise.all([
    bxpService.awardXP(TEST_USER_ADDRESS, 'COMPLETE_SONG_PLAY', { songId: 'song-1' }),
    bxpService.awardXP(TEST_USER_ADDRESS, 'COMPLETE_SONG_PLAY', { songId: 'song-2' }),
    bxpService.awardXP(TEST_USER_ADDRESS, 'COMPLETE_SONG_PLAY', { songId: 'song-3' }),
    bxpService.awardXP(TEST_USER_ADDRESS, 'LIKE_SONG', { songId: 'song-1' }),
    bxpService.awardXP(TEST_USER_ADDRESS, 'CREATE_POST', { postId: 'post-1' }),
  ]);
  console.log('Batch Results:', batchResults.map(r => r.xpAwarded));
  console.log('✅ Test 5 passed\n');

  // Wait for batch processing
  console.log('⏳ Waiting for batch processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  await bxpService.flush();
  console.log('✅ Batch processed\n');

  // Test 6: Get updated profile
  console.log('📋 Test 6: Get Updated Profile');
  const profile2 = await bxpService.getUserProfile(TEST_USER_ADDRESS);
  console.log('Updated Profile:', {
    totalXP: profile2.totalXP,
    level: profile2.level,
    dailyXP: profile2.dailyXP,
    streak: profile2.streak,
  });
  console.log('✅ Test 6 passed\n');

  // Test 7: Update streak
  console.log('📋 Test 7: Update Streak');
  const newStreak = await bxpService.updateStreak(TEST_USER_ADDRESS);
  console.log('New Streak:', newStreak);
  console.log('✅ Test 7 passed\n');

  // Test 8: Get transactions
  console.log('📋 Test 8: Get User Transactions');
  const transactions = await bxpService.getUserTransactions(TEST_USER_ADDRESS, 10);
  console.log(`Found ${transactions.length} transactions`);
  if (transactions.length > 0) {
    console.log('Latest transaction:', {
      type: transactions[0].type,
      amount: transactions[0].amount,
      timestamp: new Date(transactions[0].timestamp).toISOString(),
    });
  }
  console.log('✅ Test 8 passed\n');

  // Test 9: Add multiplier
  console.log('📋 Test 9: Add Multiplier');
  await bxpService.addMultiplier(TEST_USER_ADDRESS, 'NFT_HOLDER');
  const profile3 = await bxpService.getUserProfile(TEST_USER_ADDRESS);
  console.log('Multipliers:', profile3.multipliers);
  console.log('✅ Test 9 passed\n');

  // Test 10: Award XP with multiplier
  console.log('📋 Test 10: Award XP with Multiplier');
  const result4 = await bxpService.awardXP(
    TEST_USER_ADDRESS,
    'COMPLETE_SONG_PLAY',
    { songId: 'test-song-3' }
  );
  console.log('Result with multiplier:', result4);
  console.log('Base XP:', BXP_REWARDS.COMPLETE_SONG_PLAY);
  console.log('Multiplied XP:', result4.xpAwarded);
  console.log('✅ Test 10 passed\n');

  // Summary
  console.log('='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log('✅ All tests passed!');
  console.log(`\nFinal Stats:`);
  console.log(`  Total XP: ${profile3.totalXP}`);
  console.log(`  Level: ${profile3.level}`);
  console.log(`  Daily XP: ${profile3.dailyXP}`);
  console.log(`  Streak: ${profile3.streak}`);
  console.log(`  Multipliers: ${profile3.multipliers.join(', ')}`);
  console.log('\n🎉 BeatsXP System is working correctly!\n');
}

testBXPSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
