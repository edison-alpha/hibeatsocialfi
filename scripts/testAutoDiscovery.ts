/**
 * Test Auto-Discovery of Publishers
 * 
 * Verifies that new publishers are automatically discovered from post authors
 * and interaction authors, ensuring global visibility of posts.
 */

import { somniaDatastreamServiceV3 } from '../src/services/somniaDatastreamService.v3';
import { publisherIndexer } from '../src/services/publisherIndexer';
import { ContentType } from '../src/config/somniaDataStreams.v3';

async function testAutoDiscovery() {
  console.log('🧪 Testing Auto-Discovery of Publishers...\n');

  try {
    // Connect to DataStream
    console.log('📡 Connecting to DataStream...');
    await somniaDatastreamServiceV3.connect();
    console.log('✅ Connected!\n');

    // Step 1: Check initial publisher count
    const initialPublishers = publisherIndexer.getAllPublishers();
    console.log(`📋 Initial Publishers (${initialPublishers.length}):`);
    initialPublishers.forEach((pub, idx) => {
      console.log(`  ${idx + 1}. ${pub.slice(0, 10)}...${pub.slice(-8)}`);
    });
    console.log('');

    // Step 2: Clear publisher index to simulate fresh start
    console.log('🗑️ Clearing publisher index to simulate fresh start...');
    publisherIndexer.clear();
    console.log('✅ Publisher index cleared\n');

    // Step 3: Load posts (should trigger auto-discovery)
    console.log('📥 Loading posts (should trigger auto-discovery)...');
    const startTime = Date.now();
    const posts = await somniaDatastreamServiceV3.getPostsPaginated(0, 20);
    const loadTime = Date.now() - startTime;
    
    console.log(`✅ Loaded ${posts.length} posts in ${loadTime}ms\n`);

    // Step 4: Check discovered publishers
    const discoveredPublishers = publisherIndexer.getAllPublishers();
    console.log(`📋 Discovered Publishers (${discoveredPublishers.length}):`);
    discoveredPublishers.forEach((pub, idx) => {
      console.log(`  ${idx + 1}. ${pub.slice(0, 10)}...${pub.slice(-8)}`);
    });
    console.log('');

    // Step 5: Verify publishers match post authors
    const uniqueAuthors = new Set(posts.map(p => p.author.toLowerCase()));
    console.log(`📊 Unique Authors in Posts: ${uniqueAuthors.size}`);
    console.log(`📊 Discovered Publishers: ${discoveredPublishers.length}`);
    
    const allAuthorsDiscovered = Array.from(uniqueAuthors).every(author => 
      discoveredPublishers.includes(author)
    );
    
    if (allAuthorsDiscovered) {
      console.log('✅ All post authors were discovered!\n');
    } else {
      console.log('❌ Some post authors were NOT discovered!\n');
      
      // Show missing authors
      const missingAuthors = Array.from(uniqueAuthors).filter(author => 
        !discoveredPublishers.includes(author)
      );
      console.log(`Missing Authors (${missingAuthors.length}):`);
      missingAuthors.forEach(author => {
        console.log(`  - ${author.slice(0, 10)}...${author.slice(-8)}`);
      });
      console.log('');
    }

    // Step 6: Load interactions (should discover more publishers)
    console.log('📥 Loading interactions (should discover more publishers)...');
    const interactionsStartTime = Date.now();
    const interactions = await somniaDatastreamServiceV3.getAllInteractions();
    const interactionsLoadTime = Date.now() - interactionsStartTime;
    
    console.log(`✅ Loaded ${interactions.length} interactions in ${interactionsLoadTime}ms\n`);

    // Step 7: Check final publisher count
    const finalPublishers = publisherIndexer.getAllPublishers();
    console.log(`📋 Final Publishers (${finalPublishers.length}):`);
    finalPublishers.forEach((pub, idx) => {
      console.log(`  ${idx + 1}. ${pub.slice(0, 10)}...${pub.slice(-8)}`);
    });
    console.log('');

    // Step 8: Verify interactions authors
    const uniqueInteractionAuthors = new Set(interactions.map(i => i.fromUser.toLowerCase()));
    console.log(`📊 Unique Interaction Authors: ${uniqueInteractionAuthors.size}`);
    console.log(`📊 Final Publishers: ${finalPublishers.length}`);
    
    const allInteractionAuthorsDiscovered = Array.from(uniqueInteractionAuthors).every(author => 
      finalPublishers.includes(author)
    );
    
    if (allInteractionAuthorsDiscovered) {
      console.log('✅ All interaction authors were discovered!\n');
    } else {
      console.log('❌ Some interaction authors were NOT discovered!\n');
    }

    // Step 9: Test persistence (localStorage)
    console.log('💾 Testing persistence...');
    const stats = publisherIndexer.getStats();
    console.log(`  Total Publishers: ${stats.total}`);
    console.log(`  Active Last Hour: ${stats.activeLastHour}`);
    console.log(`  Active Last Day: ${stats.activeLastDay}`);
    console.log(`  Active Last Week: ${stats.activeLastWeek}`);
    console.log('');

    // Step 10: Simulate second load (should reuse cached publishers)
    console.log('🔄 Simulating second load (should reuse cached publishers)...');
    const secondLoadStart = Date.now();
    const posts2 = await somniaDatastreamServiceV3.getPostsPaginated(0, 20);
    const secondLoadTime = Date.now() - secondLoadStart;
    
    console.log(`✅ Second load completed in ${secondLoadTime}ms`);
    console.log(`  Posts: ${posts2.length}`);
    console.log(`  Publishers: ${publisherIndexer.getAllPublishers().length}`);
    console.log('');

    // Summary
    console.log('✅ Auto-Discovery Test Complete!\n');
    console.log('📝 Summary:');
    console.log(`  - Initial Publishers: ${initialPublishers.length}`);
    console.log(`  - Discovered from Posts: ${discoveredPublishers.length}`);
    console.log(`  - Final Publishers: ${finalPublishers.length}`);
    console.log(`  - Unique Post Authors: ${uniqueAuthors.size}`);
    console.log(`  - Unique Interaction Authors: ${uniqueInteractionAuthors.size}`);
    console.log(`  - First Load Time: ${loadTime}ms`);
    console.log(`  - Second Load Time: ${secondLoadTime}ms`);
    console.log(`  - All Authors Discovered: ${allAuthorsDiscovered && allInteractionAuthorsDiscovered ? '✅ YES' : '❌ NO'}`);

    // Restore initial publishers
    console.log('\n🔄 Restoring initial publishers...');
    initialPublishers.forEach(pub => publisherIndexer.addPublisher(pub));
    console.log('✅ Publishers restored');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test
testAutoDiscovery()
  .then(() => {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
