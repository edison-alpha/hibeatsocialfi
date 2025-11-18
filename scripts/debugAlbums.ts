// Debug script to check albums in subgraph
import { ApolloClient, InMemoryCache, gql, HttpLink } from '@apollo/client';

const SUBGRAPH_URL = 'https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v3.0.1/gn';

const client = new ApolloClient({
  link: new HttpLink({
    uri: SUBGRAPH_URL,
  }),
  cache: new InMemoryCache(),
});

// Query to get all albums
const GET_ALL_ALBUMS = gql`
  query GetAllAlbums {
    albums(first: 10, orderBy: createdAt, orderDirection: desc) {
      id
      albumId
      title
      albumType
      songCount
      createdAt
      coverImageHash
      artist {
        id
        username
        displayName
      }
    }
  }
`;

// Query to get albums by artist
const GET_USER_ALBUMS = gql`
  query GetUserAlbums($artistId: ID!) {
    albums(where: { artist_: { id: $artistId } }, first: 10) {
      id
      albumId
      title
      albumType
      songCount
      createdAt
      coverImageHash
      artist {
        id
        username
        displayName
      }
    }
  }
`;

// Query to get user profiles
const GET_USER_PROFILES = gql`
  query GetUserProfiles {
    userProfiles(first: 10) {
      id
      username
      displayName
    }
  }
`;

async function debugAlbums() {
  try {
    console.log('🔍 Fetching all albums from subgraph...\n');
    
    // Get all albums
    const allAlbumsResult = await client.query({
      query: GET_ALL_ALBUMS,
      fetchPolicy: 'network-only',
    });
    
    const albums = allAlbumsResult.data.albums;
    console.log(`📀 Found ${albums.length} albums total:\n`);
    
    albums.forEach((album: any, index: number) => {
      console.log(`${index + 1}. Album ID: ${album.albumId}`);
      console.log(`   Title: ${album.title}`);
      console.log(`   Type: ${album.albumType}`);
      console.log(`   Songs: ${album.songCount}`);
      console.log(`   Cover Hash: ${album.coverImageHash || 'NO COVER'}`);
      console.log(`   Artist ID: ${album.artist.id}`);
      console.log(`   Artist: ${album.artist.displayName || album.artist.username || 'Unknown'}`);
      console.log(`   Created: ${new Date(Number(album.createdAt) * 1000).toLocaleString()}`);
      console.log('');
    });
    
    // Get user profiles
    console.log('\n👥 Fetching user profiles...\n');
    const profilesResult = await client.query({
      query: GET_USER_PROFILES,
      fetchPolicy: 'network-only',
    });
    
    const profiles = profilesResult.data.userProfiles;
    console.log(`Found ${profiles.length} user profiles:\n`);
    
    profiles.forEach((profile: any, index: number) => {
      console.log(`${index + 1}. ${profile.id}`);
      console.log(`   Username: ${profile.username || 'N/A'}`);
      console.log(`   Display Name: ${profile.displayName || 'N/A'}`);
      console.log('');
    });
    
    // Test query for specific user
    if (albums.length > 0) {
      const testArtistId = albums[0].artist.id;
      console.log(`\n🎯 Testing query for artist: ${testArtistId}\n`);
      
      const userAlbumsResult = await client.query({
        query: GET_USER_ALBUMS,
        variables: { artistId: testArtistId },
        fetchPolicy: 'network-only',
      });
      
      const userAlbums = userAlbumsResult.data.albums;
      console.log(`✅ Found ${userAlbums.length} albums for this artist`);
      
      userAlbums.forEach((album: any) => {
        console.log(`   - ${album.title} (${album.albumType})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
  }
}

// Run the debug
debugAlbums().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
