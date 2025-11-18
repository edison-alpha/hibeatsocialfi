import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  ListingCreated,
  ListingSold,
  ListingCancelled
} from "../generated/Marketplace/Marketplace"
import {
  SongListing,
  SongSale,
  MarketplaceStats,
  Song,
  UserProfile,
  GlobalStats,
  UserNFTStats,
  ArtistStats,
  PlatformStats,
  SongPriceHistory,
  DailyPlatformStats,
  WalletActivity
} from "../generated/schema"

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

function getOrCreateMarketplaceStats(): MarketplaceStats {
  let stats = MarketplaceStats.load("global")
  if (stats == null) {
    stats = new MarketplaceStats("global")
    stats.totalListings = BigInt.fromI32(0)
    stats.activeListings = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.totalVolume = BigInt.fromI32(0)
    stats.totalRoyalties = BigInt.fromI32(0)
    stats.totalPlatformFees = BigInt.fromI32(0)
    stats.averageSalePrice = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
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
    profile.beatsId = BigInt.fromI32(0)
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
  }
  return profile
}

export function handleListingCreated(event: ListingCreated): void {
  let sellerAddress = event.params.seller.toHexString()
  let listing = new SongListing(event.params.listingId.toString())
  
  listing.song = event.params.tokenId.toString()
  listing.seller = getOrCreateUserProfile(sellerAddress).id
  listing.price = event.params.price
  listing.isActive = true
  listing.listedAt = event.block.timestamp
  listing.expiresAt = null
  listing.soldAt = null
  listing.buyer = null
  listing.blockNumber = event.block.number
  listing.transactionHash = event.transaction.hash
  listing.save()
  
  // Update song listing status
  let song = Song.load(event.params.tokenId.toString())
  if (song != null) {
    song.isListed = true
    song.price = event.params.price
    song.save()
  }
  
  // Create price history entry
  let priceHistoryId = event.params.tokenId.toString() + "-" + event.block.timestamp.toString()
  let priceHistory = new SongPriceHistory(priceHistoryId)
  priceHistory.song = event.params.tokenId.toString()
  priceHistory.price = event.params.price
  priceHistory.eventType = "listed"
  priceHistory.timestamp = event.block.timestamp
  priceHistory.blockNumber = event.block.number
  priceHistory.transactionHash = event.transaction.hash
  priceHistory.save()
  
  // Update seller NFT stats
  let sellerStats = getOrCreateUserNFTStats(sellerAddress, event.block.timestamp)
  sellerStats.activeListings = sellerStats.activeListings.plus(BigInt.fromI32(1))
  sellerStats.totalListings = sellerStats.totalListings.plus(BigInt.fromI32(1))
  sellerStats.lastActivityDate = event.block.timestamp
  sellerStats.lastUpdated = event.block.timestamp
  sellerStats.save()
  
  // Update marketplace stats
  let marketStats = getOrCreateMarketplaceStats()
  marketStats.totalListings = marketStats.totalListings.plus(BigInt.fromI32(1))
  marketStats.activeListings = marketStats.activeListings.plus(BigInt.fromI32(1))
  marketStats.lastUpdated = event.block.timestamp
  marketStats.save()
  
  // Update platform stats
  let platformStats = getOrCreatePlatformStats()
  platformStats.activeListings = platformStats.activeListings.plus(BigInt.fromI32(1))
  platformStats.totalListings = platformStats.totalListings.plus(BigInt.fromI32(1))
  platformStats.lastUpdated = event.block.timestamp
  platformStats.save()
  
  // Create wallet activity for listing
  let activityId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let activity = new WalletActivity(activityId)
  activity.user = sellerAddress
  activity.activityType = "listing"
  activity.from = sellerAddress
  activity.to = null
  activity.amount = event.params.price
  activity.token = "STT"
  activity.song = event.params.tokenId.toString()
  activity.listing = event.params.listingId.toString()
  activity.sale = null
  activity.tip = null
  activity.status = "success"
  activity.description = "Listed " + (song ? song.title : "NFT") + " for sale"
  activity.timestamp = event.block.timestamp
  activity.blockNumber = event.block.number
  activity.transactionHash = event.transaction.hash
  activity.save()
}

