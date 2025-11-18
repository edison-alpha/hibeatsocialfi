import { BigInt } from "@graphprotocol/graph-ts"
import {
  ProfileCreated,
  ProfileUpdated,
  ArtistVerified,
  ArtistUpgraded,
  VerificationRenewed,
  VerificationExpired,
  UsernameChanged
} from "../generated/UserProfile/UserProfile"
import {
  UserProfile,
  ArtistUpgradeEvent,
  VerificationEvent,
  UsernameChangeEvent
} from "../generated/schema"

export function handleProfileCreated(event: ProfileCreated): void {
  let profile = new UserProfile(event.params.user.toHexString())
  
  profile.beatsId = event.params.beatsId
  profile.username = event.params.username
  profile.displayName = event.params.username
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
  profile.createdAt = event.block.timestamp
  profile.updatedAt = event.block.timestamp
  
  profile.save()
}

export function handleProfileUpdated(event: ProfileUpdated): void {
  let profile = UserProfile.load(event.params.user.toHexString())
  
  if (profile == null) {
    // Create profile if not exists
    profile = new UserProfile(event.params.user.toHexString())
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
    profile.createdAt = event.block.timestamp
  }
  
  profile.updatedAt = event.block.timestamp
  profile.save()
}

export function handleArtistVerified(event: ArtistVerified): void {
  let profile = UserProfile.load(event.params.artist.toHexString())
  
  if (profile != null) {
    profile.isVerified = true
    profile.verificationExpiryTime = event.params.expiryTime
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create verification event
  let verificationEvent = new VerificationEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  verificationEvent.user = event.params.artist.toHexString()
  verificationEvent.eventType = "verified"
  verificationEvent.expiryTime = event.params.expiryTime
  verificationEvent.feePaid = null
  verificationEvent.timestamp = event.block.timestamp
  verificationEvent.blockNumber = event.block.number
  verificationEvent.transactionHash = event.transaction.hash
  verificationEvent.save()
}

export function handleArtistUpgraded(event: ArtistUpgraded): void {
  let profile = UserProfile.load(event.params.user.toHexString())
  
  if (profile != null) {
    profile.isArtist = true
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create artist upgrade event
  let upgradeEvent = new ArtistUpgradeEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  upgradeEvent.user = event.params.user.toHexString()
  upgradeEvent.feePaid = event.params.feePaid
  upgradeEvent.timestamp = event.block.timestamp
  upgradeEvent.blockNumber = event.block.number
  upgradeEvent.transactionHash = event.transaction.hash
  upgradeEvent.save()
}

export function handleVerificationRenewed(event: VerificationRenewed): void {
  let profile = UserProfile.load(event.params.user.toHexString())
  
  if (profile != null) {
    profile.isVerified = true
    profile.verificationExpiryTime = event.params.newExpiryTime
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create verification event
  let verificationEvent = new VerificationEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  verificationEvent.user = event.params.user.toHexString()
  verificationEvent.eventType = "renewed"
  verificationEvent.expiryTime = event.params.newExpiryTime
  verificationEvent.feePaid = event.params.feePaid
  verificationEvent.timestamp = event.block.timestamp
  verificationEvent.blockNumber = event.block.number
  verificationEvent.transactionHash = event.transaction.hash
  verificationEvent.save()
}

export function handleVerificationExpired(event: VerificationExpired): void {
  let profile = UserProfile.load(event.params.user.toHexString())
  
  if (profile != null) {
    profile.isVerified = false
    profile.verificationExpiryTime = BigInt.fromI32(0)
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create verification event
  let verificationEvent = new VerificationEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  verificationEvent.user = event.params.user.toHexString()
  verificationEvent.eventType = "expired"
  verificationEvent.expiryTime = null
  verificationEvent.feePaid = null
  verificationEvent.timestamp = event.block.timestamp
  verificationEvent.blockNumber = event.block.number
  verificationEvent.transactionHash = event.transaction.hash
  verificationEvent.save()
}

export function handleUsernameChanged(event: UsernameChanged): void {
  let profile = UserProfile.load(event.params.user.toHexString())
  
  if (profile != null) {
    profile.username = event.params.newUsername
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create username change event
  let usernameEvent = new UsernameChangeEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  usernameEvent.user = event.params.user.toHexString()
  usernameEvent.oldUsername = event.params.oldUsername
  usernameEvent.newUsername = event.params.newUsername
  usernameEvent.timestamp = event.block.timestamp
  usernameEvent.blockNumber = event.block.number
  usernameEvent.transactionHash = event.transaction.hash
  usernameEvent.save()
}
