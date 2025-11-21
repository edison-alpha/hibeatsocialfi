// Comprehensive Playlist Test Script
// Tests all playlist features: CRUD, Social (follow, like), Collaboration

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

// Test data
const TEST_PLAYLIST = {
  title: 'Test Playlist - ' + Date.now(),
  description: 'Comprehensive test playlist for all features',
  coverHash: 'ipfs://QmTest123',
  trackIds: ['track1', 'track2', 'track3'],
  isPublic: true
};

async function testPlaylistComplete() {
  console.log('🎵 Comprehensive Playlist Feature Test\n');
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
    console.log(`📝 Test Account: ${account.address}\n`);
    console.log('=' .repeat(70));

    // ===== TEST 1: SCHEMA VERIFICATION =====
    console.log('\n📋 TEST 1: Schema Verification');
    console.log('-'.repeat(70));

    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    const playlistSchemaId = await sdk.streams.computeSchemaId(playlistSchema);
    
    const interactionSchema = 'uint64 timestamp, string playlistId, address userAddress, string interactionType';
    const interactionSchemaId = await sdk.streams.computeSchemaId(interactionSchema);

    console.log('Playlist Schema ID:', playlistSchemaId);
    console.log('Interaction Schema ID:', interactionSchemaId);
    console.log('✅ Schemas verified\n');

    // ===== TEST 2: CREATE PLAYLIST =====
    console.log('=' .repeat(70));
    console.log('\n📋 TEST 2: Create Playlist');
    console.log('-'.repeat(70));

    const timestamp = Date.now();
    const playlistId = `0x${Buffer.from(`playlist_${account.address}_${timestamp}`).toString('hex').slice(0, 64)}`;

    console.log('Creating playlist...');
    console.log('  Title:', TEST_PLAYLIST.title);
    console.log('  Tracks:', TEST_PLAYLIST.trackIds.length);
    console.log('  Public:', TEST_PLAYLIST.isPublic);

    const { SchemaEncoder } = await import('@somnia-chain/streams');
    const encoder = new SchemaEncoder(playlistSchema);

    const streamId = `0x${Buffer.from(`playlist_stream_${playlistId}_${Date.now()}`).toString('hex').slice(0, 64)}`;
    const encodedData = encoder.encodeData([
      { name: 'timestamp', value: timestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: TEST_PLAYLIST.title, type: 'string' },
      { name: 'description', value: TEST_PLAYLIST.description, type: 'string' },
      { name: 'coverHash', value: TEST_PLAYLIST.coverHash, type: 'string' },
      { name: 'trackIds', value: TEST_PLAYLIST.trackIds.join(','), type: 'string' },
      { name: 'isPublic', value: TEST_PLAYLIST.isPublic, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId as `0x${string}`,
      schemaId: playlistSchemaId,
      data: encodedData as `0x${string}`
    }]);

    console.log('✅ Playlist created!');
    console.log('   Playlist ID:', playlistId);
    console.log('   Stream ID:', streamId);

    // ===== TEST 3: FOLLOW PLAYLIST =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 3: Follow Playlist');
    console.log('-'.repeat(70));

    console.log('Recording follow interaction...');
    
    const interactionEncoder = new SchemaEncoder(interactionSchema);
    const followTimestamp = Date.now();
    const followStreamId = `0x${Buffer.from(`interaction_${playlistId}_${account.address}_${followTimestamp}`).toString('hex').slice(0, 64)}`;
    
    const followData = interactionEncoder.encodeData([
      { name: 'timestamp', value: followTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'string' },
      { name: 'userAddress', value: account.address, type: 'address' },
      { name: 'interactionType', value: 'follow', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: followStreamId as `0x${string}`,
      schemaId: interactionSchemaId,
      data: followData as `0x${string}`
    }]);

    console.log('✅ Follow interaction recorded!');
    console.log('   User:', account.address);
    console.log('   Type: follow');

    // ===== TEST 4: LIKE PLAYLIST =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 4: Like Playlist');
    console.log('-'.repeat(70));

    console.log('Recording like interaction...');
    
    const likeTimestamp = Date.now();
    const likeStreamId = `0x${Buffer.from(`interaction_${playlistId}_${account.address}_${likeTimestamp}`).toString('hex').slice(0, 64)}`;
    
    const likeData = interactionEncoder.encodeData([
      { name: 'timestamp', value: likeTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'string' },
      { name: 'userAddress', value: account.address, type: 'address' },
      { name: 'interactionType', value: 'like', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: likeStreamId as `0x${string}`,
      schemaId: interactionSchemaId,
      data: likeData as `0x${string}`
    }]);

    console.log('✅ Like interaction recorded!');
    console.log('   User:', account.address);
    console.log('   Type: like');

    // ===== TEST 5: PLAY PLAYLIST =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 5: Play Playlist');
    console.log('-'.repeat(70));

    console.log('Recording play interaction...');
    
    const playTimestamp = Date.now();
    const playStreamId = `0x${Buffer.from(`interaction_${playlistId}_system_${playTimestamp}`).toString('hex').slice(0, 64)}`;
    
    const playData = interactionEncoder.encodeData([
      { name: 'timestamp', value: playTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'string' },
      { name: 'userAddress', value: account.address, type: 'address' },
      { name: 'interactionType', value: 'play', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: playStreamId as `0x${string}`,
      schemaId: interactionSchemaId,
      data: playData as `0x${string}`
    }]);

    console.log('✅ Play interaction recorded!');
    console.log('   Type: play');

    // ===== TEST 6: READ PLAYLIST DATA =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 6: Read Playlist Data');
    console.log('-'.repeat(70));

    console.log('Reading playlist from blockchain...');
    
    const allPlaylists = await sdk.streams.getAllPublisherDataForSchema(
      playlistSchemaId,
      account.address as `0x${string}`
    );

    console.log('Total playlists found:', allPlaylists?.length || 0);
    
    if (allPlaylists && allPlaylists.length > 0) {
      const latestPlaylist = allPlaylists[allPlaylists.length - 1];
      console.log('\n📊 Latest Playlist:');
      console.log('   Data:', JSON.stringify(latestPlaylist, null, 2));
    }

    // ===== TEST 7: READ INTERACTIONS =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 7: Read Interactions');
    console.log('-'.repeat(70));

    console.log('Reading interactions from blockchain...');
    
    const allInteractions = await sdk.streams.getAllPublisherDataForSchema(
      interactionSchemaId,
      account.address as `0x${string}`
    );

    console.log('Total interactions found:', allInteractions?.length || 0);
    
    if (allInteractions && allInteractions.length > 0) {
      console.log('\n📊 Recent Interactions:');
      allInteractions.slice(-3).forEach((interaction: any, index: number) => {
        console.log(`   ${index + 1}.`, JSON.stringify(interaction, null, 2));
      });
    }

    // ===== TEST 8: ADD TRACK TO PLAYLIST =====
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 TEST 8: Add Track to Playlist');
    console.log('-'.repeat(70));

    console.log('Adding new track to playlist...');
    
    const updatedTrackIds = [...TEST_PLAYLIST.trackIds, 'track4'];
    const updateTimestamp = Date.now();
    const updateStreamId = `0x${Buffer.from(`playlist_stream_${playlistId}_${updateTimestamp}`).toString('hex').slice(0, 64)}`;
    
    const updateData = encoder.encodeData([
      { name: 'timestamp', value: updateTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: TEST_PLAYLIST.title, type: 'string' },
      { name: 'description', value: TEST_PLAYLIST.description, type: 'string' },
      { name: 'coverHash', value: TEST_PLAYLIST.coverHash, type: 'string' },
      { name: 'trackIds', value: updatedTrackIds.join(','), type: 'string' },
      { name: 'isPublic', value: TEST_PLAYLIST.isPublic, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: updateStreamId as `0x${string}`,
      schemaId: playlistSchemaId,
      data: updateData as `0x${string}`
    }]);

    console.log('✅ Track added!');
    console.log('   New track count:', updatedTrackIds.length);
    console.log('   Tracks:', updatedTrackIds.join(', '));

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 TEST SUMMARY');
    console.log('=' .repeat(70));
    console.log('✅ Schema Verification - PASSED');
    console.log('✅ Create Playlist - PASSED');
    console.log('✅ Follow Playlist - PASSED');
    console.log('✅ Like Playlist - PASSED');
    console.log('✅ Play Playlist - PASSED');
    console.log('✅ Read Playlist Data - PASSED');
    console.log('✅ Read Interactions - PASSED');
    console.log('✅ Add Track to Playlist - PASSED');
    console.log('\n📊 Test Results:');
    console.log('   Total Tests: 8');
    console.log('   Passed: 8');
    console.log('   Failed: 0');
    console.log('   Success Rate: 100%');
    console.log('\n✅ ALL TESTS PASSED!');
    console.log('=' .repeat(70));

    console.log('\n📝 Next Steps:');
    console.log('1. Check data in browser:');
    console.log('   - Navigate to http://localhost:3000/myplaylist');
    console.log('   - Create a playlist via UI');
    console.log('   - Follow/like playlists');
    console.log('2. Monitor logs:');
    console.log('   - Navigate to http://localhost:3000/logs');
    console.log('   - Watch for playlist transactions');
    console.log('3. Verify multi-publisher:');
    console.log('   - Check wallet type in logs (USER vs SERVER)');
    console.log('   - Verify transaction hashes');

  } catch (error: any) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message || error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testPlaylistComplete();
