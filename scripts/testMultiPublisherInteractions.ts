/**
 * Test Multi-Publisher Interactions
 * 
 * Verifies that interactions (likes, comments, reposts) from all publishers
 * are correctly loaded and displayed in the feed.
 */

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import { publisherIndexer } from '../src/services/publisherIndexer';
import { InteractionType } from '../src/config/somniaDataStreams.v3';

async function testMultiPublisherInteractions() {
  console.log('🧪 Testing Multi-Publisher Interactions...\n');

  try {
    // Connect to DataStream
    console.log('📡 Connecting to DataStream...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ Connected!\n');

    // Check indexed publishers
    const publishers = publisherIndexer.getAllPublishers();
    console.log(`📋 Indexed Publishers (${publishers.length}):`);
    publishers.forEach((pub, idx) => {
      console.log(`  ${idx + 1}. ${pub.slice(0, 10)}...${pub.slice(-8)}`);
    });
    console.log('');

    // Load all interactions
    console.log('📥 Loading all interactions from all publishers...');
    const startTime = Date.now();
    const interactions = await somniaDatastreamServiceV3.getAllInteractions();
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Loaded ${interactions.length} interactions in ${loadTime}ms\n`);

    // Group interactions by type
    const interactionsByType = new Map<InteractionType, number>();
    const interactionsByPublisher = new Map<string, number>();
    
    interactions.forEach(interaction => {
      // Count by type
      const typeCount = interactionsByType.get(interaction.interactionType) || 0;
      interactionsByType.set(interaction.interactionType, typeCount + 1);
      
      // Count by publisher (fromUser)
      const pubCount = interactionsByPublisher.get(interaction.fromUser) || 0;
      interactionsByPublisher.set(interaction.fromUser, pubCount + 1);
    });

    // Display stats by type
    console.log('📊 Interactions by Type:');
    console.log(`  LIKE: ${interactionsByType.get(InteractionType.LIKE) || 0}`);
    console.log(`  UNLIKE: ${interactionsByType.get(InteractionType.UNLIKE) || 0}`);
    console.log(`  COMMENT: ${interactionsByType.get(InteractionType.COMMENT) || 0}`);
    console.log(`  REPOST: ${interactionsByType.get(InteractionType.REPOST) || 0}`);
    console.log(`  UNREPOST: ${interactionsByType.get(InteractionType.UNREPOST) || 0}`);
    console.log(`  BOOKMARK: ${interactionsByType.get(InteractionType.BOOKMARK) || 0}`);
    console.log(`  UNBOOKMARK: ${interactionsByType.get(InteractionType.UNBOOKMARK) || 0}`);
    console.log('');

    // Display stats by publisher
    console.log('📊 Interactions by Publisher:');
    Array.from(interactionsByPublisher.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count descending
      .forEach(([publisher, count]) => {
        console.log(`  ${publisher.slice(0, 10)}...${publisher.slice(-8)}: ${count} interactions`);
      });
    console.log('');

    // Test feed loading with interactions
    console.log('📥 Loading feed with interactions...');
    const feedStartTime = Date.now();
    const feedResult = await somniaDatastreamServiceV3.loadFeedOptimized(0, 20, publishers[0]);
    const feedLoadTime = Date.now() - feedStartTime;
    
    console.log(`✅ Feed loaded in ${feedLoadTime}ms`);
    console.log(`  Posts: ${feedResult.posts.length}`);
    console.log(`  Interactions: ${feedResult.interactions.length}`);
    console.log(`  Stats Map Size: ${feedResult.statsMap.size}`);
    console.log('');

    // Display sample post stats
    if (feedResult.posts.length > 0) {
      console.log('📈 Sample Post Stats:');
      feedResult.posts.slice(0, 3).forEach((post, idx) => {
        const stats = feedResult.statsMap.get(post.id);
        console.log(`\n  Post ${idx + 1} (ID: ${String(post.id).substring(0, 20)}...):`);
        console.log(`    Author: ${post.author.slice(0, 10)}...${post.author.slice(-8)}`);
        console.log(`    Content: ${post.content.substring(0, 50)}...`);
        console.log(`    Likes: ${stats?.likes || 0} (User Liked: ${stats?.userLiked || false})`);
        console.log(`    Comments: ${stats?.comments || 0}`);
        console.log(`    Reposts: ${stats?.reposts || 0} (User Reposted: ${stats?.userReposted || false})`);
        console.log(`    Bookmarks: ${stats?.bookmarks || 0}`);
      });
    }

    console.log('\n✅ Multi-Publisher Interactions Test Complete!');
    console.log('\n📝 Summary:');
    console.log(`  - Total Publishers: ${publishers.length}`);
    console.log(`  - Total Interactions: ${interactions.length}`);
    console.log(`  - Unique Users: ${interactionsByPublisher.size}`);
    console.log(`  - Load Time: ${loadTime}ms`);
    console.log(`  - Feed Load Time: ${feedLoadTime}ms`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test
testMultiPublisherInteractions()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