export function handleListingSold(event: ListingSold): void {
  let listing = SongListing.load(event.params.listingId.toString())
  let buyerAddress = event.params.buyer.toHexString()
  
  if (listing != null) {
    let sellerAddress = listing.seller
    let salePrice = event.params.price
    
    listing.isActive = false
    listing.soldAt = event.block.timestamp
    listing.buyer = getOrCreateUserProfile(buyerAddress).id
    listing.save()
    
    // Calculate fees (example: 2.5% platform fee, 5% royalty)
    let platformFee = salePrice.times(BigInt.fromI32(25)).div(BigInt.fromI32(1000)) // 2.5%
    let royaltyFee = salePrice.times(BigInt.fromI32(50)).div(BigInt.fromI32(1000))  // 5%
    let sellerProceeds = salePrice.minus(platformFee).minus(royaltyFee)
    
    // Create sale record
    let sale = new SongSale(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
    sale.song = listing.song
    sale.seller = sellerAddress
    sale.buyer = listing.buyer!
    sale.price = salePrice
    sale.royaltyPaid = royaltyFee
    sale.platformFee = platformFee
    sale.sellerProceeds = sellerProceeds
    sale.timestamp = event.block.timestamp
    sale.blockNumber = event.block.number
    sale.transactionHash = event.transaction.hash
    sale.save()
    
    // Create price history entry
    let priceHistoryId = listing.song + "-" + event.block.timestamp.toString()
    let priceHistory = new SongPriceHistory(priceHistoryId)
    priceHistory.song = listing.song
    priceHistory.price = salePrice
    priceHistory.eventType = "sold"
    priceHistory.timestamp = event.block.timestamp
    priceHistory.blockNumber = event.block.number
    priceHistory.transactionHash = event.transaction.hash
    priceHistory.save()
    
    // Update song
    let song = Song.load(listing.song)
    if (song != null) {
      song.isListed = false
      song.save()
    }
    
    // Update seller NFT stats
    let sellerStats = getOrCreateUserNFTStats(sellerAddress, event.block.timestamp)
    sellerStats.activeListings = sellerStats.activeListings.minus(BigInt.fromI32(1))
    sellerStats.songsSold = sellerStats.songsSold.plus(BigInt.fromI32(1))
    sellerStats.totalSalesVolume = sellerStats.totalSalesVolume.plus(salePrice)
    sellerStats.lastActivityDate = event.block.timestamp
    sellerStats.lastUpdated = event.block.timestamp
    
    // Update highest sale price
    if (salePrice.gt(sellerStats.highestSalePrice)) {
      sellerStats.highestSalePrice = salePrice
      sellerStats.bestSellingSong = listing.song
    }
    
    // Update average sale price
    if (sellerStats.songsSold.gt(BigInt.fromI32(0))) {
      sellerStats.averageSalePrice = sellerStats.totalSalesVolume.div(sellerStats.songsSold)
    }
    sellerStats.save()
    
    // Update buyer NFT stats
    let buyerStats = getOrCreateUserNFTStats(buyerAddress, event.block.timestamp)
    buyerStats.songsBought = buyerStats.songsBought.plus(BigInt.fromI32(1))
    buyerStats.totalPurchaseVolume = buyerStats.totalPurchaseVolume.plus(salePrice)
    buyerStats.lastActivityDate = event.block.timestamp
    buyerStats.lastUpdated = event.block.timestamp
    buyerStats.save()
    
    // Update marketplace stats
    let marketStats = getOrCreateMarketplaceStats()
    marketStats.activeListings = marketStats.activeListings.minus(BigInt.fromI32(1))
    marketStats.totalSales = marketStats.totalSales.plus(BigInt.fromI32(1))
    marketStats.totalVolume = marketStats.totalVolume.plus(salePrice)
    marketStats.totalRoyalties = marketStats.totalRoyalties.plus(royaltyFee)
    marketStats.totalPlatformFees = marketStats.totalPlatformFees.plus(platformFee)
    
    // Update average sale price
    if (marketStats.totalSales.gt(BigInt.fromI32(0))) {
      marketStats.averageSalePrice = marketStats.totalVolume.div(marketStats.totalSales)
    }
    marketStats.lastUpdated = event.block.timestamp
    marketStats.save()
    
    // Update platform stats
    let platformStats = getOrCreatePlatformStats()
    platformStats.activeListings = platformStats.activeListings.minus(BigInt.fromI32(1))
    platformStats.totalSales = platformStats.totalSales.plus(BigInt.fromI32(1))
    platformStats.totalVolume = platformStats.totalVolume.plus(salePrice)
    platformStats.totalRoyalties = platformStats.totalRoyalties.plus(royaltyFee)
    platformStats.totalPlatformFees = platformStats.totalPlatformFees.plus(platformFee)
    platformStats.sales24h = platformStats.sales24h.plus(BigInt.fromI32(1))
    platformStats.volume24h = platformStats.volume24h.plus(salePrice)
    
    // Update average sale price
    if (platformStats.totalSales.gt(BigInt.fromI32(0))) {
      platformStats.averageSalePrice = platformStats.totalVolume.div(platformStats.totalSales)
    }
    platformStats.lastUpdated = event.block.timestamp
    platformStats.save()
    
    // Update global stats
    let globalStats = getOrCreateGlobalStats()
    globalStats.totalSales = globalStats.totalSales.plus(BigInt.fromI32(1))
    globalStats.lastUpdated = event.block.timestamp
    globalStats.save()
    
    // Get song for description
    let songForDesc = Song.load(listing.song)
    let songTitle = songForDesc ? songForDesc.title : "NFT"
    
    // Create wallet activity for seller (sale)
    let activityIdSeller = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-seller"
    let activitySeller = new WalletActivity(activityIdSeller)
    activitySeller.user = sellerAddress
    activitySeller.activityType = "sale"
    activitySeller.from = buyerAddress
    activitySeller.to = sellerAddress
    activitySeller.amount = salePrice
    activitySeller.token = "STT"
    activitySeller.song = listing.song
    activitySeller.listing = event.params.listingId.toString()
    activitySeller.sale = sale.id
    activitySeller.tip = null
    activitySeller.status = "success"
    activitySeller.description = "Sold " + songTitle
    activitySeller.timestamp = event.block.timestamp
    activitySeller.blockNumber = event.block.number
    activitySeller.transactionHash = event.transaction.hash
    activitySeller.save()
    
    // Create wallet activity for buyer (purchase)
    let activityIdBuyer = event.transaction.hash.toHex() + "-" + event.logIndex.toString() + "-buyer"
    let activityBuyer = new WalletActivity(activityIdBuyer)
    activityBuyer.user = buyerAddress
    activityBuyer.activityType = "receive"
    activityBuyer.from = sellerAddress
    activityBuyer.to = buyerAddress
    activityBuyer.amount = salePrice
    activityBuyer.token = "STT"
    activityBuyer.song = listing.song
    activityBuyer.listing = event.params.listingId.toString()
    activityBuyer.sale = sale.id
    activityBuyer.tip = null
    activityBuyer.status = "success"
    activityBuyer.description = "Purchased " + songTitle
    activityBuyer.timestamp = event.block.timestamp
    activityBuyer.blockNumber = event.block.number
    activityBuyer.transactionHash = event.transaction.hash
    activityBuyer.save()
  }
}

export function handleListingCancelled(event: ListingCancelled): void {
  let listing = SongListing.load(event.params.listingId.toString())
  
  if (listing != null) {
    let sellerAddress = listing.seller
    
    listing.isActive = false
    listing.save()
    
    // Update song
    let song = Song.load(listing.song)
    if (song != null) {
      song.isListed = false
      song.save()
    }
    
    // Update seller NFT stats
    let sellerStats = getOrCreateUserNFTStats(sellerAddress, event.block.timestamp)
    sellerStats.activeListings = sellerStats.activeListings.minus(BigInt.fromI32(1))
    sellerStats.lastActivityDate = event.block.timestamp
    sellerStats.lastUpdated = event.block.timestamp
    sellerStats.save()
    
    // Update marketplace stats
    let marketStats = getOrCreateMarketplaceStats()
    marketStats.activeListings = marketStats.activeListings.minus(BigInt.fromI32(1))
    marketStats.lastUpdated = event.block.timestamp
    marketStats.save()
    
    // Update platform stats
    let platformStats = getOrCreatePlatformStats()
    platformStats.activeListings = platformStats.activeListings.minus(BigInt.fromI32(1))
    platformStats.lastUpdated = event.block.timestamp
    platformStats.save()
  }
}
