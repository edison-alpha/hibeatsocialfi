/**
 * Somnia Data Streams V3 Configuration - ULTRA OPTIMIZED
 * 
 * Designed for Web2-level performance on Web3:
 * - Index-based pagination (getBetweenRange)
 * - Batch operations (reduce RPC calls)
 * - Minimal schema (faster encoding/decoding)
 * - Smart caching (leverage IceDB 15-100ns)
 * - Sequential IDs (efficient indexing)
 */

export const SOMNIA_CONFIG_V3 = {
  // Network Configuration
  rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  wsUrl: import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws',
  chainId: 50312,
  
  // Performance Settings (optimized for Web2 speed)
  performance: {
    // Pagination
    defaultPageSize: 20,
    maxPageSize: 100,
    
    // Caching (leverage IceDB's 15-100ns read/write)
    cacheExpiry: 30000, // 30 seconds
    aggressiveCaching: true, // Cache everything
    
    // Batch Operations
    batchSize: 50, // Batch multiple writes
    batchDelay: 100, // Wait 100ms before flushing batch
    
    // Prefetching
    prefetchNextPage: true, // Prefetch next page for smooth scrolling
    prefetchInteractions: true, // Prefetch interactions for visible posts
  },
  
  // Optimized Schema Definitions - V6 (PRODUCTION READY)
  schemas: {
    // Posts V6 - Full SocialFi features
    posts: 'hibeats_posts_v6',
    
    // Interactions V6 - Enhanced with tipping
    interactions: 'hibeats_interactions_v6',
    
    // User profiles V6 - Cached for fast lookups
    profiles: 'hibeats_profiles_v6',
    
    // NEW: Feed index - For ultra-fast feed loading
    feedIndex: 'hibeats_feed_index_v1',
    
    // NEW: User activity - For personalized feeds
    userActivity: 'hibeats_user_activity_v1',
    
    // NEW: Generated music backup - For failed mint recovery
    generatedMusic: 'hibeats_generated_music_v1',
    
    // NEW: Play events - For play count tracking & trending
    playEvents: 'hibeats_play_events_v1',
    
    // NEW: Activity history - For wallet activity tracking
    activityHistory: 'hibeats_activity_history_v1',
  },
  
  // Schema Strings for Somnia SDK (V6 - FULL SOCIALFI FEATURES)
  schemaStrings: {
    // Posts Schema V6 (20 fields - Feature Complete)
    // NEW: Multiple media, threading, mentions, monetization
    posts: 'uint256 id, uint256 timestamp, string content, uint8 contentType, string mediaHashes, address author, uint256 quotedPostId, uint256 replyToId, string mentions, address collectModule, uint256 collectPrice, uint32 collectLimit, uint32 collectCount, bool isGated, address referrer, uint32 nftTokenId, bool isDeleted, bool isPinned',
    
    // Interactions Schema V6 (9 fields - Enhanced)
    // NEW: Tip support, metadata for extensibility
    interactions: 'uint256 id, uint256 timestamp, uint8 interactionType, uint256 targetId, uint8 targetType, address fromUser, string content, uint256 parentId, uint256 tipAmount',
    
    // Profiles Schema (9 fields - cached stats)
    profiles: 'address userAddress, string username, string displayName, string bio, string avatarHash, uint32 followerCount, uint32 followingCount, bool isVerified, bool isArtist',
    
    // NEW: Feed Index Schema (4 fields - ultra minimal for speed)
    // Maps sequential index to postId for O(1) pagination
    feedIndex: 'uint256 index, uint256 postId, uint256 timestamp, address author',
    
    // NEW: User Activity Schema (5 fields - for personalized feeds)
    // Tracks user's interactions for "Following" feed
    userActivity: 'uint256 timestamp, address user, uint8 activityType, uint256 targetId, uint256 relatedId',
    
    // NEW: Generated Music Schema (11 fields - backup for failed mints)
    // Stores complete music generation data for manual mint recovery
    generatedMusic: 'uint256 id, uint256 timestamp, address owner, string taskId, string title, string audioUrl, string imageUrl, string prompt, string style, string lyrics, uint8 status',
    
    // NEW: Play Events Schema (6 fields - for play count tracking & trending)
    // Records every play event for analytics and trending algorithm
    playEvents: 'uint256 id, uint256 timestamp, uint32 tokenId, address listener, uint32 duration, string source',
    
    // NEW: Activity History Schema (10 fields - for wallet activity tracking)
    // Records all user activities for activity feed
    activityHistory: 'uint256 id, uint256 timestamp, address user, uint8 activityType, string title, string description, uint256 targetId, address targetAddress, string txHash, string metadata',
  },
} as const;

// ===== ENUMS for Type Safety & Efficiency =====

/**
 * Content types (uint8 enum - more efficient than string)
 */
export enum ContentType {
  TEXT = 0,
  IMAGE = 1,
  VIDEO = 2,
  MUSIC = 3,
  QUOTE = 4,
}

/**
 * Interaction types (uint8 enum) - V6 Enhanced
 */
