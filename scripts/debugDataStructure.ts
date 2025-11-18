/**
 * Debug Data Structure - See actual structure from blockchain
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

import { SDK } from '@somnia-chain/streams';
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

async function debugDataStructure() {
  console.log('🔍 Debugging Data Structure...\n');

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

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  const postsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.posts);
  const interactionsSchemaId = await sdk.streams.computeSchemaId(SCHEMAS.interactions);

  // Get first post
  console.log('📝 Getting first post...\n');
  const allPosts = await sdk.streams.getAllPublisherDataForSchema(postsSchemaId, account.address);
  
  if (allPosts && allPosts.length > 0) {
    const firstPost = allPosts[0];
    
    console.log('Raw first post:');
    console.log(JSON.stringify(firstPost, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    console.log('\n');
    
    console.log('Type of first post:', typeof firstPost);
    console.log('Is array?', Array.isArray(firstPost));
    console.log('Keys:', Object.keys(firstPost));
    console.log('\n');
    
    if (Array.isArray(firstPost)) {
      console.log('Array length:', firstPost.length);
      console.log('\nFirst 5 elements:');
      for (let i = 0; i < Math.min(5, firstPost.length); i++) {
        const elem = firstPost[i];
        console.log(`[${i}]:`, typeof elem, elem);
      }
    }
  }

  // Get first interaction
  console.log('\n\n💬 Getting first interaction...\n');
  const allInteractions = await sdk.streams.getAllPublisherDataForSchema(interactionsSchemaId, account.address);
  
  if (allInteractions && allInteractions.length > 0) {
    const firstInteraction = allInteractions[0];
    
    console.log('Raw first interaction:');
    console.log(JSON.stringify(firstInteraction, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
    console.log('\n');
    
    console.log('Type of first interaction:', typeof firstInteraction);
    console.log('Is array?', Array.isArray(firstInteraction));
    console.log('Keys:', Object.keys(firstInteraction));
    console.log('\n');
    
    if (Array.isArray(firstInteraction)) {
      console.log('Array length:', firstInteraction.length);
      console.log('\nAll elements:');
      for (let i = 0; i < firstInteraction.length; i++) {
        const elem = firstInteraction[i];
        console.log(`[${i}]:`, typeof elem, elem);
      }
    }
  }
}

debugDataStructure().catch(console.error);
