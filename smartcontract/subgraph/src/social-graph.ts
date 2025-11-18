import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  PostCreated,
  PostLiked,
  PostUnliked,
  CommentCreated,
  CommentLiked,
  UserFollowed,
  UserUnfollowed
} from "../generated/SocialGraph/SocialGraph";
import { 
  Post, 
  Like, 
  Comment, 
  UserProfile, 
  Follow, 
  GlobalStats,
  DailyStats 
} from "../generated/schema";

// Helper: Get or create GlobalStats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalPosts = BigInt.fromI32(0);
    stats.totalLikes = BigInt.fromI32(0);
    stats.totalComments = BigInt.fromI32(0);
    stats.totalFollows = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  return stats;
}

// Helper: Get or create UserProfile
function getOrCreateUserProfile(address: Bytes, timestamp: BigInt): UserProfile {
  let profile = UserProfile.load(address.toHexString());
  if (profile == null) {
    profile = new UserProfile(address.toHexString());
    profile.username = "user_" + address.toHexString().substring(2, 8);
    profile.displayName = "User";
    profile.bio = "";
    profile.avatarHash = "";
    profile.isVerified = false;
    profile.isArtist = false;
    profile.followerCount = BigInt.fromI32(0);
    profile.followingCount = BigInt.fromI32(0);
    profile.postCount = BigInt.fromI32(0);
    profile.createdAt = timestamp;
    profile.updatedAt = timestamp;
    profile.save();
    
    // Update global stats
    let stats = getOrCreateGlobalStats();
    stats.totalUsers = stats.totalUsers.plus(BigInt.fromI32(1));
    stats.save();
  }
  return profile;
}

// Helper: Get or create DailyStats
function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  // Format: YYYY-MM-DD
  let dayTimestamp = timestamp.toI32() - (timestamp.toI32() % 86400); // Round to day start
  let dateId = dayTimestamp.toString();
  
  let stats = DailyStats.load(dateId);
  if (stats == null) {
    stats = new DailyStats(dateId);
    let date = new Date(dayTimestamp * 1000);
    stats.date = date.toISOString().split('T')[0];
    stats.newUsers = BigInt.fromI32(0);
    stats.newPosts = BigInt.fromI32(0);
    stats.newLikes = BigInt.fromI32(0);
    stats.newComments = BigInt.fromI32(0);
    stats.newFollows = BigInt.fromI32(0);
    stats.activeUsers = BigInt.fromI32(0);
    stats.save();
  }
  return stats;
}

// Event Handler: PostCreated
export function handlePostCreated(event: PostCreated): void {
  let postId = event.params.postId.toString();
  let post = new Post(postId);
  
  post.author = event.params.author.toHexString();
  post.content = event.params.content;
  post.contentType = "text"; // Default, can be extended
  post.ipfsHash = "";
  post.timestamp = event.block.timestamp;
  post.likes = BigInt.fromI32(0);
  post.comments = BigInt.fromI32(0);
  post.shares = BigInt.fromI32(0);
  post.isDeleted = false;
  post.blockNumber = event.block.number;
  post.transactionHash = event.transaction.hash;
  post.save();

  // Update author profile
  let author = getOrCreateUserProfile(event.params.author, event.block.timestamp);
  author.postCount = author.postCount.plus(BigInt.fromI32(1));
  author.updatedAt = event.block.timestamp;
  author.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalPosts = globalStats.totalPosts.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.newPosts = dailyStats.newPosts.plus(BigInt.fromI32(1));
  dailyStats.save();
}

// Event Handler: PostLiked
export function handlePostLiked(event: PostLiked): void {
  let likeId = event.params.postId.toString() + "_" + event.params.user.toHexString();
  let like = new Like(likeId);
  
  like.post = event.params.postId.toString();
  like.user = event.params.user.toHexString();
  like.timestamp = event.block.timestamp;
  like.blockNumber = event.block.number;
  like.transactionHash = event.transaction.hash;
  like.save();

  // Update post likes count
  let post = Post.load(event.params.postId.toString());
  if (post != null) {
    post.likes = post.likes.plus(BigInt.fromI32(1));
    post.save();
  }

  // Ensure user profile exists
  getOrCreateUserProfile(event.params.user, event.block.timestamp);

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalLikes = globalStats.totalLikes.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.newLikes = dailyStats.newLikes.plus(BigInt.fromI32(1));
  dailyStats.save();
}

