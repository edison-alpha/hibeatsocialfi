import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  SongMinted,
  Transfer,
  SongNFT
} from "../generated/SongNFT/SongNFT"
import {
  Song,
  SongTransfer,
  UserProfile,
  GlobalStats,
  UserNFTStats,
  ArtistStats,
  PlatformStats,
  SongPriceHistory,
  GenreStats,
  WalletActivity
} from "../generated/schema"

// ============ HELPER FUNCTIONS ============

function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalSongs = BigInt.fromI32(0)
    stats.totalPlaylists = BigInt.fromI32(0)
    stats.totalTips = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
}

function getOrCreatePlatformStats(): PlatformStats {
  let stats = PlatformStats.load("global")
  if (stats == null) {
    stats = new PlatformStats("global")
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalArtists = BigInt.fromI32(0)
    stats.totalVerifiedArtists = BigInt.fromI32(0)
    stats.totalSongs = BigInt.fromI32(0)
    stats.totalAlbums = BigInt.fromI32(0)
    stats.totalPlaylists = BigInt.fromI32(0)
    stats.totalDuration = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.totalVolume = BigInt.fromI32(0)
    stats.totalRoyalties = BigInt.fromI32(0)
    stats.totalPlatformFees = BigInt.fromI32(0)
    stats.averageSalePrice = BigInt.fromI32(0)
    stats.activeListings = BigInt.fromI32(0)
    stats.totalListings = BigInt.fromI32(0)
    stats.totalTips = BigInt.fromI32(0)
    stats.totalTipAmount = BigInt.fromI32(0)
    stats.sales24h = BigInt.fromI32(0)
    stats.volume24h = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
}

function getOrCreateUserProfile(address: string): UserProfile {
  let profile = UserProfile.load(address)
  if (profile == null) {
    profile = new UserProfile(address)
    profile.beatsId = BigInt.fromI32(0) // Default beatsId for users without profile
    profile.username = "unknown"
    profile.displayName = "Unknown User"
    profile.bio = ""
    profile.avatarHash = ""
    profile.bannerHash = ""
    profile.location = ""
    profile.website = ""
    profile.instagramHandle = ""
    profile.twitterHandle = ""
    profile.youtubeHandle = ""
    profile.spotifyHandle = ""
    profile.isVerified = false
    profile.isArtist = false
    profile.verificationExpiryTime = BigInt.fromI32(0)
    profile.reputationScore = BigInt.fromI32(0)
    profile.createdAt = BigInt.fromI32(0)
    profile.updatedAt = BigInt.fromI32(0)
    profile.save()
    
    // Update platform stats
    let platformStats = getOrCreatePlatformStats()
    platformStats.totalUsers = platformStats.totalUsers.plus(BigInt.fromI32(1))
    platformStats.lastUpdated = BigInt.fromI32(0)
    platformStats.save()
  }
  return profile
}

function getOrCreateUserNFTStats(address: string, timestamp: BigInt): UserNFTStats {
  let stats = UserNFTStats.load(address)
  if (stats == null) {
    stats = new UserNFTStats(address)
    stats.user = address
    stats.songsOwned = BigInt.fromI32(0)
    stats.songsCreated = BigInt.fromI32(0)
    stats.albumsCreated = BigInt.fromI32(0)
    stats.playlistsCreated = BigInt.fromI32(0)
    stats.songsSold = BigInt.fromI32(0)
    stats.songsBought = BigInt.fromI32(0)
    stats.totalSalesVolume = BigInt.fromI32(0)
    stats.totalPurchaseVolume = BigInt.fromI32(0)
    stats.totalRoyaltiesEarned = BigInt.fromI32(0)
    stats.activeListings = BigInt.fromI32(0)
    stats.totalListings = BigInt.fromI32(0)
    stats.averageListingPrice = BigInt.fromI32(0)
    stats.totalTipsReceived = BigInt.fromI32(0)
    stats.totalTipAmount = BigInt.fromI32(0)
    stats.bestSellingSong = null
    stats.highestSalePrice = BigInt.fromI32(0)
    stats.averageSalePrice = BigInt.fromI32(0)
    stats.firstMintDate = timestamp
    stats.lastActivityDate = timestamp
    stats.lastUpdated = timestamp
  }
  return stats
}

function getOrCreateArtistStats(address: string, timestamp: BigInt): ArtistStats {
  let stats = ArtistStats.load(address)
  if (stats == null) {
    stats = new ArtistStats(address)
    stats.artist = address
    stats.totalSongs = BigInt.fromI32(0)
    stats.totalAlbums = BigInt.fromI32(0)
    stats.totalDuration = BigInt.fromI32(0)
    stats.totalSalesRevenue = BigInt.fromI32(0)
    stats.totalRoyalties = BigInt.fromI32(0)
    stats.totalTips = BigInt.fromI32(0)
    stats.totalEarnings = BigInt.fromI32(0)
    stats.averageSongPrice = BigInt.fromI32(0)
    stats.salesRank = BigInt.fromI32(0)
    stats.earningsRank = BigInt.fromI32(0)
    stats.topSong = null
    stats.topAlbum = null
    stats.firstReleaseDate = timestamp
    stats.lastReleaseDate = timestamp
    stats.lastUpdated = timestamp
  }
  return stats
}

function getOrCreateGenreStats(genre: string, timestamp: BigInt): GenreStats {
  let genreId = genre.toLowerCase()
  let stats = GenreStats.load(genreId)
  if (stats == null) {
    stats = new GenreStats(genreId)
    stats.genre = genre
    stats.totalSongs = BigInt.fromI32(0)
    stats.totalArtists = BigInt.fromI32(0)
    stats.totalAlbums = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.totalVolume = BigInt.fromI32(0)
    stats.averagePrice = BigInt.fromI32(0)
    stats.floorPrice = BigInt.fromI32(0)
    stats.topSong = null
    stats.topArtist = null
    stats.lastUpdated = timestamp
  }
  return stats
}

// ============ EVENT HANDLERS ============

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
    // Struct fields: title, artist, genre, duration, ipfsAudioHash, ipfsArtworkHash, 
    // royaltyPercentage, artistAddress, createdAt, isExplicit, likeCount, playCount
    song.description = "" // Not in struct, keep empty
    song.genre = metadata.genre
    song.coverHash = metadata.ipfsArtworkHash
    song.duration = metadata.duration
    song.price = BigInt.fromI32(0) // Price is not in metadata struct
    song.royaltyPercentage = metadata.royaltyPercentage
  } else {
    // Fallback to defaults if contract call fails
    song.description = ""
    song.genre = ""
    song.coverHash = ""
    song.duration = BigInt.fromI32(0)
    song.price = BigInt.fromI32(0)
    song.royaltyPercentage = BigInt.fromI32(0)
  }
  
  song.transferCount = BigInt.fromI32(0)
  song.isListed = false
  song.createdAt = event.block.timestamp
  song.blockNumber = event.block.number
  song.transactionHash = event.transaction.hash
  song.save()
  
  // Create price history entry
  let priceHistoryId = tokenId + "-" + event.block.timestamp.toString()
  let priceHistory = new SongPriceHistory(priceHistoryId)
  priceHistory.song = tokenId
  priceHistory.price = BigInt.fromI32(0)
  priceHistory.eventType = "minted"
  priceHistory.timestamp = event.block.timestamp
  priceHistory.blockNumber = event.block.number
  priceHistory.transactionHash = event.transaction.hash
  priceHistory.save()
  
  // Update user profile
  let artist = getOrCreateUserProfile(artistAddress)
  if (!artist.isArtist) {
    artist.isArtist = true
    artist.save()
    
    // Update platform stats for new artist
    let platformStats = getOrCreatePlatformStats()
    platformStats.totalArtists = platformStats.totalArtists.plus(BigInt.fromI32(1))
    platformStats.save()
  }
  
  // Update user NFT stats
  let userStats = getOrCreateUserNFTStats(artistAddress, event.block.timestamp)
  userStats.songsCreated = userStats.songsCreated.plus(BigInt.fromI32(1))
  userStats.songsOwned = userStats.songsOwned.plus(BigInt.fromI32(1))
  userStats.lastActivityDate = event.block.timestamp
  userStats.lastUpdated = event.block.timestamp
  userStats.save()
  
  // Update artist stats
  let artistStats = getOrCreateArtistStats(artistAddress, event.block.timestamp)
  artistStats.totalSongs = artistStats.totalSongs.plus(BigInt.fromI32(1))
  artistStats.lastReleaseDate = event.block.timestamp
  artistStats.lastUpdated = event.block.timestamp
  artistStats.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalSongs = globalStats.totalSongs.plus(BigInt.fromI32(1))
  globalStats.lastUpdated = event.block.timestamp
  globalStats.save()
  
  // Update platform stats
  let platformStats = getOrCreatePlatformStats()
  platformStats.totalSongs = platformStats.totalSongs.plus(BigInt.fromI32(1))
  platformStats.lastUpdated = event.block.timestamp
  platformStats.save()
  
  // Create wallet activity for minting
  let activityId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let activity = new WalletActivity(activityId)
  activity.user = artistAddress
  activity.activityType = "mint"
  activity.from = null
  activity.to = artistAddress
  activity.amount = BigInt.fromI32(0)
  activity.token = "NFT"
  activity.song = tokenId
  activity.listing = null
  activity.sale = null
  activity.tip = null
  activity.status = "success"
  activity.description = "Minted " + song.title
  activity.timestamp = event.block.timestamp
  activity.blockNumber = event.block.number
  activity.transactionHash = event.transaction.hash
  activity.save()
}

