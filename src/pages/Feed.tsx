import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  MessageCircle,
  Share2,
  Play,
  Pause,
  MoreHorizontal,
  Music,
  TrendingUp,
  ShoppingCart,
  Send,
  X,
  Plus,
  Reply,
  Repeat2,
  DollarSign,
  Copy,
  Flag,
  UserX,
  VolumeX,
  Link as LinkIcon,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import PostComposer from "@/components/PostComposer";
import Navbar from "@/components/Navbar";
import PlaylistModal from "@/components/PlaylistModal";
import PostCard from "@/components/feed/PostCard";
import QuotePostModal from "@/components/QuotePostModal";
import { PostSkeleton } from "@/components/PostSkeleton";
import BuyModal from "@/components/BuyModal";
import TipModal from "@/components/TipModal";
import { NetworkStatus } from "@/components/NetworkStatus";
import { TransactionQueueStatus } from "@/components/TransactionQueueStatus";
import RightSidebar from "@/components/RightSidebar";
import { useAudio } from "@/contexts/AudioContext";
import { useSequence } from "@/contexts/SequenceContext";
import { useAuth } from "@/contexts/AuthContext";
import { recordMusicPlay } from "@/utils/playCountHelper";
import { useToast } from "@/hooks/use-toast";
import { useSocialCache } from "@/hooks/useSocialCache";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { somniaDatastreamServiceV3 } from "@/services/somniaDatastreamService.v3";
import { ipfsService } from "@/services/ipfsService";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { SOMNIA_CONFIG_V3, PostDataV3, InteractionDataV3, ContentType, InteractionType, TargetType, createPostId, createInteractionId, createCommentId } from "@/config/somniaDataStreams.v3";
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface Comment {
  id: number | string;
  postId: number | string;
  author?: string;
  fromUser?: string;
  content: string;
  timestamp: number;
  parentCommentId?: number | string;
  parentId?: string;
  username?: string;
  displayName?: string;
  avatarHash?: string;
}

interface Post {
  id: number | string;
  author: string;
  content: string;
  metadata?: string | any;
  timestamp: number;
  blockNumber?: number;
  transactionHash?: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  isRepost?: boolean;
  isReposted?: boolean;
  originalPostId?: number | string;
  quoteText?: string;
  quotedPost?: Post;
  reposter?: string;
  reposterProfile?: {
    username: string;
    displayName: string;
    avatarHash?: string;
    isVerified?: boolean;
    isArtist?: boolean;
  };
  authorProfile?: {
    username: string;
    displayName: string;
    avatarHash?: string;
    isVerified?: boolean;
    isArtist?: boolean;
  };
  contentType?: string;
  ipfsHash?: string;
  isDeleted?: boolean;
  isPinned?: boolean;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarHash?: string;
}

// Helper function to format post data for UI components
const formatPostForUI = (post: any) => {
  // Safe metadata parsing
  let metadata: any = {};
  try {
    if (post.metadata && typeof post.metadata === 'string') {
      metadata = JSON.parse(post.metadata);
    } else if (post.metadata && typeof post.metadata === 'object') {
      metadata = post.metadata;
    }
  } catch (error) {
    console.warn('Failed to parse metadata in formatPostForUI:', error);
    metadata = {};
  }

  return {
    id: post.id,
    title: metadata.title || post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
    artist: post.author.slice(0, 6) + '...' + post.author.slice(-4),
    avatar: metadata.avatar || '',
    cover: metadata.cover || metadata.ipfsHash ? `https://ipfs.io/ipfs/${metadata.ipfsHash}` : '',
    genre: metadata.genre || 'Social',
    duration: metadata.duration || '0:00',
    description: post.content,
    timestamp: new Date(post.timestamp).toLocaleString(),
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    isLiked: post.isLiked
  };
};

