/**
 * Verify Interactions V3
 * 
 * Script untuk memverifikasi bahwa interactions tersimpan dengan benar
 */

import { readFileSync } from 'fs';
import { SDK } from '@somnia-chain/streams';

// Load .env
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const privateKey = env.VITE_PRIVATE_KEY;
const rpcUrl = env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

if (!privateKey) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

async function verifyInteractions() {
  console.log('🔍 Verifying Interactions V3\n');

  try {
    // Initialize SDK
    console.log('🔌 Initializing Somnia SDK...');
    const sdk = new SDK({
      privateKey,
      rpcUrl,
    });
    console.log('✅ SDK initialized\n');

  // Get schema IDs
  console.log('📋 Getting schema IDs...');
  const postsSchemaId = await sdk.streams.getSchemaUID('hibeats_posts_v3');
  const interactionsSchemaId = await sdk.streams.getSchemaUID('hibeats_interactions_v3');
  
  console.log('   Posts schema:', postsSchemaId);
  console.log('   Interactions schema:', interactionsSchemaId);
  console.log('');

  // Get publisher address
  const publisher = sdk.account.address;
  console.log('👤 Publisher:', publisher);
  console.log('');

  // Load posts
  console.log('📚 Loading posts...');
  const posts = await sdk.streams.getAllPublisherDataForSchema(postsSchemaId, publisher);
  console.log(`✅ Found ${posts.length} posts\n`);

  // Load interactions
  console.log('📊 Loading interactions...');
  const interactions = await sdk.streams.getAllPublisherDataForSchema(interactionsSchemaId, publisher);
  console.log(`✅ Found ${interactions.length} interactions\n`);

  if (interactions.length === 0) {
    console.log('ℹ️  No interactions found yet.');
    console.log('   Try liking/commenting on posts in the UI first.\n');
    return;
  }

  // Count interaction types
  console.log('🔢 Analyzing interactions...\n');
  
  const stats = {
    likes: 0,
    unlikes: 0,
    comments: 0,
    reposts: 0,
    unreposts: 0,
    bookmarks: 0,
    unbookmarks: 0,
  };

  const interactionTypes = {
    0: 'LIKE',
    1: 'UNLIKE',
    2: 'COMMENT',
    3: 'REPOST',
    4: 'UNREPOST',
    5: 'DELETE',
    6: 'BOOKMARK',
    7: 'UNBOOKMARK',
  };

  for (let i = 0; i < Math.min(interactions.length, 10); i++) {
    const interaction = interactions[i];
    
    try {
      // Extract interaction type (field index 1)
      const typeValue = interaction[1]?.value?.value || interaction[1]?.value || interaction[1];
      const type = Number(typeValue);
      const typeName = interactionTypes[type] || 'UNKNOWN';
      
      // Extract timestamp (field index 0)
      const timestamp = Number(interaction[0]?.value?.value || interaction[0]?.value || interaction[0]);
      const date = new Date(timestamp).toLocaleString();
      
      // Extract content (field index 5)
      const content = String(interaction[5]?.value?.value || interaction[5]?.value || interaction[5] || '');
      
      console.log(`   ${i + 1}. ${typeName}`);
      console.log(`      Date: ${date}`);
      if (content) {
        console.log(`      Content: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }
      console.log('');
      
      // Count by type
      switch (type) {
        case 0: stats.likes++; break;
        case 1: stats.unlikes++; break;
        case 2: stats.comments++; break;
        case 3: stats.reposts++; break;
        case 4: stats.unreposts++; break;
        case 6: stats.bookmarks++; break;
        case 7: stats.unbookmarks++; break;
      }
    } catch (err) {
      console.log(`   ${i + 1}. [Invalid interaction data]`);
    }
  }

  if (interactions.length > 10) {
    console.log(`   ... and ${interactions.length - 10} more\n`);
  }

  // Summary
  console.log('📊 INTERACTION SUMMARY');
  console.log('═══════════════════════');
  console.log(`   Total: ${interactions.length}`);
  console.log(`   Likes: ${stats.likes}`);
  console.log(`   Unlikes: ${stats.unlikes}`);
  console.log(`   Net Likes: ${stats.likes - stats.unlikes}`);
  console.log(`   Comments: ${stats.comments}`);
  console.log(`   Reposts: ${stats.reposts}`);
  console.log(`   Unreposts: ${stats.unreposts}`);
  console.log(`   Net Reposts: ${stats.reposts - stats.unreposts}`);
  console.log(`   Bookmarks: ${stats.bookmarks}`);
  console.log(`   Unbookmarks: ${stats.unbookmarks}`);
  console.log('');

  console.log('✅ Verification complete!');
  console.log('');
  console.log('💡 Tips:');
  console.log('   - Like/Unlike should cancel each other out');
  console.log('   - Net likes = total likes - total unlikes');
  console.log('   - Same logic applies to reposts');
  console.log('   - Comments are always additive');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run verification
verifyInteractions();
