import { subgraphService } from '../src/services/subgraphService';

async function debugWalletNFTs() {
  console.log('🔍 Debug Wallet NFTs\n');

  // Test addresses - ganti dengan address yang sebenarnya
  const testAddresses = [
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Example address
    // Tambahkan address lain untuk test
  ];

  for (const address of testAddresses) {
    console.log(`\n📍 Testing address: ${address}`);
    console.log('='.repeat(60));

    try {
      // Get owned songs
      console.log('\n📡 Calling getUserOwnedSongs...');
      const ownedSongs = await subgraphService.getUserOwnedSongs(address, 100, 0);

      console.log(`\n✅ Found ${ownedSongs.length} NFTs`);

      if (ownedSongs.length > 0) {
        console.log('\n🎵 NFT Details:');
        ownedSongs.forEach((song: any, index: number) => {
          console.log(`\n  ${index + 1}. ${song.title || 'Untitled'}`);
          console.log(`     Token ID: ${song.id}`);
          console.log(`     Artist: ${song.artist || 'Unknown'}`);
          console.log(`     Artwork: ${song.ipfsArtworkHash || 'None'}`);
          console.log(`     Owner: ${song.owner}`);
        });
      } else {
        console.log('\n⚠️ No NFTs found for this address');
        console.log('   Possible reasons:');
        console.log('   1. User has not minted any NFTs yet');
        console.log('   2. Subgraph is not synced');
        console.log('   3. Address is incorrect');
      }

    } catch (error) {
      console.error('\n❌ Error:', error);
      if (error instanceof Error) {
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Debug complete\n');
}

// Run debug
debugWalletNFTs().catch(console.error);
