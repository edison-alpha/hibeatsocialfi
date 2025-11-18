# Datastream vs Subgraph - Architecture Documentation

## 📊 Data Source Separation

HiBeats menggunakan **dual-indexing architecture** untuk optimal performance:

### 🔵 **DATASTREAM (EAS)** - Social Layer
**Purpose**: Fast, off-chain social interactions using Ethereum Attestation Service

**Handles:**
- ✅ Posts (create, delete, pin, quote, reply)
- ✅ Likes/Unlikes
- ✅ Comments
- ✅ Reposts
- ✅ Bookmarks
- ✅ Follow/Unfollow
- ✅ Social tips (off-chain)
- ✅ Play events tracking
- ✅ User activity feed
- ✅ Generated music backup

**Schemas:**
- `hibeats_posts_v6`
- `hibeats_interactions_v6`
- `hibeats_profiles_v6`
- `hibeats_feed_index_v1`
- `hibeats_user_activity_v1`
- `hibeats_generated_music_v1`
- `hibeats_play_events_v1`

**Service**: `somniaDatastreamService.v3.ts`

---

### 🟢 **SUBGRAPH** - Blockchain Layer
**Purpose**: Index on-chain smart contract events for NFTs and trading

**Handles:**
- ✅ Song NFT minting
- ✅ NFT transfers & ownership
- ✅ Album management
- ✅ Playlist management (on-chain)
- ✅ Marketplace listings
- ✅ NFT sales & trading
- ✅ On-chain tips (via TippingSystem contract)
- ✅ Price history
- ✅ Wallet activity
- ✅ Advanced NFT analytics

**Contracts Indexed:**
- `UserProfile.sol`
- `SongNFT.sol`
- `AlbumManager.sol`
- `PlaylistManager.sol`
- `Marketplace.sol`
- `TippingSystem.sol`

**Service**: `subgraphService.ts`

---

## 🔄 Data Flow

### Social Interactions (Datastream)
```
User Action → Datastream SDK → EAS Contract → IceDB
                                              ↓
                                    Query via SDK ← Frontend
```

### NFT Operations (Subgraph)
```
User Action → Smart Contract → Event Emitted → Subgraph Indexer
                                                      ↓
                                            GraphQL API ← Frontend
```

---

## 📋 Field Mapping

### UserProfile
| Field | Source | Notes |
|-------|--------|-------|
| username | Subgraph | From UserProfile contract |
| displayName | Subgraph | From UserProfile contract |
| bio | Subgraph | From UserProfile contract |
| avatarHash | Subgraph | From UserProfile contract |
| isVerified | Subgraph | From UserProfile contract |
| isArtist | Subgraph | From UserProfile contract |
| **followerCount** | **Datastream** | Social feature |
| **followingCount** | **Datastream** | Social feature |
| **postCount** | **Datastream** | Social feature |

### Song NFT
| Field | Source | Notes |
|-------|--------|-------|
| tokenId | Subgraph | NFT metadata |
| title | Subgraph | NFT metadata |
| artist | Subgraph | NFT metadata |
| owner | Subgraph | Current owner |
| price | Subgraph | Listing price |
| transferCount | Subgraph | On-chain transfers |
| **playCount** | **Datastream** | Play events |
| **likeCount** | **Datastream** | Social interactions |

### Tips
| Field | Source | Notes |
|-------|--------|-------|
| On-chain tips | Subgraph | Via TippingSystem contract |
| Social tips | Datastream | Off-chain attestations |

---

## 🎯 Query Strategy

### For Social Features
```typescript
// Use Datastream
import { somniaDatastreamService } from '@/services/somniaDatastreamService.v3';

// Get posts with likes/comments
const posts = await somniaDatastreamService.getPosts(20, 0);

// Get play count
const playEvents = await somniaDatastreamService.getPlayEvents(tokenId);
```

### For NFT Features
```typescript
// Use Subgraph
import { subgraphService } from '@/services/subgraphService';

// Get owned NFTs
const songs = await subgraphService.getUserOwnedSongs(address);

// Get sales history
const sales = await subgraphService.getUserSongSales(address);

// Get wallet activity
const activity = await subgraphService.getWalletActivity(address);
```

### For Combined Data
```typescript
// Get NFT from subgraph
const song = await subgraphService.getSong(tokenId);

// Get social stats from datastream
const playCount = await somniaDatastreamService.getPlayCount(tokenId);
const likes = await somniaDatastreamService.getLikes(tokenId);

// Combine
const enrichedSong = {
  ...song,
  playCount,
  likeCount: likes.length,
};
```

---

## ✅ Benefits of This Architecture

### Performance
- **Datastream**: Ultra-fast reads (15-100ns via IceDB)
- **Subgraph**: Reliable on-chain data indexing

### Scalability
- **Datastream**: Handles high-frequency social interactions
- **Subgraph**: Handles complex NFT queries and analytics

### Cost Efficiency
- **Datastream**: Gasless attestations for social features
- **Subgraph**: Only indexes important on-chain events

### Data Integrity
- **Datastream**: Fast, eventually consistent
- **Subgraph**: Blockchain-verified, immutable

---

## 🚀 Advanced Analytics

### Subgraph Analytics (On-chain only)
- ✅ Trading volume & sales
- ✅ NFT ownership distribution
- ✅ Price history & trends
- ✅ Artist earnings (sales + royalties + on-chain tips)
- ✅ Marketplace stats
- ✅ Wallet activity tracking
- ✅ Genre-based trading stats
- ✅ Leaderboards (by sales/earnings)

### Datastream Analytics (Social only)
- ✅ Play count & trending
- ✅ Like count & engagement
- ✅ Comment activity
- ✅ Follow/follower growth
- ✅ User activity feed
- ✅ Social tips tracking

---

## 📝 Important Notes

1. **Never query social metrics from Subgraph** - They won't be accurate
2. **Never query NFT ownership from Datastream** - Use Subgraph
3. **Tips are dual-tracked** - Social tips in Datastream, on-chain tips in Subgraph
4. **Play count is in Datastream** - Use `playEvents` schema
5. **Wallet activity is in Subgraph** - For on-chain transaction history

---

## 🔧 Maintenance

### When to Update Datastream
- Adding new social features
- Changing post/interaction schemas
- Adding new attestation types

### When to Update Subgraph
- Deploying new smart contracts
- Adding new contract events
- Changing NFT metadata structure

---

## 📚 Related Documentation
- [Datastream Configuration](../src/config/somniaDataStreams.v3.ts)
- [Subgraph Schema](./schema.graphql)
- [Datastream Service](../src/services/somniaDatastreamService.v3.ts)
- [Subgraph Service](../src/services/subgraphService.ts)