// Event Handler: PostUnliked
export function handlePostUnliked(event: PostUnliked): void {
  // Update post likes count
  let post = Post.load(event.params.postId.toString());
  if (post != null && post.likes.gt(BigInt.fromI32(0))) {
    post.likes = post.likes.minus(BigInt.fromI32(1));
    post.save();
  }

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  if (globalStats.totalLikes.gt(BigInt.fromI32(0))) {
    globalStats.totalLikes = globalStats.totalLikes.minus(BigInt.fromI32(1));
  }
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Event Handler: CommentCreated
export function handleCommentCreated(event: CommentCreated): void {
  let commentId = event.params.postId.toString() + "_" + event.params.commentId.toString();
  let comment = new Comment(commentId);
  
  comment.post = event.params.postId.toString();
  comment.author = event.params.author.toHexString();
  comment.content = ""; // Content not in event, would need to fetch from contract
  comment.timestamp = event.block.timestamp;
  comment.blockNumber = event.block.number;
  comment.transactionHash = event.transaction.hash;
  comment.save();

  // Update post comments count
  let post = Post.load(event.params.postId.toString());
  if (post != null) {
    post.comments = post.comments.plus(BigInt.fromI32(1));
    post.save();
  }

  // Ensure commenter profile exists
  getOrCreateUserProfile(event.params.author, event.block.timestamp);

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalComments = globalStats.totalComments.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.newComments = dailyStats.newComments.plus(BigInt.fromI32(1));
  dailyStats.save();
}

// Event Handler: CommentLiked
export function handleCommentLiked(event: CommentLiked): void {
  // Comment likes tracking can be added here if needed
  // For now, we'll just update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalLikes = globalStats.totalLikes.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}

// Event Handler: UserFollowed
export function handleUserFollowed(event: UserFollowed): void {
  let followId = event.params.follower.toHexString() + "_" + event.params.following.toHexString();
  let follow = new Follow(followId);
  
  follow.follower = event.params.follower.toHexString();
  follow.followed = event.params.following.toHexString();
  follow.timestamp = event.block.timestamp;
  follow.blockNumber = event.block.number;
  follow.transactionHash = event.transaction.hash;
  follow.save();

  // Update follower profile
  let followerProfile = getOrCreateUserProfile(event.params.follower, event.block.timestamp);
  followerProfile.followingCount = followerProfile.followingCount.plus(BigInt.fromI32(1));
  followerProfile.updatedAt = event.block.timestamp;
  followerProfile.save();

  // Update followed profile
  let followedProfile = getOrCreateUserProfile(event.params.following, event.block.timestamp);
  followedProfile.followerCount = followedProfile.followerCount.plus(BigInt.fromI32(1));
  followedProfile.updatedAt = event.block.timestamp;
  followedProfile.save();

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalFollows = globalStats.totalFollows.plus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();

  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.newFollows = dailyStats.newFollows.plus(BigInt.fromI32(1));
  dailyStats.save();
}

// Event Handler: UserUnfollowed
export function handleUserUnfollowed(event: UserUnfollowed): void {
  // Update follower profile
  let followerProfile = UserProfile.load(event.params.follower.toHexString());
  if (followerProfile != null && followerProfile.followingCount.gt(BigInt.fromI32(0))) {
    followerProfile.followingCount = followerProfile.followingCount.minus(BigInt.fromI32(1));
    followerProfile.updatedAt = event.block.timestamp;
    followerProfile.save();
  }

  // Update followed profile
  let followedProfile = UserProfile.load(event.params.following.toHexString());
  if (followedProfile != null && followedProfile.followerCount.gt(BigInt.fromI32(0))) {
    followedProfile.followerCount = followedProfile.followerCount.minus(BigInt.fromI32(1));
    followedProfile.updatedAt = event.block.timestamp;
    followedProfile.save();
  }

  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  if (globalStats.totalFollows.gt(BigInt.fromI32(0))) {
    globalStats.totalFollows = globalStats.totalFollows.minus(BigInt.fromI32(1));
  }
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
}
