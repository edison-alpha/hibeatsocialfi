// Debug script for wallet activity
import { apolloClient } from '../src/lib/apollo-client';
import { gql } from '@apollo/client';

const TEST_ADDRESS = '0x82010A989EDda6ccB1758B79dEfc3FE3429A201A';

async function debugActivity() {
  console.log('🔍 Debugging Wallet Activity for:', TEST_ADDRESS);
  console.log('');

  try {
    // Test 1: Check if user has any songs
    console.log('📊 Test 1: Checking user songs...');
    const SONGS_QUERY = gql`
      query GetUserSongs($address: ID!) {
        songs(where: { artist: $address }, first: 5) {
          id
          tokenId
          title
          createdAt
          transactionHash
        }
      }
    `;
    
    const songsResult = await apolloClient.query({
      query: SONGS_QUERY,
      variables: { address: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('   Songs found:', songsResult.data.songs.length);
    if (songsResult.data.songs.length > 0) {
      console.log('   Sample:', songsResult.data.songs[0]);
    }
    console.log('');

    // Test 2: Check SongTransfer
    console.log('📊 Test 2: Checking song transfers...');
    const TRANSFERS_QUERY = gql`
      query GetTransfers($address: ID!) {
        songTransfers(
          where: {
            or: [
              { from: $address }
              { to: $address }
            ]
          }
          first: 5
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          transferType
          from {
            id
          }
          to {
            id
          }
          timestamp
          transactionHash
        }
      }
    `;
    
    const transfersResult = await apolloClient.query({
      query: TRANSFERS_QUERY,
      variables: { address: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('   Transfers found:', transfersResult.data.songTransfers.length);
    if (transfersResult.data.songTransfers.length > 0) {
      console.log('   Sample:', transfersResult.data.songTransfers[0]);
    }
    console.log('');

    // Test 3: Check UserProfile
    console.log('📊 Test 3: Checking user profile...');
    const PROFILE_QUERY = gql`
      query GetProfile($address: ID!) {
        userProfile(id: $address) {
          id
          username
          isArtist
          createdAt
        }
      }
    `;
    
    const profileResult = await apolloClient.query({
      query: PROFILE_QUERY,
      variables: { address: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('   Profile found:', profileResult.data.userProfile ? 'Yes' : 'No');
    if (profileResult.data.userProfile) {
      console.log('   Profile:', profileResult.data.userProfile);
    }
    console.log('');

    // Test 4: Check any activity at all
    console.log('📊 Test 4: Checking all songs in subgraph...');
    const ALL_SONGS_QUERY = gql`
      query GetAllSongs {
        songs(first: 5, orderBy: createdAt, orderDirection: desc) {
          id
          tokenId
          title
          artist {
            id
            username
          }
          createdAt
        }
      }
    `;
    
    const allSongsResult = await apolloClient.query({
      query: ALL_SONGS_QUERY,
      fetchPolicy: 'network-only',
    });
    
    console.log('   Total songs in subgraph:', allSongsResult.data.songs.length);
    if (allSongsResult.data.songs.length > 0) {
      console.log('   Latest song:', allSongsResult.data.songs[0]);
    }
    console.log('');

    // Summary
    console.log('📋 Summary:');
    console.log('   User Songs:', songsResult.data.songs.length);
    console.log('   Song Transfers:', transfersResult.data.songTransfers.length);
    console.log('   Profile Exists:', profileResult.data.userProfile ? 'Yes' : 'No');
    console.log('   Total Songs in Subgraph:', allSongsResult.data.songs.length);
    console.log('');

    if (songsResult.data.songs.length === 0 && 
        transfersResult.data.songTransfers.length === 0 &&
        allSongsResult.data.songs.length === 0) {
      console.log('⚠️  ISSUE: Subgraph has NO data at all!');
      console.log('   Possible causes:');
      console.log('   1. Subgraph not deployed');
      console.log('   2. Subgraph not synced');
      console.log('   3. No transactions have happened yet');
      console.log('   4. Wrong subgraph URL');
    } else if (songsResult.data.songs.length === 0 && transfersResult.data.songTransfers.length === 0) {
      console.log('⚠️  ISSUE: User has no activity');
      console.log('   This user has not minted or transferred any songs');
    } else {
      console.log('✅ Data found! Activity should display.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugActivity();
