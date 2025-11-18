/**
 * Verify Duplicate Like Prevention
 * 
 * Check if duplicate like actually overwrites (not adds)
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

const INTERACTIONS_SCHEMA = 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount';

async function verifyDuplicateLike() {
  console.log('🔍 Verifying Duplicate Like Prevention...\n');

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

  const interactionsSchemaId = await sdk.streams.computeSchemaId(INTERACTIONS_SCHEMA);
  console.log('📋 Interactions Schema ID:', interactionsSchemaId);

  // Read all interactions
  const allInteractions = await sdk.streams.getAllPublisherDataForSchema(interactionsSchemaId, account.address);
  
  if (!allInteractions) {
    console.log('❌ No interactions found');
    return;
  }

  console.log(`\n📊 Total interactions: ${allInteractions.length}\n`);

  // Parse interactions
  const interactionsEncoder = new SchemaEncoder(INTERACTIONS_SCHEMA);
  const parsedInteractions: any[] = [];

  for (const item of allInteractions) {
    try {
      const decoded = interactionsEncoder.decodeData(item.data);
      const interaction = {
        id: decoded[0]?.value?.toString() || 'unknown',
        timestamp: decoded[1]?.value?.toString() || 'unknown',
        type: Number(decoded[2]?.value || 0),
        targetId: decoded[3]?.value?.toString() || 'unknown',
        targetType: Number(decoded[4]?.value || 0),
        fromUser: decoded[5]?.value || 'unknown',
        content: decoded[6]?.value || '',
        parentId: decoded[7]?.value?.toString() || '0',
        tipAmount: decoded[8]?.value?.toString() || '0',
      };
      parsedInteractions.push(interaction);
    } catch (error) {
      console.log('⚠️ Failed to parse interaction:', error);
    }
  }

  console.log(`✅ Parsed ${parsedInteractions.length} interactions\n`);

  // Group by type
  const typeNames = ['LIKE', 'UNLIKE', 'COMMENT', 'REPOST', 'UNREPOST'];
  const byType: Record<string, any[]> = {
    LIKE: [],
    UNLIKE: [],
    COMMENT: [],
    REPOST: [],
    UNREPOST: [],
  };

  for (const interaction of parsedInteractions) {
    const typeName = typeNames[interaction.type] || 'UNKNOWN';
    if (byType[typeName]) {
      byType[typeName].push(interaction);
    }
  }

  console.log('📈 Interactions by Type:');
  console.log(`   LIKE: ${byType.LIKE.length}`);
  console.log(`   UNLIKE: ${byType.UNLIKE.length}`);
  console.log(`   COMMENT: ${byType.COMMENT.length}`);
  console.log(`   REPOST: ${byType.REPOST.length}`);
  console.log(`   UNREPOST: ${byType.UNREPOST.length}`);

  // Check for duplicate IDs
  console.log('\n🔍 Checking for duplicate IDs...');
  const idCounts = new Map<string, number>();
  
  for (const interaction of parsedInteractions) {
    const count = idCounts.get(interaction.id) || 0;
    idCounts.set(interaction.id, count + 1);
  }

  const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
  
  if (duplicates.length > 0) {
    console.log(`❌ Found ${duplicates.length} duplicate IDs:`);
    for (const [id, count] of duplicates) {
      console.log(`   ID ${id}: ${count} times`);
    }
  } else {
    console.log('✅ No duplicate IDs found! Each ID is unique.');
  }

  // Check likes for specific post (from test)
  const testPostId = '1762903664563'; // First post from test
  const likesForPost = byType.LIKE.filter(i => i.targetId === testPostId);
  
  console.log(`\n🎯 Likes for test post ${testPostId}:`);
  console.log(`   Count: ${likesForPost.length}`);
  
  if (likesForPost.length === 1) {
    console.log('   ✅ Only 1 like exists (duplicate was overwritten!)');
  } else if (likesForPost.length === 0) {
    console.log('   ⚠️ No likes found (may have been unliked)');
  } else {
    console.log(`   ❌ ${likesForPost.length} likes exist (duplicates not prevented)`);
  }

  // Show like details
  if (likesForPost.length > 0) {
    console.log('\n   Like details:');
    for (const like of likesForPost) {
      console.log(`   - ID: ${like.id}`);
      console.log(`     Timestamp: ${like.timestamp}`);
      console.log(`     From: ${like.fromUser}`);
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 CONCLUSION');
  console.log('═══════════════════════════════════════');
  
  if (duplicates.length === 0 && likesForPost.length <= 1) {
    console.log('✅ Duplicate like prevention is WORKING!');
    console.log('   - Same ID overwrites previous data');
    console.log('   - No duplicate likes in blockchain');
  } else {
    console.log('⚠️ Need to investigate further');
  }
  
  console.log('═══════════════════════════════════════\n');
}

verifyDuplicateLike().catch(console.error);
