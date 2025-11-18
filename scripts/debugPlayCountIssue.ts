/**
 * Debug script untuk memeriksa kenapa play count tidak bertambah
 * Memeriksa:
 * 1. Apakah post music memiliki tokenId di metadata
 * 2. Apakah play event ter-record dengan benar
 * 3. Apakah play count ter-update
 * 
 * Run: npm run debug:playcount
 */

// Mock import.meta.env for Node.js environment
if (typeof import.meta === 'undefined') {
  (global as any).import = { meta: { env: {} } };
}

import somniaService from '../src/services/somniaDatastreamService.v3';

async function debugPlayCountIssue() {
  console.log('🔍 Starting play count debug...\n');

  try {
    // 1. Get recent music posts
    console.log('📝 Step 1: Fetching recent music posts...');
    const posts = await somniaService.getUserPosts('0x0000000000000000000000000000000000000000', 10, 0);
    
    const musicPosts = posts.filter(p => p.contentType === 'music');
    console.log(`Found ${musicPosts.length} music posts out of ${posts.length} total posts\n`);

    if (musicPosts.length === 0) {
      console.log('⚠️ No music posts found. Create a music post first!');
      return;
    }

    // 2. Check metadata for each music post
    console.log('📝 Step 2: Checking metadata for tokenId...');
    for (const post of musicPosts.slice(0, 3)) {
      console.log(`\nPost ID: ${post.id}`);
      console.log(`Author: ${post.author}`);
      console.log(`Content: ${post.content?.substring(0, 50)}...`);
      
      // Parse metadata
      let metadata: any = {};
      if (typeof post.metadata === 'string') {
        try {
          metadata = JSON.parse(post.metadata);
        } catch (e) {
          console.error('❌ Failed to parse metadata');
        }
      } else if (post.metadata) {
        metadata = post.metadata;
      }
      
      // Try ipfsHash as fallback
      if (!metadata.tokenId && post.ipfsHash) {
        try {
          metadata = JSON.parse(post.ipfsHash);
        } catch (e) {
          // Not JSON
        }
      }
      
      console.log('Metadata:', {
        hasTokenId: !!metadata.tokenId,
        tokenId: metadata.tokenId,
        title: metadata.title,
        artist: metadata.artist,
        type: metadata.type,
        keys: Object.keys(metadata)
      });
      
      if (!metadata.tokenId) {
        console.log('❌ WARNING: No tokenId found in metadata!');
      } else {
        console.log(`✅ TokenId found: ${metadata.tokenId}`);
        
        // 3. Check play count for this token
        const playCount = await somniaService.getPlayCountsForTokens([metadata.tokenId]);
        console.log(`🎵 Current play count: ${playCount.get(metadata.tokenId) || 0}`);
      }
    }

    // 4. Get recent play events
    console.log('\n📝 Step 3: Checking recent play events...');
    const recentEvents = await somniaService.getRecentPlayEvents(10);
    console.log(`Found ${recentEvents.length} recent play events:`);
    
    for (const event of recentEvents.slice(0, 5)) {
      console.log(`- TokenId: ${event.tokenId}, Listener: ${event.listener.substring(0, 10)}..., Source: ${event.source}, Time: ${new Date(event.timestamp).toLocaleString()}`);
    }

    // 5. Summary
    console.log('\n📊 Summary:');
    console.log(`- Total music posts: ${musicPosts.length}`);
    console.log(`- Posts with tokenId: ${musicPosts.filter(p => {
      let metadata: any = {};
      try {
        metadata = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
      } catch (e) {}
      if (!metadata.tokenId && p.ipfsHash) {
        try {
          metadata = JSON.parse(p.ipfsHash);
        } catch (e) {}
      }
      return !!metadata.tokenId;
    }).length}`);
    console.log(`- Total play events: ${recentEvents.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run
debugPlayCountIssue()
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