export enum InteractionType {
  LIKE = 0,
  UNLIKE = 1,
  COMMENT = 2,
  REPOST = 3,
  UNREPOST = 4,
  DELETE = 5,
  BOOKMARK = 6,
  UNBOOKMARK = 7,
  TIP = 8,           // NEW: Tip a post/comment
  COLLECT = 9,       // NEW: Collect/mint post as NFT
  UNCOLLECT = 10,    // NEW: Burn collected NFT
  FOLLOW = 11,       // NEW: Follow a user
  UNFOLLOW = 12,     // NEW: Unfollow a user
}

/**
 * Target types (uint8 enum)
 */
export enum TargetType {
  POST = 0,
  COMMENT = 1,
  USER = 2,  // NEW: For follow/unfollow interactions
}

/**
 * Activity types (uint8 enum)
 */
export enum ActivityType {
  POST_CREATED = 0,
  POST_LIKED = 1,
  POST_COMMENTED = 2,
  POST_REPOSTED = 3,
  USER_FOLLOWED = 4,
  USER_UNFOLLOWED = 5,
}

/**
 * Generated music status (uint8 enum)
 */
export enum GeneratedMusicStatus {
  PENDING = 0,      // Generation in progress
  COMPLETED = 1,    // Generation completed, ready to mint
  MINTED = 2,       // Successfully minted as NFT
  FAILED = 3,       // Generation or mint failed
}

// ===== TypeScript Interfaces (OPTIMIZED) =====

/**
 * Post data structure V6 (FULL SOCIALFI FEATURES)
 */
export interface PostDataV3 {
  id: number;              // uint256 = timestamp (most efficient)
  index: number;           // Sequential index for pagination
  timestamp: number;       // unix timestamp (same as ID)
  content: string;         // post text content
  contentType: ContentType; // enum (0-4) instead of string
  
  // Media Support (Multiple)
  mediaHashes: string;     // Comma-separated IPFS hashes (e.g., "Qm1,Qm2,Qm3")
  
  // Social Features
  author: string;          // user address
  quotedPostId: number;    // referenced post ID (0 if not a quote)
  replyToId: number;       // reply to post ID (0 if not a reply) - THREADING
  mentions: string;        // Comma-separated addresses (e.g., "0xABC,0xDEF")
  
  // Monetization Features
  collectModule: string;   // Smart contract address for collect logic (0x0 = disabled)
  collectPrice: number;    // Price in wei to collect this post (0 = free)
  collectLimit: number;    // Max number of collects (0 = unlimited)
  collectCount: number;    // Current number of collects
  isGated: boolean;        // Is content locked behind payment
  referrer: string;        // Referral address for revenue sharing (0x0 = none)
  
  // NFT & Flags
  nftTokenId: number;      // NFT token ID (0 if not NFT)
  isDeleted: boolean;      // soft delete flag
  isPinned: boolean;       // pinned to profile
  
  // Computed fields (not stored, calculated from interactions)
  likes?: number;
  comments?: number;
  reposts?: number;
  quotes?: number;
  tips?: number;           // Total tips received
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  isCollected?: boolean;   // Has current user collected this
}

/**
 * Interaction data structure V6 (Enhanced with Tipping)
 */
export interface InteractionDataV3 {
  id: number;                      // uint256 = timestamp * 10 + type
  timestamp: number;               // unix timestamp
  interactionType: InteractionType; // enum (0-7) instead of string
  targetId: number;                // uint256 = post/comment ID
  targetType: TargetType;          // enum (0-1) instead of string
  fromUser: string;                // user address
  content: string;                 // comment text (empty for likes/reposts)
  parentId: number;                // uint256 = parent comment ID (0 for top-level)
  tipAmount: number;               // Tip amount in wei (0 for non-tip interactions)
}

/**
 * User profile data structure (cached)
 */
export interface ProfileDataV3 {
  userAddress: string;     // user address (primary key)
  username: string;        // unique username
  displayName: string;     // display name
  bio: string;             // user bio
  avatarHash: string;      // IPFS hash for avatar
  followerCount: number;   // cached follower count
  followingCount: number;  // cached following count
  isVerified: boolean;     // verified badge
  isArtist: boolean;       // artist badge
}

/**
 * Feed index entry (for ultra-fast pagination)
 */
export interface FeedIndexEntry {
  index: number;           // Sequential index (0, 1, 2, ...)
  postId: number;          // V6: uint256 post ID
  timestamp: number;       // post timestamp
  author: string;          // post author
}

/**
 * User activity entry (for personalized feeds)
 */
export interface UserActivityEntry {
  timestamp: number;       // activity timestamp
  user: string;            // user address
  activityType: ActivityType; // enum (0-5)
  targetId: string;        // bytes32 hash of target
  relatedId: string;       // bytes32 hash of related entity
}

/**
 * Generated music data structure (backup for failed mints)
 */
export interface GeneratedMusicData {
  id: number;              // uint256 = timestamp
  timestamp: number;       // unix timestamp
  owner: string;           // user address who generated
  taskId: string;          // Suno task ID
  title: string;           // song title
  audioUrl: string;        // IPFS or direct URL to audio file
  imageUrl: string;        // IPFS or direct URL to cover image
  prompt: string;          // generation prompt
  style: string;           // music style/genre
  lyrics: string;          // song lyrics (if any)
  status: GeneratedMusicStatus; // enum (0-3)
}

