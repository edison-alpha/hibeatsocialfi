import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  MessageCircle,
  Repeat2,
  Music,
  Image as ImageIcon,
  Video,
  MoreHorizontal,
  Clock,
  ExternalLink,
  Send,
  Loader2,
  Reply,
  Bookmark,
  Share,
  EyeOff,
  UserMinus,
  VolumeX,
  Ban,
  Code,
  Flag,
  Trash2,
  Play,
  Pause,
  Coins
} from 'lucide-react';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { useSequence } from '@/contexts/SequenceContext';
import { useAudio } from '@/contexts/AudioContext';
import { useGlobalPlayCounts } from '@/contexts/PlayCountContext';
import { profileService } from '@/services/profileService';
import CommentInput from '@/components/CommentInput';
import { parseContentWithMentionsAndTags } from '@/utils/textParser';
import { OptimizedImage } from '@/components/OptimizedImage';
import { OptimizedVideo } from '@/components/OptimizedVideo';
import { recordMusicPlay } from '@/utils/playCountHelper';
import TipModal from '@/components/TipModal';
import { toast } from 'sonner';
import { useBookmarks } from '@/hooks/useBookmarks';
import { SharePostModal } from '@/components/SharePostModal';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface PostData {
  id: string;
  author: string;
  content: string;
  contentType: 'text' | 'music' | 'image' | 'video' | 'quote';
  ipfsHash?: string;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  isReposted?: boolean; // Track if current user has reposted this
  isRepost?: boolean; // Is this post a repost/quote?
  quoteText?: string; // Text for quote repost
  quotedPost?: PostData; // The original post being quoted
  reposter?: string; // Address of user who reposted (for simple reposts)
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
  metadata?: any;
}

interface PostCardProps {
  post: PostData | null;
  isLoading?: boolean;
  showSkeleton?: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onCommentWithText?: (postId: string, commentText: string) => void;
  onShare?: (postId: string) => void;
  onQuote?: (postId: string) => void; // New: handler for quote repost
  onDelete?: (postId: string) => void; // New: handler for delete post
  onViewDetails?: (postId: string) => void;
  onViewLikes?: (postId: string) => void; // New: handler for view likes
  onViewReposts?: (postId: string) => void; // New: handler for view reposts
  comments?: CommentData[];
  currentUserAddress?: string; // Current logged in user address
}

interface CommentData {
  id: number | string; // Support both number and string IDs (DataStream uses string IDs)
  author: string;
  content: string;
  timestamp: number;
  parentCommentId?: number | string; // Support both number and string
}

// Skeleton component for loading state
const PostCardSkeleton = () => (
  <Card className="w-full">
    <CardHeader className="pb-3">
      <div className="flex items-center space-x-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center space-x-4 pt-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </CardContent>
  </Card>
);

