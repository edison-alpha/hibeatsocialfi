# Indexing Fix - v4.4.0

## Problem
Subgraph indexing gagal dengan error:
```
Entity UserProfile[0x0000000000000000000000000000000000000000]: 
missing value for non-nullable field `beatsId`
```

## Root Cause
Saat event `Transfer` terjadi (mint/burn), subgraph mencoba membuat entity `UserProfile` untuk zero address (`0x0000000000000000000000000000000000000000`), tetapi field `beatsId` yang non-nullable tidak memiliki nilai default.

## Solution Applied

### 1. Updated `getOrCreateUserProfile` Function
Menambahkan semua field yang diperlukan dengan nilai default di semua file handler:

**Files Updated:**
- `src/song-nft.ts`
- `src/marketplace.ts`
- `src/tipping-system.ts`
- `src/playlist-manager.ts`
- `src/album-manager.ts`

**Changes:**
```typescript
function getOrCreateUserProfile(address: string): UserProfile {
  let profile = UserProfile.load(address)
  if (profile == null) {
    profile = new UserProfile(address)
    profile.beatsId = BigInt.fromI32(0)  // ✅ Added
    profile.username = "unknown"
    profile.displayName = "Unknown User"
    profile.bio = ""
    profile.avatarHash = ""
    profile.bannerHash = ""              // ✅ Added
    profile.location = ""                // ✅ Added
    profile.website = ""                 // ✅ Added
    profile.instagramHandle = ""         // ✅ Added
    profile.twitterHandle = ""           // ✅ Added
    profile.youtubeHandle = ""           // ✅ Added
    profile.spotifyHandle = ""           // ✅ Added
    profile.isVerified = false
    profile.isArtist = false
    profile.verificationExpiryTime = BigInt.fromI32(0)  // ✅ Added
    profile.reputationScore = BigInt.fromI32(0)         // ✅ Added
    profile.createdAt = BigInt.fromI32(0)
    profile.updatedAt = BigInt.fromI32(0)
    profile.save()
  }
  return profile
}
```

### 2. Fixed Transfer Handler (song-nft.ts)
Menghindari pembuatan profile untuk zero address:

```typescript
export function handleTransfer(event: Transfer): void {
  // ...
  
  // Skip creating transfer entity for zero address (mint/burn from/to zero address)
  // Only create profiles for non-zero addresses
  let fromProfile = fromAddress != "0x0000000000000000000000000000000000000000" 
    ? getOrCreateUserProfile(fromAddress) 
    : null
  let toProfile = toAddress != "0x0000000000000000000000000000000000000000" 
    ? getOrCreateUserProfile(toAddress) 
    : null
  
  // Create transfer entity
  let transferId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let transfer = new SongTransfer(transferId)
  transfer.song = tokenId
  transfer.from = fromProfile ? fromProfile.id : fromAddress
  transfer.to = toProfile ? toProfile.id : toAddress
  // ...
}
```

## Deployment

### Build & Deploy Commands:
```bash
cd blockchain/hibeats-social-subgraph
npm run codegen
npm run build
graph deploy hibeats-social-subgraph \
  --node https://api.subgraph.somnia.network/deploy \
  --ipfs https://api.subgraph.somnia.network/ipfs \
  --access-token B92G441EE2XAR6SO4G8WFFS5Q \
  --version-label v4.4.0
```

### Deployment Result:
```
Build completed: QmPtRofZr2B3HEta6Fgs43K1TAwFSU3hxjuF8dbgpauJ26
Deployed to /api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.4.0/gn

Subgraph endpoints:
Queries (HTTP): /api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.4.0/gn
```

## Frontend Update

Updated Apollo Client endpoint in `src/lib/apollo-client.ts`:
```typescript
const httpLink = new HttpLink({
  uri: 'https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.4.0/gn',
});
```

## Testing

Wait 5-10 minutes for subgraph to sync, then test:

```bash
# Test subgraph query
node test-subgraph.mjs

# Or test in browser
# Navigate to MyCollection page and check if NFTs appear
```

## Expected Result

✅ Subgraph should now successfully index all events without errors
✅ NFT collections should appear in MyCollection page
✅ User profiles should be created correctly with all required fields

## Monitoring

Check subgraph status at:
https://subgraph.somnia.network/

Look for:
- ✅ Synced status
- ✅ No indexing errors
- ✅ Latest block number increasing

## Notes

- Zero address profiles are now handled gracefully
- All UserProfile entities have default values for required fields
- beatsId defaults to 0 for auto-created profiles (will be updated when user creates profile via UserProfile contract)