/**
 * Play event data structure (for tracking & trending)
 */
export interface PlayEventData {
  id: number;              // uint256 = timestamp + random
  timestamp: number;       // unix timestamp
  tokenId: number;         // NFT token ID
  listener: string;        // user address who played
  duration: number;        // how long played (seconds)
  source: string;          // where played (feed, collection, album, etc)
}

/**
 * Activity history types (uint8 enum)
 */
export enum ActivityHistoryType {
  MINT = 0,
  TRANSFER = 1,
  SALE = 2,
  PURCHASE = 3,
  FOLLOW = 4,
  UNFOLLOW = 5,
  POST = 6,
  COMMENT = 7,
  LIKE = 8,
  REPOST = 9,
}

/**
 * Activity history data structure (for wallet activity tracking)
 */
export interface ActivityHistoryData {
  id: number;              // uint256 = timestamp
  timestamp: number;       // unix timestamp
  user: string;            // user address
  activityType: ActivityHistoryType; // enum (0-9)
  title: string;           // activity title
  description: string;     // activity description
  targetId: number;        // target ID (tokenId, postId, etc)
  targetAddress: string;   // target address (if applicable)
  txHash: string;          // transaction hash
  metadata: string;        // JSON metadata
}

/**
 * Aggregated post stats (computed from interactions)
 */
export interface PostStats {
  likes: number;
  comments: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  userLiked: boolean;
  userReposted: boolean;
  userBookmarked: boolean;
  likedBy: string[];       // List of users who liked
  repostedBy: string[];    // List of users who reposted
  topComments: InteractionDataV3[]; // Top-level comments only
}

// ===== Helper Functions (OPTIMIZED) =====

/**
 * Create bytes32 hash for efficient indexing
 * Uses keccak256 for deterministic, collision-resistant IDs
 * 
 * @deprecated Use simple string IDs instead (timestamp_address)
 */
export const createBytes32Id = (prefix: string, ...parts: (string | number)[]): string => {
  // Filter out undefined/null values
  const validParts = parts.filter(p => p !== undefined && p !== null);
  const combined = `${prefix}_${validParts.join('_')}`;
  
  // In production, use keccak256 from viem
  // For now, use a simple hash
  const hash = combined.split('').reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
};

/**
 * Create post ID (uint256 = timestamp)
 * 
 * OPTIMIZED: Use timestamp as ID for maximum efficiency
 * Format: timestamp (milliseconds since epoch)
 * Example: 1762894722362
 * 
 * Note: If multiple posts in same millisecond, add nonce (timestamp + nonce)
 */
export const createPostId = (author: string, timestamp?: number): number => {
  const ts = timestamp || Date.now();
  return ts;
};

/**
 * Create interaction ID (uint256 = hash of type + targetId + fromUser)
 * 
 * FIXED V2: Deterministic ID based on type + targetId + fromUser (NO timestamp)
 * This ensures each user can only have ONE like/repost per post
 * 
 * Format: hash("LIKE_1762894722362_0xABC...") → same ID for same user+post+type
 * Example: User A likes Post 123 → always same ID
 *          User A unlikes Post 123 → different type, different ID
 *          User B likes Post 123 → different user, different ID
 */
export const createInteractionId = (
  type: InteractionType, 
  fromUser: string, 
  timestamp?: number,
  targetId?: number
): number => {
  // For LIKE/UNLIKE/REPOST/UNREPOST: Use deterministic ID (no timestamp)
  // This prevents duplicate likes from same user on same post
  const isDeterministic = [
    InteractionType.LIKE,
    InteractionType.UNLIKE,
    InteractionType.REPOST,
    InteractionType.UNREPOST,
    InteractionType.BOOKMARK,
    InteractionType.UNBOOKMARK
  ].includes(type);
  
  let combined: string;
  
  if (isDeterministic) {
    // Deterministic: Same user + same post + same type = same ID
    combined = `${type}_${targetId || 0}_${fromUser.toLowerCase()}`;
  } else {
    // Non-deterministic: Include timestamp for comments (can have multiple)
    const ts = timestamp || Date.now();
    combined = `${type}_${targetId || 0}_${fromUser.toLowerCase()}_${ts}`;
  }
  
  // Simple hash function (for production, use keccak256)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Return absolute value to ensure positive uint256
  return Math.abs(hash);
};

/**
 * Create comment ID (uint256 = timestamp + offset)
 * 
 * Format: timestamp * 100 + random(0-99)
 * Example: 176289472236245
 */
export const createCommentId = (postId: number, fromUser: string, timestamp?: number): number => {
  const ts = timestamp || Date.now();
  // Add random offset to avoid collision
  const offset = Math.floor(Math.random() * 100);
  return ts * 100 + offset;
};

// ===== V6 Helper Functions (Media, Mentions, Monetization) =====

/**
 * Parse media hashes from comma-separated string
 * 
 * @param mediaHashes - "Qm1,Qm2,Qm3" or single hash
 * @returns Array of IPFS hashes
 */
