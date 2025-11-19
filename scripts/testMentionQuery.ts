// Test mention query directly
import { apolloClient } from '../src/lib/apollo-client';
import { GET_ALL_USERS } from '../src/graphql/queries';

async function testMentionQuery() {
  console.log('🧪 Testing mention query...\n');
  
  try {
    console.log('📡 Querying Subgraph...');
    const result = await apolloClient.query({
      query: GET_ALL_USERS,
      variables: {
        first: 100,
        skip: 0,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      },
      fetchPolicy: 'network-only'
    });

    console.log('✅ Query successful!');
    console.log('Raw result:', JSON.stringify(result, null, 2));

    const users = result?.data?.userProfiles || [];
    console.log(`\n📊 Found ${users.length} users`);

    if (users.length > 0) {
      console.log('\n👥 Users:');
      users.forEach((user: any, index: number) => {
        console.log(`${index + 1}. @${user.username} (${user.displayName || 'N/A'})`);
      });

      // Test filtering
      const usersWithUsername = users.filter((u: any) => u.username);
      console.log(`\n✅ Users with username: ${usersWithUsername.length}/${users.length}`);

      // Simulate what PostComposer does
      const mappedUsers = usersWithUsername.map((p: any) => ({
        username: p.username,
        displayName: p.displayName || p.username,
        avatar: p.avatarHash || '',
        isArtist: p.isArtist || false,
        isVerified: p.isVerified || false,
        userAddress: p.id,
        source: 'subgraph'
      }));

      console.log('\n📋 Mapped users (as PostComposer would see):');
      console.log(JSON.stringify(mappedUsers, null, 2));

      console.log('\n✅ MENTION SHOULD WORK!');
      console.log('Available users for mention:');
      mappedUsers.forEach((u: any) => {
        console.log(`  - @${u.username}`);
      });
    } else {
      console.log('\n❌ NO USERS FOUND!');
      console.log('This is why mention dropdown shows "No users on blockchain yet"');
    }

  } catch (error: any) {
    console.error('\n❌ Query failed:', error);
    console.error('Error message:', error.message);
    
    if (error.networkError) {
      console.error('Network error:', error.networkError);
    }
    
    if (error.graphQLErrors) {
      console.error('GraphQL errors:', error.graphQLErrors);
    }
  }
}

testMentionQuery()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
