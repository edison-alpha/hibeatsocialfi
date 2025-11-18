import { BigInt } from "@graphprotocol/graph-ts";
import {
  AlbumCreated,
  SongAddedToAlbum,
  SongRemovedFromAlbum,
  AlbumPublished,
  AlbumManager
} from "../generated/AlbumManager/AlbumManager";
import { Album, AlbumSong, Song, UserProfile, GlobalStats } from "../generated/schema";

// Helper: Get or create GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalSongs = BigInt.fromI32(0);
    stats.totalPlaylists = BigInt.fromI32(0);
    stats.totalTips = BigInt.fromI32(0);
    stats.totalSales = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  return stats;
}

// Handle AlbumCreated event
export function handleAlbumCreated(event: AlbumCreated): void {
  let albumId = event.params.albumId.toString();
  let album = new Album(albumId);
  
  album.albumId = event.params.albumId;
  album.artist = event.params.artist.toHexString();
  album.title = event.params.title;
  
  // 🔥 Read full album data from contract storage using getAlbum
  let contract = AlbumManager.bind(event.address);
  let albumData = contract.try_getAlbum(event.params.albumId);
  
  if (!albumData.reverted) {
    album.description = albumData.value.description;
    album.coverImageHash = albumData.value.coverImageHash;
    album.metadataURI = albumData.value.metadataURI;
    album.releaseDate = albumData.value.releaseDate;
    album.isPublished = albumData.value.isPublished;
  } else {
    album.description = "";
    album.coverImageHash = "";
    album.metadataURI = null;
    album.releaseDate = null;
    album.isPublished = false;
  }
  
  // Map albumType enum: 0 = SINGLE, 1 = EP, 2 = ALBUM
  let albumTypeValue = event.params.albumType;
  if (albumTypeValue == 0) {
    album.albumType = "SINGLE";
  } else if (albumTypeValue == 1) {
    album.albumType = "EP";
  } else {
    album.albumType = "ALBUM";
  }
  
  album.songCount = BigInt.fromI32(0);
  album.createdAt = event.block.timestamp;
  album.blockNumber = event.block.number;
  album.transactionHash = event.transaction.hash;
  
  album.save();
  
  // Ensure UserProfile exists
  let userProfile = UserProfile.load(event.params.artist.toHexString());
  if (userProfile == null) {
    userProfile = new UserProfile(event.params.artist.toHexString());
    userProfile.beatsId = BigInt.fromI32(0);
    userProfile.username = "user_" + event.params.artist.toHexString().slice(2, 8);
    userProfile.displayName = "";
    userProfile.bio = "";
    userProfile.avatarHash = "";
    userProfile.bannerHash = "";
    userProfile.location = "";
    userProfile.website = "";
    userProfile.instagramHandle = "";
    userProfile.twitterHandle = "";
    userProfile.youtubeHandle = "";
    userProfile.spotifyHandle = "";
    userProfile.isVerified = false;
    userProfile.isArtist = true;
    userProfile.verificationExpiryTime = BigInt.fromI32(0);
    userProfile.reputationScore = BigInt.fromI32(0);
    userProfile.createdAt = event.block.timestamp;
    userProfile.updatedAt = event.block.timestamp;
    userProfile.save();
  }
  
  // Update global stats
  let stats = getOrCreateGlobalStats();
  stats.lastUpdated = event.block.timestamp;
  stats.save();
}

// Handle SongAddedToAlbum event
export function handleSongAddedToAlbum(event: SongAddedToAlbum): void {
  let albumId = event.params.albumId.toString();
  let songTokenId = event.params.songTokenId.toString();
  let albumSongId = albumId + "-" + songTokenId;
  
  let albumSong = new AlbumSong(albumSongId);
  albumSong.album = albumId;
  albumSong.song = songTokenId;
  albumSong.addedAt = event.block.timestamp;
  albumSong.blockNumber = event.block.number;
  albumSong.transactionHash = event.transaction.hash;
  
  // Update position based on current song count
  let album = Album.load(albumId);
  if (album != null) {
    albumSong.position = album.songCount;
    album.songCount = album.songCount.plus(BigInt.fromI32(1));
    album.save();
  } else {
    albumSong.position = BigInt.fromI32(0);
  }
  
  albumSong.save();
}

// Handle SongRemovedFromAlbum event
export function handleSongRemovedFromAlbum(event: SongRemovedFromAlbum): void {
  let albumId = event.params.albumId.toString();
  let songTokenId = event.params.songTokenId.toString();
  let albumSongId = albumId + "-" + songTokenId;
  
  // Remove the AlbumSong entity
  let albumSong = AlbumSong.load(albumSongId);
  if (albumSong != null) {
    // Update album song count
    let album = Album.load(albumId);
    if (album != null) {
      album.songCount = album.songCount.minus(BigInt.fromI32(1));
      album.save();
    }
    
    // Note: We can't actually remove entities in Graph Protocol
    // Instead, we could add an 'isRemoved' field in the schema
    // For now, we'll just leave it as is
  }
}

// Handle AlbumPublished event
export function handleAlbumPublished(event: AlbumPublished): void {
  let albumId = event.params.albumId.toString();
  let album = Album.load(albumId);
  
  if (album != null) {
    album.isPublished = true;
    album.releaseDate = event.params.releaseDate;
    album.save();
  }
}
