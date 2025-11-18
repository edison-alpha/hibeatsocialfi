// Test script to check if WalletActivity and SongTransfer are indexed
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';
import fetch from 'cross-fetch';

const SUBGRAPH_URL = process.env.VITE_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/your-subgraph-id';

const client = new ApolloClient({
  link: new HttpLink({
    uri: SUBGRAPH_URL,
    fetch,
  }),
  cache: new InMemoryCache(),
});

async function testWalletActivity() {
  console.log('🔍 Testing WalletActivity query...\n');
  
  const TEST_ADDRESS = '0x82010A989EDda6ccB1758B79dEfc3FE3429A201A';
  
  try {
    // Test 1: Get all wallet activities
    const WALLET_ACTIVITY_QUERY = gql`
      query GetWalletActivities($userAddress: ID!) {
        walletActivities(
          first: 10
          orderBy: timestamp
          orderDirection: desc
          where: { user: $userAddress }
        ) {
          id
          activityType
          user {
            id
            username
          }
          from {
            id
            username
          }
          to {
            id
            username
          }
          amount
          token
          status
          description
          timestamp
          transactionHash
        }
      }
    `;
    
    const result1 = await client.query({
      query: WALLET_ACTIVITY_QUERY,
      variables: { userAddress: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('✅ WalletActivity query result:');
    console.log(`   Found ${result1.data.walletActivities.length} activities`);
    if (result1.data.walletActivities.length > 0) {
      console.log('   Sample:', JSON.stringify(result1.data.walletActivities[0], null, 2));
    }
    console.log('');
    
    // Test 2: Get song transfers
    const SONG_TRANSFER_QUERY = gql`
      query GetSongTransfers($userAddress: ID!) {
        songTransfers(
          first: 10
          orderBy: timestamp
          orderDirection: desc
          where: {
            or: [
              { from: $userAddress }
              { to: $userAddress }
            ]
          }
        ) {
          id
          transferType
          from {
            id
            username
          }
          to {
            id
            username
          }
          song {
            id
            title
          }
          timestamp
          transactionHash
        }
      }
    `;
    
    const result2 = await client.query({
      query: SONG_TRANSFER_QUERY,
      variables: { userAddress: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('✅ SongTransfer query result:');
    console.log(`   Found ${result2.data.songTransfers.length} transfers`);
    if (result2.data.songTransfers.length > 0) {
      console.log('   Sample:', JSON.stringify(result2.data.songTransfers[0], null, 2));
    }
    console.log('');
    
    // Test 3: Get user songs
    const USER_SONGS_QUERY = gql`
      query GetUserSongs($artistId: ID!) {
        songs(
          first: 10
          where: { artist: $artistId }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          tokenId
          title
          artist {
            id
            username
          }
          owner {
            id
            username
          }
          createdAt
          transactionHash
        }
      }
    `;
    
    const result3 = await client.query({
      query: USER_SONGS_QUERY,
      variables: { artistId: TEST_ADDRESS.toLowerCase() },
      fetchPolicy: 'network-only',
    });
    
    console.log('✅ User Songs query result:');
    console.log(`   Found ${result3.data.songs.length} songs`);
    if (result3.data.songs.length > 0) {
      console.log('   Sample:', JSON.stringify(result3.data.songs[0], null, 2));
    }
    console.log('');
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   WalletActivities: ${result1.data.walletActivities.length}`);
    console.log(`   SongTransfers: ${result2.data.songTransfers.length}`);
    console.log(`   Songs: ${result3.data.songs.length}`);
    
    if (result1.data.walletActivities.length === 0 && 
        result2.data.songTransfers.length === 0 && 
        result3.data.songs.length === 0) {
      console.log('\n⚠️  No data found! Possible issues:');
      console.log('   1. Subgraph not deployed with latest schema');
      console.log('   2. Subgraph not synced yet');
      console.log('   3. User has no on-chain activity');
      console.log('   4. Wrong subgraph URL');
    }
    
  } catch (error) {
    console.error('❌ Error testing queries:', error);
  }
}

testWalletActivity();