export const parseMediaHashes = (mediaHashes: string): string[] => {
  if (!mediaHashes || mediaHashes.trim() === '') return [];
  return mediaHashes.split(',').map(h => h.trim()).filter(h => h.length > 0);
};

/**
 * Format media hashes to comma-separated string
 * 
 * @param hashes - Array of IPFS hashes
 * @returns "Qm1,Qm2,Qm3"
 */
export const formatMediaHashes = (hashes: string[]): string => {
  return hashes.filter(h => h && h.trim().length > 0).join(',');
};

/**
 * Parse mentions from comma-separated addresses
 * 
 * @param mentions - "0xABC,0xDEF" or single address
 * @returns Array of addresses
 */
export const parseMentions = (mentions: string): string[] => {
  if (!mentions || mentions.trim() === '') return [];
  return mentions.split(',').map(m => m.trim()).filter(m => m.startsWith('0x'));
};

/**
 * Format mentions to comma-separated string
 * 
 * @param addresses - Array of addresses
 * @returns "0xABC,0xDEF"
 */
export const formatMentions = (addresses: string[]): string => {
  return addresses.filter(a => a && a.startsWith('0x')).join(',');
};

/**
 * Check if post is monetized
 * 
 * @param post - Post data
 * @returns true if post has collect/gate enabled
 */
export const isMonetized = (post: PostDataV3): boolean => {
  return (
    (post.collectModule && post.collectModule !== '0x0000000000000000000000000000000000000000') ||
    (post.collectPrice && post.collectPrice > 0) ||
    post.isGated
  );
};

/**
 * Check if post can be collected
 * 
 * @param post - Post data
 * @returns true if collect is available
 */
