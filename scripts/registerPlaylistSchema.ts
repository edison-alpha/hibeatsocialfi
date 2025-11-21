// Register Playlist Schema on Somnia Data Streams
// Schema for storing user playlists on blockchain

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file
const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env file');
}

if (!PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

const RPC_URL = 'https://dream-rpc.somnia.network';

async function registerPlaylistSchema() {
  console.log('🎵 Registering Playlist Schema on Somnia Data Streams\n');

  try {
    // Setup
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(RPC_URL),
    });

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    console.log('✅ SDK initialized');
    console.log(`📝 Account: ${account.address}\n`);

    // Define playlist schema
    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    
    console.log('📋 Schema Definition:');
    console.log('   ' + playlistSchema);
    console.log('');

    // Register schema
    console.log('📤 Registering schema...');
    const tx = await sdk.streams.registerSchema(playlistSchema);
    console.log(`✅ Schema registered! TX: ${tx}`);

    // Compute schema ID
    const schemaId = await sdk.streams.computeSchemaId(playlistSchema);
    console.log(`\n🔑 Schema ID: ${schemaId}`);

    console.log('\n✅ SUCCESS! Playlist schema registered on Somnia blockchain');
    console.log('\n📝 Add this to your .env file:');
    console.log(`VITE_PLAYLIST_SCHEMA_ID=${schemaId}`);

    console.log('\n📊 Schema Fields:');
    console.log('   - timestamp: When playlist was created/updated');
    console.log('   - playlistId: Unique playlist identifier');
    console.log('   - owner: Wallet address of playlist creator');
    console.log('   - title: Playlist name');
    console.log('   - description: Playlist description');
    console.log('   - coverHash: IPFS hash of cover image');
    console.log('   - trackIds: Comma-separated list of track IDs');
    console.log('   - isPublic: Whether playlist is public or private');
    console.log('   - isDeleted: Soft delete flag');

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

registerPlaylistSchema();
