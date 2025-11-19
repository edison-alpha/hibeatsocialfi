// Check users in Subgraph for @mention feature
import { apolloClient } from '../src/lib/apollo-client';
import { gql } from '@apollo/client/core';

// Simple query without followerCount and postCount
const GET_USERS_SIMPLE = gql`
  query GetUsersSimple($first: Int!, $skip: Int!) {
    userProfiles(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      username
      displayName
      avatarHash
      isVerified
      isArtist
      createdAt
    }
  }
`;

const SEARCH_USERS_SIMPLE = gql`
  query SearchUsersSimple($searchText: String!, $first: Int!) {
    userProfiles(
      where: {
        or: [
          { username_contains_nocase: $searchText }
          { displayName_contains_nocase: $searchText }
        ]
      }
      first: $first
    ) {
      id
      username
      displayName
      avatarHash
      isVerified
      isArtist
    }
  }
`;

async function checkSubgraphUsers() {
  console.log('🔍 Checking Subgraph for users...\n');
  
  try {
    // Test 1: Get all users
    console.log('📊 Test 1: Fetching all users...');
    const allUsersResult = await apolloClient.query({
      query: GET_USERS_SIMPLE,
      variables: {
        first: 100,
        skip: 0
      },
      fetchPolicy: 'network-only'
    });
    
    const users = allUsersResult?.data?.userProfiles || [];
    console.log(`✅ Found ${users.length} users in Subgraph\n`);

    if (users.length === 0) {
      console.log('❌ NO USERS FOUND!');
      console.log('📝 Possible reasons:');
      console.log('   1. No users have created profiles yet');
      console.log('   2. Subgraph is not synced');
      console.log('   3. Schema mismatch\n');
      
      // Check subgraph meta
      console.log('🔍 Checking subgraph indexing status...');
      try {
        const metaResult = await apolloClient.query({
          query: `
            query {
              _meta {
                block {
                  number
                  hash
                  timestamp
                }
                hasIndexingErrors
              }
            }
          `,
          fetchPolicy: 'network-only'
        });
        
        console.log('📊 Subgraph Meta:', JSON.stringify(metaResult.data._meta, null, 2));
      } catch (metaError) {
        console.error('❌ Failed to get meta:', metaError);
      }
      
      return;
    }

    // Display users
    console.log('👥 Users List:');
    console.log('─'.repeat(80));
    users.forEach((user: any, index: number) => {
      console.log(`${index + 1}. @${user.username || 'NO_USERNAME'}`);
      console.log(`   Display Name: ${user.displayName || 'N/A'}`);
      console.log(`   Address: ${user.id}`);
      console.log(`   Avatar: ${user.avatarHash ? '✅ Yes' : '❌ No'}`);
      console.log(`   Artist: ${user.isArtist ? '✅ Yes' : '❌ No'}`);
      console.log(`   Verified: ${user.isVerified ? '✅ Yes' : '❌ No'}`);

      console.log(`   Created: ${user.createdAt ? new Date(user.createdAt * 1000).toLocaleString() : 'N/A'}`);
      console.log('─'.repeat(80));
    });

    // Test 2: Check users with username
    const usersWithUsername = users.filter((u: any) => u.username);
    console.log(`\n✅ Users with username: ${usersWithUsername.length}/${users.length}`);
    
    if (usersWithUsername.length === 0) {
      console.log('❌ NO USERS WITH USERNAME!');
      console.log('📝 Users need to set username in their profile for @mention to work\n');
    }

    // Test 3: Check users with avatar
    const usersWithAvatar = users.filter((u: any) => u.avatarHash);
    console.log(`✅ Users with avatar: ${usersWithAvatar.length}/${users.length}`);

    // Test 4: Check artists
    const artists = users.filter((u: any) => u.isArtist);
    console.log(`✅ Artists: ${artists.length}/${users.length}`);

    // Test 5: Check verified users
    const verified = users.filter((u: any) => u.isVerified);
    console.log(`✅ Verified users: ${verified.length}/${users.length}`);

    // Test 6: Search test
    if (usersWithUsername.length > 0) {
      const testUsername = usersWithUsername[0].username;
      console.log(`\n🔍 Test 2: Searching for "${testUsername}"...`);
      
      try {
        const searchResult = await apolloClient.query({
          query: SEARCH_USERS_SIMPLE,
          variables: {
            searchText: testUsername,
            first: 10
          },
          fetchPolicy: 'network-only'
        });

        const searchUsers = searchResult.data.userProfiles || [];
        console.log(`✅ Search found ${searchUsers.length} users`);
        
        if (searchUsers.length > 0) {
          console.log('📋 Search results:');
          searchUsers.forEach((user: any) => {
            console.log(`   - @${user.username} (${user.displayName})`);
          });
        }
      } catch (searchError) {
        console.error('❌ Search failed:', searchError);
      }
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(80));
    console.log(`Total Users: ${users.length}`);
    console.log(`Users with Username: ${usersWithUsername.length} ${usersWithUsername.length > 0 ? '✅' : '❌'}`);
    console.log(`Users with Avatar: ${usersWithAvatar.length}`);
    console.log(`Artists: ${artists.length}`);
    console.log(`Verified: ${verified.length}`);
    console.log('─'.repeat(80));

    if (usersWithUsername.length > 0) {
      console.log('\n✅ @MENTION FEATURE SHOULD WORK!');
      console.log('📝 Users available for mention:');
      usersWithUsername.slice(0, 5).forEach((user: any) => {
        console.log(`   - @${user.username}`);
      });
      if (usersWithUsername.length > 5) {
        console.log(`   ... and ${usersWithUsername.length - 5} more`);
      }
    } else {
      console.log('\n❌ @MENTION FEATURE WILL NOT WORK!');
      console.log('📝 Action needed: Users must create profiles with usernames');
    }

  } catch (error: any) {
    console.error('❌ Error checking subgraph:', error);
    console.error('Error details:', error.message);
    
    if (error.networkError) {
      console.error('Network error:', error.networkError);
    }
    
    if (error.graphQLErrors) {
      console.error('GraphQL errors:', error.graphQLErrors);
    }
  }
}

// Run the check
checkSubgraphUsers()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error);
    process.exit(1);
  });
