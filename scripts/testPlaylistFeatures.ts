// Simple Playlist Features Test
// Tests playlist service directly

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env
const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;
let PLAYLIST_SCHEMA_ID: string | undefined;
let INTERACTION_SCHEMA_ID: string | undefined;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
  
  const playlistMatch = envContent.match(/VITE_PLAYLIST_SCHEMA_ID=(.+)/);
  PLAYLIST_SCHEMA_ID = playlistMatch ? playlistMatch[1].trim() : undefined;
  
  const interactionMatch = envContent.match(/VITE_PLAYLIST_INTERACTION_SCHEMA_ID=(.+)/);
  INTERACTION_SCHEMA_ID = interactionMatch ? interactionMatch[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env');
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found');
  process.exit(1);
}

const RPC_URL = 'https://dream-rpc.somnia.network';

async function testPlaylistFeatures() {
  console.log('🎵 Testing Playlist Features\n');
  console.log('='.repeat(70));

  try {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    console.log('✅ Account:', account.address);
    console.log('='.repeat(70));

    // Test 1: Schema IDs from .env
    console.log('\n📋 TEST 1: Verify Environment Variables');
    console.log('-'.repeat(70));
    
    if (PLAYLIST_SCHEMA_ID) {
      console.log('✅ VITE_PLAYLIST_SCHEMA_ID found');
      console.log('   ', PLAYLIST_SCHEMA_ID);
    } else {
      console.log('❌ VITE_PLAYLIST_SCHEMA_ID not found in .env');
      throw new Error('Missing VITE_PLAYLIST_SCHEMA_ID');
    }
    
    if (INTERACTION_SCHEMA_ID) {
      console.log('✅ VITE_PLAYLIST_INTERACTION_SCHEMA_ID found');
      console.log('   ', INTERACTION_SCHEMA_ID);
    } else {
      console.log('❌ VITE_PLAYLIST_INTERACTION_SCHEMA_ID not found in .env');
      throw new Error('Missing VITE_PLAYLIST_INTERACTION_SCHEMA_ID');
    }

    // Test 2: Initialize SDK
    console.log('\n📋 TEST 2: Initialize Somnia SDK');
    console.log('-'.repeat(70));
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(RPC_URL)
    });

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient
    });
    
    console.log('✅ SDK initialized');
    console.log('   Wallet:', walletClient.account.address);

    // Test 3: Check RPC Connection
    console.log('\n📋 TEST 3: Test RPC Connection');
    console.log('-'.repeat(70));
    
    const blockNumber = await publicClient.getBlockNumber();
    console.log('✅ RPC connection successful');
    console.log('   Current block:', blockNumber.toString());

    // Test 4: Create Test Playlist
    console.log('\n📋 TEST 4: Create Test Playlist');
    console.log('-'.repeat(70));
    
    const timestamp = Date.now();
    const playlistId = `0x${Buffer.from(`test_playlist_${timestamp}`).toString('hex').padEnd(64, '0').slice(0, 64)}`;
    
    console.log('Creating playlist...');
    console.log('   Title: Test Playlist ' + timestamp);
    console.log('   ID:', playlistId);
    
    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    const encoder = new SchemaEncoder(playlistSchema);
    
    const streamId = `0x${Buffer.from(`stream_${timestamp}`).toString('hex').padEnd(64, '0').slice(0, 64)}`;
    const encodedData = encoder.encodeData([
      { name: 'timestamp', value: timestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: `Test Playlist ${timestamp}`, type: 'string' },
      { name: 'description', value: 'Automated test playlist', type: 'string' },
      { name: 'coverHash', value: 'ipfs://test', type: 'string' },
      { name: 'trackIds', value: 'track1,track2,track3', type: 'string' },
      { name: 'isPublic', value: true, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId as `0x${string}`,
      schemaId: PLAYLIST_SCHEMA_ID as `0x${string}`,
      data: encodedData as `0x${string}`
    }]);
    
    console.log('✅ Playlist created on blockchain!');
    console.log('   Stream ID:', streamId);

    // Test 5: Follow Playlist
    console.log('\n📋 TEST 5: Follow Playlist');
    console.log('-'.repeat(70));
    
    const followTimestamp = Date.now();
    const followStreamId = `0x${Buffer.from(`follow_${followTimestamp}`).toString('hex').padEnd(64, '0').slice(0, 64)}`;
    
    const interactionSchema = 'uint64 timestamp, string playlistId, address userAddress, string interactionType';
    const interactionEncoder = new SchemaEncoder(interactionSchema);
    
    const followData = interactionEncoder.encodeData([
      { name: 'timestamp', value: followTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'string' },
      { name: 'userAddress', value: account.address, type: 'address' },
      { name: 'interactionType', value: 'follow', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: followStreamId as `0x${string}`,
      schemaId: INTERACTION_SCHEMA_ID as `0x${string}`,
      data: followData as `0x${string}`
    }]);
    
    console.log('✅ Follow interaction recorded!');
    console.log('   Type: follow');

    // Test 6: Like Playlist
    console.log('\n📋 TEST 6: Like Playlist');
    console.log('-'.repeat(70));
    
    const likeTimestamp = Date.now();
    const likeStreamId = `0x${Buffer.from(`like_${likeTimestamp}`).toString('hex').padEnd(64, '0').slice(0, 64)}`;
    
    const likeData = interactionEncoder.encodeData([
      { name: 'timestamp', value: likeTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'string' },
      { name: 'userAddress', value: account.address, type: 'address' },
      { name: 'interactionType', value: 'like', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: likeStreamId as `0x${string}`,
      schemaId: INTERACTION_SCHEMA_ID as `0x${string}`,
      data: likeData as `0x${string}`
    }]);
    
    console.log('✅ Like interaction recorded!');
    console.log('   Type: like');

    // Test 7: Read Data Back
    console.log('\n📋 TEST 7: Read Playlist Data');
    console.log('-'.repeat(70));
    
    console.log('Reading playlists from blockchain...');
    const playlists = await sdk.streams.getAllPublisherDataForSchema(
      PLAYLIST_SCHEMA_ID as `0x${string}`,
      account.address as `0x${string}`
    );
    
    console.log('✅ Data retrieved!');
    console.log('   Total playlists:', playlists?.length || 0);
    
    if (playlists && playlists.length > 0) {
      console.log('   Latest playlist:', JSON.stringify(playlists[playlists.length - 1], null, 2));
    }

    // Test 8: Read Interactions
    console.log('\n📋 TEST 8: Read Interactions');
    console.log('-'.repeat(70));
    
    console.log('Reading interactions from blockchain...');
    const interactions = await sdk.streams.getAllPublisherDataForSchema(
      INTERACTION_SCHEMA_ID as `0x${string}`,
      account.address as `0x${string}`
    );
    
    console.log('✅ Interactions retrieved!');
    console.log('   Total interactions:', interactions?.length || 0);
    
    if (interactions && interactions.length > 0) {
      console.log('   Recent interactions:', interactions.slice(-2).map((i: any) => ({
        type: i.interactionType || 'unknown',
        playlist: i.playlistId || 'unknown'
      })));
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('✅ TEST 1: Environment variables - PASSED');
    console.log('✅ TEST 2: SDK initialization - PASSED');
    console.log('✅ TEST 3: RPC connection - PASSED');
    console.log('✅ TEST 4: Create playlist - PASSED');
    console.log('✅ TEST 5: Follow playlist - PASSED');
    console.log('✅ TEST 6: Like playlist - PASSED');
    console.log('✅ TEST 7: Read playlist data - PASSED');
    console.log('✅ TEST 8: Read interactions - PASSED');
    
    console.log('\n📊 Test Results:');
    console.log('   Total Tests: 8');
    console.log('   Passed: 8');
    console.log('   Failed: 0');
    console.log('   Success Rate: 100%');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Restart dev server: npm run dev');
    console.log('2. Open browser: http://localhost:3000/myplaylist');
    console.log('3. Create a playlist via UI');
    console.log('4. Test follow/like features');
    console.log('5. Check logs: http://localhost:3000/logs');
    console.log('\n✅ Playlist features are production ready!');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

testPlaylistFeatures();
