// Register Playlist Schemas on Somnia Data Streams
// 1. Main Playlist Schema - For playlist CRUD
// 2. Playlist Interaction Schema - For social features (follow, like, play)

import { SDK } from '@somnia-chain/streams';
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

async function registerPlaylistSchemas() {
  console.log('🎵 Registering Playlist Schemas on Somnia Data Streams\n');
  console.log('=' .repeat(70));

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
    console.log('=' .repeat(70));

    // ===== SCHEMA 1: MAIN PLAYLIST SCHEMA =====
    console.log('\n📋 SCHEMA 1: Main Playlist Schema');
    console.log('-'.repeat(70));
    
    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    
    console.log('Schema Definition:');
    console.log('   ' + playlistSchema);
    console.log('');

    console.log('🔑 Computing schema ID...');
    const playlistSchemaId = await sdk.streams.computeSchemaId(playlistSchema);
    console.log(`✅ Schema ID: ${playlistSchemaId}`);

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

    // ===== SCHEMA 2: PLAYLIST INTERACTION SCHEMA =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SCHEMA 2: Playlist Interaction Schema');
    console.log('-'.repeat(70));
    
    const interactionSchema = 'uint64 timestamp, string playlistId, address userAddress, string interactionType';
    
    console.log('Schema Definition:');
    console.log('   ' + interactionSchema);
    console.log('');

    console.log('🔑 Computing schema ID...');
    const interactionSchemaId = await sdk.streams.computeSchemaId(interactionSchema);
    console.log(`✅ Schema ID: ${interactionSchemaId}`);

    console.log('\n📊 Schema Fields:');
    console.log('   - timestamp: When interaction occurred');
    console.log('   - playlistId: Target playlist identifier');
    console.log('   - userAddress: User who performed the interaction');
    console.log('   - interactionType: Type of interaction (follow, unfollow, like, unlike, play)');

    console.log('\n📝 Interaction Types:');
    console.log('   - follow: User followed the playlist');
    console.log('   - unfollow: User unfollowed the playlist');
    console.log('   - like: User liked the playlist');
    console.log('   - unlike: User unliked the playlist');
    console.log('   - play: Playlist was played');

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(70));
    console.log('\n✅ SUCCESS! Both playlist schema IDs computed');
    console.log('\n📝 Add these to your .env file:');
    console.log('=' .repeat(70));
    console.log(`VITE_PLAYLIST_SCHEMA_ID=${playlistSchemaId}`);
    console.log(`VITE_PLAYLIST_INTERACTION_SCHEMA_ID=${interactionSchemaId}`);
    console.log('=' .repeat(70));

    console.log('\n📚 Usage in Code:');
    console.log('-'.repeat(70));
    console.log('// Main Playlist Service');
    console.log('const playlistSchema = "uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted";');
    console.log('const schemaId = await sdk.streams.computeSchemaId(playlistSchema);');
    console.log('');
    console.log('// Playlist Interaction Service');
    console.log('const interactionSchema = "uint64 timestamp, string playlistId, address userAddress, string interactionType";');
    console.log('const schemaId = await sdk.streams.computeSchemaId(interactionSchema);');

    console.log('\n🎉 Registration Complete!');
    console.log('=' .repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message || error);
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

registerPlaylistSchemas();
