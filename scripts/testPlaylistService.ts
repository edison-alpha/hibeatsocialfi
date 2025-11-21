// Test Playlist Service
// Tests create, read, update, delete operations

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem';
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

async function testPlaylistService() {
  console.log('🧪 Testing Playlist Service\n');

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

    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    const schemaId = await sdk.streams.computeSchemaId(playlistSchema);
    const encoder = new SchemaEncoder(playlistSchema);

    console.log(`🔑 Schema ID: ${schemaId}\n`);

    // Test 1: Create Playlist
    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 1: Create Playlist');
    console.log('═══════════════════════════════════════════════════\n');

    const timestamp1 = Date.now();
    const playlistId1 = keccak256(toBytes(`playlist_${account.address}_${timestamp1}`));
    
    const streamId1 = keccak256(toBytes(`playlist_stream_${playlistId1}_${Date.now()}`));
    const encodedData1 = encoder.encodeData([
      { name: 'timestamp', value: timestamp1.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId1, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'My Electronic Collection', type: 'string' },
      { name: 'description', value: 'Best electronic tracks', type: 'string' },
      { name: 'coverHash', value: 'QmTest123', type: 'string' },
      { name: 'trackIds', value: 'track1,track2,track3', type: 'string' },
      { name: 'isPublic', value: true, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId1,
      schemaId: schemaId,
      data: encodedData1
    }]);

    console.log(`✅ Playlist created!`);
    console.log(`   ID: ${playlistId1.slice(0, 20)}...`);
    console.log(`   Title: My Electronic Collection`);
    console.log(`   Tracks: 3`);
    console.log(`   Public: Yes`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Create Another Playlist
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 2: Create Another Playlist');
    console.log('═══════════════════════════════════════════════════\n');

    const timestamp2 = Date.now();
    const playlistId2 = keccak256(toBytes(`playlist_${account.address}_${timestamp2}`));
    
    const streamId2 = keccak256(toBytes(`playlist_stream_${playlistId2}_${Date.now()}`));
    const encodedData2 = encoder.encodeData([
      { name: 'timestamp', value: timestamp2.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId2, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'Chill Vibes', type: 'string' },
      { name: 'description', value: 'Relaxing music', type: 'string' },
      { name: 'coverHash', value: 'QmTest456', type: 'string' },
      { name: 'trackIds', value: 'track4,track5', type: 'string' },
      { name: 'isPublic', value: false, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId2,
      schemaId: schemaId,
      data: encodedData2
    }]);

    console.log(`✅ Playlist created!`);
    console.log(`   ID: ${playlistId2.slice(0, 20)}...`);
    console.log(`   Title: Chill Vibes`);
    console.log(`   Tracks: 2`);
    console.log(`   Public: No`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Read All Playlists
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 3: Read All Playlists');
    console.log('═══════════════════════════════════════════════════\n');

    const allData = await sdk.streams.getAllPublisherDataForSchema(
      schemaId,
      account.address
    );

    console.log(`📊 Total records: ${allData?.length || 0}\n`);

    const playlists: any[] = [];

    if (allData && Array.isArray(allData)) {
      for (const item of allData) {
        try {
          const itemAny = item as any;
          
          const extractValue = (val: any): any => {
            if (val && typeof val === 'object' && 'value' in val) {
              return extractValue(val.value);
            }
            return val;
          };

          let playlistIdValue, ownerValue, titleValue, trackIdsValue, isDeletedValue;

          if (itemAny.playlistId) {
            playlistIdValue = itemAny.playlistId;
            ownerValue = itemAny.owner;
            titleValue = itemAny.title;
            trackIdsValue = itemAny.trackIds;
            isDeletedValue = itemAny.isDeleted;
          } else if (Array.isArray(itemAny)) {
            playlistIdValue = extractValue(itemAny.find((i: any) => i.name === 'playlistId')?.value);
            ownerValue = extractValue(itemAny.find((i: any) => i.name === 'owner')?.value);
            titleValue = extractValue(itemAny.find((i: any) => i.name === 'title')?.value);
            trackIdsValue = extractValue(itemAny.find((i: any) => i.name === 'trackIds')?.value);
            isDeletedValue = extractValue(itemAny.find((i: any) => i.name === 'isDeleted')?.value);
          }

          if (playlistIdValue && ownerValue && !isDeletedValue) {
            const trackIds = trackIdsValue ? String(trackIdsValue).split(',') : [];
            playlists.push({
              id: String(playlistIdValue),
              owner: String(ownerValue),
              title: String(titleValue),
              trackCount: trackIds.length
            });
          }
        } catch (error) {
          // Skip
        }
      }
    }

    console.log(`✅ Found ${playlists.length} playlists:\n`);
    playlists.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.title}`);
      console.log(`      ID: ${p.id.slice(0, 20)}...`);
      console.log(`      Tracks: ${p.trackCount}`);
      console.log(`      Owner: ${p.owner.slice(0, 10)}...`);
      console.log('');
    });

    // Test 4: Update Playlist (Add Track)
    console.log('═══════════════════════════════════════════════════');
    console.log('TEST 4: Update Playlist (Add Track)');
    console.log('═══════════════════════════════════════════════════\n');

    const timestamp3 = Date.now();
    const streamId3 = keccak256(toBytes(`playlist_stream_${playlistId1}_${Date.now()}`));
    const encodedData3 = encoder.encodeData([
      { name: 'timestamp', value: timestamp3.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId1, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'My Electronic Collection', type: 'string' },
      { name: 'description', value: 'Best electronic tracks', type: 'string' },
      { name: 'coverHash', value: 'QmTest123', type: 'string' },
      { name: 'trackIds', value: 'track1,track2,track3,track6', type: 'string' }, // Added track6
      { name: 'isPublic', value: true, type: 'bool' },
      { name: 'isDeleted', value: false, type: 'bool' }
    ]);

    await sdk.streams.set([{
      id: streamId3,
      schemaId: schemaId,
      data: encodedData3
    }]);

    console.log(`✅ Playlist updated!`);
    console.log(`   Added track: track6`);
    console.log(`   New track count: 4`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Delete Playlist (Soft Delete)
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 5: Delete Playlist (Soft Delete)');
    console.log('═══════════════════════════════════════════════════\n');

    const timestamp4 = Date.now();
    const streamId4 = keccak256(toBytes(`playlist_stream_${playlistId2}_${Date.now()}`));
    const encodedData4 = encoder.encodeData([
      { name: 'timestamp', value: timestamp4.toString(), type: 'uint64' },
      { name: 'playlistId', value: playlistId2, type: 'uint256' },
      { name: 'owner', value: account.address, type: 'address' },
      { name: 'title', value: 'Chill Vibes', type: 'string' },
      { name: 'description', value: 'Relaxing music', type: 'string' },
      { name: 'coverHash', value: 'QmTest456', type: 'string' },
      { name: 'trackIds', value: 'track4,track5', type: 'string' },
      { name: 'isPublic', value: false, type: 'bool' },
      { name: 'isDeleted', value: true, type: 'bool' } // Soft delete
    ]);

    await sdk.streams.set([{
      id: streamId4,
      schemaId: schemaId,
      data: encodedData4
    }]);

    console.log(`✅ Playlist deleted (soft delete)!`);
    console.log(`   Playlist: Chill Vibes`);
    console.log(`   Data remains on blockchain but marked as deleted`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Verify Final State
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 6: Verify Final State');
    console.log('═══════════════════════════════════════════════════\n');

    const finalData = await sdk.streams.getAllPublisherDataForSchema(
      schemaId,
      account.address
    );

    const activePlaylists: any[] = [];

    if (finalData && Array.isArray(finalData)) {
      for (const item of finalData) {
        try {
          const itemAny = item as any;
          
          const extractValue = (val: any): any => {
            if (val && typeof val === 'object' && 'value' in val) {
              return extractValue(val.value);
            }
            return val;
          };

          let playlistIdValue, titleValue, trackIdsValue, isDeletedValue;

          if (itemAny.playlistId) {
            playlistIdValue = itemAny.playlistId;
            titleValue = itemAny.title;
            trackIdsValue = itemAny.trackIds;
            isDeletedValue = itemAny.isDeleted;
          } else if (Array.isArray(itemAny)) {
            playlistIdValue = extractValue(itemAny.find((i: any) => i.name === 'playlistId')?.value);
            titleValue = extractValue(itemAny.find((i: any) => i.name === 'title')?.value);
            trackIdsValue = extractValue(itemAny.find((i: any) => i.name === 'trackIds')?.value);
            isDeletedValue = extractValue(itemAny.find((i: any) => i.name === 'isDeleted')?.value);
          }

          if (playlistIdValue && !isDeletedValue) {
            const trackIds = trackIdsValue ? String(trackIdsValue).split(',') : [];
            activePlaylists.push({
              id: String(playlistIdValue),
              title: String(titleValue),
              trackCount: trackIds.length
            });
          }
        } catch (error) {
          // Skip
        }
      }
    }

    console.log(`📊 Active playlists: ${activePlaylists.length}\n`);
    activePlaylists.forEach((p, index) => {
      console.log(`   ${index + 1}. ${p.title} (${p.trackCount} tracks)`);
    });

    console.log('\n✅ VERIFICATION:');
    console.log('─────────────────────────────────────────────────\n');

    let allPassed = true;

    if (activePlaylists.length === 1) {
      console.log('   ✅ 1 active playlist (Chill Vibes deleted)');
    } else {
      console.log(`   ❌ Expected 1 active playlist, got ${activePlaylists.length}`);
      allPassed = false;
    }

    const electronicPlaylist = activePlaylists.find(p => p.title === 'My Electronic Collection');
    if (electronicPlaylist && electronicPlaylist.trackCount === 4) {
      console.log('   ✅ Electronic Collection has 4 tracks (track added)');
    } else {
      console.log('   ❌ Electronic Collection should have 4 tracks');
      allPassed = false;
    }

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Playlist service working correctly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the results above.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

testPlaylistService();
