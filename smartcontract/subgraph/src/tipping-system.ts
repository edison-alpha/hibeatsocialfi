import { BigInt } from "@graphprotocol/graph-ts"
import {
  TipSent
} from "../generated/TippingSystem/TippingSystem"
import { Tip, TippingStats, UserProfile, GlobalStats } from "../generated/schema"

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

function getOrCreateTippingStats(userId: string): TippingStats {
  let stats = TippingStats.load(userId)
  if (stats == null) {
    stats = new TippingStats(userId)
    stats.user = userId
    stats.totalTipsGiven = BigInt.fromI32(0)
    stats.totalTipsReceived = BigInt.fromI32(0)
    stats.totalAmountGiven = BigInt.fromI32(0)
    stats.totalAmountReceived = BigInt.fromI32(0)
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

export function handleTipSent(event: TipSent): void {
  let tip = new Tip(event.params.tipId.toString())
  
  let tipper = getOrCreateUserProfile(event.params.tipper.toHexString())
  let recipient = getOrCreateUserProfile(event.params.recipient.toHexString())
  
  tip.tipper = tipper.id
  tip.recipient = recipient.id
  tip.song = event.params.songId.equals(BigInt.fromI32(0)) ? null : event.params.songId.toString()
  tip.amount = event.params.amount
  tip.message = ""
  tip.timestamp = event.block.timestamp
  tip.blockNumber = event.block.number
  tip.transactionHash = event.transaction.hash
  
  tip.save()
  
  // Update tipper stats
  let tipperStats = getOrCreateTippingStats(tipper.id)
  tipperStats.totalTipsGiven = tipperStats.totalTipsGiven.plus(BigInt.fromI32(1))
  tipperStats.totalAmountGiven = tipperStats.totalAmountGiven.plus(event.params.amount)
  tipperStats.lastUpdated = event.block.timestamp
  tipperStats.save()
  
  // Update recipient stats
  let recipientStats = getOrCreateTippingStats(recipient.id)
  recipientStats.totalTipsReceived = recipientStats.totalTipsReceived.plus(BigInt.fromI32(1))
  recipientStats.totalAmountReceived = recipientStats.totalAmountReceived.plus(event.params.amount)
  recipientStats.lastUpdated = event.block.timestamp
  recipientStats.save()
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats()
  globalStats.totalTips = globalStats.totalTips.plus(BigInt.fromI32(1))
  globalStats.lastUpdated = event.block.timestamp
  globalStats.save()
}
