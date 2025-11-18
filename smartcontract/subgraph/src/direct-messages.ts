import { BigInt } from "@graphprotocol/graph-ts"
import {
  MessageSent,
  MessageRead
} from "../generated/DirectMessages/DirectMessages"
import { DirectMessage, Conversation, UserProfile, GlobalStats } from "../generated/schema"

function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global")
  if (stats == null) {
    stats = new GlobalStats("global")
    stats.totalUsers = BigInt.fromI32(0)
    stats.totalPosts = BigInt.fromI32(0)
    stats.totalLikes = BigInt.fromI32(0)
    stats.totalComments = BigInt.fromI32(0)
    stats.totalFollows = BigInt.fromI32(0)
    stats.totalSongs = BigInt.fromI32(0)
    stats.totalPlaylists = BigInt.fromI32(0)
    stats.totalMessages = BigInt.fromI32(0)
    stats.totalTips = BigInt.fromI32(0)
    stats.totalSales = BigInt.fromI32(0)
    stats.lastUpdated = BigInt.fromI32(0)
  }
  return stats
}

function getOrCreateUserProfile(address: string): UserProfile {
  let profile = UserProfile.load(address)
  if (profile == null) {
    profile = new UserProfile(address)
    profile.username = "unknown"
    profile.displayName = "Unknown User"
    profile.bio = ""
    profile.avatarHash = ""
    profile.isVerified = false
    profile.isArtist = false
    profile.followerCount = BigInt.fromI32(0)
    profile.followingCount = BigInt.fromI32(0)
    profile.postCount = BigInt.fromI32(0)
    profile.createdAt = BigInt.fromI32(0)
    profile.updatedAt = BigInt.fromI32(0)
    profile.save()
  }
  return profile
}

export function handleMessageSent(event: MessageSent): void {
  let message = new DirectMessage(event.params.messageId.toString())
  
  message.sender = getOrCreateUserProfile(event.params.sender.toHexString()).id
  message.recipient = getOrCreateUserProfile(event.params.receiver.toHexString()).id
  message.content = ""
  message.encryptedContent = ""
  message.timestamp = event.block.timestamp
  message.isRead = false
  message.blockNumber = event.block.number
  message.transactionHash = event.transaction.hash
  
  message.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalMessages = stats.totalMessages.plus(BigInt.fromI32(1))
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleMessageRead(event: MessageRead): void {
  let message = DirectMessage.load(event.params.messageId.toString())
  
  if (message != null) {
    message.isRead = true
    message.save()
  }
}
