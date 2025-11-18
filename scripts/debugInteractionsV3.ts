/**
 * Debug script untuk memeriksa interactions di blockchain
 * 
 * Gunakan untuk verify apakah like/unlike/comment/repost tersimpan dengan benar
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// Define Somnia testnet inline
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

const SOMNIA_CONFIG_V3 = {
  rpcUrl: process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  wsUrl: process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws',
  schemas: {
    interactions: 'hibeats_interactions_v3',
  },
  schemaStrings: {
    interactions: 'uint256 timestamp, uint8 interactionType, bytes32 targetId, uint8 targetType, address fromUser, string content, bytes32 parentId',
  },
};

enum InteractionType {
  LIKE = 0,
  UNLIKE = 1,
  COMMENT = 2,
  REPOST = 3,
  UNREPOST = 4,
  DELETE = 5,
  BOOKMARK = 6,
  UNBOOKMARK = 7,
}

enum TargetType {
  POST = 0,
  COMMENT = 1,
}

const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY as `0x${string}`;

async function debugInteractions() {
  console.log('🔍 [DEBUG] Starting interaction debug...\n');

  // Initialize clients
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(SOMNIA_CONFIG_V3.wsUrl),
  });

  const account = privateKeyToAccount(PRIVATE_KEY);
  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(SOMNIA_CONFIG_V3.rpcUrl),
  });

  console.log('👤 Publisher:', account.address);

  // Initialize SDK
  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  // Get schema ID
  const schemaString = SOMNIA_CONFIG_V3.schemaStrings.interactions;
  const schemaId = await sdk.streams.computeSchemaId(schemaString);
  console.log('📋 Schema ID:', schemaId);

  // Load all interactions
  console.log('\n📚 Loading all interactions from blockchain...');
  const rawData = await sdk.streams.getAllPublisherDataForSchema(schemaId, account.address);
  console.log(`✅ Found ${rawData.length} total interactions\n`);

  if (rawData.length === 0) {
    console.log('❌ No interactions found! This is the problem.');
    return;
  }

  // Decode and display interactions
  console.log('📊 Interaction Details:\n');
  console.log('─'.repeat(100));
  
  const interactions: any[] = [];
  
  for (let i = 0; i < rawData.length; i++) {
    try {
      const item = rawData[i] as any;
      
      // Decode with nested value.value structure
      const timestamp = Number((item[0] as any)?.value?.value || (item[0] as any)?.value || item[0]);
      const interactionType = Number((item[1] as any)?.value?.value || (item[1] as any)?.value || item[1]);
      const targetId = String((item[2] as any)?.value?.value || (item[2] as any)?.value || item[2] || '');
      const targetType = Number((item[3] as any)?.value?.value || (item[3] as any)?.value || item[3]);
      const fromUser = String((item[4] as any)?.value?.value || (item[4] as any)?.value || item[4] || '');
      const content = String((item[5] as any)?.value?.value || (item[5] as any)?.value || item[5] || '');
      const parentId = String((item[6] as any)?.value?.value || (item[6] as any)?.value || item[6] || '');
      
      const interaction = {
        index: i,
        timestamp,
        interactionType: InteractionType[interactionType],
        targetId: targetId.substring(0, 30) + '...',
        targetType: TargetType[targetType],
        fromUser: fromUser.substring(0, 10) + '...',
        content: content.substring(0, 50),
        parentId: parentId.substring(0, 20) + '...',
        date: new Date(timestamp).toLocaleString()
      };
      
      interactions.push(interaction);
      
      console.log(`[${i}] ${interaction.interactionType} | ${interaction.date}`);
      console.log(`    Target: ${interaction.targetId}`);
      console.log(`    From: ${interaction.fromUser}`);
      if (content) console.log(`    Content: ${content}`);
      console.log('─'.repeat(100));
      
    } catch (error: any) {
      console.error(`❌ Failed to decode interaction ${i}:`, error.message);
    }
  }

  // Group by type
  console.log('\n📈 Summary by Type:\n');
  const byType: Record<string, number> = {};
  interactions.forEach(i => {
    byType[i.interactionType] = (byType[i.interactionType] || 0) + 1;
  });
  
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  // Group by target
  console.log('\n🎯 Summary by Target Post:\n');
  const byTarget: Record<string, any[]> = {};
  interactions.forEach(i => {
    if (!byTarget[i.targetId]) {
      byTarget[i.targetId] = [];
    }
    byTarget[i.targetId].push(i);
  });
  
  Object.entries(byTarget).forEach(([targetId, inters]) => {
    console.log(`\n  Post: ${targetId}`);
    const likes = inters.filter(i => i.interactionType === 'LIKE').length;
    const unlikes = inters.filter(i => i.interactionType === 'UNLIKE').length;
    const comments = inters.filter(i => i.interactionType === 'COMMENT').length;
    const reposts = inters.filter(i => i.interactionType === 'REPOST').length;
    const unreposts = inters.filter(i => i.interactionType === 'UNREPOST').length;
    
    console.log(`    Likes: ${likes} | Unlikes: ${unlikes} | Net: ${likes - unlikes}`);
    console.log(`    Comments: ${comments}`);
    console.log(`    Reposts: ${reposts} | Unreposts: ${unreposts} | Net: ${reposts - unreposts}`);
  });

  console.log('\n✅ Debug complete!');
}

debugInteractions().catch(console.error);