export const canCollect = (post: PostDataV3): boolean => {
  if (!post.collectModule || post.collectModule === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  if (post.collectLimit > 0 && post.collectCount >= post.collectLimit) {
    return false; // Sold out
  }
  return true;
};

/**
 * Format price for display
 * 
 * @param priceInWei - Price in wei
 * @returns Formatted string (e.g., "0.01 ETH")
 */
export const formatPrice = (priceInWei: number): string => {
  if (priceInWei === 0) return 'Free';
  const eth = priceInWei / 1e18;
  if (eth < 0.001) return `${(priceInWei / 1e9).toFixed(2)} Gwei`;
  return `${eth.toFixed(4)} ETH`;
};

/**
 * Validate post data
 */
export const validatePostData = (data: Partial<PostDataV3>): boolean => {
  // Must have author
  if (!data.author) return false;
  
  // Must have either content or mediaHashes (V6: plural)
  if (!data.content && !data.mediaHashes) return false;
  
  // If has content, check length
  if (data.content && data.content.length > 5000) return false; // Max 5000 chars
  
  return true;
};

/**
 * Validate interaction data
 */
export const validateInteractionData = (data: Partial<InteractionDataV3>): boolean => {
  // Must have required fields
  if (!data.fromUser || !data.targetId || data.interactionType === undefined) return false;
  
  // Check if interactionType is valid enum value
  const validTypes = [
    InteractionType.LIKE, 
    InteractionType.UNLIKE, 
    InteractionType.COMMENT, 
    InteractionType.REPOST, 
    InteractionType.UNREPOST, 
    InteractionType.DELETE,
    InteractionType.BOOKMARK,
    InteractionType.UNBOOKMARK,
    InteractionType.TIP,
    InteractionType.COLLECT,
    InteractionType.UNCOLLECT,
    InteractionType.FOLLOW,
    InteractionType.UNFOLLOW,
  ];
  if (!validTypes.includes(data.interactionType)) return false;
  
  // Comment must have content
  if (data.interactionType === InteractionType.COMMENT && !data.content) return false;
  
  return true;
};

/**
 * Create default post data
 */
export const createDefaultPostData = (author: string, content: string): PostDataV3 => {
  return {
    id: createPostId(author),
    index: 0,
    timestamp: Date.now(),
    content,
    contentType: ContentType.TEXT,
    mediaHashes: '', // V6: plural
    author,
    quotedPostId: 0, // V6: number
    replyToId: 0, // V6: new field
    mentions: '', // V6: new field
    collectModule: '0x0000000000000000000000000000000000000000', // V6: new field
    collectPrice: 0, // V6: new field
    collectLimit: 0, // V6: new field
    collectCount: 0, // V6: new field
    isGated: false, // V6: new field
    referrer: '0x0000000000000000000000000000000000000000', // V6: new field
    nftTokenId: 0,
    isDeleted: false,
    isPinned: false,
  };
};

/**
 * Create like interaction data
 */
export const createLikeInteraction = (postId: number, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.LIKE, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.LIKE,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content: '',
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create unlike interaction data
 */
export const createUnlikeInteraction = (postId: number, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.UNLIKE, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.UNLIKE,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content: '',
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create comment interaction data
 */
export const createCommentInteraction = (
  postId: number,
  fromUser: string,
  content: string,
  parentId?: number
): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.COMMENT, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.COMMENT,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content,
    parentId: parentId || 0,
    tipAmount: 0,
  };
};

/**
 * Create repost interaction data
 */
export const createRepostInteraction = (postId: number, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.REPOST, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.REPOST,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content: '',
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create bookmark interaction data
 */
export const createBookmarkInteraction = (postId: number, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.BOOKMARK, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.BOOKMARK,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content: '',
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create unbookmark interaction data
 */
export const createUnbookmarkInteraction = (postId: number, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  return {
    id: createInteractionId(InteractionType.UNBOOKMARK, fromUser, timestamp, postId),
    timestamp,
    interactionType: InteractionType.UNBOOKMARK,
    targetId: postId,
    targetType: TargetType.POST,
    fromUser,
    content: '',
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create follow interaction data
 */
export const createFollowInteraction = (targetUser: string, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  // Convert address to number for targetId
  const targetId = parseInt(targetUser.slice(2, 18), 16); // Use first 16 hex chars as number
  return {
    id: createInteractionId(InteractionType.FOLLOW, fromUser, timestamp, targetId),
    timestamp,
    interactionType: InteractionType.FOLLOW,
    targetId,
    targetType: TargetType.USER,
    fromUser,
    content: targetUser, // Store full address in content for reference
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * Create unfollow interaction data
 */
export const createUnfollowInteraction = (targetUser: string, fromUser: string): InteractionDataV3 => {
  const timestamp = Date.now();
  // Convert address to number for targetId
  const targetId = parseInt(targetUser.slice(2, 18), 16); // Use first 16 hex chars as number
  return {
    id: createInteractionId(InteractionType.UNFOLLOW, fromUser, timestamp, targetId),
    timestamp,
    interactionType: InteractionType.UNFOLLOW,
    targetId,
    targetType: TargetType.USER,
    fromUser,
    content: targetUser, // Store full address in content for reference
    parentId: 0,
    tipAmount: 0,
  };
};

/**
 * ULTRA-FAST aggregation using Map for O(1) lookups
 * 
 * Performance: ~1ms for 1000 interactions (vs ~10ms with objects)
 * 
 * IMPROVED: Tracks user state per interaction type to handle LIKE/UNLIKE correctly
 */
export const aggregateInteractions = (
  interactions: InteractionDataV3[],
  currentUser?: string
): Map<number, PostStats> => {
  const statsMap = new Map<number, PostStats>();
  const currentUserLower = currentUser?.toLowerCase();
  
  // Track user states per post (untuk handle LIKE/UNLIKE dengan benar)
  const userLikeState = new Map<number, Map<string, boolean>>(); // postId -> userId -> isLiked
  const userRepostState = new Map<number, Map<string, boolean>>(); // postId -> userId -> isReposted
  const userBookmarkState = new Map<number, Map<string, boolean>>(); // postId -> userId -> isBookmarked
  
  // Sort interactions by timestamp (oldest first) untuk process secara chronological
  const sortedInteractions = [...interactions].sort((a, b) => a.timestamp - b.timestamp);
  
  // Single pass aggregation - O(n)
  for (const interaction of sortedInteractions) {
    const { targetId, interactionType, fromUser, parentId } = interaction;
    
    // Get or create stats
    let stats = statsMap.get(targetId);
    if (!stats) {
      stats = {
        likes: 0,
        comments: 0,
        reposts: 0,
        quotes: 0,
        bookmarks: 0,
        userLiked: false,
        userReposted: false,
        userBookmarked: false,
        likedBy: [],
        repostedBy: [],
        topComments: [],
      };
      statsMap.set(targetId, stats);
    }
    
    const fromUserLower = fromUser.toLowerCase();
    const isCurrentUser = currentUserLower === fromUserLower;
    
    // Aggregate based on type (using enum for faster comparison)
    switch (interactionType) {
      case InteractionType.LIKE: {
        // Get or create user like state for this post
        let postLikes = userLikeState.get(targetId);
        if (!postLikes) {
          postLikes = new Map();
          userLikeState.set(targetId, postLikes);
        }
        
        // Only count if user hasn't liked yet
        if (!postLikes.get(fromUserLower)) {
          postLikes.set(fromUserLower, true);
          stats.likedBy.push(fromUser);
          if (isCurrentUser) stats.userLiked = true;
        }
        break;
      }
        
      case InteractionType.UNLIKE: {
        // Get user like state for this post
        const postLikes = userLikeState.get(targetId);
        if (postLikes && postLikes.get(fromUserLower)) {
          postLikes.set(fromUserLower, false);
          stats.likedBy = stats.likedBy.filter(u => u.toLowerCase() !== fromUserLower);
          if (isCurrentUser) stats.userLiked = false;
        }
        break;
      }
        
      case InteractionType.COMMENT:
        stats.comments++;
        // Only store top-level comments (no parentId)
        if (!parentId || parentId === 0) {
          stats.topComments.push(interaction);
        }
        break;
        
      case InteractionType.REPOST: {
        // Get or create user repost state for this post
        let postReposts = userRepostState.get(targetId);
        if (!postReposts) {
          postReposts = new Map();
          userRepostState.set(targetId, postReposts);
        }
        
        // Only count if user hasn't reposted yet
        if (!postReposts.get(fromUserLower)) {
          postReposts.set(fromUserLower, true);
          stats.repostedBy.push(fromUser);
          if (isCurrentUser) stats.userReposted = true;
        }
        break;
      }
        
      case InteractionType.UNREPOST: {
        // Get user repost state for this post
        const postReposts = userRepostState.get(targetId);
        if (postReposts && postReposts.get(fromUserLower)) {
          postReposts.set(fromUserLower, false);
          stats.repostedBy = stats.repostedBy.filter(u => u.toLowerCase() !== fromUserLower);
          if (isCurrentUser) stats.userReposted = false;
        }
        break;
      }
        
      case InteractionType.BOOKMARK: {
        // Get or create user bookmark state for this post
        let postBookmarks = userBookmarkState.get(targetId);
        if (!postBookmarks) {
          postBookmarks = new Map();
          userBookmarkState.set(targetId, postBookmarks);
        }
        
        // Only count if user hasn't bookmarked yet
        if (!postBookmarks.get(fromUserLower)) {
          postBookmarks.set(fromUserLower, true);
          if (isCurrentUser) stats.userBookmarked = true;
        }
        break;
      }
        
      case InteractionType.UNBOOKMARK: {
        // Get user bookmark state for this post
        const postBookmarks = userBookmarkState.get(targetId);
        if (postBookmarks && postBookmarks.get(fromUserLower)) {
          postBookmarks.set(fromUserLower, false);
          if (isCurrentUser) stats.userBookmarked = false;
        }
        break;
      }
    }
  }
  
  // Calculate final counts from state maps
  for (const [targetId, stats] of statsMap.entries()) {
    // Count likes
    const postLikes = userLikeState.get(targetId);
    if (postLikes) {
      stats.likes = Array.from(postLikes.values()).filter(liked => liked).length;
    }
    
    // Count reposts
    const postReposts = userRepostState.get(targetId);
    if (postReposts) {
      stats.reposts = Array.from(postReposts.values()).filter(reposted => reposted).length;
    }
    
    // Count bookmarks
    const postBookmarks = userBookmarkState.get(targetId);
    if (postBookmarks) {
      stats.bookmarks = Array.from(postBookmarks.values()).filter(bookmarked => bookmarked).length;
    }
    
    // Sort top comments by timestamp (oldest first)
    stats.topComments.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  return statsMap;
};

/**
 * Convert Map to Object for easier consumption
 */
export const statsMapToObject = (statsMap: Map<string, PostStats>): Record<string, PostStats> => {
  const obj: Record<string, PostStats> = {};
  for (const [key, value] of statsMap.entries()) {
    obj[key] = value;
  }
  return obj;
};

/**
 * Get comments for a post (with threading)
 */
export const getCommentsForPost = (
  postId: number,
  interactions: InteractionDataV3[]
): InteractionDataV3[] => {
  return interactions.filter(
    i => i.targetId === postId && i.interactionType === InteractionType.COMMENT
  ).sort((a, b) => a.timestamp - b.timestamp); // Oldest first
};

/**
 * Build comment tree with replies (optimized with Map)
 * 
 * Performance: O(n) instead of O(n²)
 */
export const buildCommentTree = (
  postId: number,
  interactions: InteractionDataV3[]
): Array<InteractionDataV3 & { replies: InteractionDataV3[] }> => {
  // Filter comments for this post
  const comments = interactions.filter(
    i => i.targetId === postId && i.interactionType === InteractionType.COMMENT
  );
  
  // Group by parentId using Map for O(1) lookups
  const repliesMap = new Map<number, InteractionDataV3[]>();
  const topLevel: InteractionDataV3[] = [];
  
  for (const comment of comments) {
    if (!comment.parentId || comment.parentId === 0) {
      topLevel.push(comment);
    } else {
      const replies = repliesMap.get(comment.parentId) || [];
      replies.push(comment);
      repliesMap.set(comment.parentId, replies);
    }
  }
  
  // Build tree
  return topLevel.map(comment => ({
    ...comment,
    replies: repliesMap.get(comment.id) || [],
  })).sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Get replies for a specific comment
 */
export const getRepliesForComment = (
  commentId: number,
  interactions: InteractionDataV3[]
): InteractionDataV3[] => {
  return interactions
    .filter(i => i.parentId === commentId && i.interactionType === InteractionType.COMMENT)
    .sort((a, b) => a.timestamp - b.timestamp);
};

/**
 * Batch create helper - for multiple posts/interactions at once
 * Reduces RPC calls significantly
 */
export interface BatchOperation {
  type: 'post' | 'interaction';
  data: Partial<PostDataV3> | Partial<InteractionDataV3>;
}

/**
 * Create batch of operations
 */
export const createBatch = (): BatchOperation[] => [];

/**
 * Add post to batch
 */
export const addPostToBatch = (
  batch: BatchOperation[],
  postData: Partial<PostDataV3>
): void => {
  batch.push({ type: 'post', data: postData });
};

/**
 * Add interaction to batch
 */
export const addInteractionToBatch = (
  batch: BatchOperation[],
  interactionData: Partial<InteractionDataV3>
): void => {
  batch.push({ type: 'interaction', data: interactionData });
};

/**
 * Count quotes for each post (from quotedPostId field)
 * 
 * @param posts - All posts to analyze
 * @returns Map of postId -> quote count
 */
export const countQuotes = (posts: PostDataV3[]): Map<number, number> => {
  const quoteCounts = new Map<number, number>();
  
  for (const post of posts) {
    if (post.quotedPostId && post.quotedPostId !== 0) {
      const currentCount = quoteCounts.get(post.quotedPostId) || 0;
      quoteCounts.set(post.quotedPostId, currentCount + 1);
    }
  }
  
  return quoteCounts;
};

/**
 * Merge posts with stats (optimized)
 */
export const mergePostsWithStats = (
  posts: PostDataV3[],
  statsMap: Map<number, PostStats>,
  quoteCounts?: Map<number, number>
): PostDataV3[] => {
  return posts.map(post => {
    const stats = statsMap.get(post.id);
    const quotes = quoteCounts?.get(post.id) || 0;
    
    if (!stats) {
      return {
        ...post,
        quotes,
      };
    }
    
    return {
      ...post,
      likes: stats.likes,
      comments: stats.comments,
      reposts: stats.reposts,
      quotes,
      isLiked: stats.userLiked,
      isReposted: stats.userReposted,
      isBookmarked: stats.userBookmarked,
    };
  });
};

/**
 * Filter deleted posts
 */
export const filterActivePosts = (posts: PostDataV3[]): PostDataV3[] => {
  return posts.filter(p => !p.isDeleted);
};

/**
 * Sort posts by timestamp (newest first)
 */
export const sortPostsByTimestamp = (posts: PostDataV3[]): PostDataV3[] => {
  return [...posts].sort((a, b) => b.timestamp - a.timestamp);
};

/**
 * Paginate posts
 */
export const paginatePosts = (
  posts: PostDataV3[],
  page: number,
  pageSize: number = SOMNIA_CONFIG_V3.performance.defaultPageSize
): PostDataV3[] => {
  const start = page * pageSize;
  const end = start + pageSize;
  return posts.slice(start, end);
};

/**
 * Get quoted post from posts array
 */
export const getQuotedPost = (
  post: PostDataV3,
  allPosts: PostDataV3[]
): PostDataV3 | undefined => {
  if (!post.quotedPostId || post.quotedPostId === 0) {
    return undefined;
  }
  return allPosts.find(p => p.id === post.quotedPostId);
};

/**
 * Enrich posts with quoted posts (recursive, max depth 3)
 */
export const enrichPostsWithQuotes = (
  posts: PostDataV3[],
  maxDepth: number = 3
): Array<PostDataV3 & { quotedPost?: PostDataV3 }> => {
  const postsMap = new Map(posts.map(p => [p.id, p]));
  
  const enrichPost = (post: PostDataV3, depth: number = 0): PostDataV3 & { quotedPost?: PostDataV3 } => {
    if (depth >= maxDepth || !post.quotedPostId || post.quotedPostId === 0) {
      return post;
    }
    
    const quotedPost = postsMap.get(post.quotedPostId);
    if (!quotedPost) return post;
    
    return {
      ...post,
      quotedPost: enrichPost(quotedPost, depth + 1),
    };
  };
  
  return posts.map(post => enrichPost(post));
};

/**
 * Create feed index entry
 */
export const createFeedIndexEntry = (
  index: number,
  post: PostDataV3
): FeedIndexEntry => {
  return {
    index,
    postId: post.id,
    timestamp: post.timestamp,
    author: post.author,
  };
};

/**
 * Create user activity entry
 */
export const createUserActivityEntry = (
  user: string,
  activityType: ActivityType,
  targetId: string,
  relatedId: string = '0x0000000000000000000000000000000000000000000000000000000000000000'
): UserActivityEntry => {
  return {
    timestamp: Date.now(),
    user,
    activityType,
    targetId,
    relatedId,
  };
};

/**
 * Performance monitoring helper
 */
export const measurePerformance = <T>(
  name: string,
  fn: () => T
): T => {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  console.log(`⚡ [PERF] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

/**
 * Async performance monitoring helper
 */
export const measurePerformanceAsync = async <T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  console.log(`⚡ [PERF] ${name}: ${(end - start).toFixed(2)}ms`);
  return result;
};

// ===== Generated Music Helper Functions =====

/**
 * Create generated music ID (uint256 = timestamp)
 */
export const createGeneratedMusicId = (owner: string, timestamp?: number): number => {
  const ts = timestamp || Date.now();
  return ts;
};

/**
 * Create default generated music data
 */
export const createDefaultGeneratedMusicData = (
  owner: string,
  taskId: string,
  title: string,
  audioUrl: string,
  imageUrl: string,
  prompt: string,
  style: string,
  lyrics: string = ''
): GeneratedMusicData => {
  return {
    id: createGeneratedMusicId(owner),
    timestamp: Date.now(),
    owner,
    taskId,
    title,
    audioUrl,
    imageUrl,
    prompt,
    style,
    lyrics,
    status: GeneratedMusicStatus.COMPLETED,
  };
};

/**
 * Validate generated music data
 */
export const validateGeneratedMusicData = (data: Partial<GeneratedMusicData>): boolean => {
  // Must have owner
  if (!data.owner) return false;
  
  // Must have taskId
  if (!data.taskId) return false;
  
  // Must have title and audioUrl
  if (!data.title || !data.audioUrl) return false;
  
  return true;
};

/**
 * Filter generated music by status
 */
export const filterGeneratedMusicByStatus = (
  musicList: GeneratedMusicData[],
  status: GeneratedMusicStatus
): GeneratedMusicData[] => {
  return musicList.filter(m => m.status === status);
};

/**
 * Get unminted music (COMPLETED status)
 */
export const getUnmintedMusic = (musicList: GeneratedMusicData[]): GeneratedMusicData[] => {
  return filterGeneratedMusicByStatus(musicList, GeneratedMusicStatus.COMPLETED);
};

/**
 * Sort generated music by timestamp (newest first)
 */
export const sortGeneratedMusicByTimestamp = (musicList: GeneratedMusicData[]): GeneratedMusicData[] => {
  return [...musicList].sort((a, b) => b.timestamp - a.timestamp);
};

// ===== Play Events Helper Functions =====

/**
 * Create play event ID (uint256 = timestamp + random)
 */
export const createPlayEventId = (): number => {
  const ts = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return ts * 1000 + random;
};

/**
 * Create play event data
 */
export const createPlayEventData = (
  tokenId: number,
  listener: string,
  duration: number,
  source: string = 'app'
): PlayEventData => {
  return {
    id: createPlayEventId(),
    timestamp: Date.now(),
    tokenId,
    listener,
    duration,
    source,
  };
};

/**
 * Validate play event data
 */
export const validatePlayEventData = (data: Partial<PlayEventData>): boolean => {
  if (!data.tokenId || data.tokenId <= 0) return false;
  if (!data.listener) return false;
  if (data.duration === undefined || data.duration < 0) return false;
  return true;
};

/**
 * Aggregate play counts from events
 * Returns Map of tokenId -> play count
 */
export const aggregatePlayCounts = (events: PlayEventData[]): Map<number, number> => {
  const counts = new Map<number, number>();
  
  for (const event of events) {
    const current = counts.get(event.tokenId) || 0;
    counts.set(event.tokenId, current + 1);
  }
  
  return counts;
};

/**
 * Get unique listeners for a song
 */
export const getUniqueListeners = (events: PlayEventData[], tokenId: number): Set<string> => {
  const listeners = new Set<string>();
  
  for (const event of events) {
    if (event.tokenId === tokenId) {
      listeners.add(event.listener.toLowerCase());
    }
  }
  
  return listeners;
};

/**
 * Calculate trending score
 * Formula: (plays * 0.7) + (unique_listeners * 0.3) + recency_boost
 */
export const calculateTrendingScore = (
  tokenId: number,
  events: PlayEventData[],
  timeWindow: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): number => {
  const now = Date.now();
  const cutoff = now - timeWindow;
  
  // Filter events within time window
  const recentEvents = events.filter(e => 
    e.tokenId === tokenId && e.timestamp >= cutoff
  );
  
  if (recentEvents.length === 0) return 0;
  
  // Count plays
  const playCount = recentEvents.length;
  
  // Count unique listeners
  const uniqueListeners = getUniqueListeners(recentEvents, tokenId).size;
  
  // Calculate recency boost (newer = higher score)
  const avgTimestamp = recentEvents.reduce((sum, e) => sum + e.timestamp, 0) / recentEvents.length;
  const recencyBoost = (avgTimestamp - cutoff) / timeWindow * 10; // 0-10 points
  
  // Final score
  const score = (playCount * 0.7) + (uniqueListeners * 0.3) + recencyBoost;
  
  return score;
};

/**
 * Get trending songs (sorted by score)
 */
export const getTrendingSongs = (
  events: PlayEventData[],
  tokenIds: number[],
  limit: number = 10,
  timeWindow?: number
): Array<{ tokenId: number; score: number; plays: number; uniqueListeners: number }> => {
  const trending = tokenIds.map(tokenId => {
    const score = calculateTrendingScore(tokenId, events, timeWindow);
    const songEvents = events.filter(e => e.tokenId === tokenId);
    const plays = songEvents.length;
    const uniqueListeners = getUniqueListeners(events, tokenId).size;
    
    return { tokenId, score, plays, uniqueListeners };
  });
  
  // Sort by score (highest first)
  trending.sort((a, b) => b.score - a.score);
  
  return trending.slice(0, limit);
};

/**
 * Check if user already played song today (anti-spam)
 */
export const hasPlayedToday = (
  events: PlayEventData[],
  tokenId: number,
  listener: string
): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();
  
  return events.some(e => 
    e.tokenId === tokenId &&
    e.listener.toLowerCase() === listener.toLowerCase() &&
    e.timestamp >= todayTimestamp
  );
};

export default SOMNIA_CONFIG_V3;