export function handleTransfer(event: Transfer): void {
  let tokenId = event.params.tokenId.toString()
  let fromAddress = event.params.from.toHexString()
  let toAddress = event.params.to.toHexString()
  
  // Determine transfer type
  let transferType = "transfer"
  if (fromAddress == "0x0000000000000000000000000000000000000000") {
    transferType = "mint"
  } else if (toAddress == "0x0000000000000000000000000000000000000000") {
    transferType = "burn"
  }
  
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
  transfer.transferType = transferType
  transfer.timestamp = event.block.timestamp
  transfer.blockNumber = event.block.number
  transfer.transactionHash = event.transaction.hash
  transfer.save()
  
  // Update song owner and transfer count
  let song = Song.load(tokenId)
  if (song != null) {
    song.owner = toAddress
    song.transferCount = song.transferCount.plus(BigInt.fromI32(1))
    song.save()
    
    // Update previous owner stats (if not mint)
    if (transferType != "mint") {
      let fromStats = getOrCreateUserNFTStats(fromAddress, event.block.timestamp)
      fromStats.songsOwned = fromStats.songsOwned.minus(BigInt.fromI32(1))
      fromStats.lastActivityDate = event.block.timestamp
      fromStats.lastUpdated = event.block.timestamp
      fromStats.save()
    }
    
    // Update new owner stats (if not burn)
    if (transferType != "burn") {
      let toStats = getOrCreateUserNFTStats(toAddress, event.block.timestamp)
      toStats.songsOwned = toStats.songsOwned.plus(BigInt.fromI32(1))
      toStats.lastActivityDate = event.block.timestamp
      toStats.lastUpdated = event.block.timestamp
      toStats.save()
      
      // Create wallet activity for transfer (receiver)
      let activityIdTo = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-to"
      let activityTo = new WalletActivity(activityIdTo)
      activityTo.user = toAddress
      activityTo.activityType = "receive"
      activityTo.from = fromAddress
      activityTo.to = toAddress
      activityTo.amount = BigInt.fromI32(0)
      activityTo.token = "NFT"
      activityTo.song = tokenId
      activityTo.listing = null
      activityTo.sale = null
      activityTo.tip = null
      activityTo.status = "success"
      activityTo.description = "Received " + (song ? song.title : "NFT")
      activityTo.timestamp = event.block.timestamp
      activityTo.blockNumber = event.block.number
      activityTo.transactionHash = event.transaction.hash
      activityTo.save()
    }
    
    // Create wallet activity for transfer (sender)
    if (transferType != "mint") {
      let activityIdFrom = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-from"
      let activityFrom = new WalletActivity(activityIdFrom)
      activityFrom.user = fromAddress
      activityFrom.activityType = "send"
      activityFrom.from = fromAddress
      activityFrom.to = toAddress
      activityFrom.amount = BigInt.fromI32(0)
      activityFrom.token = "NFT"
      activityFrom.song = tokenId
      activityFrom.listing = null
      activityFrom.sale = null
      activityFrom.tip = null
      activityFrom.status = "success"
      activityFrom.description = "Sent " + (song ? song.title : "NFT")
      activityFrom.timestamp = event.block.timestamp
      activityFrom.blockNumber = event.block.number
      activityFrom.transactionHash = event.transaction.hash
      activityFrom.save()
    }
  }
}
