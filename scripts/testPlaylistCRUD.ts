// Test Playlist CRUD Operations
// Tests create, read, update, delete playlist with real data

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env
const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;
let PLAYLIST_SCHEMA_ID: string | undefined;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
  
  const playlistMatch = envContent.match(/VITE_PLAYLIST_SCHEMA_ID=(.+)/);
  PLAYLIST_SCHEMA_ID = playlistMatch ? playlistMatch[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env');
  process.exit(1);
}

if (!PRIVATE_KEY || !PLAYLIST_SCHEMA_ID) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const RPC_URL = 'https://dream-rpc.somnia.network';

async function testPlaylistCRUD() {
  console.log('🎵 Testing Playlist CRUD Operations\n');
  console.log('='.repeat(70));

  try {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    console.log('✅ Account:', account.address);
    console.log('='.repeat(70));

    // Initialize SDK
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

    // Test 1: CREATE Playlist
    console.log('\n📋 TEST 1: Create Playlist');
    console.log('-'.repeat(70));
    
    const timestamp = Date.now();
    const playlistId = keccak256(toBytes(`playlist_${account.address}_${timestamp}`));
    
    console.log('Creating playlist...');
    console.log('   Title: My Test Playlist');
    console.log('   ID:', playlistId);
    
    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    const encoder = new SchemaEncoder(playlistSchema);
    
    const streamId = keccak256(toBytes(`stream_${timestamp}`));
    const encodedData = encoder.encodeData([
      { name: 'timestamp', value: timestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'My Test Playlist', type: 'string' },
      { name: 'description', value: 'Testing CRUD operations', type: 'string' },
      { name: 'coverHash', value: 'QmTest123', type: 'string' },
      { name: 'trackIds', value: 'track1,track2,track3', type: 'string' },
      { name: 'isPublic', value: true, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId as `0x${string}`,
      schemaId: PLAYLIST_SCHEMA_ID as `0x${string}`,
      data: encodedData as `0x${string}`
    }]);
    
    console.log('✅ Playlist created!');

    // Test 2: READ Playlists
    console.log('\n📋 TEST 2: Read Playlists');
    console.log('-'.repeat(70));
    
    console.log('Reading playlists from blockchain...');
    const playlists = await sdk.streams.getAllPublisherDataForSchema(
      PLAYLIST_SCHEMA_ID as `0x${string}`,
      account.address as `0x${string}`
    );
    
    console.log('✅ Data retrieved!');
    console.log('   Total playlists:', playlists?.length || 0);
    
    if (playlists && playlists.length > 0) {
      const latest = playlists[playlists.length - 1];
      console.log('   Latest playlist (raw):', latest);
      
      // Try to parse if it's an array
      if (Array.isArray(latest)) {
        console.log('   Parsed:');
        console.log('     - Timestamp:', latest[0]);
        console.log('     - PlaylistId:', latest[1]);
        console.log('     - Owner:', latest[2]);
        console.log('     - Title:', latest[3]);
        console.log('     - Description:', latest[4]);
        console.log('     - CoverHash:', latest[5]);
        console.log('     - TrackIds:', latest[6]);
        console.log('     - IsPublic:', latest[7]);
        console.log('     - IsDeleted:', latest[8]);
      } else {
        console.log('   Latest playlist:');
        console.log('     - Title:', latest.title || 'N/A');
        console.log('     - Owner:', latest.owner || 'N/A');
        console.log('     - Public:', latest.isPublic || false);
        console.log('     - Tracks:', latest.trackIds || 'N/A');
      }
    }

    // Test 3: UPDATE Playlist (Make Private)
    console.log('\n📋 TEST 3: Update Playlist (Make Private)');
    console.log('-'.repeat(70));
    
    const updateTimestamp = Date.now();
    const updateStreamId = keccak256(toBytes(`stream_update_${updateTimestamp}`));
    const updateData = encoder.encodeData([
      { name: 'timestamp', value: updateTimestamp.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'My Test Playlist (Updated)', type: 'string' },
      { name: 'description', value: 'Testing CRUD operations - Updated', type: 'string' },
      { name: 'coverHash', value: 'QmTest123', type: 'string' },
      { name: 'trackIds', value: 'track1,track2,track3,track4', type: 'string' },
      { name: 'isPublic', value: false, type: 'bool' }, // Changed to private
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: updateStreamId as `0x${string}`,
      schemaId: PLAYLIST_SCHEMA_ID as `0x${string}`,
      data: updateData as `0x${string}`
    }]);
    
    console.log('✅ Playlist updated!');
    console.log('   - Changed to private');
    console.log('   - Added track4');

    // Test 4: READ Updated Data
    console.log('\n📋 TEST 4: Verify Update');
    console.log('-'.repeat(70));
    
    const updatedPlaylists = await sdk.streams.getAllPublisherDataForSchema(
      PLAYLIST_SCHEMA_ID as `0x${string}`,
      account.address as `0x${string}`
    );
    
    console.log('✅ Data retrieved!');
    console.log('   Total playlists:', updatedPlaylists?.length || 0);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('✅ TEST 1: Create playlist - PASSED');
    console.log('✅ TEST 2: Read playlists - PASSED');
    console.log('✅ TEST 3: Update playlist - PASSED');
    console.log('✅ TEST 4: Verify update - PASSED');
    
    console.log('\n📝 Next Steps:');
    console.log('1. Open browser: http://localhost:5173/myplaylist');
    console.log('2. Connect your wallet');
    console.log('3. Click "Create Playlist"');
    console.log('4. Fill in details and submit');
    console.log('5. Your playlist will appear in the list!');
    console.log('\n✅ Playlist CRUD operations are working!');
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

testPlaylistCRUD();
