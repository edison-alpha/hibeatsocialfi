import { BigInt } from "@graphprotocol/graph-ts"
import {
  PlaylistCreated,
  PlaylistUpdated,
  SongAddedToPlaylist,
  SongRemovedFromPlaylist
} from "../generated/PlaylistManager/PlaylistManager"
import { Playlist, PlaylistSong, UserProfile, Song, GlobalStats } from "../generated/schema"

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

export function handlePlaylistCreated(event: PlaylistCreated): void {
  let playlist = new Playlist(event.params.playlistId.toString())
  
  playlist.owner = getOrCreateUserProfile(event.params.creator.toHexString()).id
  playlist.name = event.params.name
  playlist.description = ""
  playlist.coverHash = ""
  playlist.isPublic = true
  playlist.songCount = BigInt.fromI32(0)
  playlist.createdAt = event.block.timestamp
  playlist.updatedAt = event.block.timestamp
  playlist.blockNumber = event.block.number
  playlist.transactionHash = event.transaction.hash
  
  playlist.save()
  
  // Update global stats
  let stats = getOrCreateGlobalStats()
  stats.totalPlaylists = stats.totalPlaylists.plus(BigInt.fromI32(1))
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handlePlaylistUpdated(event: PlaylistUpdated): void {
  let playlist = Playlist.load(event.params.playlistId.toString())
  
  if (playlist != null) {
    playlist.updatedAt = event.block.timestamp
    playlist.save()
  }
}

export function handleSongAddedToPlaylist(event: SongAddedToPlaylist): void {
  let playlistSongId = event.params.playlistId.toString() + "-" + event.params.songId.toString()
  let playlistSong = new PlaylistSong(playlistSongId)
  
  playlistSong.playlist = event.params.playlistId.toString()
  playlistSong.song = event.params.songId.toString()
  playlistSong.addedAt = event.block.timestamp
  playlistSong.addedBy = event.transaction.from.toHexString()
  playlistSong.position = BigInt.fromI32(0)
  playlistSong.blockNumber = event.block.number
  playlistSong.transactionHash = event.transaction.hash
  
  playlistSong.save()
  
  // Update playlist song count
  let playlist = Playlist.load(event.params.playlistId.toString())
  if (playlist != null) {
    playlist.songCount = playlist.songCount.plus(BigInt.fromI32(1))
    playlist.updatedAt = event.block.timestamp
    playlist.save()
  }
}

export function handleSongRemovedFromPlaylist(event: SongRemovedFromPlaylist): void {
  let playlistSongId = event.params.playlistId.toString() + "-" + event.params.songId.toString()
  let playlistSong = PlaylistSong.load(playlistSongId)
  
  if (playlistSong != null) {
    // Remove the entity
    // Note: The Graph doesn't support entity deletion, so we keep it for historical data
  }
  
  // Update playlist song count
  let playlist = Playlist.load(event.params.playlistId.toString())
  if (playlist != null) {
    playlist.songCount = playlist.songCount.minus(BigInt.fromI32(1))
    playlist.updatedAt = event.block.timestamp
    playlist.save()
  }
}
