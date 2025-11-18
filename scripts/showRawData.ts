/**
 * Show Raw Data - Display posts and interactions as they will appear in UI
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-devnet.socialscan.io' },
  },
  testnet: true,
});

const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const WS_URL = process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';

const SCHEMAS = {
  posts: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
  interactions: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
};

enum ContentType {
  TEXT = 0,
  IMAGE = 1,
  VIDEO = 2,
  MUSIC = 3,
  QUOTE = 4,
}

enum InteractionType {
  LIKE = 0,
  UNLIKE = 1,
  COMMENT = 2,
  REPOST = 3,
  UNREPOST = 4,
}

async function showRawData() {
  console.log('📊 Showing Raw Data from Blockchain\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(WS_URL),
  });

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(RPC_URL),
  });

  console.log('👤 Account:', account.address);

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  const postsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.posts);
  const interactionsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.interactions);

  console.log('📋 Posts Schema ID:', postsSchemaId);
  console.log('📋 Interactions Schema ID:', interactionsSchemaId);
  console.log('');

  // ===== LOAD POSTS =====
  console.log('📝 LOADING POSTS...\n');
  const allPosts = await sdk.streams.getAllPublisherDataForSchema(postsSchemaId, account.address);
  
  if (!allPosts || allPosts.length === 0) {
    console.log('❌ No posts found\n');
  } else {
    console.log(`✅ Found ${allPosts.length} posts\n`);
    
    // Parse and display posts
    const postsEncoder = new SchemaEncoder(SCHEMAS.posts);
    const parsedPosts: any[] = [];
    
    for (let i = 0; i < Math.min(5, allPosts.length); i++) {
      const item = allPosts[i];
      
      try {
        // Data structure: array of {name, type, signature, value: {name, type, value}}
        const decoded = item;
        
        // Helper to extract value from nested structure
        const getValue = (val: any): any => {
          if (val === null || val === undefined) return '';
          // Check for nested value.value structure
          if (typeof val === 'object' && val.value !== undefined) {
            if (typeof val.value === 'object' && val.value.value !== undefined) {
              const innerValue = val.value.value;
              return typeof innerValue === 'bigint' ? innerValue.toString() : innerValue;
            }
            return typeof val.value === 'bigint' ? val.value.toString() : val.value;
          }
          if (typeof val === 'bigint') return val.toString();
          return val;
        };
        
        const post = {
          id: getValue(decoded[0]),
          timestamp: getValue(decoded[1]),
          content: String(getValue(decoded[2]) || ''),
          contentType: Number(getValue(decoded[3]) || 0),
          mediaHashes: String(getValue(decoded[4]) || ''),
          author: String(getValue(decoded[5]) || ''),
          quotedPostId: getValue(decoded[6]),
          replyToId: getValue(decoded[7]),
          mentions: String(getValue(decoded[8]) || ''),
          collectModule: String(getValue(decoded[9]) || ''),
          collectPrice: getValue(decoded[10]),
          collectLimit: getValue(decoded[11]),
          collectCount: getValue(decoded[12]),
          isGated: Boolean(getValue(decoded[13])),
          referrer: String(getValue(decoded[14]) || ''),
          nftTokenId: getValue(decoded[15]),
          isDeleted: Boolean(getValue(decoded[16])),
          isPinned: Boolean(getValue(decoded[17])),
        };
        
        parsedPosts.push(post);
        
        console.log(`─────────────────────────────────────────────────────────────`);
        console.log(`POST #${i + 1}`);
        console.log(`─────────────────────────────────────────────────────────────`);
        console.log(`ID:           ${post.id}`);
        console.log(`Timestamp:    ${post.timestamp} (${new Date(Number(post.timestamp)).toLocaleString()})`);
        console.log(`Content:      ${post.content.substring(0, 60)}${post.content.length > 60 ? '...' : ''}`);
        console.log(`Type:         ${ContentType[post.contentType] || 'UNKNOWN'} (${post.contentType})`);
        console.log(`Media:        ${post.mediaHashes || '(none)'}`);
        console.log(`Author:       ${post.author}`);
        console.log(`Quoted Post:  ${post.quotedPostId && post.quotedPostId !== '0' ? post.quotedPostId : '(none)'}`);
        console.log(`Reply To:     ${post.replyToId && post.replyToId !== '0' ? post.replyToId : '(none)'}`);
        console.log(`Deleted:      ${post.isDeleted}`);
        console.log(`Pinned:       ${post.isPinned}`);
        console.log('');
        
      } catch (error: any) {
        console.log(`❌ Failed to parse post ${i}:`, error.message);
      }
    }
    
    if (allPosts.length > 5) {
      console.log(`... and ${allPosts.length - 5} more posts\n`);
    }
  }

  // ===== LOAD INTERACTIONS =====
  console.log('\n💬 LOADING INTERACTIONS...\n');
  const allInteractions = await sdk.streams.getAllPublisherDataForSchema(interactionsSchemaId, account.address);
  
  if (!allInteractions || allInteractions.length === 0) {
    console.log('❌ No interactions found\n');
  } else {
    console.log(`✅ Found ${allInteractions.length} interactions\n`);
    
    // Parse and display interactions
    const interactionsEncoder = new SchemaEncoder(SCHEMAS.interactions);
    const parsedInteractions: any[] = [];
    
    // Group by type
    const byType: Record<string, any[]> = {
      LIKE: [],
      UNLIKE: [],
      COMMENT: [],
      REPOST: [],
      UNREPOST: [],
    };
    
    for (let i = 0; i < allInteractions.length; i++) {
      const item = allInteractions[i];
      
      try {
        // Data structure: array of {name, type, signature, value: {name, type, value}}
        const decoded = item;
        
        // Helper to extract value from nested structure
        const getValue = (val: any): any => {
          if (val === null || val === undefined) return '';
          // Check for nested value.value structure
          if (typeof val === 'object' && val.value !== undefined) {
            if (typeof val.value === 'object' && val.value.value !== undefined) {
              const innerValue = val.value.value;
              return typeof innerValue === 'bigint' ? innerValue.toString() : innerValue;
            }
            return typeof val.value === 'bigint' ? val.value.toString() : val.value;
          }
          if (typeof val === 'bigint') return val.toString();
          return val;
        };
        
        const interaction = {
          id: getValue(decoded[0]),
          timestamp: getValue(decoded[1]),
          type: Number(getValue(decoded[2]) || 0),
          targetId: getValue(decoded[3]),
          targetType: Number(getValue(decoded[4]) || 0),
          fromUser: String(getValue(decoded[5]) || ''),
          content: String(getValue(decoded[6]) || ''),
          parentId: getValue(decoded[7]),
          tipAmount: getValue(decoded[8]),
        };
        
        parsedInteractions.push(interaction);
        
        const typeName = InteractionType[interaction.type] || 'UNKNOWN';
        if (byType[typeName]) {
          byType[typeName].push(interaction);
        }
        
      } catch (error: any) {
        // Skip failed parsing
      }
    }
    
    // Display summary
    console.log('📊 INTERACTION SUMMARY:');
    console.log(`   LIKE:     ${byType.LIKE.length}`);
    console.log(`   UNLIKE:   ${byType.UNLIKE.length}`);
    console.log(`   COMMENT:  ${byType.COMMENT.length}`);
    console.log(`   REPOST:   ${byType.REPOST.length}`);
    console.log(`   UNREPOST: ${byType.UNREPOST.length}`);
    console.log('');
    
    // Show sample of each type
    for (const [typeName, interactions] of Object.entries(byType)) {
      if (interactions.length > 0) {
        console.log(`─────────────────────────────────────────────────────────────`);
        console.log(`${typeName} INTERACTIONS (${interactions.length} total)`);
        console.log(`─────────────────────────────────────────────────────────────`);
        
        // Show first 3
        for (let i = 0; i < Math.min(3, interactions.length); i++) {
          const interaction = interactions[i];
          console.log(`\n${typeName} #${i + 1}:`);
          console.log(`  ID:        ${interaction.id}`);
          console.log(`  Timestamp: ${interaction.timestamp} (${new Date(Number(interaction.timestamp)).toLocaleString()})`);
          console.log(`  Target:    ${interaction.targetId}`);
          console.log(`  From:      ${interaction.fromUser}`);
          if (interaction.content) {
            console.log(`  Content:   ${interaction.content.substring(0, 50)}${interaction.content.length > 50 ? '...' : ''}`);
          }
        }
        
        if (interactions.length > 3) {
          console.log(`\n  ... and ${interactions.length - 3} more ${typeName} interactions`);
        }
        console.log('');
      }
    }
  }

  // ===== AGGREGATE DATA (AS IN UI) =====
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎨 DATA AS IT WILL APPEAR IN UI');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Parse all data
  const postsEncoder = new SchemaEncoder(SCHEMAS.posts);
  const interactionsEncoder = new SchemaEncoder(SCHEMAS.interactions);
  
  const posts: any[] = [];
  const interactions: any[] = [];
  
  // Parse posts
  if (allPosts) {
    for (const item of allPosts) {
      try {
        const decoded = item;
        
        const getValue = (val: any): any => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'object' && val.value !== undefined) {
            if (typeof val.value === 'object' && val.value.value !== undefined) {
              const innerValue = val.value.value;
              return typeof innerValue === 'bigint' ? innerValue.toString() : innerValue;
            }
            return typeof val.value === 'bigint' ? val.value.toString() : val.value;
          }
          if (typeof val === 'bigint') return val.toString();
          return val;
        };
        
        posts.push({
          id: getValue(decoded[0]),
          timestamp: Number(getValue(decoded[1]) || 0),
          content: String(getValue(decoded[2]) || ''),
          contentType: Number(getValue(decoded[3]) || 0),
          author: String(getValue(decoded[5]) || ''),
        });
      } catch (error) {
        // Skip
      }
    }
  }
  
  // Parse interactions
  if (allInteractions) {
    for (const item of allInteractions) {
      try {
        const decoded = item;
        
        const getValue = (val: any): any => {
          if (val === null || val === undefined) return '';
          if (typeof val === 'object' && val.value !== undefined) {
            if (typeof val.value === 'object' && val.value.value !== undefined) {
              const innerValue = val.value.value;
              return typeof innerValue === 'bigint' ? innerValue.toString() : innerValue;
            }
            return typeof val.value === 'bigint' ? val.value.toString() : val.value;
          }
          if (typeof val === 'bigint') return val.toString();
          return val;
        };
        
        interactions.push({
          id: getValue(decoded[0]),
          timestamp: Number(getValue(decoded[1]) || 0),
          type: Number(getValue(decoded[2]) || 0),
          targetId: getValue(decoded[3]),
          fromUser: String(getValue(decoded[5]) || '').toLowerCase(),
          content: String(getValue(decoded[6]) || ''),
        });
      } catch (error) {
        // Skip
      }
    }
  }
  
  // Aggregate stats per post
  const postStats = new Map<string, any>();
  
  for (const post of posts) {
    postStats.set(post.id, {
      likes: 0,
      comments: 0,
      reposts: 0,
      likedBy: new Set<string>(),
      repostedBy: new Set<string>(),
    });
  }
  
  // Process interactions chronologically
  const sortedInteractions = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const interaction of sortedInteractions) {
    const stats = postStats.get(interaction.targetId);
    if (!stats) continue;
    
    const userLower = interaction.fromUser.toLowerCase();
    
    switch (interaction.type) {
      case 0: // LIKE
        stats.likedBy.add(userLower);
        break;
      case 1: // UNLIKE
        stats.likedBy.delete(userLower);
        break;
      case 2: // COMMENT
        stats.comments++;
        break;
      case 3: // REPOST
        stats.repostedBy.add(userLower);
        break;
      case 4: // UNREPOST
        stats.repostedBy.delete(userLower);
        break;
    }
  }
  
  // Calculate final counts
  for (const [postId, stats] of postStats.entries()) {
    stats.likes = stats.likedBy.size;
    stats.reposts = stats.repostedBy.size;
  }
  
  // Display posts with stats (latest 5)
  const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  
  for (let i = 0; i < sortedPosts.length; i++) {
    const post = sortedPosts[i];
    const stats = postStats.get(post.id);
    
    console.log(`─────────────────────────────────────────────────────────────`);
    console.log(`POST #${i + 1} (UI View)`);
    console.log(`─────────────────────────────────────────────────────────────`);
    const contentStr = String(post.content || '');
    console.log(`Content:  ${contentStr.substring(0, 60)}${contentStr.length > 60 ? '...' : ''}`);
    console.log(`Author:   ${post.author}`);
    console.log(`Time:     ${new Date(post.timestamp).toLocaleString()}`);
    console.log('');
    console.log(`❤️  Likes:    ${stats?.likes || 0}`);
    console.log(`💬 Comments: ${stats?.comments || 0}`);
    console.log(`🔄 Reposts:  ${stats?.reposts || 0}`);
    
    if (stats && stats.likedBy.size > 0) {
      console.log(`\nLiked by: ${Array.from(stats.likedBy).map((u: string) => String(u).substring(0, 10) + '...').join(', ')}`);
    }
    console.log('');
  }
  
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ Data display complete!\n');
}

showRawData().catch(console.error);