// Main PostCard component
const PostCard: React.FC<PostCardProps> = ({
  post,
  isLoading = false,
  showSkeleton = false,
  onLike,
  onComment,
  onCommentWithText,
  onShare,
  onQuote,
  onDelete,
  onViewDetails,
  onViewLikes,
  onViewReposts,
  comments = [],
  currentUserAddress
}) => {
  const navigate = useNavigate();
  const { smartAccountAddress } = useSequence();
  const { readUserProfile } = useSomniaDatastream();
  const { playTrack, pauseTrack, currentTrack, isPlaying: audioIsPlaying, currentTime, duration: audioDuration } = useAudio();
  const globalPlayCounts = useGlobalPlayCounts();

  const [authorProfile, setAuthorProfile] = useState<any>(null);
  const [quotedAuthorProfile, setQuotedAuthorProfile] = useState<any>(null);
  const [commentProfiles, setCommentProfiles] = useState<{[key: string]: any}>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(post?.isLiked || false);
  const [likesCount, setLikesCount] = useState(post?.likes || 0);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isReposted, setIsReposted] = useState(post?.isReposted || false);
  const [sharesCount, setSharesCount] = useState(post?.shares || 0);
  const [showComments, setShowComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const likeButtonRef = React.useRef<HTMLButtonElement>(null);
  const bookmarkButtonRef = React.useRef<HTMLButtonElement>(null);
  
  // Bookmark hook
  const { isBookmarked: checkIsBookmarked, toggleBookmark } = useBookmarks();
  const [localBookmarkState, setLocalBookmarkState] = useState(false);
  const [isBookmarkAnimating, setIsBookmarkAnimating] = useState(false);
  
  // Sync bookmark state from hook
  React.useEffect(() => {
    if (post?.id) {
      const bookmarked = checkIsBookmarked(Number(post.id));
      setLocalBookmarkState(bookmarked);
    }
  }, [post?.id, checkIsBookmarked]);

  // Sync isLiked state with post prop changes
  React.useEffect(() => {
    if (post?.isLiked !== undefined) {
      setIsLiked(post.isLiked);
    }
  }, [post?.isLiked]);

  // Sync isReposted state with post prop changes
  React.useEffect(() => {
    if (post?.isReposted !== undefined) {
      setIsReposted(post.isReposted);
    }
  }, [post?.isReposted]);

  // Sync shares/repost state with post prop changes
  React.useEffect(() => {
    if (post?.shares !== undefined) {
      setSharesCount(post.shares);
    }
  }, [post?.shares]);

  // Sync likesCount state with post prop changes
  React.useEffect(() => {
    if (post?.likes !== undefined) {
      setLikesCount(post.likes);
    }
  }, [post?.likes]);

  // Track tokenId for play count updates
  React.useEffect(() => {
    if (post?.contentType === 'music' && post?.metadata) {
      let metadata: any = {};
      try {
        metadata = typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata;
      } catch (e) {
        if (post.ipfsHash) {
          try {
            metadata = JSON.parse(post.ipfsHash);
          } catch (e2) {}
        }
      }
      
      if (metadata.tokenId && metadata.tokenId > 0) {
        // Register this tokenId for tracking
        globalPlayCounts.refreshPlayCounts([metadata.tokenId]);
      }
    }
  }, [post?.contentType, post?.metadata, post?.ipfsHash, globalPlayCounts]);

  // Load author profile using optimized profileService with DataStream (only if not already provided)
  React.useEffect(() => {
    const loadAuthorProfile = async () => {
      // Skip if profile already provided with complete data (has username and avatarHash)
      if ((post?.authorProfile?.username && post?.authorProfile?.avatarHash) || !post?.author || profileLoading) {
        return;
      }

      // If profile exists but incomplete (no avatarHash), still fetch
      // Debug log (hidden for production)
      // console.log('🔍 [PostCard] Fetching author profile:', {
      //   author: post?.author,
      //   hasProfile: !!post?.authorProfile,
      //   hasUsername: !!post?.authorProfile?.username,
      //   hasAvatar: !!post?.authorProfile?.avatarHash
      // });

      setProfileLoading(true);
      try {
        // Use optimized profileService with DataStream integration
        const profile = await profileService.getProfile(post.author);
        if (profile) {
          // Debug log (hidden for production)
          // console.log('✅ [PostCard] Author profile loaded:', {
          //   username: profile.username,
          //   displayName: profile.displayName,
          //   hasAvatar: !!profile.avatarHash
          // });
          setAuthorProfile(profile);
        }
      } catch (error) {
        console.error('Error loading author profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    loadAuthorProfile();
  }, [post?.author, post?.authorProfile, profileLoading]);

  // Load quoted post author profile if needed
  React.useEffect(() => {
    const loadQuotedAuthorProfile = async () => {
      if (!post?.quotedPost?.author) return;
      
      // Skip if profile already complete
      if (post.quotedPost.authorProfile?.username && post.quotedPost.authorProfile?.avatarHash) {
        return;
      }

      try {
        const profile = await profileService.getProfile(post.quotedPost.author);
        if (profile) {
          setQuotedAuthorProfile(profile);
        }
      } catch (error) {
        console.error('Error loading quoted author profile:', error);
      }
    };

    loadQuotedAuthorProfile();
  }, [post?.quotedPost?.author, post?.quotedPost?.authorProfile]);

  // Load comment author profiles
  React.useEffect(() => {
    const loadCommentProfiles = async () => {
      if (!comments || comments.length === 0) return;

      const profiles: {[key: string]: any} = {};
      
      for (const comment of comments) {
        if (!comment.author) continue;
        
        try {
          const profile = await profileService.getProfile(comment.author);
          if (profile) {
            profiles[comment.author] = profile;
          }
        } catch (error) {
          console.error('Error loading comment profile:', error);
        }
      }

      if (Object.keys(profiles).length > 0) {
        setCommentProfiles(profiles);
      }
    };

    loadCommentProfiles();
  }, [comments]);

  // Memoized values to prevent unnecessary recalculations
  const displayName = useMemo(() => {
    if (post?.authorProfile?.displayName) return post.authorProfile.displayName;
    if (authorProfile?.displayName) return authorProfile.displayName;
    if (post?.authorProfile?.username) return post.authorProfile.username;
    if (authorProfile?.username) return authorProfile.username;
    return post?.author ? `${post.author.slice(0, 6)}...${post.author.slice(-4)}` : 'Unknown';
  }, [post?.authorProfile, authorProfile, post?.author]);

  const username = useMemo(() => {
    if (post?.authorProfile?.username) return post.authorProfile.username;
    if (authorProfile?.username) return authorProfile.username;
    return post?.author ? `${post.author.slice(0, 6)}...${post.author.slice(-4)}` : '';
  }, [post?.authorProfile, authorProfile, post?.author]);

  const avatarUrl = useMemo(() => {
    if (post?.authorProfile?.avatarHash) return `https://ipfs.io/ipfs/${post.authorProfile.avatarHash}`;
    if (authorProfile?.avatarHash) return `https://ipfs.io/ipfs/${authorProfile.avatarHash}`;
    return undefined;
  }, [post?.authorProfile, authorProfile]);

  const isVerified = useMemo(() => {
    return Boolean(post?.authorProfile?.isVerified || authorProfile?.isVerified);
  }, [post?.authorProfile, authorProfile]);

  const isArtist = useMemo(() => {
    return Boolean(post?.authorProfile?.isArtist || authorProfile?.isArtist);
  }, [post?.authorProfile, authorProfile]);

  const formatTimeAgo = useMemo(() => {
    if (!post?.timestamp) return '';

    const now = Date.now();
    const diff = now - post.timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(post.timestamp).toLocaleDateString();
  }, [post?.timestamp]);

  const getContentIcon = () => {
    switch (post?.contentType) {
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const { sendLikeNotification } = useNotifications();

  const handleLike = async () => {
    if (!post?.id || !smartAccountAddress) return;
    
    try {
      // ⚡ OPTIMISTIC UPDATE: Update UI immediately (Twitter-style)
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
      
      // Trigger animation only when liking (not unliking)
      if (!wasLiked) {
        setIsAnimating(true);
        
        // Create particle burst effect (Twitter-style)
        if (likeButtonRef.current) {
          const button = likeButtonRef.current;
          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          // Create 6 particles
          for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'heart-particle';
            particle.innerHTML = '❤️';
            particle.style.cssText = `
              position: fixed;
              left: ${centerX}px;
              top: ${centerY}px;
              font-size: 12px;
              z-index: 9999;
              --tx: ${Math.cos((i * 60) * Math.PI / 180) * 40}px;
              --ty: ${Math.sin((i * 60) * Math.PI / 180) * 40}px;
            `;
            document.body.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
              particle.remove();
            }, 600);
          }
        }
        
        // Reset animation state
        setTimeout(() => {
          setIsAnimating(false);
        }, 400);
      }
      
      // Call parent handler (blockchain write happens in background)
      if (onLike) {
        await onLike(post.id);
      }

      // 🔔 Send notification to post author (only when liking, not unliking)
      if (!wasLiked && post.author && post.author.toLowerCase() !== smartAccountAddress.toLowerCase()) {
        try {
          await sendLikeNotification(post.author, post.id);
          console.log('✅ Like notification sent to:', post.author);
        } catch (notifError) {
          console.warn('⚠️ Failed to send like notification:', notifError);
          // Don't throw - notification failure shouldn't break the like action
        }
      }
    } catch (error) {
      console.error('❌ [LIKE] Error:', error);
      // Rollback on error
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev + 1 : prev - 1);
    }
  };

  const handleComment = () => {
    setShowCommentInput(!showCommentInput);
    if (post?.id && onComment) {
      onComment(post.id);
    }
  };

  const handleCommentSubmit = async (comment: string) => {
    if (!comment.trim() || !post?.id || isSubmittingComment) return;

    setIsSubmittingComment(true);
    
    try {
      // Call parent handler directly (same as PostDetail)
      if (onCommentWithText) {
        await onCommentWithText(post.id, comment);
      }
      
      // Close comment input after successful submission
      setShowCommentInput(false);
    } catch (error) {
      console.error('❌ [COMMENT] Error:', error);
      // Keep input open so user can retry
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!post?.id || !smartAccountAddress) return;

    try {
      setIsReposted(!isReposted);
      setSharesCount(prev => isReposted ? prev - 1 : prev + 1);

      if (onShare) {
        await onShare(post.id);
      }
    } catch (error) {
      // Revert on error
      setIsReposted(!isReposted);
      setSharesCount(prev => isReposted ? prev + 1 : prev - 1);
      console.error('Error sharing post:', error);
    }
  };

  const handleBookmark = async () => {
    if (!post?.id || !smartAccountAddress) return;
    
    try {
      // ⚡ OPTIMISTIC UPDATE: Update UI immediately (Twitter-style)
      const wasBookmarked = localBookmarkState;
      setLocalBookmarkState(!wasBookmarked);
      
      // Trigger animation only when bookmarking (not unbookmarking)
      if (!wasBookmarked) {
        setIsBookmarkAnimating(true);
        
        // Create particle burst effect (similar to like)
        if (bookmarkButtonRef.current) {
          const button = bookmarkButtonRef.current;
          const rect = button.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          
          // Create 6 particles with blue bookmark icon
          for (let i = 0; i < 6; i++) {
            const particle = document.createElement('div');
            particle.className = 'bookmark-particle';
            // Use SVG bookmark icon with blue color
            particle.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#3b82f6" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            `;
            particle.style.cssText = `
              position: fixed;
              left: ${centerX}px;
              top: ${centerY}px;
              z-index: 9999;
              --tx: ${Math.cos((i * 60) * Math.PI / 180) * 40}px;
              --ty: ${Math.sin((i * 60) * Math.PI / 180) * 40}px;
            `;
            document.body.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => {
              particle.remove();
            }, 600);
          }
        }
        
        // Reset animation state
        setTimeout(() => {
          setIsBookmarkAnimating(false);
        }, 400);
      }
      
      // Call bookmark service (blockchain write happens in background)
      await toggleBookmark(Number(post.id));
    } catch (error) {
      console.error('❌ [BOOKMARK] Error:', error);
      // Revert on error
      setLocalBookmarkState(!localBookmarkState);
    }
  };

  const handleViewDetails = () => {
    if (post?.id && onViewDetails) {
      onViewDetails(post.id);
    }
  };

  // Helper function to clean IPFS URL
  const cleanIPFSUrl = (source: string | undefined): string => {
    if (!source) return '';
    
    // If already a valid HTTP URL, check if it has double prefix issue
    if (source.startsWith('http')) {
      // Fix double prefix: https://ipfs.io/ipfs/ipfs://hash
      if (source.includes('/ipfs/ipfs://')) {
        const hash = source.split('/ipfs/ipfs://')[1];
        return `https://ipfs.io/ipfs/${hash}`;
      }
      return source;
    }
    
    // Remove ALL possible IPFS prefixes
    const hash = source
      .replace(/^ipfs:\/\//, '')
      .replace(/^ipfs\//, '')
      .replace(/^\/ipfs\//, '');
    
    return `https://ipfs.io/ipfs/${hash}`;
  };

  // Don't render if no post data (no skeleton on initial load)
  if (!post) {
    return null;
  }

  // Debug: Log post structure and parse metadata if needed
  let parsedMetadata = post?.metadata;
  if (post) {
    // Parse metadata if it's a string
    if (typeof post.metadata === 'string') {
      try {
        parsedMetadata = JSON.parse(post.metadata);
        console.log('📝 Parsed metadata from string:', parsedMetadata);
      } catch (error) {
        console.error('❌ Failed to parse metadata string:', error);
        parsedMetadata = {};
      }
    } else if (typeof post.metadata === 'object' && post.metadata !== null) {
      // Metadata is already an object
      parsedMetadata = post.metadata;
    } else if (post.ipfsHash && typeof post.ipfsHash === 'string') {
      // Fallback: try to parse ipfsHash as metadata
      try {
        parsedMetadata = JSON.parse(post.ipfsHash);
        console.log('📝 Parsed metadata from ipfsHash:', parsedMetadata);
      } catch (error) {
        console.warn('⚠️ ipfsHash is not valid JSON:', post.ipfsHash);
        parsedMetadata = {};
      }
    }
    
    // Debug log
    console.log('🔍 PostCard rendering:', {
      id: post.id,
      contentType: post.contentType,
      hasMetadata: !!parsedMetadata,
      metadataType: typeof parsedMetadata,
      metadataKeys: parsedMetadata ? Object.keys(parsedMetadata) : [],
      tokenId: parsedMetadata?.tokenId, // ✅ ADD: Log tokenId explicitly
      hasAttachments: !!parsedMetadata?.attachments,
      attachmentsCount: parsedMetadata?.attachments?.length || 0,
      attachments: parsedMetadata?.attachments,
      fullMetadata: parsedMetadata
    });
  }

  // Use parsed metadata for rendering
  const metadata = parsedMetadata || {};

  // Parse content for @mentions and #hashtags using utility function
  const parseContentWithLinksAndTags = (text: string) => {
    if (!text) return null;
    const parts = parseContentWithMentionsAndTags(text, navigate);
    return parts.length > 0 ? parts : text;
  };

  // Handle card click to navigate to post detail
  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if clicking on the card itself, not on interactive elements
    const target = e.target as HTMLElement;
    const isInteractiveElement = target.closest('button, a, input, textarea, [role="button"]');
    
    if (!isInteractiveElement && post?.id) {
      console.log('🔗 [CARD] Navigating to post detail:', post.id);
      navigate(`/post/${post.id}`);
    }
  };

  return (
    <Card 
      className="w-full hover:shadow-md transition-shadow duration-200"
      onClick={handleCardClick}
    >
      {/* Repost Indicator - Show for simple reposts (no quote) */}
      {post?.isRepost && !post?.quoteText && post?.reposter && (
        <div className="px-4 pt-3 pb-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Repeat2 className="w-3 h-3" />
            <span>
              {post.reposter.toLowerCase() === currentUserAddress?.toLowerCase() 
                ? 'You reposted' 
                : `${post.reposterProfile?.displayName || post.reposter.slice(0, 6)} reposted`}
            </span>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Clickable Avatar */}
            <Avatar 
              className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                if (username) {
                  console.log('🔗 [AVATAR] Navigating to profile:', username);
                  navigate(`/profile/${username}`);
                }
              }}
              title={username ? `View @${username}'s profile` : 'View profile'}
            >
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* Clickable Display Name */}
              <div className="flex items-center space-x-2">
                <h3 
                  className="font-semibold text-sm truncate cursor-pointer hover:underline transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (username) {
                      console.log('🔗 [NAME] Navigating to profile:', username);
                      navigate(`/profile/${username}`);
                    }
                  }}
                  title={username ? `View @${username}'s profile` : 'View profile'}
                >
                  {displayName}
                </h3>
                {isVerified && <VerifiedBadge />}
              </div>

              {/* Clickable Username */}
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {username && (
                  <span 
                    className="cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔗 [USERNAME] Navigating to profile:', username);
                      navigate(`/profile/${username}`);
                    }}
                    title={`View @${username}'s profile`}
                  >
                    @{username}
                  </span>
                )}
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {getContentIcon() && (
              <div className="text-muted-foreground">
                {getContentIcon()}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Show Delete option if post is from current user */}
                {post && currentUserAddress && post.author.toLowerCase() === currentUserAddress.toLowerCase() && onDelete && (
                  <>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this post?')) {
                          onDelete(post.id);
                        }
                      }}
                      className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete post
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* Show other options only if post is NOT from current user */}
                {(!currentUserAddress || post?.author.toLowerCase() !== currentUserAddress.toLowerCase()) && (
                  <>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Not interested in this post');
                      }}
                      className="cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 mr-2" />
                      Not interested in this post
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Unfollow @' + username);
                      }}
                      className="cursor-pointer"
                    >
                      <UserMinus className="w-4 h-4 mr-2" />
                      Unfollow @{username || 'user'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Mute @' + username);
                      }}
                      className="cursor-pointer"
                    >
                      <VolumeX className="w-4 h-4 mr-2" />
                      Mute @{username || 'user'}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Block @' + username);
                      }}
                      className="cursor-pointer"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Block @{username || 'user'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Embed post');
                  }}
                  className="cursor-pointer"
                >
                  <Code className="w-4 h-4 mr-2" />
                  Embed post
                </DropdownMenuItem>
                
                {/* Show Report only if post is NOT from current user */}
                {(!currentUserAddress || post?.author.toLowerCase() !== currentUserAddress.toLowerCase()) && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('Report post');
                    }}
                    className="cursor-pointer text-red-600"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Post Content - Show caption FIRST (above music card) */}
        {post.content && post.content.trim() && (
          <div className="space-y-2 cursor-pointer">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {parseContentWithLinksAndTags(post.content)}
            </p>
          </div>
        )}

        {/* Music Content - Same design as PostDetail */}
        {post.contentType === 'music' && metadata && (
          <Card className="border-border/30 bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <img
                  src={(() => {
                    // Clean IPFS hash - support multiple field names
                    const hash = (metadata.ipfsImageHash || metadata.ipfsArtworkHash)?.replace?.('ipfs://', '') || '';
                    const url = hash 
                      ? `https://ipfs.io/ipfs/${hash}` 
                      : metadata.imageUrl || '/assets/default-cover.jpg';
                    console.log('🖼️ [PostCard Music] Image:', { 
                      title: metadata.title,
                      ipfsImageHash: metadata.ipfsImageHash,
                      ipfsArtworkHash: metadata.ipfsArtworkHash,
                      cleanHash: hash,
                      imageUrl: metadata.imageUrl,
                      finalUrl: url,
                      metadata: metadata
                    });
                    return url;
                  })()}
                  alt={metadata.title || 'Music'}
                  className="w-12 h-12 rounded-md object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    console.error('❌ [PostCard] Failed to load image:', target.src);
                    const hash = (metadata.ipfsImageHash || metadata.ipfsArtworkHash)?.replace?.('ipfs://', '');
                    if (target.src.includes('ipfs.io') && hash) {
                      target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                      console.log('🔄 [PostCard] Trying Pinata gateway');
                    } else if (target.src.includes('gateway.pinata.cloud') && hash) {
                      target.src = `https://cloudflare-ipfs.com/ipfs/${hash}`;
                      console.log('🔄 [PostCard] Trying Cloudflare gateway');
                    } else {
                      target.src = '/assets/default-cover.jpg';
                      console.log('📷 [PostCard] Using default cover');
                    }
                  }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{metadata.title || 'Untitled'}</h4>
                  <p className="text-xs text-muted-foreground truncate">
                    {metadata.artist || 'Unknown Artist'}
                    {metadata.tokenId && (
                      <span className="ml-2 text-purple-600">• NFT #{metadata.tokenId}</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {/* Play count badge - real-time from context */}
                    {metadata.tokenId && metadata.tokenId > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        {globalPlayCounts.getPlayCount(metadata.tokenId) || 0}
                      </span>
                    )}
                    {(() => {
                      const isCurrentTrack = currentTrack?.id === (metadata.tokenId || Number(post.id));
                      
                      // Show current time if playing, otherwise show duration
                      if (isCurrentTrack && audioIsPlaying && audioDuration > 0) {
                        return (
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                          </span>
                        );
                      } else if (metadata.duration) {
                        return (
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(metadata.duration / 60)}:{String(Math.floor(metadata.duration % 60)).padStart(2, '0')}
                          </span>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex-1 bg-muted rounded-full h-1">
                      {(() => {
                        const isCurrentTrack = currentTrack?.id === (metadata.tokenId || Number(post.id));
                        
                        if (isCurrentTrack && audioDuration > 0) {
                          // Show real-time progress
                          const progress = (currentTime / audioDuration) * 100;
                          return (
                            <div 
                              className="bg-primary h-1 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            ></div>
                          );
                        }
                        return (
                          <div className="bg-primary h-1 rounded-full w-0"></div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-8 h-8 p-0 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('🎵 [BUTTON] Play button clicked!');
                    console.log('🎵 [BUTTON] Metadata:', metadata);
                    
                    // Construct audio URL - support multiple field names and ensure proper IPFS URL
                    let audioUrl = metadata.audioUrl;
                    if (!audioUrl && metadata.ipfsAudioHash) {
                      // Extract clean hash (remove any ipfs:// prefix)
                      const hash = metadata.ipfsAudioHash.replace(/^ipfs:\/\//, '');
                      audioUrl = `https://ipfs.io/ipfs/${hash}`;
                    } else if (audioUrl) {
                      // Clean existing URL (fix double prefix if exists)
                      audioUrl = cleanIPFSUrl(audioUrl);
                    }
                    
                    // Construct cover URL - clean any double prefix
                    let coverUrl = metadata.imageUrl || metadata.ipfsImageHash || metadata.ipfsArtworkHash;
                    coverUrl = coverUrl ? cleanIPFSUrl(coverUrl) : '/assets/default-cover.jpg';
                    
                    console.log('🔗 [BUTTON] Audio URL:', audioUrl);
                    console.log('🔗 [BUTTON] Cover URL:', coverUrl);
                    
                    // Validate audio URL
                    if (!audioUrl || audioUrl === 'https://ipfs.io/ipfs/') {
                      console.error('❌ [BUTTON] Invalid audio URL:', audioUrl);
                      console.error('❌ [BUTTON] Metadata:', metadata);
                      alert('Audio file not available. Please check if the song was uploaded correctly.');
                      return;
                    }
                    
                    const track = {
                      id: metadata.tokenId || Number(post.id),
                      tokenId: metadata.tokenId, // ✅ ADD: Explicit tokenId for play count tracking
                      title: metadata.title || 'Untitled',
                      artist: metadata.artist || 'Unknown Artist',
                      avatar: coverUrl,
                      cover: coverUrl,
                      genre: metadata.genre || 'Music',
                      duration: metadata.duration ? `${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')}` : '0:00',
                      audioUrl: audioUrl,
                      likes: post.likes || 0,
                    };
                    
                    console.log('🎵 [PLAY] Track data:', track);
                    console.log('🎵 [PLAY] TokenId for play count:', track.tokenId);
                    console.log('🎵 [PLAY] Audio URL:', track.audioUrl);
                    
                    if (currentTrack?.id === track.id && audioIsPlaying) {
                      console.log('⏸️ [PAUSE] Pausing track');
                      pauseTrack();
                    } else {
                      console.log('▶️ [PLAY] Playing track');
                      console.log('🔍 [PLAY] Track object:', {
                        id: track.id,
                        tokenId: track.tokenId,
                        title: track.title,
                        hasTokenId: !!track.tokenId,
                        tokenIdType: typeof track.tokenId,
                        tokenIdValue: track.tokenId
                      });
                      
                      playTrack(track);
                      
                      // Record play event (no await - run in background)
                      const duration = typeof track.duration === 'string' 
                        ? parseInt(track.duration.split(':')[0]) * 60 + parseInt(track.duration.split(':')[1] || '0')
                        : track.duration || 180;
                      
                      // ✅ Only record if we have valid tokenId
                      if (track.tokenId && track.tokenId > 0) {
                        console.log('✅ [PLAY] Recording play event for tokenId:', track.tokenId);
                        console.log('🎵 [PLAY] Play details:', {
                          tokenId: track.tokenId,
                          listener: smartAccountAddress?.substring(0, 10) + '...',
                          duration,
                          source: 'post'
                        });
                        recordMusicPlay(track, smartAccountAddress, duration, 'post');
                      } else {
                        console.error('❌ [PLAY] CANNOT RECORD - Invalid tokenId!');
                        console.error('❌ [PLAY] Track:', track);
                        console.error('❌ [PLAY] Metadata:', metadata);
                        console.error('❌ [PLAY] Post:', post);
                      }
                    }
                  }}
                >
                  {(() => {
                    const isCurrentTrack = currentTrack?.id === (metadata.tokenId || Number(post.id));
                    return (isCurrentTrack && audioIsPlaying) ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    );
                  })()}
                </Button>
              </div>
              
              {/* Additional Tracks - Show "+ more" button or expanded tracks */}
              {metadata.allTracks && metadata.allTracks.length > 1 && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  {!showAllTracks ? (
                    // Collapsed state - show button
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllTracks(true);
                      }}
                    >
                      + {metadata.allTracks.length - 1} more track{metadata.allTracks.length > 2 ? 's' : ''}
                    </Button>
                  ) : (
                    // Expanded state - show all tracks
                    <div className="space-y-1.5">
                      {metadata.allTracks.slice(1).map((track: any, index: number) => (
                        <div key={track.id || index} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors">
                          <img
                            src={track.imageUrl || '/assets/default-cover.jpg'}
                            alt={track.title}
                            className="w-8 h-8 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/assets/default-cover.jpg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-medium truncate">{track.title}</p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                              {track.isMinted && track.tokenId && track.tokenId !== 'pending' && (
                                <span className="ml-1 text-purple-600">• NFT #{track.tokenId}</span>
                              )}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-6 h-6 p-0 rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              const audioUrl = track.audioUrl || (track.ipfsAudioHash ? `https://ipfs.io/ipfs/${track.ipfsAudioHash.replace(/^ipfs:\/\//, '')}` : '');
                              const coverUrl = track.imageUrl || '/assets/default-cover.jpg';
                              
                              if (!audioUrl) {
                                alert('Audio file not available');
                                return;
                              }
                              
                              const trackData = {
                                id: track.tokenId || `${post.id}-${index}`,
                                tokenId: track.tokenId && track.tokenId !== 'pending' ? track.tokenId : undefined, // ✅ ADD: Explicit tokenId
                                title: track.title || 'Untitled',
                                artist: track.artist || metadata.artist || 'Unknown Artist',
                                avatar: coverUrl,
                                cover: coverUrl,
                                genre: track.genre?.[0] || 'Music',
                                duration: `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}`,
                                audioUrl: audioUrl,
                                likes: 0,
                              };
                              
                              const isCurrentTrack = currentTrack?.id === trackData.id;
                              if (isCurrentTrack && audioIsPlaying) {
                                pauseTrack();
                              } else {
                                playTrack(trackData);
                                // Record play event (no await - run in background)
                                // ✅ Only record if we have valid tokenId
                                if (trackData.tokenId && typeof trackData.tokenId === 'number' && trackData.tokenId > 0) {
                                  console.log('✅ [PLAY] Recording play event for additional track tokenId:', trackData.tokenId);
                                  recordMusicPlay(trackData, smartAccountAddress, track.duration || 180, 'post');
                                } else {
                                  console.warn('⚠️ [PLAY] Skipping play count for additional track - no valid tokenId');
                                }
                              }
                            }}
                          >
                            {(() => {
                              const isCurrentTrack = currentTrack?.id === (track.tokenId || `${post.id}-${index}`);
                              return isCurrentTrack && audioIsPlaying ? (
                                <Pause className="w-3 h-3" />
                              ) : (
                                <Play className="w-3 h-3 ml-0.5" />
                              );
                            })()}
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-6 text-[9px] text-muted-foreground hover:text-foreground mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAllTracks(false);
                        }}
                      >
                        Show less
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quoted Post (if this is a quote repost) - Same styling as DataStreamSocialTest */}
        {post.quotedPost && (
          <div 
            className="mt-3 p-3 border-2 border-border rounded-lg bg-muted/30 hover:bg-muted/40 transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (post.quotedPost?.id) {
                navigate(`/post/${post.quotedPost.id}`);
              }
            }}
          >
            {/* Quoted Post Header */}
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage 
                  src={
                    (post.quotedPost.authorProfile?.avatarHash || quotedAuthorProfile?.avatarHash)
                      ? `https://ipfs.io/ipfs/${post.quotedPost.authorProfile?.avatarHash || quotedAuthorProfile?.avatarHash}` 
                      : `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.quotedPost.author}`
                  } 
                  alt={post.quotedPost.authorProfile?.displayName || quotedAuthorProfile?.displayName || 'User'} 
                />
                <AvatarFallback className="text-xs">
                  {(post.quotedPost.authorProfile?.displayName || quotedAuthorProfile?.displayName || post.quotedPost.author).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1 text-xs">
                <span className="font-semibold">
                  {post.quotedPost.authorProfile?.displayName || quotedAuthorProfile?.displayName || `${post.quotedPost.author.slice(0, 6)}...${post.quotedPost.author.slice(-4)}`}
                </span>
                {(post.quotedPost.authorProfile?.isVerified || quotedAuthorProfile?.isVerified) && (
                  <VerifiedBadge size="sm" />
                )}
                <span className="text-muted-foreground">
                  @{post.quotedPost.authorProfile?.username || quotedAuthorProfile?.username || post.quotedPost.author.slice(0, 8)}
                </span>
              </div>
            </div>

            {/* Quoted Post Content */}
            <div className="text-sm text-muted-foreground line-clamp-3">
              {post.quotedPost.content}
            </div>

            {/* Quoted Post Media - Direct ipfsHash (same as DataStreamSocialTest) */}
            {post.quotedPost.ipfsHash && (
              <div className="mt-2">
                {post.quotedPost.contentType === 'image' && (
                  <img
                    src={`https://ipfs.io/ipfs/${post.quotedPost.ipfsHash}`}
                    alt="Quoted"
                    className="w-full rounded max-h-48 object-cover"
                    loading="lazy"
                  />
                )}
                {post.quotedPost.contentType === 'video' && (
                  <video
                    src={`https://ipfs.io/ipfs/${post.quotedPost.ipfsHash}`}
                    className="w-full rounded max-h-48"
                    controls
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Post Media - Show after quoted post if exists (same as DataStreamSocialTest) */}
        {post.ipfsHash && (post.contentType === 'image' || post.contentType === 'quote') && (
          <img
            src={`https://ipfs.io/ipfs/${post.ipfsHash}`}
            alt="Post"
            className={`w-full rounded-lg max-h-96 object-cover ${post.quotedPost ? 'mt-3' : ''}`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('ipfs.io')) {
                target.src = `https://gateway.pinata.cloud/ipfs/${post.ipfsHash}`;
              }
            }}
          />
        )}

        {post.ipfsHash && post.contentType === 'video' && (
          <video
            src={`https://ipfs.io/ipfs/${post.ipfsHash}`}
            controls
            preload="metadata"
            loop
            muted
            playsInline
            className={`w-full rounded-lg max-h-96 ${post.quotedPost ? 'mt-3' : ''}`}
            onMouseEnter={(e) => {
              const video = e.currentTarget;
              video.play().catch(() => {
                // Ignore play errors (e.g., if video not loaded yet)
              });
            }}
            onMouseLeave={(e) => {
              const video = e.currentTarget;
              video.pause();
              video.currentTime = 0; // Reset to start
            }}
          />
        )}

        {/* Image/Video Attachments - Support for multiple media (metadata.attachments) */}
        {metadata?.attachments && metadata.attachments.length > 0 && (
          <div className={`mt-3 ${
            metadata.attachments.length === 1 
              ? '' // Single image: no grid
              : metadata.attachments.length === 2 
                ? 'grid grid-cols-2 gap-2' // 2 images: 2 columns
                : metadata.attachments.length === 3 
                  ? 'grid grid-cols-2 gap-2' // 3 images: 2 columns with first spanning 2 rows
                  : 'grid grid-cols-2 gap-2' // 4+ images: 2x2 grid
          }`}>
            {console.log('🖼️ [PostCard] Rendering', metadata.attachments.length, 'attachments for post', post.id)}
            {metadata.attachments.map((attachment: any, index: number) => {
              // Validate attachment has required data
              if (!attachment || (!attachment.url && !attachment.ipfsHash)) {
                console.warn('⚠️ Invalid attachment, skipping:', attachment);
                return null;
              }

              // Try to construct proper IPFS URL
              let mediaUrl = attachment.url || '';
              
              // If it's an IPFS hash, use ipfs.io gateway (same as avatar - proven to work)
              if (attachment.ipfsHash && typeof attachment.ipfsHash === 'string') {
                const hash = attachment.ipfsHash.replace('ipfs://', '');
                // Use ipfs.io gateway (same as avatar rendering)
                mediaUrl = `https://ipfs.io/ipfs/${hash}`;
                console.log('🔗 Using IPFS URL:', mediaUrl, 'from hash:', hash);
              } else if (attachment.url && typeof attachment.url === 'string' && attachment.url.includes('ipfs://')) {
                const hash = attachment.url.replace('ipfs://', '');
                mediaUrl = `https://ipfs.io/ipfs/${hash}`;
                console.log('🔗 Converted ipfs:// to gateway URL:', mediaUrl);
              }
              
              console.log('📸 Rendering attachment', index + 1, ':', { type: attachment.type, url: mediaUrl });
              
              // Special layout for 3 images: first image spans 2 rows
              const isFirstOfThree = metadata.attachments.length === 3 && index === 0;
              const gridClass = isFirstOfThree ? 'row-span-2' : '';
              
              // Twitter-style sizing
              const getSizeClass = () => {
                if (metadata.attachments.length === 1) {
                  // Single media: max height 510px, maintain aspect ratio
                  return 'max-h-[510px] w-full';
                } else if (metadata.attachments.length === 2) {
                  // 2 media: equal height ~288px
                  return 'h-[288px] w-full';
                } else if (metadata.attachments.length === 3) {
                  // 3 media: first tall (288px), others half height
                  return isFirstOfThree ? 'h-[288px] w-full' : 'h-[142px] w-full';
                } else {
                  // 4+ media: 2x2 grid, each ~142px
                  return 'h-[142px] w-full';
                }
              };
              
              return (
                <div key={index} className={gridClass}>
                  {attachment.type === 'image' && (
                    <div className="relative w-full h-full overflow-hidden rounded-lg border border-border/50">
                      <img
                        src={mediaUrl}
                        alt={attachment.name || `Image ${index + 1}`}
                        className={`${getSizeClass()} object-cover`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          console.error('❌ Failed to load image:', { 
                            url: mediaUrl, 
                            attachment,
                            ipfsHash: attachment.ipfsHash 
                          });
                          // Try alternate gateways (fallback order: ipfs.io → pinata → cloudflare)
                          const currentSrc = (e.target as HTMLImageElement).src;
                          if (currentSrc.includes('ipfs.io') && attachment.ipfsHash && typeof attachment.ipfsHash === 'string') {
                            const hash = attachment.ipfsHash.replace('ipfs://', '');
                            (e.target as HTMLImageElement).src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                            console.log('🔄 Trying gateway.pinata.cloud:', `https://gateway.pinata.cloud/ipfs/${hash}`);
                          } else if (currentSrc.includes('gateway.pinata.cloud') && attachment.ipfsHash && typeof attachment.ipfsHash === 'string') {
                            const hash = attachment.ipfsHash.replace('ipfs://', '');
                            (e.target as HTMLImageElement).src = `https://cloudflare-ipfs.com/ipfs/${hash}`;
                            console.log('🔄 Trying cloudflare gateway:', `https://cloudflare-ipfs.com/ipfs/${hash}`);
                          } else {
                            // Final fallback
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="45%25" dominant-baseline="middle" text-anchor="middle" font-size="16"%3EImage not available%3C/text%3E%3Ctext fill="%23666" x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-size="12"%3E' + (attachment.name || 'Loading from IPFS...') + '%3C/text%3E%3C/svg%3E';
                          }
                        }}
                        onLoad={() => {
                          console.log('✅ Image', index + 1, 'loaded successfully:', mediaUrl);
                        }}
                      />
                    </div>
                  )}
                  {attachment.type === 'video' && (
                    <div className="relative overflow-hidden rounded-lg border border-border/50 bg-black">
                      <video
                        src={(() => {
                          // Construct proper IPFS URL for video (same logic as image)
                          if (attachment.ipfsHash && typeof attachment.ipfsHash === 'string') {
                            const hash = attachment.ipfsHash.replace('ipfs://', '');
                            return `https://ipfs.io/ipfs/${hash}`;
                          } else if (attachment.url && typeof attachment.url === 'string' && attachment.url.includes('ipfs://')) {
                            const hash = attachment.url.replace('ipfs://', '');
                            return `https://ipfs.io/ipfs/${hash}`;
                          }
                          return attachment.url || '';
                        })()}
                        controls
                        controlsList="nodownload"
                        preload="metadata"
                        loop
                        muted
                        playsInline
                        className={`${getSizeClass()} object-contain`}
                        onMouseEnter={(e) => {
                          const video = e.currentTarget;
                          video.play().catch(() => {
                            // Ignore play errors (e.g., if video not loaded yet)
                          });
                        }}
                        onMouseLeave={(e) => {
                          const video = e.currentTarget;
                          video.pause();
                          video.currentTime = 0; // Reset to start
                        }}
                        onError={(e) => {
                          console.error('❌ Failed to load video:', { 
                            url: (e.target as HTMLVideoElement).src, 
                            attachment 
                          });
                        }}
                        onLoadedData={() => {
                          console.log('✅ Video', index + 1, 'loaded successfully');
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Engagement Stats - Twitter Style */}
        <div className="flex items-center justify-between pt-2 border-t">
          {/* Left side: Comment, Repost, Like */}
          <div className="flex items-center space-x-8">
            {/* Comment */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 space-x-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
              onClick={(e) => {
                e.stopPropagation();
                handleComment();
                setShowComments(!showComments);
              }}
              disabled={isLoading}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">{post?.comments || 0}</span>
            </Button>

            {/* Repost with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 px-2 space-x-2 ${isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'} hover:bg-green-500/10`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  disabled={isLoading}
                >
                  <Repeat2 className={`w-4 h-4 ${isReposted ? 'text-green-500' : ''}`} />
                  <span className="text-xs">{sharesCount}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                  className="cursor-pointer"
                >
                  <Repeat2 className="w-4 h-4 mr-2" />
                  Repost
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (post?.id && onQuote) {
                      onQuote(post.id);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Quote
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Like */}
            <Button
              ref={likeButtonRef}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 space-x-2 transition-all duration-200 ${isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'} hover:bg-red-500/10`}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              disabled={isLoading}
            >
              <Heart className={`w-4 h-4 transition-all duration-200 ${isLiked ? 'fill-current' : ''} ${isAnimating ? 'heart-burst' : isLiked ? 'heart-pop' : ''}`} />
              <span className="text-xs transition-all duration-200">{likesCount}</span>
            </Button>

            {/* Tip - Only show for verified artists */}
            {isVerified && isArtist && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!smartAccountAddress) {
                    toast.error('Please connect your wallet first');
                    return;
                  }
                  if (post?.author && smartAccountAddress.toLowerCase() === post.author.toLowerCase()) {
                    toast.info('You cannot tip your own post');
                    return;
                  }
                  setShowTipModal(true);
                }}
                disabled={isLoading}
                title="Send a tip to this verified artist"
              >
                <Coins className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Right side: Bookmark, Share */}
          <div className="flex items-center space-x-2">
            {/* Bookmark */}
            <Button
              ref={bookmarkButtonRef}
              variant="ghost"
              size="sm"
              className={`h-8 px-2 transition-all duration-200 ${localBookmarkState ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'} hover:bg-blue-500/10`}
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
              disabled={isLoading}
              title={localBookmarkState ? 'Remove bookmark' : 'Bookmark this post'}
            >
              <Bookmark className={`w-4 h-4 transition-all duration-200 ${localBookmarkState ? 'fill-current' : ''} ${isBookmarkAnimating ? 'bookmark-pop' : localBookmarkState ? 'bookmark-saved' : ''}`} />
            </Button>

            {/* Share */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
              onClick={(e) => {
                e.stopPropagation();
                setShowShareModal(true);
              }}
              disabled={isLoading}
              title="Share this post"
            >
              <Share className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Share Modal */}
        {post?.id && (
          <SharePostModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            postId={post.id}
            postContent={post.content}
            postAuthor={displayName}
          />
        )}

        {/* Tip Modal */}
        {post && (
          <TipModal
            isOpen={showTipModal}
            onClose={() => setShowTipModal(false)}
            recipientAddress={post.author}
            recipientName={displayName}
            recipientAvatar={avatarUrl}
            onTipSent={() => {
              // Optional: refresh post or show success message
              console.log('Tip sent successfully');
            }}
          />
        )}

        {/* View Likes and Reposts Links - sama seperti DataStreamSocialTest */}
        <div className="flex items-center gap-4 pt-2">
          {likesCount > 0 && onViewLikes && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewLikes(post.id);
              }}
              className="text-xs text-muted-foreground hover:underline hover:text-foreground transition-colors"
            >
              View {likesCount} {likesCount === 1 ? 'like' : 'likes'}
            </button>
          )}
          {sharesCount > 0 && onViewReposts && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewReposts(post.id);
              }}
              className="text-xs text-muted-foreground hover:underline hover:text-foreground transition-colors"
            >
              View {sharesCount} {sharesCount === 1 ? 'repost' : 'reposts'}
            </button>
          )}
        </div>

        {/* Comment History Section */}
        {showComments && comments.length > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground">Comments ({comments.length})</h4>
            {comments
              .filter(c => !c.parentCommentId) // Show only top-level comments
              .map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage 
                        src={commentProfiles[comment.author]?.avatarHash 
                          ? `https://ipfs.io/ipfs/${commentProfiles[comment.author].avatarHash}` 
                          : undefined
                        } 
                      />
                      <AvatarFallback className="text-xs">
                        {(commentProfiles[comment.author]?.displayName || comment.author).slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-muted/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-xs">
                            {commentProfiles[comment.author]?.displayName || 
                             `${comment.author.slice(0, 6)}...${comment.author.slice(-4)}`}
                          </span>
                          {commentProfiles[comment.author]?.username && (
                            <span className="text-xs text-muted-foreground">
                              @{commentProfiles[comment.author].username}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            · {new Date(comment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{parseContentWithLinksAndTags(comment.content)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1 text-xs"
                          onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Replies to this comment */}
                  {comments
                    .filter(c => c.parentCommentId === comment.id)
                    .map((reply) => (
                      <div key={reply.id} className="flex gap-2 ml-10">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage 
                            src={commentProfiles[reply.author]?.avatarHash 
                              ? `https://ipfs.io/ipfs/${commentProfiles[reply.author].avatarHash}` 
                              : undefined
                            } 
                          />
                          <AvatarFallback className="text-xs">
                            {(commentProfiles[reply.author]?.displayName || reply.author).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/20 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-xs">
                                {commentProfiles[reply.author]?.displayName || 
                                 `${reply.author.slice(0, 6)}...${reply.author.slice(-4)}`}
                              </span>
                              {commentProfiles[reply.author]?.username && (
                                <span className="text-xs text-muted-foreground">
                                  @{commentProfiles[reply.author].username}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                · {new Date(reply.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                  {/* Reply Input for this comment */}
                  {replyingTo === comment.id && (
                    <div className="flex gap-2 ml-10">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarFallback className="text-xs">U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder={`Reply to ${comment.author.slice(0, 6)}...`}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && replyText.trim()) {
                              onCommentWithText?.(post?.id || '', `@reply:${comment.id}:${replyText}`);
                              setReplyText('');
                              setReplyingTo(null);
                            }
                          }}
                          className="flex-1 px-3 py-1.5 bg-muted/50 border border-border/20 rounded-full text-sm focus:outline-none focus:border-primary"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 h-7"
                          onClick={() => {
                            if (replyText.trim()) {
                              onCommentWithText?.(post?.id || '', `@reply:${comment.id}:${replyText}`);
                              setReplyText('');
                              setReplyingTo(null);
                            }
                          }}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Comment Input */}
        {showCommentInput && (
          <div className="pt-3 border-t">
            <CommentInput
              onSubmit={handleCommentSubmit}
              isSubmitting={isSubmittingComment}
              disabled={isLoading}
              placeholder="Write a comment..."
              avatarUrl={avatarUrl}
              displayName={displayName}
              autoFocus={true}
              postAuthor={post?.author}
              postId={post?.id}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PostCard;
