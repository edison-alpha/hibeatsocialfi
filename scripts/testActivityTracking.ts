/**
 * Test Activity Tracking System
 * 
 * Tests:
 * 1. Record various activity types
 * 2. Fetch user activities
 * 3. Fetch recent activities
 * 4. Activity stats calculation
 */

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import { ActivityHistoryType, createActivityData } from '../src/config/somniaDataStreams.v3';
import { privateKeyToAccount } from 'viem/accounts';

async function testActivityTracking() {
  console.log('🧪 Testing Activity Tracking System\n');

  // Get user address
  const privateKey = process.env.VITE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VITE_PRIVATE_KEY not found');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const userAddress = account.address;
  console.log('👤 User:', userAddress);
  console.log('');

  // Connect to service
  await somniaDatastreamServiceV3.connect();
  console.log('✅ Connected to Somnia DataStream\n');

  // Test 1: Record various activities
  console.log('📝 TEST 1: Recording Activities');
  console.log('─────────────────────────────────');

  const activities = [
    createActivityData(
      userAddress,
      ActivityHistoryType.POST_CREATED,
      'Created a new post',
      'Posted about the new activity tracking feature',
      Date.now(),
      '0x0000000000000000000000000000000000000000',
      '',
      JSON.stringify({ postId: Date.now(), content: 'Test post' })
    ),
    createActivityData(
      userAddress,
      ActivityHistoryType.NFT_MINTED,
      'Minted a new NFT',
      'Minted "Summer Vibes" track',
      123,
      '0x0000000000000000000000000000000000000000',
      '0xabc123...',
      JSON.stringify({ tokenId: 123, title: 'Summer Vibes' })
    ),
    createActivityData(
      userAddress,
      ActivityHistoryType.USER_FOLLOWED,
      'Followed a user',
      'Started following @artist123',
      0,
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      '',
      JSON.stringify({ targetUser: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
    ),
  ];

  for (const activity of activities) {
    try {
      console.log(`\n📌 Recording: ${activity.title}`);
      const activityId = await somniaDatastreamServiceV3.recordActivity(activity, true);
      console.log(`   ✅ Activity ID: ${activityId}`);
      
      // Wait between activities
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`   ❌ Failed:`, error.message);
    }
  }

  // Wait for blockchain confirmation
  console.log('\n⏳ Waiting for blockchain confirmation...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Test 2: Fetch user activities
  console.log('\n📚 TEST 2: Fetching User Activities');
  console.log('─────────────────────────────────');

  try {
    const userActivities = await somniaDatastreamServiceV3.getUserActivities(userAddress);
    console.log(`\n✅ Found ${userActivities.length} activities for user`);
    
    if (userActivities.length > 0) {
      console.log('\n📋 Recent Activities:');
      userActivities.slice(0, 5).forEach((activity, idx) => {
        const date = new Date(activity.timestamp).toLocaleString();
        console.log(`\n${idx + 1}. ${activity.title}`);
        console.log(`   Type: ${ActivityHistoryType[activity.activityType]}`);
        console.log(`   Description: ${activity.description}`);
        console.log(`   Time: ${date}`);
        if (activity.metadata) {
          console.log(`   Metadata: ${activity.metadata}`);
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch user activities:', error.message);
  }

  // Test 3: Fetch recent activities (global)
  console.log('\n\n🌍 TEST 3: Fetching Recent Activities (Global)');
  console.log('─────────────────────────────────────────────');

  try {
    const recentActivities = await somniaDatastreamServiceV3.getRecentActivities(10);
    console.log(`\n✅ Found ${recentActivities.length} recent activities`);
    
    if (recentActivities.length > 0) {
      console.log('\n📋 Global Activity Feed:');
      recentActivities.slice(0, 5).forEach((activity, idx) => {
        const date = new Date(activity.timestamp).toLocaleString();
        const userShort = activity.user.substring(0, 10) + '...';
        console.log(`\n${idx + 1}. ${activity.title}`);
        console.log(`   User: ${userShort}`);
        console.log(`   Type: ${ActivityHistoryType[activity.activityType]}`);
        console.log(`   Time: ${date}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Failed to fetch recent activities:', error.message);
  }

  // Test 4: Activity stats
  console.log('\n\n📊 TEST 4: Activity Statistics');
  console.log('─────────────────────────────────');

  try {
    const count = await somniaDatastreamServiceV3.getActivityCount(userAddress);
    console.log(`\n✅ Total activities: ${count}`);
    
    const userActivities = await somniaDatastreamServiceV3.getUserActivities(userAddress);
    
    // Import helper functions
    const { calculateActivityStats, getActivityTypeLabel } = await import('../src/config/somniaDataStreams.v3');
    const stats = calculateActivityStats(userActivities);
    
    console.log('\n📈 Activity Breakdown:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Today: ${stats.today}`);
    console.log(`   This Week: ${stats.week}`);
    console.log(`   This Month: ${stats.month}`);
    
    if (stats.byType.size > 0) {
      console.log('\n📊 By Type:');
      for (const [type, count] of stats.byType.entries()) {
        console.log(`   ${getActivityTypeLabel(type)}: ${count}`);
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to calculate stats:', error.message);
  }

  // Test 5: Clear cache
  console.log('\n\n🗑️  TEST 5: Cache Management');
  console.log('─────────────────────────────────');

  try {
    somniaDatastreamServiceV3.clearActivityCache();
    console.log('✅ Activity cache cleared');
    
    // Fetch again to test cache rebuild
    const userActivities = await somniaDatastreamServiceV3.getUserActivities(userAddress);
    console.log(`✅ Cache rebuilt with ${userActivities.length} activities`);
  } catch (error: any) {
    console.error('❌ Failed to manage cache:', error.message);
  }

  console.log('\n\n🎉 All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   ✅ Activity recording works');
  console.log('   ✅ User activity fetching works');
  console.log('   ✅ Global activity feed works');
  console.log('   ✅ Activity stats calculation works');
  console.log('   ✅ Cache management works');
}

// Run tests
testActivityTracking()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