const Feed = () => {
  const { currentTrack, isPlaying, playTrack, pauseTrack, addToPlaylist, isAudioReady, resumeTrack } = useAudio();
  const { smartAccountAddress, isAccountReady, address } = useSequence();
  const { toast } = useToast();
  const { userProfile, isAuthenticated } = useAuth();
  const { profileData: currentUserProfile } = useCurrentUserProfile();
  
  // 💾 Cache & Optimistic Updates Hook
  const socialCache = useSocialCache();
  
  // Somnia testnet chain config
  const somniaTestnet = defineChain({
    id: 50312,
    name: 'Somnia Testnet',
    network: 'somnia-testnet',
    nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
    rpcUrls: {
      default: { http: ['https://dream-rpc.somnia.network'] },
      public: { http: ['https://dream-rpc.somnia.network'] }
    }
  });

  // Public client for reading contract data
  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http()
  });
  
  // Helper function to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };
  
  // Feed state from DataStream
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [isSDKInitialized, setIsSDKInitialized] = useState(false);
  const [lastPostCount, setLastPostCount] = useState(0);
  const [totalPostsFromBlockchain, setTotalPostsFromBlockchain] = useState(0); // Track total posts from blockchain
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false); // Flag untuk auto-refresh vs manual refresh
  
  // Get posts and interactions from cache
  const posts = socialCache.cache.posts;
  const commentsByPost = socialCache.cache.comments;
  const likesByPost = socialCache.cache.likes;
  const repostsByPost = socialCache.cache.reposts;
  const userLikes = socialCache.cache.userLikes;
  const userReposts = socialCache.cache.userReposts;
  
  // Pagination state for load more
  const [allPostsData, setAllPostsData] = useState<any[]>([]); // Store all posts from DataStream
  const [displayedPostsCount, setDisplayedPostsCount] = useState(20); // How many posts to display
  const displayedPostsCountRef = useRef(20); // Ref to track latest value for auto-refresh
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Update ref whenever displayedPostsCount changes
  useEffect(() => {
    displayedPostsCountRef.current = displayedPostsCount;
  }, [displayedPostsCount]);
  
  // Infinite scroll - load more when near bottom (Twitter-style)
  useEffect(() => {
    const handleScroll = () => {
      // Check if user is near bottom (within 500px)
      const scrollPosition = window.innerHeight + window.scrollY;
      const bottomPosition = document.documentElement.scrollHeight - 500;
      
      if (scrollPosition >= bottomPosition && !isLoadingMore && !feedLoading && displayedPostsCount < allPostsData.length) {
        console.log('📜 [INFINITE-SCROLL] Near bottom, loading more posts...');
        loadMorePosts();
      }
    };
    
    // Throttle scroll event for performance
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', throttledScroll);
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [isLoadingMore, feedLoading, displayedPostsCount, allPostsData.length]);
  
  // Comment state (sama seperti DataStreamSocialTest)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  
  // Like state - untuk menampilkan siapa yang like (sama seperti DataStreamSocialTest)
  const [expandedLikes, setExpandedLikes] = useState<Set<string>>(new Set());
  
  // Repost state - untuk menampilkan siapa yang repost (sama seperti DataStreamSocialTest)
  const [expandedReposts, setExpandedReposts] = useState<Set<string>>(new Set());
  
  // Backward compatibility
  const [commentsOpen, setCommentsOpen] = useState<{ [key: number]: boolean }>({});
  const [commentTexts, setCommentTexts] = useState<{ [key: number]: string }>({});
  const [replyTexts, setReplyTexts] = useState<{ [key: string]: string }>({});
  

  
  const [selectedPost, setSelectedPost] = useState<typeof posts[0] | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [selectedTrackForPurchase, setSelectedTrackForPurchase] = useState<typeof posts[0] | null>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [selectedTrackForTip, setSelectedTrackForTip] = useState<typeof posts[0] | null>(null);

  
  // Quote repost state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedPostForQuote, setSelectedPostForQuote] = useState<typeof posts[0] | null>(null);
  
  // Scroll detection for showing/hiding new posts button
  const [isScrollingDown, setIsScrollingDown] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  // Enhanced scroll position restoration with multiple fallbacks
  const SCROLL_POSITION_KEY = 'hibeats_feed_scroll_position';
  const SCROLL_TIMESTAMP_KEY = 'hibeats_feed_scroll_timestamp';
  const SCROLL_POST_COUNT_KEY = 'hibeats_feed_scroll_post_count';
  const SCROLL_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  const scrollRestoredRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const scrollSaveTimeoutRef = useRef<NodeJS.Timeout>();

  const [loadingStates, setLoadingStates] = useState<{[key: string]: boolean}>({});
  const [recentTransactions, setRecentTransactions] = useState<{txHash: string, type: string, timestamp: number}[]>([]);


  
  // Pull-to-refresh state
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const pullThreshold = 80; // Minimum distance to trigger refresh

  // Pagination state (disabled for now - DataStream loads all posts)


  // Initialize SDK and load feed
  useEffect(() => {
    const initSDK = async () => {
      if (!isSDKInitialized) {
        try {
          await somniaDatastreamServiceV3.connect();
          setIsSDKInitialized(true);
          console.log('✅ [V3] DataStream SDK initialized!');
        } catch (error) {
          console.error('❌ [V3] Failed to initialize SDK:', error);
        }
      }
    };
    initSDK();
  }, [isSDKInitialized]);

  // Auto-load feed when ready
  useEffect(() => {
    if (isAccountReady && smartAccountAddress && isSDKInitialized) {
      loadFeed();
    }
  }, [isAccountReady, smartAccountAddress, isSDKInitialized]);

  // Setup auto-refresh callback for cache
  useEffect(() => {
    socialCache.setAutoRefreshCallback(() => {
      console.log('💾 [CACHE] Auto-refreshing feed...');
      loadFeed();
    });
  }, [socialCache]);
  
  // Enhanced scroll position saving with throttling and metadata
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollY = window.scrollY;
      
      // Only save if scroll position changed significantly (> 50px)
      if (Math.abs(scrollY - lastScrollYRef.current) < 50) {
        return;
      }
      
      lastScrollYRef.current = scrollY;
      
      try {
        sessionStorage.setItem(SCROLL_POSITION_KEY, scrollY.toString());
        sessionStorage.setItem(SCROLL_TIMESTAMP_KEY, Date.now().toString());
        sessionStorage.setItem(SCROLL_POST_COUNT_KEY, posts.length.toString());
        console.log('💾 [SCROLL] Saved position:', scrollY, 'posts:', posts.length);
      } catch (error) {
        console.warn('⚠️ [SCROLL] Failed to save position:', error);
      }
    };
    
    // Throttled scroll handler (max once per 200ms)
    let lastSaveTime = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastSaveTime < 200) return;
      
      lastSaveTime = now;
      
      // Clear existing timeout
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
      
      // Debounce save (wait 300ms after last scroll)
      scrollSaveTimeoutRef.current = setTimeout(saveScrollPosition, 300);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Save on unmount
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current);
      }
      saveScrollPosition();
    };
  }, [posts.length]);
  
  // Enhanced scroll position restoration with validation
  useEffect(() => {
    if (scrollRestoredRef.current || posts.length === 0) return;
    
    try {
      const savedPosition = sessionStorage.getItem(SCROLL_POSITION_KEY);
      const savedTimestamp = sessionStorage.getItem(SCROLL_TIMESTAMP_KEY);
      const savedPostCount = sessionStorage.getItem(SCROLL_POST_COUNT_KEY);
      
      if (!savedPosition || !savedTimestamp) {
        scrollRestoredRef.current = true;
        return;
      }
      
      const scrollY = parseInt(savedPosition);
      const timestamp = parseInt(savedTimestamp);
      const postCount = savedPostCount ? parseInt(savedPostCount) : 0;
      const age = Date.now() - timestamp;
      
      // Validate saved position
      if (isNaN(scrollY) || scrollY < 0) {
        console.warn('⚠️ [SCROLL] Invalid saved position:', savedPosition);
        scrollRestoredRef.current = true;
        return;
      }
      
      // Check if saved position is expired
      if (age > SCROLL_EXPIRY_MS) {
        console.log('⏰ [SCROLL] Saved position expired (age:', Math.round(age / 1000), 's)');
        sessionStorage.removeItem(SCROLL_POSITION_KEY);
        sessionStorage.removeItem(SCROLL_TIMESTAMP_KEY);
        sessionStorage.removeItem(SCROLL_POST_COUNT_KEY);
        scrollRestoredRef.current = true;
        return;
      }
      
      // Check if post count is similar (within 20% difference)
      const postCountDiff = Math.abs(posts.length - postCount);
      const postCountDiffPercent = (postCountDiff / Math.max(postCount, 1)) * 100;
      
      if (postCountDiffPercent > 20) {
        console.log('⚠️ [SCROLL] Post count changed significantly, adjusting scroll position');
        // Adjust scroll position proportionally
        const adjustedScrollY = Math.round(scrollY * (posts.length / Math.max(postCount, 1)));
        console.log('📜 [SCROLL] Adjusted position:', scrollY, '→', adjustedScrollY);
        
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: adjustedScrollY, behavior: 'instant' });
            scrollRestoredRef.current = true;
            lastScrollYRef.current = adjustedScrollY;
          });
        });
        return;
      }
      
      console.log('📜 [SCROLL] Restoring position:', scrollY, '(age:', Math.round(age / 1000), 's, posts:', postCount, '→', posts.length, ')');
      
      // Double requestAnimationFrame for better reliability
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'instant' });
          scrollRestoredRef.current = true;
          lastScrollYRef.current = scrollY;
          
          // Verify scroll position after a short delay
          setTimeout(() => {
            const actualScrollY = window.scrollY;
            if (Math.abs(actualScrollY - scrollY) > 100) {
              console.warn('⚠️ [SCROLL] Position mismatch, retrying:', actualScrollY, 'vs', scrollY);
              window.scrollTo({ top: scrollY, behavior: 'instant' });
            }
          }, 100);
        });
      });
    } catch (error) {
      console.warn('⚠️ [SCROLL] Failed to restore position:', error);
      scrollRestoredRef.current = true;
    }
  }, [posts.length]);

  // Load feed from DataStream using V3 service (sama seperti DataStreamSocialTestV3)
  const loadFeed = async (isAutoRefresh = false) => {
    if (!smartAccountAddress) return;

    // Set appropriate loading state
    if (isAutoRefresh) {
      setIsAutoRefreshing(true);
    } else {
      setFeedLoading(true);
    }
    const startTime = Date.now();
    
    try {
      console.log('🚀 [V3-FEED] Starting feed load...');
      
      // Get private key address for DataStream reads
      const privateKey = import.meta.env.VITE_PRIVATE_KEY;
      const privateKeyAddress = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;
      
      if (!privateKeyAddress) {
        console.error('❌ [V3] Private key not found in .env');
        setFeedLoading(false);
        return;
      }
      
      // ⚡ Use V3 optimized feed loader
      const result = await somniaDatastreamServiceV3.loadFeedOptimized(0, 999999, smartAccountAddress);
      const { posts: allPosts, statsMap, loadTime, interactions } = result;

      console.log('⚡ [V3-FEED] Data loaded in', loadTime, 'ms');
      console.log('📦 [V3] Posts:', allPosts?.length || 0, 'Interactions:', interactions?.length || 0);

      if (!allPosts || allPosts.length === 0) {
        console.log('📭 [V3] No posts found');
        socialCache.updateCache([], {}, {}, {}, new Set(), new Set());
        setFeedLoading(false);
        setIsAutoRefreshing(false);
        return;
      }

      // ⚡ Sort posts by timestamp (newest first)
      const sortedAllPosts = allPosts.sort((a, b) => b.timestamp - a.timestamp);
      
      console.log('⚡ [V3-FEED] Processing', sortedAllPosts.length, 'posts');

      // ⚡ Count quotes (from all posts)
      const { countQuotes, mergePostsWithStats, enrichPostsWithQuotes } = await import('@/config/somniaDataStreams.v3');
      const quoteCounts = countQuotes(sortedAllPosts);

      // ⚡ Merge posts with stats (PENTING: ini yang menambahkan likes, comments, reposts dari blockchain)
      const enrichedPosts = mergePostsWithStats(sortedAllPosts, statsMap, quoteCounts);

      console.log(`✅ [V3] Enriched posts with stats:`, enrichedPosts.slice(0, 3).map(p => ({
        id: String(p.id).substring(0, 20),
        likes: p.likes,
        comments: p.comments,
        reposts: p.reposts,
        isLiked: p.isLiked,
        isReposted: p.isReposted
      })));

      // ⚡ Enrich with quoted posts
      const enrichedWithQuotes = enrichPostsWithQuotes(enrichedPosts);

      // ⚡ Filter out deleted posts
      const finalPosts = enrichedWithQuotes.filter((post: any) => !post.isDeleted);
      
      console.log(`🗑️ [V3-FEED] Filtered out ${enrichedWithQuotes.length - finalPosts.length} deleted posts`);

      // ⚡ Load profiles for post authors
      const userAddresses = new Set<string>();
      finalPosts.forEach((post) => {
        if (post.author) userAddresses.add(post.author.toLowerCase());
      });
      
      console.log('⚡ [V3-FEED] Loading', userAddresses.size, 'profiles...');
      
      const profileMap = new Map();
      const { profileService } = await import('@/services/profileService');
      
      // Load profiles in batches of 5 for better performance
      const addressArray = Array.from(userAddresses);
      const batchSize = 5;
      for (let i = 0; i < addressArray.length; i += batchSize) {
        const batch = addressArray.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (address) => {
            try {
              const profile = await profileService.getProfile(address);
              if (profile && profile.username) {
                return { address: address.toLowerCase(), profile };
              }
            } catch (error) {
              // Silent fail
            }
            return null;
          })
        );
        
        batchResults.forEach((result) => {
          if (result) {
            profileMap.set(result.address, result.profile);
          }
        });
      }
      
      console.log('⚡ [V3-FEED] Profiles loaded');

      // ⚡ Process interactions for UI display (likes list, reposts list, comments)
      const commentsByPost: Record<string, any[]> = {};
      const likesByPost: Record<string, any[]> = {};
      const repostsByPost: Record<string, any[]> = {};
      const userLikesSet = new Set<number>();
      const userRepostsSet = new Set<number>();

      interactions.forEach((interaction) => {
        const postId = interaction.targetId;
        const postIdStr = String(postId);
        
        // Track user's own interactions
        const isCurrentUser = interaction.fromUser?.toLowerCase() === smartAccountAddress?.toLowerCase();
        
        if (isCurrentUser) {
          if (interaction.interactionType === InteractionType.LIKE) {
            userLikesSet.add(postId);
          } else if (interaction.interactionType === InteractionType.UNLIKE) {
            userLikesSet.delete(postId);
          } else if (interaction.interactionType === InteractionType.REPOST) {
            userRepostsSet.add(postId);
          } else if (interaction.interactionType === InteractionType.UNREPOST) {
            userRepostsSet.delete(postId);
          }
        }
        
        // Collect comments dengan username
        if (interaction.interactionType === InteractionType.COMMENT) {
          if (!commentsByPost[postIdStr]) {
            commentsByPost[postIdStr] = [];
          }
          const userProfile = profileMap.get(interaction.fromUser?.toLowerCase());
          commentsByPost[postIdStr].push({
            ...interaction,
            username: userProfile?.username || null,
            displayName: userProfile?.displayName || null,
            avatarHash: userProfile?.avatarHash || null
          });
        }
        
        // Collect likes dengan informasi fromUser dan username
        if (interaction.interactionType === InteractionType.LIKE) {
          if (!likesByPost[postIdStr]) {
            likesByPost[postIdStr] = [];
          }
          const userProfile = profileMap.get(interaction.fromUser?.toLowerCase());
          likesByPost[postIdStr].push({
            ...interaction,
            username: userProfile?.username || null,
            displayName: userProfile?.displayName || null,
            avatarHash: userProfile?.avatarHash || null
          });
        } else if (interaction.interactionType === InteractionType.UNLIKE) {
          // Remove like dari user ini
          if (likesByPost[postIdStr]) {
            likesByPost[postIdStr] = likesByPost[postIdStr].filter(
              (like: any) => like.fromUser !== interaction.fromUser
            );
          }
        }
        
        // Collect reposts dengan informasi fromUser dan username
        if (interaction.interactionType === InteractionType.REPOST) {
          if (!repostsByPost[postIdStr]) {
            repostsByPost[postIdStr] = [];
          }
          const userProfile = profileMap.get(interaction.fromUser?.toLowerCase());
          repostsByPost[postIdStr].push({
            ...interaction,
            username: userProfile?.username || null,
            displayName: userProfile?.displayName || null,
            avatarHash: userProfile?.avatarHash || null
          });
        } else if (interaction.interactionType === InteractionType.UNREPOST) {
          // Remove repost dari user ini
          if (repostsByPost[postIdStr]) {
            repostsByPost[postIdStr] = repostsByPost[postIdStr].filter(
              (repost: any) => repost.fromUser !== interaction.fromUser
            );
          }
        }
      });

      console.log('💬 [V3] Comments by post:', Object.keys(commentsByPost).length);
      console.log('❤️ [V3] Likes by post:', Object.keys(likesByPost).length);
      console.log('🔄 [V3] Reposts by post:', Object.keys(repostsByPost).length);

      const totalTime = Date.now() - startTime;
      console.log('⚡ [V3-FEED] Total load time:', totalTime, 'ms');
      
      // Store all posts data for load more functionality
      setAllPostsData(sortedAllPosts);
      
      // ⚡ Track total posts from blockchain (for new posts detection)
      const newTotalPosts = sortedAllPosts.length;
      
      // Check if this is auto-refresh and there are new posts
      if (isAutoRefresh && newTotalPosts > totalPostsFromBlockchain && totalPostsFromBlockchain > 0) {
        // New posts detected during auto-refresh
        // DON'T update cache yet - just show notification
        console.log('🔔 [AUTO-REFRESH] New posts detected, showing notification only');
        setTotalPostsFromBlockchain(newTotalPosts);
        setIsAutoRefreshing(false);
        return; // Exit early - don't update cache
      }
      
      // Update total posts count
      setTotalPostsFromBlockchain(newTotalPosts);
      
      // Preserve displayed count if refreshing, otherwise reset to 20
      // Use ref to get latest value (important for auto-refresh)
      const currentDisplayed = displayedPostsCountRef.current;
      const postsToShow = Math.min(currentDisplayed > 20 ? currentDisplayed : 20, sortedAllPosts.length);
      setDisplayedPostsCount(postsToShow);
      displayedPostsCountRef.current = postsToShow; // Update ref immediately
      
      // ⚡ Convert V3 posts to Feed format
      const postsToCache = finalPosts.slice(0, postsToShow).map((post: any) => {
        const authorProfile = profileMap.get(post.author?.toLowerCase());
        
        // Helper to convert ContentType enum to lowercase string
        const getContentTypeString = (contentType: number): string => {
          const typeStr = ContentType[contentType] || 'TEXT';
          return typeStr.toLowerCase(); // "IMAGE" -> "image", "VIDEO" -> "video"
        };
        
        // 🖼️ Parse mediaHashes into attachments array for multiple images/videos
        const parseMediaHashes = (mediaHashes: string, contentType: string): any[] => {
          if (!mediaHashes || !mediaHashes.trim()) return [];
          
          // Split by comma to get multiple hashes
          const hashes = mediaHashes.split(',').map(h => h.trim()).filter(h => h.length > 0);
          
          // ⚡ ONLY create attachments array if there are MULTIPLE hashes
          // Single media should use ipfsHash field, not attachments array
          if (hashes.length <= 1) return [];
          
          // Convert to attachments format (only for multiple media)
          return hashes.map(hash => ({
            type: contentType === 'video' ? 'video' : 'image',
            ipfsHash: hash,
            url: `https://ipfs.io/ipfs/${hash}`,
            name: `${contentType}_${hash.substring(0, 8)}`
          }));
        };
        
        const contentTypeStr = getContentTypeString(post.contentType);
        const attachments = parseMediaHashes(post.mediaHashes, contentTypeStr);
        
        return {
          id: post.id,
          author: post.author,
          content: post.content,
          contentType: contentTypeStr, // Convert to lowercase
          ipfsHash: post.mediaHashes, // V6: mediaHashes (keep original for backward compatibility)
          timestamp: post.timestamp,
          likes: post.likes || 0,
          comments: post.comments || 0,
          shares: post.reposts || 0,
          isLiked: post.isLiked || false,
          isReposted: post.isReposted || false,
          isDeleted: post.isDeleted || false,
          isPinned: post.isPinned || false,
          quotedPost: post.quotedPost ? {
            id: post.quotedPost.id,
            author: post.quotedPost.author,
            content: post.quotedPost.content,
            contentType: getContentTypeString(post.quotedPost.contentType), // Convert to lowercase
            ipfsHash: post.quotedPost.mediaHashes,
            timestamp: post.quotedPost.timestamp,
            likes: post.quotedPost.likes || 0,
            comments: post.quotedPost.comments || 0,
            shares: post.quotedPost.reposts || 0,
            isDeleted: false,
            isPinned: false,
            authorProfile: {
              username: 'Unknown',
              displayName: 'Unknown User',
              avatarHash: '',
              isVerified: false,
              isArtist: false,
            },
            metadata: {}
          } : undefined,
          authorUsername: authorProfile?.username || null,
          authorDisplayName: authorProfile?.displayName || null,
          authorAvatarHash: authorProfile?.avatarHash || null,
          authorProfile: {
            username: authorProfile?.username || 'Unknown',
            displayName: authorProfile?.displayName || 'Unknown User',
            avatarHash: authorProfile?.avatarHash || '',
            isVerified: authorProfile?.isVerified || false,
            isArtist: authorProfile?.isArtist || false,
          },
          metadata: {
            attachments: attachments.length > 0 ? attachments : undefined
          },
        };
      });
      
      // Convert userLikesSet and userRepostsSet to string IDs for cache
      const userLikesSetStr = new Set(Array.from(userLikesSet).map(id => String(id)));
      const userRepostsSetStr = new Set(Array.from(userRepostsSet).map(id => String(id)));
      
      // 💾 UPDATE CACHE with confirmed blockchain data (preserve loaded posts)
      socialCache.updateCache(
        postsToCache,
        commentsByPost,
        likesByPost,
        repostsByPost,
        userLikesSetStr,
        userRepostsSetStr
      );
      
      // Silent load - no toast notifications for clean UX
    } catch (error: any) {
      console.error('❌ Failed to load feed:', error);
      // Silent error - no toast for clean UX, just log to console
    } finally {
      setFeedLoading(false);
      setIsAutoRefreshing(false);
    }
  };

  // Load more posts (next 20)
  const loadMorePosts = async () => {
    if (isLoadingMore || displayedPostsCount >= allPostsData.length) return;
    
    setIsLoadingMore(true);
    const newDisplayCount = Math.min(displayedPostsCount + 20, allPostsData.length);
    
    console.log('📥 Loading more posts...', {
      current: displayedPostsCount,
      newCount: newDisplayCount,
      total: allPostsData.length
    });
    
    try {
      // Simply update the displayed count - posts are already processed in loadFeed
      setDisplayedPostsCount(newDisplayCount);
      
      // Trigger a re-render by calling loadFeed which will preserve the new displayedPostsCount
      await loadFeed();
      
      console.log('✅ Now showing', newDisplayCount, 'posts');
    } catch (error) {
      console.error('❌ Failed to load more posts:', error);
      // Silent error - no toast for clean UX
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Refresh feed
  const refetchPosts = async () => {
    setFeedRefreshing(true);
    await loadFeed();
    setFeedRefreshing(false);
  };

  const [showNewPostsNotification, setShowNewPostsNotification] = useState(false);

  // Twitter-like: Show new posts and scroll to top
  const handleShowNewPosts = useCallback(() => {
    // Scroll to top and reload feed (manual refresh - will update cache)
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowNewPostsNotification(false);
    setNewPostsCount(0); // Reset count
    
    // Update ref to current blockchain count to prevent re-triggering
    lastBlockchainCountRef.current = totalPostsFromBlockchain;
    
    loadFeed(false); // Pass false for manual refresh - will update cache
  }, [totalPostsFromBlockchain]);

  // Clear new posts notification
  const handleDismissNewPosts = useCallback(() => {
    setShowNewPostsNotification(false);
    setNewPostsCount(0); // Reset count
  }, []);



  // Detect scroll direction to show/hide new posts button
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Detect scroll direction
      // If scrolling down and past threshold (100px), mark as scrolling down
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsScrollingDown(true);
      } 
      // If scrolling up or at the top area (< 50px), mark as not scrolling down
      else if (currentScrollY < lastScrollY || currentScrollY <= 50) {
        setIsScrollingDown(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);



  // ⚡ Real-time new posts detection with count
  const [newPostsCount, setNewPostsCount] = useState(0);
  const lastBlockchainCountRef = useRef(0);
  
  useEffect(() => {
    // Only detect new posts if total blockchain posts increased
    // This prevents "load more" from triggering notification
    if (totalPostsFromBlockchain > lastBlockchainCountRef.current && lastBlockchainCountRef.current > 0) {
      const newCount = totalPostsFromBlockchain - lastBlockchainCountRef.current;
      console.log(`✅ Detected ${newCount} NEW posts from blockchain`);
      setNewPostsCount(newCount);
      setShowNewPostsNotification(true);
    }
    lastBlockchainCountRef.current = totalPostsFromBlockchain;
  }, [totalPostsFromBlockchain]);

  // Auto refresh setiap 10 detik untuk deteksi new posts
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 [AUTO-REFRESH] Checking for new posts...');
      loadFeed(true); // Pass true to indicate auto-refresh
    }, 10000); // 10 detik

    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, [smartAccountAddress, totalPostsFromBlockchain]);

  // Pull-to-refresh handlers - Only for feed container
  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate if at top of page and not clicking on interactive elements
    const target = e.target as HTMLElement;
    if (window.scrollY === 0 && !target.closest('button, a, input, textarea, [role="button"]')) {
      setStartY(e.touches[0].clientY);
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    const dampedDistance = Math.min(distance * 0.5, 120); // Dampen the pull distance
    
    // Only prevent default if actually pulling
    if (distance > 10) {
      e.preventDefault();
    }
    
    setPullDistance(dampedDistance);
  }, [isPulling, startY]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= pullThreshold) {
      console.log('🔄 Pull-to-refresh triggered!');
      await refetchPosts();
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, pullThreshold, refetchPosts]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Only activate if at top of page and not clicking on interactive elements
    const target = e.target as HTMLElement;
    if (window.scrollY === 0 && !target.closest('button, a, input, textarea, [role="button"]')) {
      setStartY(e.clientY);
      setIsPulling(true);
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPulling || window.scrollY > 0) return;
    
    const distance = Math.max(0, e.clientY - startY);
    const dampedDistance = Math.min(distance * 0.5, 120);
    
    setPullDistance(dampedDistance);
  }, [isPulling, startY]);

  const handleMouseUp = useCallback(async () => {
    if (!isPulling) return;
    
    setIsPulling(false);
    
    if (pullDistance >= pullThreshold) {
      console.log('🔄 Pull-to-refresh triggered!');
      await refetchPosts();
    }
    
    setPullDistance(0);
  }, [isPulling, pullDistance, pullThreshold, refetchPosts]);

  // Add pull-to-refresh event listeners
  useEffect(() => {
    const handleTouchStartWrapper = (e: TouchEvent) => handleTouchStart(e);
    const handleTouchMoveWrapper = (e: TouchEvent) => handleTouchMove(e);
    const handleTouchEndWrapper = () => handleTouchEnd();
    const handleMouseDownWrapper = (e: MouseEvent) => handleMouseDown(e);
    const handleMouseMoveWrapper = (e: MouseEvent) => handleMouseMove(e);
    const handleMouseUpWrapper = () => handleMouseUp();

    // Use { passive: false } for touchmove to allow preventDefault
    document.addEventListener('touchstart', handleTouchStartWrapper, { passive: true });
    document.addEventListener('touchmove', handleTouchMoveWrapper, { passive: false });
    document.addEventListener('touchend', handleTouchEndWrapper, { passive: true });
    document.addEventListener('mousedown', handleMouseDownWrapper);
    document.addEventListener('mousemove', handleMouseMoveWrapper);
    document.addEventListener('mouseup', handleMouseUpWrapper);

    return () => {
      document.removeEventListener('touchstart', handleTouchStartWrapper);
      document.removeEventListener('touchmove', handleTouchMoveWrapper);
      document.removeEventListener('touchend', handleTouchEndWrapper);
      document.removeEventListener('mousedown', handleMouseDownWrapper);
      document.removeEventListener('mousemove', handleMouseMoveWrapper);
      document.removeEventListener('mouseup', handleMouseUpWrapper);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Add transaction to recent list
  const addRecentTransaction = (txHash: string, type: string) => {
    setRecentTransactions(prev => [
      { txHash, type, timestamp: Date.now() },
      ...prev.slice(0, 4) // Keep only last 5 transactions
    ]);
  };
  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Toggle comments visibility (sama seperti DataStreamSocialTest)
  const toggleComments = (postId: string | number) => {
    const postIdStr = typeof postId === 'string' ? postId : postId.toString();
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postIdStr)) {
        newSet.delete(postIdStr);
      } else {
        newSet.add(postIdStr);
      }
      return newSet;
    });
  };

  // Toggle likes visibility (sama seperti DataStreamSocialTest)
  const toggleLikes = (postId: string) => {
    setExpandedLikes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  // Toggle reposts visibility (sama seperti DataStreamSocialTest)
  const toggleReposts = (postId: string) => {
    setExpandedReposts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCommentChange = (trackId: number | string, text: string) => {
    const key = typeof trackId === 'string' ? trackId : trackId.toString();
    setCommentInputs(prev => ({
      ...prev,
      [key]: text
    }));
    // Keep backward compatibility
    if (typeof trackId === 'number') {
      setCommentTexts(prev => ({
        ...prev,
        [trackId]: text
      }));
    }
  };

  const handleReplyChange = (key: string, text: string) => {
    setCommentInputs(prev => ({
      ...prev,
      [key]: text
    }));
    // Keep backward compatibility
    setReplyTexts(prev => ({
      ...prev,
      [key]: text
    }));
  };

  // ⚡ Comment on post using V3 service
  const handleAddComment = async (postId: string, commentText: string) => {
    if (!isAccountReady || !smartAccountAddress) {
      toast({
        title: "Please connect your wallet to comment",
        variant: "destructive",
      });
      return;
    }

    if (!commentText.trim()) return;

    console.log('🔍 [V3-FEED] handleAddComment called:', {
      postId,
      commentText: commentText.substring(0, 50),
      smartAccountAddress
    });

    try {
      const postIdNum = typeof postId === 'string' ? Number(postId) : postId;
      const timestamp = Date.now();
      const commentId = createCommentId(postIdNum, smartAccountAddress, timestamp);
      
      const interactionData: Partial<InteractionDataV3> = {
        id: commentId,
        interactionType: InteractionType.COMMENT,
        targetId: postIdNum,
        targetType: TargetType.POST,
        fromUser: smartAccountAddress,
        content: commentText.trim(),
        parentId: 0,
        timestamp,
        tipAmount: 0,
      };
      
      // ⚡ Write to blockchain using V3 service (immediate)
      await somniaDatastreamServiceV3.createInteraction(interactionData, true);
      
      // Silent success - no toast for clean UX
      // Reload feed after blockchain confirmation
      setTimeout(() => {
        loadFeed(false);
      }, 3000);
    } catch (error) {
      console.error('❌ [V3] Failed to add comment:', error);
      toast({
        title: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  // Wrapper untuk reply using V3 service
  const handleAddReply = async (postId: string, commentId: string, replyText: string) => {
    if (!isAccountReady || !smartAccountAddress) {
      toast({
        title: "Please connect your wallet to reply",
        variant: "destructive",
      });
      return;
    }

    if (!replyText.trim()) return;

    try {
      const postIdNum = typeof postId === 'string' ? Number(postId) : postId;
      const parentIdNum = typeof commentId === 'string' ? Number(commentId) : commentId;
      const timestamp = Date.now();
      const replyId = createCommentId(postIdNum, smartAccountAddress, timestamp);
      
      const interactionData: Partial<InteractionDataV3> = {
        id: replyId,
        interactionType: InteractionType.COMMENT,
        targetId: postIdNum,
        targetType: TargetType.POST,
        fromUser: smartAccountAddress,
        content: replyText.trim(),
        parentId: parentIdNum, // Reply to comment
        timestamp,
        tipAmount: 0,
      };
      
      // ⚡ Write to blockchain using V3 service (immediate)
      await somniaDatastreamServiceV3.createInteraction(interactionData, true);
      
      // Silent success - no toast for clean UX
      // Reload feed after blockchain confirmation
      setTimeout(() => {
        loadFeed(false);
      }, 3000);
    } catch (error) {
      console.error('❌ [V3] Failed to add reply:', error);
      toast({
        title: "Failed to add reply",
        variant: "destructive",
      });
    }
  };



  // ⚡ Simple Repost (no quote) using V3 service
  const simpleRepost = async (postId: string) => {
    if (!smartAccountAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to repost",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const postIdNum = typeof postId === 'string' ? Number(postId) : postId;
    const post = posts.find(p => p.id.toString() === postId);
    if (!post) return;

    // ⚡ Use optimistic update from socialCache (allows concurrent reposts)
    socialCache.optimisticToggleRepost(
      postId,
      smartAccountAddress,
      async () => {
        try {
          const isReposted = post.isReposted || false;
          const interactionType = isReposted ? InteractionType.UNREPOST : InteractionType.REPOST;
          const timestamp = Date.now();
          const interactionId = createInteractionId(interactionType, smartAccountAddress, timestamp, postIdNum);
          
          const interactionData: Partial<InteractionDataV3> = {
            id: interactionId,
            interactionType,
            targetId: postIdNum,
            targetType: TargetType.POST,
            fromUser: smartAccountAddress,
            content: '',
            parentId: 0,
            timestamp,
            tipAmount: 0,
          };

          // ⚡ Write to blockchain using V3 service (immediate)
          const txHash = await somniaDatastreamServiceV3.createInteraction(interactionData, true);
          
          // Silent success - no toast for clean UX
          // Reload feed after blockchain confirmation
          setTimeout(() => {
            loadFeed(false);
          }, 3000);
          
          return txHash;
        } catch (error) {
          console.error('❌ [V3] Failed to toggle repost:', error);
          toast({
            title: "Failed to " + (post.isReposted ? 'unrepost' : 'repost'),
            variant: "destructive",
          });
          return null;
        }
      }
    );
  };

  // Backward compatibility wrapper
  const handleRepost = async (post: typeof posts[0], quoteTextParam?: string, attachments?: any[]) => {
    const postIdStr = typeof post.id === 'string' ? post.id : post.id.toString();
    await simpleRepost(postIdStr);
  };

  // Delete post using V3 service (already implemented above as deletePost function)
  const handleDeletePost = async (postId: number | string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    const postIdStr = typeof postId === 'string' ? postId : postId.toString();
    await deletePost(postIdStr);
  };

  // Open quote modal
  const openQuoteModal = (post: typeof posts[0]) => {
    setSelectedPostForQuote(post);
    setIsQuoteModalOpen(true);
  };

  // Close quote modal
  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setSelectedPostForQuote(null);
  };

  // Submit quote repost using V3 service
  const handleQuoteSubmit = async (quoteText: string, attachments: any[]) => {
    if (!selectedPostForQuote) return;
    
    if (!isAccountReady || !smartAccountAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to quote posts",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      let mediaHashes = '';
      let contentTypeEnum = ContentType.QUOTE; // Always QUOTE for quote posts

      // ⚡ NO UPLOAD NEEDED: Files already uploaded to IPFS when selected!
      // Just collect the IPFS hashes
      if (attachments && attachments.length > 0) {
        // Check if any attachments are still uploading
        const stillUploading = attachments.some(att => att.uploading);
        if (stillUploading) {
          toast({
            title: "Please wait",
            description: "Media upload in progress...",
            variant: "destructive",
          });
          return;
        }
        
        // Check if any uploads failed
        const hasFailed = attachments.some(att => att.uploadFailed);
        if (hasFailed) {
          toast({
            title: "Upload failed",
            description: "Some media uploads failed. Please remove and try again",
            variant: "destructive",
          });
          return;
        }
        
        // Collect IPFS hashes (already uploaded)
        const validHashes = attachments
          .filter(att => att.ipfsHash)
          .map(att => att.ipfsHash);
        
        if (validHashes.length > 0) {
          // V6: Multiple media hashes separated by comma
          mediaHashes = validHashes.join(',');
          console.log('✅ [Quote] Using uploaded media:', mediaHashes);
        }
      }

      // Create quote post using V3 format
      const timestamp = Date.now();
      const postId = createPostId(smartAccountAddress, timestamp);
      const quotedPostIdNum = typeof selectedPostForQuote.id === 'string' 
        ? Number(selectedPostForQuote.id) 
        : selectedPostForQuote.id;
      
      const postData: Partial<PostDataV3> = {
        id: postId,
        author: smartAccountAddress,
        content: quoteText.trim(),
        contentType: contentTypeEnum, // Always QUOTE
        mediaHashes, // V6: comma-separated hashes for multiple media
        quotedPostId: quotedPostIdNum, // V6: uint256
        replyToId: 0,
        mentions: '', // TODO: Extract mentions from quoteText
        collectModule: '0x0000000000000000000000000000000000000000',
        collectPrice: 0,
        collectLimit: 0,
        collectCount: 0,
        isGated: false,
        referrer: '0x0000000000000000000000000000000000000000',
        nftTokenId: 0,
        isDeleted: false,
        isPinned: false,
        timestamp,
        index: 0,
      };

      console.log('📝 [Quote] Creating quote post:', {
        quotedPostId: quotedPostIdNum,
        hasMedia: !!mediaHashes,
        mediaCount: mediaHashes ? mediaHashes.split(',').length : 0,
        contentLength: quoteText.length
      });

      toast({
        title: "Creating quote post...",
        description: "Please wait",
      });

      await somniaDatastreamServiceV3.createPost(postData, true); // immediate = true

      toast({
        title: "✅ Quote posted!",
        description: mediaHashes 
          ? `Quote with ${mediaHashes.split(',').length} media file(s) published`
          : "Your quote has been published",
      });
      
      // Close modal
      closeQuoteModal();
      
      // Refresh feed to show new quote post
      setTimeout(() => loadFeed(), 3000);
    } catch (error: any) {
      console.error('❌ [V3] Failed to create quote:', error);
      toast({
        title: "Failed to create quote",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const openPostDetail = (post: typeof posts[0]) => {
    setSelectedPost(post);
  };

  const closePostDetail = () => {
    setSelectedPost(null);
  };

  const openBuyModal = (post: typeof posts[0]) => {
    setSelectedTrackForPurchase(post);
    setIsBuyModalOpen(true);
  };

  const closeBuyModal = () => {
    setIsBuyModalOpen(false);
    setSelectedTrackForPurchase(null);
  };

  const openTipModal = (post: typeof posts[0]) => {
    setSelectedTrackForTip(post);
    setIsTipModalOpen(true);
  };

  const closeTipModal = () => {
    setIsTipModalOpen(false);
    setSelectedTrackForTip(null);
  };

  // ⚡ Like/Unlike post using V3 service with optimistic updates
  const toggleLike = async (postId: string) => {
    if (!smartAccountAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to like posts",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    const postIdNum = typeof postId === 'string' ? Number(postId) : postId;
    const post = posts.find(p => p.id.toString() === postId);
    if (!post) return;

    // ⚡ Use optimistic update from socialCache (allows concurrent likes)
    socialCache.optimisticToggleLike(
      postId,
      smartAccountAddress,
      async () => {
        try {
          const isLiked = post.isLiked || false;
          const interactionType = isLiked ? InteractionType.UNLIKE : InteractionType.LIKE;
          const timestamp = Date.now();
          const interactionId = createInteractionId(interactionType, smartAccountAddress, timestamp, postIdNum);
          
          const interactionData: Partial<InteractionDataV3> = {
            id: interactionId,
            interactionType,
            targetId: postIdNum,
            targetType: TargetType.POST,
            fromUser: smartAccountAddress,
            content: '',
            parentId: 0,
            timestamp,
            tipAmount: 0,
          };

          // ⚡ Write to blockchain using V3 service (immediate)
          const txHash = await somniaDatastreamServiceV3.createInteraction(interactionData, true);
          
          // Silent success - no toast for clean UX
          // Reload feed after blockchain confirmation
          setTimeout(() => {
            loadFeed(false);
          }, 3000);
          
          return txHash;
        } catch (error) {
          console.error('❌ [V3] Failed to toggle like:', error);
          toast({
            title: "Failed to " + (post.isLiked ? 'unlike' : 'like') + ' post',
            variant: "destructive",
          });
          return null;
        }
      }
    );
  };

  // Backward compatibility wrapper
  const handleLike = async (post: typeof posts[0]) => {
    const postId = typeof post.id === 'string' ? post.id : post.id.toString();
    await toggleLike(postId);
  };

  // Delete post using V3 service
  const deletePost = async (postId: string) => {
    if (!isAccountReady || !smartAccountAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to delete posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const postIdNum = typeof postId === 'string' ? Number(postId) : postId;
      
      // Find the post data
      const postToDelete = posts.find(p => String(p.id) === String(postId));
      if (!postToDelete) {
        toast({
          title: "Post not found",
          variant: "destructive",
        });
        return;
      }
      
      // Check if user is the author
      if (postToDelete.author?.toLowerCase() !== smartAccountAddress?.toLowerCase()) {
        toast({
          title: "Permission denied",
          description: "You can only delete your own posts",
          variant: "destructive",
        });
        return;
      }

      // ⚡ OPTIMISTIC UPDATE: Remove post from UI immediately
      socialCache.updateCache(
        posts.filter(p => String(p.id) !== String(postId)),
        socialCache.cache.comments,
        socialCache.cache.likes,
        socialCache.cache.reposts,
        socialCache.cache.userLikes,
        socialCache.cache.userReposts
      );

      toast({
        title: "Post deleted",
        description: "Your post has been deleted",
      });

      // Prepare post data for delete (need full post data to update)
      const postData: PostDataV3 = {
        id: postIdNum,
        timestamp: postToDelete.timestamp,
        content: postToDelete.content,
        contentType: ContentType[postToDelete.contentType?.toUpperCase() as keyof typeof ContentType] || ContentType.TEXT,
        mediaHashes: postToDelete.ipfsHash || '',
        author: postToDelete.author,
        quotedPostId: postToDelete.quotedPost ? (typeof postToDelete.quotedPost.id === 'string' ? Number(postToDelete.quotedPost.id) : postToDelete.quotedPost.id) : 0,
        replyToId: 0,
        mentions: '',
        collectModule: '0x0000000000000000000000000000000000000000',
        collectPrice: 0,
        collectLimit: 0,
        collectCount: 0,
        isGated: false,
        referrer: '0x0000000000000000000000000000000000000000',
        nftTokenId: 0,
        isDeleted: false, // Will be set to true by deletePost function
        isPinned: false,
        index: 0,
      };

      // ⚡ Delete post on blockchain (soft delete by setting isDeleted = true)
      // Run in background, UI already updated
      somniaDatastreamServiceV3.deletePost(postIdNum, postData).catch(error => {
        console.error('❌ Failed to delete post on blockchain:', error);
        // Revert optimistic update on error
        loadFeed();
        toast({
          title: "Failed to delete post",
          description: "Please try again",
          variant: "destructive",
        });
      });
    } catch (error) {
      console.error('❌ [V3] Failed to delete post:', error);
      toast({
        title: "Failed to delete post",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleTip = (post: typeof posts[0], amount: number) => {
    // In a real app, this would make an API call to send the tip
    const formattedPost = formatPostForUI(post);
    console.log(`Tipping ${amount} SOMI to ${formattedPost.artist} for post: ${formattedPost.title}`);
    // You could show a success message or update the artist's earnings
    closeTipModal();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Network Status Indicator */}
              <NetworkStatus />
              
              {/* Pull-to-refresh indicator - hanya tampil saat benar-benar pulling */}
              {isPulling && pullDistance > 20 && (
                <div 
                  className="flex items-center justify-center py-2 transition-all duration-200"
                  style={{ 
                    transform: `translateY(${Math.max(0, pullDistance - 60)}px)`,
                    opacity: Math.min(pullDistance / pullThreshold, 0.8)
                  }}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        pullDistance >= pullThreshold ? 'text-primary rotate-180' : ''
                      }`} 
                    />
                    <span className="text-xs">
                      {pullDistance >= pullThreshold ? 'Release to refresh' : 'Pull to refresh'}
                    </span>
                  </div>
                </div>
              )}

              {/* Post Composer */}
              <PostComposer
                onPost={async (content, attachments) => {
                  if (!isAccountReady || !smartAccountAddress) {
                    console.warn('⚠️ Account not ready');
                    return;
                  }

                  try {
                    // ⚡ SIMPLIFIED: Extract IPFS hash and contentType directly
                    let ipfsHash = '';
                    let contentType = 'text';
                    let metadata: any = null;
                    
                    if (attachments && attachments.length > 0) {
                      const imageAttachment = attachments.find(att => att.type === 'image');
                      const videoAttachment = attachments.find(att => att.type === 'video');
                      const musicAttachment = attachments.find(att => att.type === 'music');
                      
                      if (imageAttachment?.ipfsHash) {
                        ipfsHash = imageAttachment.ipfsHash;
                        contentType = 'image';
                      } else if (videoAttachment?.ipfsHash) {
                        ipfsHash = videoAttachment.ipfsHash;
                        contentType = 'video';
                      } else if (musicAttachment?.item) {
                        // For music, store metadata as JSON
                        const musicItem = musicAttachment.item;
                        contentType = 'music';
                        
                        // Construct IPFS URLs if not already present
                        const audioUrl = musicItem.audioUrl || 
                          (musicItem.ipfsAudioHash ? `https://ipfs.io/ipfs/${musicItem.ipfsAudioHash}` : '');
                        const imageUrl = musicItem.imageUrl || 
                          (musicItem.ipfsArtworkHash ? `https://ipfs.io/ipfs/${musicItem.ipfsArtworkHash}` : 
                           musicItem.ipfsImageHash ? `https://ipfs.io/ipfs/${musicItem.ipfsImageHash}` : '');
                        
                        // Create metadata object for music
                        metadata = {
                          type: 'music',
                          title: musicItem.title || 'Untitled',
                          artist: musicItem.artist || 'Unknown Artist',
                          genre: musicItem.genre,
                          duration: musicItem.duration,
                          audioUrl: audioUrl,
                          imageUrl: imageUrl,
                          ipfsAudioHash: musicItem.ipfsAudioHash,
                          ipfsImageHash: musicItem.ipfsArtworkHash || musicItem.ipfsImageHash,
                          isNFT: musicItem.isNFT || false,
                          tokenId: musicItem.tokenId,
                          contractAddress: musicItem.contractAddress,
                        };
                        
                        // Store metadata as JSON string in ipfsHash field
                        ipfsHash = JSON.stringify(metadata);
                        
                        console.log('🎵 [POST] Music metadata prepared:', metadata);
                      }
                    }

                    // ⚡ V3: Create post data using V3 format
                    const timestamp = Date.now();
                    const postId = createPostId(smartAccountAddress, timestamp);
                    
                    // Map contentType string to ContentType enum
                    let contentTypeEnum = ContentType.TEXT;
                    if (contentType === 'image') contentTypeEnum = ContentType.IMAGE;
                    else if (contentType === 'video') contentTypeEnum = ContentType.VIDEO;
                    else if (contentType === 'music') contentTypeEnum = ContentType.MUSIC;
                    
                    const postData: Partial<PostDataV3> = {
                      id: postId,
                      author: smartAccountAddress,
                      content: content.trim(),
                      contentType: contentTypeEnum,
                      mediaHashes: ipfsHash, // V6: mediaHashes
                      quotedPostId: 0,
                      replyToId: 0,
                      mentions: '',
                      collectModule: '0x0000000000000000000000000000000000000000',
                      collectPrice: 0,
                      collectLimit: 0,
                      collectCount: 0,
                      isGated: false,
                      referrer: '0x0000000000000000000000000000000000000000',
                      nftTokenId: 0,
                      isDeleted: false,
                      isPinned: false,
                      timestamp,
                      index: 0,
                    };

                    // ⚡ Publish to blockchain using V3 service
                    await somniaDatastreamServiceV3.createPost(postData, true); // immediate = true

                    // Silent success - no toast for clean UX
                    // Reload feed after blockchain confirmation
                    setTimeout(() => {
                      loadFeed(false);
                    }, 3000);
                  } catch (error) {
                    console.error('❌ Failed to create post:', error);
                    // Keep error toast - important for user feedback
                    toast({
                      title: "❌ Post failed",
                      description: error instanceof Error ? error.message : "Failed to create post",
                      variant: "destructive",
                    });
                  }
                }}
              />

              {/* Twitter-like: New Posts Notification */}
              {showNewPostsNotification && !isScrollingDown && (
                <div 
                  className="sticky top-16 z-20 border-b border-primary/20 bg-primary/5 backdrop-blur-sm py-3 text-center cursor-pointer hover:bg-primary/10 transition-colors duration-200"
                  onClick={handleShowNewPosts}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg 
                      width="16" 
                      height="16" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    <span className="text-primary font-semibold text-sm">
                      {newPostsCount > 0 
                        ? `Show ${newPostsCount} new ${newPostsCount === 1 ? 'post' : 'posts'}`
                        : 'New posts available - Click to refresh'
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Floating button when scrolling down */}
              {showNewPostsNotification && isScrollingDown && (
                <div className="flex justify-center sticky top-20 z-20 pointer-events-none transition-all duration-300 opacity-100 translate-y-0 mb-4">
                  <Button
                    onClick={handleShowNewPosts}
                    className="pointer-events-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl rounded-full px-6 py-3 h-auto flex items-center gap-3 font-semibold animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <svg 
                      width="20" 
                      height="20" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      className="flex-shrink-0"
                    >
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    <span className="font-bold text-base leading-tight">
                      {newPostsCount > 0 
                        ? `Show ${newPostsCount} new ${newPostsCount === 1 ? 'post' : 'posts'}`
                        : 'New posts available'
                      }
                    </span>
                  </Button>
                </div>
              )}

              {/* Twitter-style Loading Spinner - Only on initial load */}
              {(feedLoading || feedRefreshing) && posts.length === 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}

              {/* Empty State - Only show after loading completes */}
              {!feedLoading && !feedRefreshing && posts.length === 0 && (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">No posts yet</p>
                      <p className="text-sm text-muted-foreground">Be the first to share something!</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Feed Posts - Using optimized PostCard component */}
              {posts
                // Filter out simple reposts (without quote) from feed
                // Simple reposts only appear on user's profile page
                .filter(post => {
                  // Parse metadata to check if it's a simple repost
                  let metadata: any = {};
                  try {
                    if (post.metadata && typeof post.metadata === 'string') {
                      metadata = JSON.parse(post.metadata);
                    } else if (post.metadata && typeof post.metadata === 'object') {
                      metadata = post.metadata;
                    }
                  } catch (error) {
                    metadata = {};
                  }
                  
                  // Show post if:
                  // 1. It's not a repost at all, OR
                  // 2. It's a quote repost (has quoteText)
                  const isSimpleRepost = metadata.type === 'repost' && !metadata.quoteText && !post.quoteText;
                  return !isSimpleRepost;
                })
                .map((post, index) => {
                // Safe metadata parsing
                let metadata: any = {};
                try {
                  if (post.metadata && typeof post.metadata === 'string') {
                    metadata = JSON.parse(post.metadata);
                  } else if (post.metadata && typeof post.metadata === 'object') {
                    metadata = post.metadata;
                  }
                  
                  // For music posts, metadata is stored in ipfsHash as JSON
                  if (post.contentType === 'music' && post.ipfsHash && typeof post.ipfsHash === 'string') {
                    try {
                      const musicMetadata = JSON.parse(post.ipfsHash);
                      if (musicMetadata && musicMetadata.type === 'music') {
                        metadata = musicMetadata;
                      }
                    } catch (e) {
                      // ipfsHash is not JSON, keep existing metadata
                    }
                  }
                } catch (error) {
                  console.warn('Failed to parse metadata for post', post.id, error);
                  metadata = { type: 'text' };
                }

                const postCardData = {
                  id: post.id.toString(),
                  author: post.author,
                  content: post.content,
                  contentType: (post.contentType || 'text') as 'text' | 'music' | 'image' | 'video' | 'quote', // Use contentType from DataStream
                  ipfsHash: post.ipfsHash, // Use ipfsHash from DataStream directly
                  timestamp: post.timestamp,
                  likes: post.likes,
                  comments: post.comments,
                  shares: post.shares,
                  isLiked: post.isLiked,
                  isReposted: post.isReposted || false,
                  isRepost: post.isRepost || false,
                  quoteText: post.quoteText,
                  quotedPost: post.quotedPost ? {
                    id: post.quotedPost.id.toString(),
                    author: post.quotedPost.author,
                    content: post.quotedPost.content,
                    contentType: (post.quotedPost.contentType || 'text') as 'text' | 'music' | 'image' | 'video' | 'quote', // Use contentType from DataStream
                    ipfsHash: post.quotedPost.ipfsHash, // Use ipfsHash from DataStream
                    timestamp: post.quotedPost.timestamp,
                    likes: post.quotedPost.likes,
                    comments: post.quotedPost.comments,
                    shares: post.quotedPost.shares,
                    authorProfile: post.quotedPost.authorProfile,
                    metadata: post.quotedPost.metadata
                  } : undefined,
                  metadata: metadata
                };

                // Get comments for this post from cache
                const postIdStr = typeof post.id === 'string' ? post.id : post.id.toString();
                const rawComments = commentsByPost[postIdStr] || [];
                
                // Transform comments to match PostCard interface - keep IDs as strings
                const postComments = rawComments.map(comment => ({
                  id: comment.id, // Keep as string (DataStream IDs are strings like "comment_123_0x...")
                  author: comment.fromUser || comment.author || '',
                  content: comment.content,
                  timestamp: comment.timestamp,
                  parentCommentId: comment.parentId || undefined
                }));

                return (
                  <div key={`${post.id}-${post.author}-${post.timestamp}`} className="space-y-0">
                    <PostCard
                      post={postCardData}
                      isLoading={false}
                      comments={postComments}
                      currentUserAddress={smartAccountAddress || undefined}
                      onLike={async (postId) => {
                        await toggleLike(postId);
                      }}
                      onComment={(postId) => {
                        toggleComments(postId);
                      }}
                      onCommentWithText={async (postId, commentText) => {
                        if (commentText?.trim()) {
                          await handleAddComment(postId, commentText);
                        }
                      }}
                      onShare={(postId) => {
                        simpleRepost(postId);
                      }}
                      onQuote={(postId) => {
                        const postData = posts.find(p => p.id.toString() === postId);
                        if (postData) {
                          openQuoteModal(postData);
                        }
                      }}
                      onDelete={(postId) => {
                        deletePost(postId);
                      }}
                      onViewDetails={(postId) => {
                        const postData = posts.find(p => p.id.toString() === postId);
                        if (postData) {
                          openPostDetail(postData);
                        }
                      }}
                      onViewLikes={(postId) => {
                        toggleLikes(postId);
                      }}
                      onViewReposts={(postId) => {
                        toggleReposts(postId);
                      }}
                    />

                    {/* Likes Section - sama seperti DataStreamSocialTest */}
                    {expandedLikes.has(postIdStr) && likesByPost[postIdStr]?.length > 0 && (
                      <Card className="border-t-0 rounded-t-none">
                        <CardContent className="pt-3 space-y-2">
                          <div className="text-sm font-semibold mb-2">
                            Liked by {likesByPost[postIdStr].length} {likesByPost[postIdStr].length === 1 ? 'user' : 'users'}
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {likesByPost[postIdStr]
                              .sort((a: any, b: any) => b.timestamp - a.timestamp)
                              .map((like: any) => (
                                <Link
                                  key={like.id}
                                  to={`/profile/${like.fromUser}`}
                                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 w-full text-left"
                                >
                                  <Avatar className="w-8 h-8">
                                    {like.avatarHash ? (
                                      <AvatarImage src={`https://ipfs.io/ipfs/${like.avatarHash}`} />
                                    ) : (
                                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${like.fromUser}`} />
                                    )}
                                    <AvatarFallback>{like.fromUser.slice(2, 4)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium hover:underline">
                                      {like.displayName || like.username || `${like.fromUser.slice(0, 6)}...${like.fromUser.slice(-4)}`}
                                    </div>
                                    {like.username && (
                                      <div className="text-xs text-muted-foreground">
                                        @{like.username}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(like.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                  <Heart className="w-4 h-4 text-red-500 fill-current" />
                                </Link>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Reposts Section - sama seperti DataStreamSocialTest */}
                    {expandedReposts.has(postIdStr) && repostsByPost[postIdStr]?.length > 0 && (
                      <Card className="border-t-0 rounded-t-none">
                        <CardContent className="pt-3 space-y-2">
                          <div className="text-sm font-semibold mb-2">
                            Reposted by {repostsByPost[postIdStr].length} {repostsByPost[postIdStr].length === 1 ? 'user' : 'users'}
                          </div>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {repostsByPost[postIdStr]
                              .sort((a: any, b: any) => b.timestamp - a.timestamp)
                              .map((repost: any) => (
                                <Link
                                  key={repost.id}
                                  to={`/profile/${repost.fromUser}`}
                                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 w-full text-left"
                                >
                                  <Avatar className="w-8 h-8">
                                    {repost.avatarHash ? (
                                      <AvatarImage src={`https://ipfs.io/ipfs/${repost.avatarHash}`} />
                                    ) : (
                                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${repost.fromUser}`} />
                                    )}
                                    <AvatarFallback>{repost.fromUser.slice(2, 4)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium hover:underline">
                                      {repost.displayName || repost.username || `${repost.fromUser.slice(0, 6)}...${repost.fromUser.slice(-4)}`}
                                    </div>
                                    {repost.username && (
                                      <div className="text-xs text-muted-foreground">
                                        @{repost.username}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(repost.timestamp).toLocaleString()}
                                    </div>
                                  </div>
                                  <Repeat2 className="w-4 h-4 text-green-500" />
                                </Link>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                );
              })}



              {/* Infinite Scroll Loading Indicator - Twitter Style with Skeletons */}
              {isLoadingMore && (
                <>
                  <PostSkeleton />
                  <PostSkeleton />
                  <PostSkeleton />
                </>
              )}

              {/* End of Feed Indicator */}
              {displayedPostsCount >= allPostsData.length && !feedRefreshing && posts.length > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center space-y-2">
                      <div className="text-primary text-lg">🎉</div>
                      <p className="text-sm font-medium">You're all caught up!</p>
                      <p className="text-xs text-muted-foreground">
                        Check back later for new posts from the community
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}


            </div>

            {/* Right Sidebar */}
            <RightSidebar 
              recentTransactions={recentTransactions}
              showTransactions={true}
              showProfile={true}
              showGenres={true}
            />
          </div>
        </div>
      </main>

      {/* Post Detail Modal */}
      <Dialog open={!!selectedPost} onOpenChange={closePostDetail}>
        <DialogContent className="max-w-5xl w-full max-h-[95vh] p-0 overflow-hidden">
          <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
            {/* Left Side - Artwork and Player */}
            <div className="lg:w-1/2 p-6 flex flex-col">
              <div className="relative flex-1 mb-6">
                <img
                  src={selectedPost ? formatPostForUI(selectedPost).cover : ''}
                  alt={selectedPost ? formatPostForUI(selectedPost).title : ''}
                  className="w-full h-full object-cover rounded-lg"
                />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-lg">
                    <Button
                      size="lg"
                      className="rounded-full w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-0"
                      onClick={() => {
                        if (currentTrack?.id === selectedPost?.id && (isPlaying || isAudioReady)) {
                          if (isPlaying) {
                            pauseTrack();
                          } else if (isAudioReady) {
                            resumeTrack();
                          }
                        } else if (selectedPost) {
                          const track = formatPostForUI(selectedPost);
                          playTrack(track);
                          // Record play event
                          const duration = typeof track.duration === 'string' 
                            ? parseInt(track.duration.split(':')[0]) * 60 + parseInt(track.duration.split(':')[1] || '0')
                            : track.duration || 180;
                          recordMusicPlay(track, address, duration, 'feed');
                        }
                      }}
                    >
                      {currentTrack?.id === selectedPost?.id && isPlaying ? (
                        <Pause className="w-8 h-8 text-white" />
                      ) : (
                        <Play className="w-8 h-8 text-white ml-0.5" />
                      )}
                    </Button>
                  </div>
              </div>

              {/* Post Info */}
              <div className="space-y-4">
                  <div>
                    <h2 className="font-clash font-semibold text-2xl mb-2">
                      {selectedPost?.authorProfile?.displayName || 'Post'}
                    </h2>
                    <div className="flex items-center gap-3 mb-3">
                      <Link 
                        to={`/profile/${selectedPost?.authorProfile?.username || selectedPost?.author}`} 
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedPost?.authorProfile?.avatarHash ? `https://ipfs.io/ipfs/${selectedPost.authorProfile.avatarHash.replace('ipfs://', '')}` : ''} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {selectedPost?.authorProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-foreground font-medium">
                            {selectedPost?.authorProfile?.displayName || 'Unknown User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{selectedPost?.authorProfile?.username || 'unknown'}
                          </p>
                        </div>
                      </Link>
                    </div>
                  </div>
                  
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">
                    {selectedPost ? new Date(selectedPost.timestamp).toLocaleString() : ''}
                  </span>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedPost?.content || ''}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-border/20">
                  <div className="flex items-center gap-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${selectedPost?.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectedPost && handleLike(selectedPost);
                      }}
                    >
                      <Heart className={`w-5 h-5 ${selectedPost?.isLiked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{selectedPost?.likes.toLocaleString()}</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-medium">{selectedPost?.comments}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-green-500 hover:text-green-600"
                      onClick={() => selectedPost && openTipModal(selectedPost)}
                    >
                      <DollarSign className="w-5 h-5" />
                      <span className="font-medium">Tip</span>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                          <Share2 className="w-5 h-5" />
                          <span className="font-medium">{selectedPost?.shares}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          selectedPost && handleRepost(selectedPost);
                        }} className="cursor-pointer">
                          <Repeat2 className="w-4 h-4 mr-2" />
                          Repost
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {selectedPost && formatPostForUI(selectedPost).genre !== 'Social' && (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-6" onClick={() => openBuyModal(selectedPost!)}>
                      <ShoppingCart className="w-4 h-4" />
                      <span className="font-medium">Buy Now - 299 SOMI</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Comments */}
            <div className="lg:w-1/2 border-l border-border/20 flex flex-col">
              <div className="p-6 border-b border-border/20">
                <h3 className="font-clash font-semibold text-xl">Comments ({selectedPost ? (commentsByPost[selectedPost.id.toString()] || []).length : 0})</h3>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedPost && (commentsByPost[selectedPost.id.toString()] || []).map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {(comment.fromUser || comment.author || '').slice(-2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="bg-muted/30 rounded-2xl px-4 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-semibold text-sm">{(comment.fromUser || comment.author || '').slice(0, 6)}...{(comment.fromUser || comment.author || '').slice(-4)}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(comment.timestamp)}</span>
                          </div>
                          <p className="text-sm leading-relaxed">{comment.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => setReplyingTo({ trackId: selectedPost.id, commentId: comment.id })}
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Replies - Show nested comments */}
                    {selectedPost && (commentsByPost[selectedPost.id.toString()] || []).filter(c => c.parentId === comment.id).length > 0 && (
                      <div className="ml-13 space-y-2">
                        {(commentsByPost[selectedPost.id.toString()] || []).filter(c => c.parentId === comment.id).map((reply) => (
                          <div key={reply.id} className="flex gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {reply.author.slice(-2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="bg-muted/20 rounded-2xl px-4 py-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-sm">{reply.author.slice(0, 6)}...{reply.author.slice(-4)}</span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{formatTimestamp(reply.timestamp)}</span>
                                </div>
                                <p className="text-sm leading-relaxed">{reply.content}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply Input */}
                    {replyingTo?.trackId === selectedPost?.id && replyingTo?.commentId === comment.id && (
                      <div className="ml-13 flex gap-3">
                        <Avatar className="w-10 h-10 flex-shrink-0">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            U
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder={`Reply to ${(comment.fromUser || comment.author || '').slice(0, 6)}...`}
                            value={commentInputs[comment.id.toString()] || ''}
                            onChange={(e) => setCommentInputs(prev => ({
                              ...prev,
                              [comment.id.toString()]: e.target.value
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                commentOnPost(selectedPost!.id.toString(), comment.id.toString());
                              }
                            }}
                            className="flex-1 px-4 py-3 bg-muted/50 border border-border/20 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => commentOnPost(selectedPost!.id.toString(), comment.id.toString())}
                            disabled={!commentInputs[comment.id.toString()]?.trim()}
                            className="px-4 rounded-full"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setReplyingTo(null)}
                            className="px-4 rounded-full"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Comment */}
              <div className="p-6 border-t border-border/20">
                <div className="flex gap-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      U
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={commentInputs[selectedPost?.id.toString() || ''] || ''}
                      onChange={(e) => setCommentInputs(prev => ({
                        ...prev,
                        [selectedPost!.id.toString()]: e.target.value
                      }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          commentOnPost(selectedPost!.id.toString());
                        }
                      }}
                      className="flex-1 px-4 py-3 bg-muted/50 border border-border/20 rounded-full text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => commentOnPost(selectedPost!.id.toString())}
                      disabled={!commentInputs[selectedPost?.id.toString() || '']?.trim()}
                      className="px-4 rounded-full"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist Modal */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
      />

      {/* Buy Modal */}
      <BuyModal
        isOpen={isBuyModalOpen}
        onClose={closeBuyModal}
        track={selectedTrackForPurchase ? formatPostForUI(selectedTrackForPurchase) : null}
      />

      {/* Tip Modal */}
      <TipModal
        isOpen={isTipModalOpen}
        onClose={closeTipModal}
        track={selectedTrackForTip ? formatPostForUI(selectedTrackForTip) : null}
        onTip={(track, amount) => selectedTrackForTip && handleTip(selectedTrackForTip, amount)}
      />

      {/* Quote Repost Modal */}
      {selectedPostForQuote && (
        <QuotePostModal
          isOpen={isQuoteModalOpen}
          onClose={closeQuoteModal}
          onSubmit={handleQuoteSubmit}
          quotedPost={{
            id: selectedPostForQuote.id,
            author: selectedPostForQuote.author,
            content: selectedPostForQuote.content,
            timestamp: selectedPostForQuote.timestamp,
            authorProfile: selectedPostForQuote.authorProfile
          }}
          currentUserProfile={currentUserProfile}
        />
      )}

      {/* Transaction Queue Status - Shows when transactions are being processed */}
      <TransactionQueueStatus />
    </div>
  );
};

export default Feed;