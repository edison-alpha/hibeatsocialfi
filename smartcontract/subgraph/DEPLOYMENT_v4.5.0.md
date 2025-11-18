# Deployment v4.5.0 - Complete NFT Metadata

## Changes

### Fixed NFT Data Indexing
- Added contract call to `getSongMetadata()` in `handleSongMinted` event handler
- Now reads complete metadata from blockchain including:
  - ✅ Genre
  - ✅ Cover/Artwork Hash (ipfsArtworkHash)
  - ✅ Duration
  - ✅ Royalty Percentage

### Previous Issues
- v4.4.0: Genre was "Unknown", coverHash was empty
- Root cause: Event `SongMinted` only provides `title` and `ipfsAudioHash`
- Solution: Call `getSongMetadata()` to get complete data from contract storage

## Deployment Info

**Version:** v4.5.0  
**Build Hash:** QmafPCSGxTUn7saKwGwHsWcYKNhbNRmJsn6L3FzZmoq33S  
**Endpoint:** https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.5.0/gn

## Code Changes

### src/song-nft.ts

```typescript
export function handleSongMinted(event: SongMinted): void {
  let tokenId = event.params.tokenId.toString()
  let artistAddress = event.params.artist.toHexString()
  
  // Create Song entity
  let song = new Song(tokenId)
  song.tokenId = event.params.tokenId
  song.artist = artistAddress
  song.owner = artistAddress
  song.title = event.params.title
  song.audioHash = event.params.ipfsAudioHash
  
  // 🔥 Read full metadata from contract using getSongMetadata
  let contract = SongNFT.bind(event.address)
  let metadataResult = contract.try_getSongMetadata(event.params.tokenId)
  
  if (!metadataResult.reverted) {
    let metadata = metadataResult.value
    song.description = ""
    song.genre = metadata.genre                    // ✅ Now indexed
    song.coverHash = metadata.ipfsArtworkHash      // ✅ Now indexed
    song.duration = metadata.duration              // ✅ Now indexed
    song.price = BigInt.fromI32(0)
    song.royaltyPercentage = metadata.royaltyPercentage  // ✅ Now indexed
  } else {
    // Fallback to defaults if contract call fails
    song.description = ""
    song.genre = ""
    song.coverHash = ""
    song.duration = BigInt.fromI32(0)
    song.price = BigInt.fromI32(0)
    song.royaltyPercentage = BigInt.fromI32(0)
  }
  
  // ... rest of handler
}
```

## Testing

Wait 5-10 minutes for subgraph to re-index from block 231334285, then test:

```bash
node test-my-collections.mjs
```

Expected result:
- ✅ Genre should show actual genre (not "Unknown")
- ✅ Cover Hash should show IPFS hash
- ✅ Duration should show actual duration
- ✅ NFTs should appear in MyCollection page

## Frontend Update

Updated `src/lib/apollo-client.ts`:
```typescript
const httpLink = new HttpLink({
  uri: 'https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.5.0/gn',
});
```

## Notes

- Subgraph will re-index all historical events from startBlock
- This may take 5-10 minutes depending on number of events
- Monitor progress at: https://subgraph.somnia.network/
