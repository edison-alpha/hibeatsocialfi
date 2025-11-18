/**
 * Test Play Events - Record and Query
 * 
 * Tests:
 * 1. Record play events for songs
 * 2. Get play counts
 * 3. Get best song in album
 * 4. Get trending songs
 */

import somniaService from '../src/services/somniaDatastreamService.v3';
import { createPlayEventData } from '../src/config/somniaDataStreams.v3';

async function testPlayEvents() {
  console.log('🎵 Testing Play Events...\n');

  try {
    // Connect to service
    await somniaService.connect();
    console.log('✅ Connected to Somnia DataStream\n');

    // Test data
    const testTokenIds = [1, 2, 3, 4, 5]; // Example NFT token IDs
    const testListener = '0x1234567890123456789012345678901234567890';

    // ===== TEST 1: Record Play Events =====
    console.log('📝 TEST 1: Recording play events...');
    
    for (let i = 0; i < testTokenIds.length; i++) {
      const tokenId = testTokenIds[i];
      const playCount = Math.floor(Math.random() * 10) + 1; // Random 1-10 plays
      
      console.log(`\n🎵 Recording ${playCount} plays for token ${tokenId}...`);
      
      for (let j = 0; j < playCount; j++) {
        const playEvent = createPlayEventData(
          tokenId,
          testListener,
          180, // 3 minutes
          'test'
        );
        
        await somniaService.recordPlayEvent(playEvent, true);
        console.log(`  ✅ Play ${j + 1}/${playCount} recorded`);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log('\n✅ All play events recorded!\n');

    // Flush any batched writes
    await somniaService.forceBatchFlush();
    console.log('✅ Batch flushed\n');

    // Wait for blockchain confirmation
    console.log('⏳ Waiting 5 seconds for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // ===== TEST 2: Get Play Counts =====
    console.log('\n📊 TEST 2: Getting play counts...');
    
    const playCounts = await somniaService.getPlayCountsForTokens(testTokenIds);
    
    console.log('\n📈 Play Counts:');
    for (const [tokenId, count] of playCounts.entries()) {
      console.log(`  Token ${tokenId}: ${count} plays`);
    }

    // ===== TEST 3: Get Best Song =====
    console.log('\n🏆 TEST 3: Getting best song...');
    
    const bestSong = await somniaService.getBestSongInAlbum(testTokenIds);
    
    if (bestSong) {
      console.log(`\n🥇 Best Song: Token ${bestSong.tokenId} with ${bestSong.playCount} plays`);
    } else {
      console.log('\n⚠️ No best song found');
    }

    // ===== TEST 4: Get Trending Songs =====
    console.log('\n📈 TEST 4: Getting trending songs...');
    
    const trending = await somniaService.getTrendingSongs(5, 7 * 24 * 60 * 60 * 1000);
    
    console.log('\n🔥 Trending Songs (Top 5):');
    trending.forEach((song, index) => {
      console.log(`  ${index + 1}. Token ${song.tokenId}`);
      console.log(`     Score: ${song.score.toFixed(2)}`);
      console.log(`     Plays: ${song.plays}`);
      console.log(`     Unique Listeners: ${song.uniqueListeners}`);
    });

    // ===== TEST 5: Get All Play Events =====
    console.log('\n📋 TEST 5: Getting all play events...');
    
    const allEvents = await somniaService.getAllPlayEvents();
    
    console.log(`\n✅ Total play events: ${allEvents.length}`);
    if (allEvents.length > 0) {
      console.log('\n📄 Sample events (first 3):');
      allEvents.slice(0, 3).forEach((event, index) => {
        console.log(`  ${index + 1}. Token ${event.tokenId}`);
        console.log(`     Listener: ${event.listener.substring(0, 10)}...`);
        console.log(`     Duration: ${event.duration}s`);
        console.log(`     Source: ${event.source}`);
        console.log(`     Timestamp: ${new Date(event.timestamp).toLocaleString()}`);
      });
    }

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run tests
testPlayEvents()
  .then(() => {
    console.log('\n🎉 Play Events test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
