import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useParams, useNavigate } from "react-router-dom";
import { parseContentWithMentionsAndTags } from "@/utils/textParser";
import CommentInput from "@/components/CommentInput";
import QuotePostModal from "@/components/QuotePostModal";
import Navbar from "@/components/Navbar";
import { useSequence } from "@/contexts/SequenceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAudio } from "@/contexts/AudioContext";
import { useWalletClient } from 'wagmi'; // ✅ Add wallet client hook
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { useBookmarks } from "@/hooks/useBookmarks";
import { somniaDatastreamServiceV3 } from "@/services/somniaDatastreamService.v3";
import { profileService } from "@/services/profileService";
import { recordMusicPlay } from "@/utils/playCountHelper";
import { SharePostModal } from "@/components/SharePostModal";
import { SOMNIA_CONFIG_V3, InteractionType, TargetType, createCommentId, createInteractionId, ContentType } from "@/config/somniaDataStreams.v3";
import { privateKeyToAccount } from 'viem/accounts';
import { toast } from "sonner";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { LiveIndicators } from "@/components/LiveIndicators";
import {
  Heart,
  MessageCircle,
  ArrowLeft,
  Verified,
  Repeat2,
  Bookmark,
  Share,
  MoreHorizontal,
  EyeOff,
  UserMinus,
  VolumeX,
  Ban,
  Code,
  Flag,
  Play,
  Pause,
  Music,
  Trash2,
  Clock,
  ExternalLink
} from "lucide-react";

interface PostData {
  id: number | string;
  author: string;
  content: string;
  contentType?: string;
  ipfsHash?: string;
  metadata?: any;
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  isReposted?: boolean;
  quotedPost?: PostData;
  authorProfile?: {
    username: string;
    displayName: string;
    avatarHash?: string;
    isVerified?: boolean;
    isArtist?: boolean;
  };
}

const PostDetail = () => {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { smartAccountAddress, isAccountReady } = useSequence();
  const { userProfile } = useAuth();
  const { profileData: currentUserProfile } = useCurrentUserProfile();
  const { currentTrack, isPlaying, playTrack, pauseTrack, currentTime, duration: audioDuration } = useAudio();
  const { isBookmarked: checkIsBookmarked, toggleBookmark } = useBookmarks();
  const { data: walletClient } = useWalletClient(); // ✅ Get user's wallet
  
  const privateKey = import.meta.env.VITE_PRIVATE_KEY;
  const privateKeyAddress = privateKey ? privateKeyToAccount(privateKey as `0x${string}`).address : null;

  // Post state
  const [post, setPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [likesList, setLikesList] = useState<any[]>([]);
  const [repostsList, setRepostsList] = useState<any[]>([]);
  
  // UI state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const likeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Helper to get IPFS URL
  const getIPFSUrl = (hash: string) => {
    if (!hash) return '';
    if (hash.startsWith('http')) return hash;
    const cleanHash = hash.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cleanHash}`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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



  // Handle like/unlike using V3 service
  const handleLike = async () => {
    if (!isAccountReady || !smartAccountAddress || !post) {
      toast.error("Please connect your wallet to like posts");
      return;
    }

    if (isLiking) return;
    setIsLiking(true);

    // ⚡ OPTIMISTIC UPDATE: Update UI immediately
    const wasLiked = post.isLiked;
    const previousLikes = post.likes;
    
    setPost({
      ...post,
      isLiked: !wasLiked,
      likes: wasLiked ? post.likes - 1 : post.likes + 1
    });

    // 🎉 Trigger animation only when liking (not unliking)
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

    try {
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      const timestamp = Date.now();
      const interactionId = createInteractionId(postIdNum, smartAccountAddress, timestamp);
      
      const interactionData = {
        id: interactionId,
        interactionType: wasLiked ? InteractionType.UNLIKE : InteractionType.LIKE,
        targetId: postIdNum,
        targetType: TargetType.POST,
        fromUser: smartAccountAddress,
        content: '',
        parentId: 0,
        timestamp,
        tipAmount: 0,
      };
      
      // ✅ Write to blockchain using V3 service with user wallet
      await somniaDatastreamServiceV3.createInteraction(interactionData, true, walletClient);
      
      toast.success(wasLiked ? "Like removed" : "Post liked! ❤️");
      
      // 🔄 Reload post in background after blockchain confirmation (no skeleton)
      setTimeout(() => {
        loadPostDetailSilent();
      }, 3000);
    } catch (error) {
      console.error('❌ Failed to toggle like:', error);
      toast.error("Failed to update like");
      
      // Rollback on error
      setPost({
        ...post,
        isLiked: wasLiked,
        likes: previousLikes
      });
    } finally {
      setIsLiking(false);
    }
  };

  // Handle repost/unrepost using V3 service
  const handleRepost = async (quoteTextParam?: string, attachments?: any[]) => {
    if (!isAccountReady || !smartAccountAddress || !post) {
      toast.error("Please connect your wallet to repost");
      return;
    }

    if (isReposting) return;
    setIsReposting(true);

    try {
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      const timestamp = Date.now();
      const interactionId = createInteractionId(postIdNum, smartAccountAddress, timestamp);
      
      const isQuote = !!quoteTextParam;
      
      if (isQuote) {
        // Quote repost - create new post with ContentType.QUOTE and quotedPostId
        let mediaHashes = '';
        
        // ⚡ NO UPLOAD NEEDED: Files already uploaded to IPFS when selected!
        // Just collect the IPFS hashes
        if (attachments && attachments.length > 0) {
          // Check if any attachments are still uploading
          const stillUploading = attachments.some(att => att.uploading);
          if (stillUploading) {
            toast.error("Please wait for media upload to complete");
            setIsReposting(false);
            return;
          }
          
          // Check if any uploads failed
          const hasFailed = attachments.some(att => att.uploadFailed);
          if (hasFailed) {
            toast.error("Some media uploads failed. Please remove and try again");
            setIsReposting(false);
            return;
          }
          
          // Collect IPFS hashes (already uploaded)
          const validHashes = attachments
            .filter(att => att.ipfsHash)
            .map(att => att.ipfsHash);
          
          if (validHashes.length > 0) {
            mediaHashes = validHashes.join(',');
            console.log('✅ [Quote] Using uploaded media:', mediaHashes);
          }
        }

        const { createPostId } = await import('@/config/somniaDataStreams.v3');
        const postId = createPostId(smartAccountAddress, timestamp);
        
        const postData = {
          id: postId,
          author: smartAccountAddress,
          content: quoteTextParam.trim(),
          contentType: ContentType.QUOTE, // Always QUOTE for quote posts
          mediaHashes,
          quotedPostId: postIdNum,
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
        
        console.log('📝 [Quote] Creating quote post:', {
          quotedPostId: postIdNum,
          hasMedia: !!mediaHashes,
          contentLength: quoteTextParam.length
        });
        
        await somniaDatastreamServiceV3.createPost(postData, true);
        
        toast.success("Quote posted!", {
          description: "Your quote will appear in the feed"
        });
        
        // Close modal immediately
        closeQuoteModal();
        
        // 🔄 Reload post in background after blockchain confirmation (no skeleton)
        setTimeout(() => {
          loadPostDetailSilent();
        }, 3000);
      } else {
        // Simple repost/unrepost
        // ⚡ OPTIMISTIC UPDATE: Update UI immediately
        const wasReposted = post.isReposted;
        const previousShares = post.shares;
        
        setPost({
          ...post,
          isReposted: !wasReposted,
          shares: wasReposted ? post.shares - 1 : post.shares + 1
        });
        
        const interactionData = {
          id: interactionId,
          interactionType: wasReposted ? InteractionType.UNREPOST : InteractionType.REPOST,
          targetId: postIdNum,
          targetType: TargetType.POST,
          fromUser: smartAccountAddress,
          content: '',
          parentId: 0,
          timestamp,
          tipAmount: 0,
        };
        
        try {
          // ✅ Write to blockchain using V3 service with user wallet
          await somniaDatastreamServiceV3.createInteraction(interactionData, true, walletClient);
          toast.success(wasReposted ? "Repost removed" : "Reposted!");
          
          // 🔄 Reload post in background after blockchain confirmation (no skeleton)
          setTimeout(() => {
            loadPostDetailSilent();
          }, 3000);
        } catch (error) {
          // Rollback on error
          setPost({
            ...post,
            isReposted: wasReposted,
            shares: previousShares
          });
          throw error;
        }
      }
    } catch (error) {
      console.error('❌ Failed to repost:', error);
      toast.error("Failed to repost");
    } finally {
      setIsReposting(false);
    }
  };

  // Open quote modal
  const openQuoteModal = () => {
    setIsQuoteModalOpen(true);
  };

  // Close quote modal
  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
  };

  // Submit quote repost
  const handleQuoteSubmit = async (quoteText: string, attachments: any[]) => {
    if (!quoteText.trim() && attachments.length === 0) return;
    await handleRepost(quoteText.trim(), attachments);
  };

  // Handle delete post using V3 service
  const handleDeletePost = async () => {
    if (!isAccountReady || !smartAccountAddress || !post) {
      toast.error("Please connect your wallet to delete posts");
      return;
    }

    // Check if user is the author
    if (post.author?.toLowerCase() !== smartAccountAddress?.toLowerCase()) {
      toast.error("You can only delete your own posts");
      return;
    }

    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      
      // Prepare post data for delete (need full post data to update)
      const postData = {
        id: postIdNum,
        timestamp: post.timestamp,
        content: post.content,
        contentType: ContentType[post.contentType?.toUpperCase() as keyof typeof ContentType] || ContentType.TEXT,
        mediaHashes: post.ipfsHash || '',
        author: post.author,
        quotedPostId: post.quotedPost ? (typeof post.quotedPost.id === 'string' ? Number(post.quotedPost.id) : post.quotedPost.id) : 0,
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
      await somniaDatastreamServiceV3.deletePost(postIdNum, postData);

      toast.success("Post deleted");

      // Navigate to feed after deletion
      setTimeout(() => {
        navigate('/feed');
      }, 1500);
    } catch (error) {
      console.error('❌ Failed to delete post:', error);
      toast.error("Failed to delete post");
    }
  };

  // Handle comment using V3 service
  const handleComment = async (commentText: string) => {
    if (!isAccountReady || !smartAccountAddress || !post) {
      toast.error("Please connect your wallet to comment");
      return;
    }

    if (!commentText.trim()) return;
    if (isCommenting) return;
    
    setIsCommenting(true);

    // ⚡ OPTIMISTIC UPDATE: Update comment count immediately
    const previousComments = post.comments;
    setPost({
      ...post,
      comments: post.comments + 1
    });

    try {
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      const timestamp = Date.now();
      const commentId = createCommentId(postIdNum, smartAccountAddress, timestamp);
      
      // Add optimistic comment to list
      const optimisticComment = {
        id: commentId,
        author: smartAccountAddress,
        content: commentText.trim(),
        timestamp,
        authorProfile: {
          username: currentUserProfile?.username || smartAccountAddress.slice(0, 8),
          displayName: currentUserProfile?.displayName || 'You',
          avatarHash: currentUserProfile?.avatarHash || '',
          isVerified: currentUserProfile?.isVerified || false,
          isArtist: currentUserProfile?.isArtist || false
        }
      };
      
      setComments([optimisticComment, ...comments]);
      
      const interactionData = {
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
      
      // ✅ Write to blockchain using V3 service with user wallet
      await somniaDatastreamServiceV3.createInteraction(interactionData, true, walletClient);
      
      toast.success("Comment posted!");
      
      // 🔄 Reload post in background after blockchain confirmation (no skeleton)
      setTimeout(() => {
        loadPostDetailSilent();
      }, 3000);
    } catch (error) {
      console.error('❌ Failed to add comment:', error);
      toast.error("Failed to post comment");
      
      // Rollback on error
      setPost({
        ...post,
        comments: previousComments
      });
      // Remove optimistic comment
      setComments(comments);
    } finally {
      setIsCommenting(false);
    }
  };





  // Load post detail silently (no skeleton, for background refresh)
  const loadPostDetailSilent = async () => {
    if (!postId || !privateKeyAddress || !smartAccountAddress) return;

    try {
      console.log('🔄 [POST-DETAIL] Silent reload:', postId);

      // Load feed data using V3 optimized loader
      const result = await somniaDatastreamServiceV3.loadFeedOptimized(0, 999999, smartAccountAddress);
      const { posts: allPosts, statsMap, interactions } = result;

      if (!allPosts || allPosts.length === 0) return;

      // Find the specific post
      const foundPost = allPosts.find((p: any) => String(p.id) === String(postId));
      if (!foundPost || foundPost.isDeleted) return;

      // Get stats for this post
      const postStats = statsMap.get(foundPost.id) || {
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
        topComments: []
      };

      // Load author profile
      const authorProfile = await profileService.getProfile(foundPost.author);
      
      // Enrich post with quoted post
      const { enrichPostsWithQuotes } = await import('@/config/somniaDataStreams.v3');
      const enrichedPosts = enrichPostsWithQuotes([foundPost]);
      const enrichedPost = enrichedPosts[0];
      
      // Get quoted post if exists
      let quotedPost = null;
      if (enrichedPost.quotedPost) {
        const quotedAuthorProfile = await profileService.getProfile(enrichedPost.quotedPost.author);
        const quotedStats = statsMap.get(enrichedPost.quotedPost.id) || { 
          likes: 0, 
          comments: 0, 
          reposts: 0,
          userLiked: false,
          userReposted: false
        };
        
        quotedPost = {
          id: enrichedPost.quotedPost.id,
          author: enrichedPost.quotedPost.author,
          content: enrichedPost.quotedPost.content,
          contentType: ContentType[enrichedPost.quotedPost.contentType]?.toLowerCase() || 'text',
          ipfsHash: enrichedPost.quotedPost.mediaHashes,
          timestamp: enrichedPost.quotedPost.timestamp,
          likes: quotedStats.likes,
          comments: quotedStats.comments,
          shares: quotedStats.reposts,
          authorProfile: {
            username: quotedAuthorProfile?.username || 'Unknown',
            displayName: quotedAuthorProfile?.displayName || 'Unknown User',
            avatarHash: quotedAuthorProfile?.avatarHash || '',
            isVerified: quotedAuthorProfile?.isVerified || false,
            isArtist: quotedAuthorProfile?.isArtist || false
          }
        };
      }

      // Filter interactions for this post
      const postInteractions = interactions.filter((i: any) => String(i.targetId) === String(postId));
      const postComments = postInteractions.filter((i: any) => i.interactionType === InteractionType.COMMENT);
      const postLikes = postInteractions.filter((i: any) => i.interactionType === InteractionType.LIKE);
      const postReposts = postInteractions.filter((i: any) => i.interactionType === InteractionType.REPOST);
      
      // Load profiles for interaction users
      const userAddresses = new Set<string>();
      postInteractions.forEach((i: any) => {
        if (i.fromUser) userAddresses.add(i.fromUser.toLowerCase());
      });
      
      const profileMap = new Map();
      for (const address of userAddresses) {
        try {
          const profile = await profileService.getProfile(address);
          if (profile && profile.username) {
            profileMap.set(address.toLowerCase(), profile);
          }
        } catch (error) {
          console.warn('Could not load profile for', address);
        }
      }
      
      // Enrich comments with profiles
      const enrichedComments = postComments.map((c: any) => {
        const profile = profileMap.get(c.fromUser?.toLowerCase());
        return {
          id: c.id,
          author: c.fromUser,
          content: c.content,
          timestamp: c.timestamp,
          authorProfile: {
            username: profile?.username || c.fromUser.slice(0, 8),
            displayName: profile?.displayName || 'User',
            avatarHash: profile?.avatarHash || '',
            isVerified: profile?.isVerified || false,
            isArtist: profile?.isArtist || false
          }
        };
      });

      // Enrich likes with profiles
      const enrichedLikes = postLikes.map((l: any) => {
        const profile = profileMap.get(l.fromUser?.toLowerCase());
        return {
          ...l,
          username: profile?.username || null,
          displayName: profile?.displayName || null,
          avatarHash: profile?.avatarHash || null
        };
      });

      // Enrich reposts with profiles
      const enrichedReposts = postReposts.map((r: any) => {
        const profile = profileMap.get(r.fromUser?.toLowerCase());
        return {
          ...r,
          username: profile?.username || null,
          displayName: profile?.displayName || null,
          avatarHash: profile?.avatarHash || null
        };
      });

      const contentTypeStr = ContentType[foundPost.contentType]?.toLowerCase() || 'text';
      const parseMediaHashes = (mediaHashes: string, contentType: string): any[] => {
        if (!mediaHashes || !mediaHashes.trim()) return [];
        if (contentType === 'music') return [];
        const trimmed = mediaHashes.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return [];
        const hashes = mediaHashes.split(',').map(h => h.trim()).filter(h => h.length > 0);
        if (hashes.length <= 1) return [];
        return hashes.map(hash => ({
          type: contentType === 'video' ? 'video' : 'image',
          ipfsHash: hash,
          url: `https://ipfs.io/ipfs/${hash}`,
          name: `${contentType}_${hash.substring(0, 8)}`
        }));
      };

      const attachments = parseMediaHashes(foundPost.mediaHashes, contentTypeStr);
      let parsedMetadata: any = {
        attachments: attachments.length > 0 ? attachments : undefined
      };

      if (contentTypeStr === 'music' && foundPost.mediaHashes && typeof foundPost.mediaHashes === 'string') {
        try {
          const musicMetadata = JSON.parse(foundPost.mediaHashes);
          parsedMetadata = {
            ...parsedMetadata,
            ...musicMetadata
          };
        } catch (error) {
          console.warn('⚠️ [POST-DETAIL] Failed to parse music metadata:', error);
        }
      }

      let cleanContent = foundPost.content;
      if (contentTypeStr === 'music' && foundPost.content) {
        if (foundPost.content.trim().startsWith('{')) {
          try {
            const contentObj = JSON.parse(foundPost.content);
            cleanContent = contentObj.description || '';
          } catch (error) {
            cleanContent = foundPost.content;
          }
        }
      }

      // 🔄 Update post state silently (no loading state change)
      setPost({
        id: foundPost.id,
        author: foundPost.author,
        content: cleanContent,
        contentType: contentTypeStr,
        ipfsHash: foundPost.mediaHashes,
        timestamp: foundPost.timestamp,
        likes: postStats.likes,
        comments: postStats.comments,
        shares: postStats.reposts,
        isLiked: postStats.userLiked || false,
        isReposted: postStats.userReposted || false,
        quotedPost: quotedPost,
        metadata: parsedMetadata,
        authorProfile: {
          username: authorProfile?.username || 'Unknown',
          displayName: authorProfile?.displayName || 'Unknown User',
          avatarHash: authorProfile?.avatarHash || '',
          isVerified: authorProfile?.isVerified || false,
          isArtist: authorProfile?.isArtist || false
        }
      });

      setComments(enrichedComments);
      setLikesList(enrichedLikes);
      setRepostsList(enrichedReposts);
      
      console.log('✅ [POST-DETAIL] Silent reload complete');
    } catch (error) {
      console.error('❌ [POST-DETAIL] Silent reload failed:', error);
    }
  };

  // Load post detail using V3 service
  const loadPostDetail = async () => {
    if (!postId || !privateKeyAddress || !smartAccountAddress) return;

    setIsLoading(true);
    try {
      console.log('🔍 [POST-DETAIL] Loading post:', postId);

      // Load feed data using V3 optimized loader
      const result = await somniaDatastreamServiceV3.loadFeedOptimized(0, 999999, smartAccountAddress);
      const { posts: allPosts, statsMap, interactions } = result;

      if (!allPosts || allPosts.length === 0) {
        toast.error('Post not found');
        navigate('/feed');
        return;
      }

      // Find the specific post
      const foundPost = allPosts.find((p: any) => String(p.id) === String(postId));
      
      if (!foundPost) {
        toast.error('Post not found');
        navigate('/feed');
        return;
      }

      // Check if post is deleted
      if (foundPost.isDeleted) {
        toast.error('This post has been deleted');
        navigate('/feed');
        return;
      }

      // Get stats for this post
      const postStats = statsMap.get(foundPost.id) || {
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
        topComments: []
      };

      // Load author profile
      const authorProfile = await profileService.getProfile(foundPost.author);
      
      // Enrich post with quoted post using V6 quotedPostId field
      const { enrichPostsWithQuotes } = await import('@/config/somniaDataStreams.v3');
      const enrichedPosts = enrichPostsWithQuotes([foundPost]);
      const enrichedPost = enrichedPosts[0];
      
      // Get quoted post if exists
      let quotedPost = null;
      if (enrichedPost.quotedPost) {
        const quotedAuthorProfile = await profileService.getProfile(enrichedPost.quotedPost.author);
        const quotedStats = statsMap.get(enrichedPost.quotedPost.id) || { 
          likes: 0, 
          comments: 0, 
          reposts: 0,
          userLiked: false,
          userReposted: false
        };
        
        quotedPost = {
          id: enrichedPost.quotedPost.id,
          author: enrichedPost.quotedPost.author,
          content: enrichedPost.quotedPost.content,
          contentType: ContentType[enrichedPost.quotedPost.contentType]?.toLowerCase() || 'text',
          ipfsHash: enrichedPost.quotedPost.mediaHashes,
          timestamp: enrichedPost.quotedPost.timestamp,
          likes: quotedStats.likes,
          comments: quotedStats.comments,
          shares: quotedStats.reposts,
          authorProfile: {
            username: quotedAuthorProfile?.username || 'Unknown',
            displayName: quotedAuthorProfile?.displayName || 'Unknown User',
            avatarHash: quotedAuthorProfile?.avatarHash || '',
            isVerified: quotedAuthorProfile?.isVerified || false,
            isArtist: quotedAuthorProfile?.isArtist || false
          }
        };
      }

      // Filter interactions for this post
      const postInteractions = interactions.filter((i: any) => String(i.targetId) === String(postId));
      
      // Separate by type
      const postComments = postInteractions.filter((i: any) => i.interactionType === InteractionType.COMMENT);
      const postLikes = postInteractions.filter((i: any) => i.interactionType === InteractionType.LIKE);
      const postReposts = postInteractions.filter((i: any) => i.interactionType === InteractionType.REPOST);
      
      // Load profiles for interaction users
      const userAddresses = new Set<string>();
      postInteractions.forEach((i: any) => {
        if (i.fromUser) userAddresses.add(i.fromUser.toLowerCase());
      });
      
      const profileMap = new Map();
      for (const address of userAddresses) {
        try {
          const profile = await profileService.getProfile(address);
          if (profile && profile.username) {
            profileMap.set(address.toLowerCase(), profile);
          }
        } catch (error) {
          console.warn('Could not load profile for', address);
        }
      }
      
      // Enrich comments with profiles
      const enrichedComments = postComments.map((c: any) => {
        const profile = profileMap.get(c.fromUser?.toLowerCase());
        return {
          id: c.id,
          author: c.fromUser,
          content: c.content,
          timestamp: c.timestamp,
          authorProfile: {
            username: profile?.username || c.fromUser.slice(0, 8),
            displayName: profile?.displayName || 'User',
            avatarHash: profile?.avatarHash || '',
            isVerified: profile?.isVerified || false,
            isArtist: profile?.isArtist || false
          }
        };
      });

      // Enrich likes with profiles
      const enrichedLikes = postLikes.map((l: any) => {
        const profile = profileMap.get(l.fromUser?.toLowerCase());
        return {
          ...l,
          username: profile?.username || null,
          displayName: profile?.displayName || null,
          avatarHash: profile?.avatarHash || null
        };
      });

      // Enrich reposts with profiles
      const enrichedReposts = postReposts.map((r: any) => {
        const profile = profileMap.get(r.fromUser?.toLowerCase());
        return {
          ...r,
          username: profile?.username || null,
          displayName: profile?.displayName || null,
          avatarHash: profile?.avatarHash || null
        };
      });

      // Parse mediaHashes into attachments array for multiple images/videos
      const parseMediaHashes = (mediaHashes: string, contentType: string): any[] => {
        if (!mediaHashes || !mediaHashes.trim()) return [];
        
        // Skip parsing for music posts - mediaHashes contains JSON metadata, not IPFS hashes
        if (contentType === 'music') return [];
        
        // Skip if mediaHashes looks like JSON (starts with { or [)
        const trimmed = mediaHashes.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) return [];
        
        const hashes = mediaHashes.split(',').map(h => h.trim()).filter(h => h.length > 0);
        
        // Only create attachments array if there are MULTIPLE hashes
        if (hashes.length <= 1) return [];
        
        return hashes.map(hash => ({
          type: contentType === 'video' ? 'video' : 'image',
          ipfsHash: hash,
          url: `https://ipfs.io/ipfs/${hash}`,
          name: `${contentType}_${hash.substring(0, 8)}`
        }));
      };

      const contentTypeStr = ContentType[foundPost.contentType]?.toLowerCase() || 'text';
      const attachments = parseMediaHashes(foundPost.mediaHashes, contentTypeStr);

      // Parse metadata for music posts
      let parsedMetadata: any = {
        attachments: attachments.length > 0 ? attachments : undefined
      };

      // For music posts, parse ipfsHash as JSON metadata
      if (contentTypeStr === 'music' && foundPost.mediaHashes && typeof foundPost.mediaHashes === 'string') {
        try {
          const musicMetadata = JSON.parse(foundPost.mediaHashes);
          console.log('🎵 [POST-DETAIL] Parsed music metadata:', musicMetadata);
          parsedMetadata = {
            ...parsedMetadata,
            ...musicMetadata
          };
        } catch (error) {
          console.warn('⚠️ [POST-DETAIL] Failed to parse music metadata:', error);
        }
      }

      // Clean content for music posts - don't show metadata JSON
      let cleanContent = foundPost.content;
      if (contentTypeStr === 'music' && foundPost.content) {
        // If content is JSON metadata, use empty string or extract description
        if (foundPost.content.trim().startsWith('{')) {
          try {
            const contentObj = JSON.parse(foundPost.content);
            // Use description if available, otherwise empty
            cleanContent = contentObj.description || '';
          } catch (error) {
            // If parsing fails, keep original content
            cleanContent = foundPost.content;
          }
        }
      }

      setPost({
        id: foundPost.id,
        author: foundPost.author,
        content: cleanContent, // Use cleaned content
        contentType: contentTypeStr,
        ipfsHash: foundPost.mediaHashes,
        timestamp: foundPost.timestamp,
        likes: postStats.likes,
        comments: postStats.comments,
        shares: postStats.reposts,
        isLiked: postStats.userLiked || false,
        isReposted: postStats.userReposted || false,
        quotedPost: quotedPost,
        metadata: parsedMetadata,
        authorProfile: {
          username: authorProfile?.username || 'Unknown',
          displayName: authorProfile?.displayName || 'Unknown User',
          avatarHash: authorProfile?.avatarHash || '',
          isVerified: authorProfile?.isVerified || false,
          isArtist: authorProfile?.isArtist || false
        }
      });

      setComments(enrichedComments);
      setLikesList(enrichedLikes);
      setRepostsList(enrichedReposts);
      
      console.log('✅ [POST-DETAIL] Post loaded:', {
        id: foundPost.id,
        likes: postStats.likes,
        comments: enrichedComments.length,
        reposts: postStats.reposts
      });
    } catch (error) {
      console.error('❌ [POST-DETAIL] Failed to load post:', error);
      toast.error('Failed to load post');
      navigate('/feed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAccountReady && smartAccountAddress && privateKeyAddress) {
      loadPostDetail();
    }
  }, [postId, privateKeyAddress, smartAccountAddress, isAccountReady]);

  // Track view when post loads
  useEffect(() => {
    if (post && smartAccountAddress) {
      // Register view for this post
      const registerView = async () => {
        try {
          console.log(`👁️ [POST-DETAIL] Registering view for post ${post.id}`);
          // View will be registered by LiveIndicators component
        } catch (error) {
          console.error('❌ [POST-DETAIL] Failed to register view:', error);
        }
      };
      registerView();
    }
  }, [post?.id, smartAccountAddress]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <button 
                  onClick={() => navigate(-1)} 
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span className="font-medium">Back</span>
                </button>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-8 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="hidden lg:block lg:col-span-1">
                <div className="sticky top-20">
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Post Detail */}
            <div className="lg:col-span-2 space-y-4">
              {/* Back button */}
              <button 
                onClick={() => navigate(-1)} 
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </button>
              <Card className="border-border/50">
                <CardContent className="p-6">
                  {/* Header with Avatar, Name, and More button */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Clickable Avatar */}
                      <Avatar 
                        className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => post.authorProfile?.username && navigate(`/profile/${post.authorProfile.username}`)}
                        title={post.authorProfile?.username ? `View @${post.authorProfile.username}'s profile` : 'View profile'}
                      >
                        <AvatarImage src={getIPFSUrl(post.authorProfile?.avatarHash || '')} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {post.authorProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {/* Clickable Author Name */}
                          <h3 
                            className="font-semibold cursor-pointer hover:underline transition-all"
                            onClick={() => post.authorProfile?.username && navigate(`/profile/${post.authorProfile.username}`)}
                            title={post.authorProfile?.username ? `View @${post.authorProfile.username}'s profile` : 'View profile'}
                          >
                            {post.authorProfile?.displayName || 'Unknown User'}
                          </h3>
                          {post.authorProfile?.isVerified && <VerifiedBadge />}
                        </div>
                        {/* Clickable Username and Time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span 
                            className="cursor-pointer hover:text-primary hover:underline transition-colors"
                            onClick={() => post.authorProfile?.username && navigate(`/profile/${post.authorProfile.username}`)}
                            title={post.authorProfile?.username ? `View @${post.authorProfile.username}'s profile` : 'View profile'}
                          >
                            @{post.authorProfile?.username || 'unknown'}
                          </span>
                          <span>·</span>
                          <span>{formatTimeAgo(post.timestamp)}</span>
                        </div>
                        
                        {/* Live Indicators - Real-time typing and view counts */}
                        <LiveIndicators postId={String(post.id)} className="mt-2" />
                      </div>
                    </div>

                    {/* More button (titik 3) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {/* Show Delete option only if user is the author */}
                        {post.author?.toLowerCase() === smartAccountAddress?.toLowerCase() && (
                          <>
                            <DropdownMenuItem 
                              onClick={handleDeletePost}
                              className="cursor-pointer text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete post
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem 
                          onClick={() => console.log('Not interested in this post')}
                          className="cursor-pointer"
                        >
                          <EyeOff className="w-4 h-4 mr-2" />
                          Not interested in this post
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Unfollow @' + post.authorProfile?.username)}
                          className="cursor-pointer"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Unfollow @{post.authorProfile?.username || 'user'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Mute @' + post.authorProfile?.username)}
                          className="cursor-pointer"
                        >
                          <VolumeX className="w-4 h-4 mr-2" />
                          Mute @{post.authorProfile?.username || 'user'}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Block @' + post.authorProfile?.username)}
                          className="cursor-pointer"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Block @{post.authorProfile?.username || 'user'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => console.log('Embed post')}
                          className="cursor-pointer"
                        >
                          <Code className="w-4 h-4 mr-2" />
                          Embed post
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => console.log('Report post')}
                          className="cursor-pointer text-red-600"
                        >
                          <Flag className="w-4 h-4 mr-2" />
                          Report post
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content */}
                  <div>
                    {/* Show text content if available and not empty */}
                    {post.content && post.content.trim() && (
                      <p className="whitespace-pre-wrap text-lg leading-relaxed mb-3">
                        {parseContentWithMentionsAndTags(post.content, navigate)}
                      </p>
                    )}

                    {/* Music Content - Same design as Marketplace */}
                    {post.contentType === 'music' && post.metadata && (
                      <Card className="mb-3 border-border/30 bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={(() => {
                                const metadata = post.metadata;
                                const hash = (metadata.ipfsImageHash || metadata.ipfsArtworkHash)?.replace?.('ipfs://', '') || '';
                                const url = hash 
                                  ? `https://ipfs.io/ipfs/${hash}` 
                                  : metadata.imageUrl || '/assets/default-cover.jpg';
                                return url;
                              })()}
                              alt={post.metadata.title || 'Music'}
                              className="w-12 h-12 rounded-md object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const hash = (post.metadata.ipfsImageHash || post.metadata.ipfsArtworkHash)?.replace?.('ipfs://', '');
                                if (target.src.includes('ipfs.io') && hash) {
                                  target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                                } else if (target.src.includes('gateway.pinata.cloud') && hash) {
                                  target.src = `https://cloudflare-ipfs.com/ipfs/${hash}`;
                                } else {
                                  target.src = '/assets/default-cover.jpg';
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{post.metadata.title || 'Untitled'}</h4>
                              <p className="text-xs text-muted-foreground truncate">{post.metadata.artist || 'Unknown Artist'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {(() => {
                                  const metadata = post.metadata;
                                  const isCurrentTrack = currentTrack?.id === (metadata.tokenId || Number(post.id));
                                  
                                  // Show current time if playing, otherwise show duration
                                  if (isCurrentTrack && isPlaying && audioDuration > 0) {
                                    return (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                                      </span>
                                    );
                                  } else if (post.metadata.duration) {
                                    return (
                                      <span className="text-xs text-muted-foreground">
                                        {Math.floor(post.metadata.duration / 60)}:{String(Math.floor(post.metadata.duration % 60)).padStart(2, '0')}
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                                <div className="flex-1 bg-muted rounded-full h-1">
                                  {(() => {
                                    const metadata = post.metadata;
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
                                
                                const metadata = post.metadata;
                                console.log('🎵 [POST-DETAIL] Play button clicked!');
                                console.log('🎵 [POST-DETAIL] Metadata:', metadata);
                                
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
                                
                                console.log('🔗 [POST-DETAIL] Audio URL:', audioUrl);
                                console.log('🔗 [POST-DETAIL] Cover URL:', coverUrl);
                                
                                // Validate audio URL
                                if (!audioUrl || audioUrl === 'https://ipfs.io/ipfs/') {
                                  console.error('❌ [POST-DETAIL] Invalid audio URL:', audioUrl);
                                  console.error('❌ [POST-DETAIL] Metadata:', metadata);
                                  toast.error('Audio file not available. Please check if the song was uploaded correctly.');
                                  return;
                                }
                                
                                const track = {
                                  id: metadata.tokenId || Number(post.id),
                                  title: metadata.title || 'Untitled',
                                  artist: metadata.artist || 'Unknown Artist',
                                  avatar: coverUrl,
                                  cover: coverUrl,
                                  genre: metadata.genre || 'Music',
                                  duration: metadata.duration ? `${Math.floor(metadata.duration / 60)}:${String(Math.floor(metadata.duration % 60)).padStart(2, '0')}` : '0:00',
                                  audioUrl: audioUrl,
                                  likes: post.likes || 0,
                                };
                                
                                console.log('🎵 [POST-DETAIL] Track data:', track);
                                console.log('🎵 [POST-DETAIL] Audio URL:', track.audioUrl);
                                
                                if (currentTrack?.id === track.id && isPlaying) {
                                  console.log('⏸️ [POST-DETAIL] Pausing track');
                                  pauseTrack();
                                } else {
                                  console.log('▶️ [POST-DETAIL] Playing track');
                                  playTrack(track);
                                  // Record play event (no await - run in background)
                                  const duration = typeof track.duration === 'string' 
                                    ? parseInt(track.duration.split(':')[0]) * 60 + parseInt(track.duration.split(':')[1] || '0')
                                    : track.duration || 180;
                                  recordMusicPlay(track, smartAccountAddress, duration, 'detail');
                                }
                              }}
                            >
                              {(() => {
                                const metadata = post.metadata;
                                const isCurrentTrack = currentTrack?.id === (metadata.tokenId || Number(post.id));
                                return (isCurrentTrack && isPlaying) ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                );
                              })()}
                            </Button>
                          </div>
                          
                          {/* Additional Tracks - Show if multiple tracks in metadata */}
                          {post.metadata.allTracks && post.metadata.allTracks.length > 1 && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <p className="text-xs text-muted-foreground mb-3 font-medium">+ {post.metadata.allTracks.length - 1} more track{post.metadata.allTracks.length > 2 ? 's' : ''} in this drop</p>
                              <div className="space-y-2">
                                {post.metadata.allTracks.slice(1).map((track: any, index: number) => (
                                  <div key={track.id || index} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <img
                                      src={track.imageUrl || '/assets/default-cover.jpg'}
                                      alt={track.title}
                                      className="w-10 h-10 rounded object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/assets/default-cover.jpg';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold truncate">{track.title}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {track.artist || post.metadata.artist || 'Unknown Artist'} • {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                                      </p>
                                      {track.isMinted && track.tokenId && track.tokenId !== 'pending' && (
                                        <p className="text-[10px] text-purple-600 mt-0.5">💎 NFT #{track.tokenId}</p>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-8 h-8 p-0 rounded-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const audioUrl = track.audioUrl || (track.ipfsAudioHash ? `https://ipfs.io/ipfs/${track.ipfsAudioHash.replace(/^ipfs:\/\//, '')}` : '');
                                        const coverUrl = track.imageUrl || '/assets/default-cover.jpg';
                                        
                                        if (!audioUrl) {
                                          toast.error('Audio file not available');
                                          return;
                                        }
                                        
                                        const trackData = {
                                          id: track.tokenId || `${post.id}-${index}`,
                                          title: track.title || 'Untitled',
                                          artist: track.artist || post.metadata.artist || 'Unknown Artist',
                                          avatar: coverUrl,
                                          cover: coverUrl,
                                          genre: track.genre?.[0] || 'Music',
                                          duration: `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, '0')}`,
                                          audioUrl: audioUrl,
                                          likes: 0,
                                        };
                                        
                                        const isCurrentTrack = currentTrack?.id === trackData.id;
                                        if (isCurrentTrack && isPlaying) {
                                          pauseTrack();
                                        } else {
                                          playTrack(trackData);
                                          // Record play event (no await - run in background)
                                          recordMusicPlay(trackData, smartAccountAddress, track.duration || 180, 'post');
                                        }
                                      }}
                                    >
                                      {(() => {
                                        const isCurrentTrack = currentTrack?.id === (track.tokenId || `${post.id}-${index}`);
                                        return isCurrentTrack && isPlaying ? (
                                          <Pause className="w-4 h-4" />
                                        ) : (
                                          <Play className="w-4 h-4 ml-0.5" />
                                        );
                                      })()}
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Quoted Post (if this is a quote repost) */}
                    {post.quotedPost && (
                      <div 
                        className="mt-4 border border-border/50 rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (post.quotedPost?.id) {
                            navigate(`/post/${post.quotedPost.id}`);
                          }
                        }}
                      >
                        {/* Quoted Post Header */}
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage 
                              src={getIPFSUrl(post.quotedPost.authorProfile?.avatarHash || '')} 
                              alt={post.quotedPost.authorProfile?.displayName || 'User'} 
                            />
                            <AvatarFallback className="text-xs">
                              {(post.quotedPost.authorProfile?.displayName || post.quotedPost.author).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-1 text-sm">
                            <span className="font-semibold">
                              {post.quotedPost.authorProfile?.displayName || `${post.quotedPost.author.slice(0, 6)}...${post.quotedPost.author.slice(-4)}`}
                            </span>
                            {post.quotedPost.authorProfile?.isVerified && <VerifiedBadge size="sm" />}
                            <span className="text-muted-foreground">
                              @{post.quotedPost.authorProfile?.username || post.quotedPost.author.slice(0, 8)}
                            </span>
                            <span>·</span>
                            <span className="text-muted-foreground">
                              {formatTimeAgo(post.quotedPost.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Quoted Post Content */}
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {post.quotedPost.content}
                        </p>

                        {/* Nested Quoted Post (if quoted post also quotes another post) */}
                        {post.quotedPost.quotedPost && (
                          <div className="mt-3 border-l-2 border-border/30 pl-3 py-2">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Repeat2 className="w-3 h-3" />
                              <span className="font-medium">
                                {post.quotedPost.quotedPost.authorProfile?.displayName || 
                                 post.quotedPost.quotedPost.author?.slice(0, 6)}
                              </span>
                              <span>quoted</span>
                            </div>
                            <p className="text-xs text-muted-foreground/80 line-clamp-2">
                              {post.quotedPost.quotedPost.content}
                            </p>
                          </div>
                        )}

                        {/* Quoted Post Music Content */}
                        {(() => {
                          try {
                            const quotedMetadata = post.quotedPost.metadata ? JSON.parse(post.quotedPost.metadata) : {};
                            if (quotedMetadata.type === 'music' && quotedMetadata.title) {
                              return (
                                <div className="mt-3 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-md p-3">
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <img
                                        src={
                                          quotedMetadata.ipfsImageHash 
                                            ? `https://ipfs.io/ipfs/${quotedMetadata.ipfsImageHash}` 
                                            : quotedMetadata.imageUrl || '/assets/default-cover.jpg'
                                        }
                                        alt={quotedMetadata.title}
                                        className="w-12 h-12 rounded object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          if (target.src.includes('ipfs.io') && quotedMetadata.ipfsImageHash) {
                                            target.src = `https://gateway.pinata.cloud/ipfs/${quotedMetadata.ipfsImageHash}`;
                                          } else if (target.src.includes('gateway.pinata.cloud') && quotedMetadata.ipfsImageHash) {
                                            target.src = `https://cloudflare-ipfs.com/ipfs/${quotedMetadata.ipfsImageHash}`;
                                          } else {
                                            target.src = '/assets/default-cover.jpg';
                                          }
                                        }}
                                      />
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                        <Music className="w-3 h-3 text-primary" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-sm truncate">{quotedMetadata.title}</h4>
                                      <p className="text-xs text-muted-foreground truncate">
                                        by {quotedMetadata.artist || 'Unknown Artist'}
                                      </p>
                                      {quotedMetadata.genre && (
                                        <Badge variant="secondary" className="text-xs px-1.5 py-0 mt-1">
                                          {Array.isArray(quotedMetadata.genre) ? quotedMetadata.genre.join(', ') : quotedMetadata.genre}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {quotedMetadata.audioUrl && (
                                    <audio controls className="w-full mt-2" preload="metadata">
                                      <source src={quotedMetadata.audioUrl} type="audio/mpeg" />
                                    </audio>
                                  )}
                                </div>
                              );
                            }
                          } catch (error) {
                            console.error('Error parsing quoted music metadata:', error);
                          }
                          return null;
                        })()}

                        {/* Quoted Post Media (Image/Video) */}
                        {(() => {
                          try {
                            const quotedMetadata = post.quotedPost.metadata ? JSON.parse(post.quotedPost.metadata) : {};
                            const quotedAttachments = quotedMetadata.attachments || [];
                            
                            if (quotedAttachments.length > 0) {
                              const firstAttachment = quotedAttachments[0];
                              let mediaUrl = firstAttachment.url || '';
                              
                              if (firstAttachment.ipfsHash && typeof firstAttachment.ipfsHash === 'string') {
                                const hash = firstAttachment.ipfsHash.replace('ipfs://', '');
                                mediaUrl = `https://ipfs.io/ipfs/${hash}`;
                              } else if (firstAttachment.url && typeof firstAttachment.url === 'string' && firstAttachment.url.includes('ipfs://')) {
                                const hash = firstAttachment.url.replace('ipfs://', '');
                                mediaUrl = `https://ipfs.io/ipfs/${hash}`;
                              }
                              
                              return (
                                <div className="mt-3">
                                  {firstAttachment.type === 'image' && (
                                    <img
                                      src={mediaUrl}
                                      alt="Quoted post media"
                                      className="w-full rounded-md object-cover max-h-64"
                                      loading="lazy"
                                      decoding="async"
                                      style={{ 
                                        contentVisibility: 'auto',
                                        imageRendering: 'auto'
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (mediaUrl.includes('ipfs.io') && firstAttachment.ipfsHash) {
                                          const hash = firstAttachment.ipfsHash.replace('ipfs://', '');
                                          target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                                        }
                                      }}
                                    />
                                  )}
                                  {firstAttachment.type === 'video' && (
                                    <video
                                      src={mediaUrl}
                                      controls
                                      controlsList="nodownload"
                                      preload="metadata"
                                      className="w-full rounded-md max-h-64 object-contain bg-black"
                                      onError={(e) => {
                                        console.error('❌ Failed to load quoted video:', mediaUrl);
                                      }}
                                    >
                                      Your browser does not support the video tag.
                                    </video>
                                  )}
                                </div>
                              );
                            }
                          } catch (error) {
                            console.error('Error parsing quoted post media:', error);
                          }
                          return null;
                        })()}
                      </div>
                    )}

                    {/* Image/Video Attachments - Only show here if NOT a quote post */}
                    {!post.quotedPost && post.metadata?.attachments && post.metadata.attachments.length > 0 && (
                      <div className="space-y-3 mt-3">
                        {post.metadata.attachments.map((attachment: any, index: number) => {
                          let imageUrl = attachment.url || '';
                          
                          // Handle IPFS URLs
                          if (attachment.ipfsHash && typeof attachment.ipfsHash === 'string') {
                            const hash = attachment.ipfsHash.replace('ipfs://', '');
                            imageUrl = `https://ipfs.io/ipfs/${hash}`;
                          } else if (attachment.url && typeof attachment.url === 'string' && attachment.url.includes('ipfs://')) {
                            const hash = attachment.url.replace('ipfs://', '');
                            imageUrl = `https://ipfs.io/ipfs/${hash}`;
                          }
                          
                          return (
                            <div key={index}>
                              {attachment.type === 'image' && (
                                <div className="relative rounded-2xl overflow-hidden border border-border/50">
                                  <img
                                    src={imageUrl}
                                    alt={attachment.name || 'Attachment'}
                                    className="w-full object-cover max-h-[600px]"
                                    loading="lazy"
                                    decoding="async"
                                    style={{ 
                                      contentVisibility: 'auto',
                                      imageRendering: 'auto'
                                    }}
                                    onError={(e) => {
                                      console.error('❌ Failed to load image:', { url: imageUrl, attachment });
                                      const target = e.target as HTMLImageElement;
                                      if (imageUrl.includes('ipfs.io') && attachment.ipfsHash) {
                                        const hash = attachment.ipfsHash.replace('ipfs://', '');
                                        target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                                      }
                                    }}
                                  />
                                </div>
                              )}
                              {attachment.type === 'video' && (
                                <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black">
                                  <video
                                    src={imageUrl}
                                    controls
                                    controlsList="nodownload"
                                    preload="metadata"
                                    className="w-full max-h-[600px] object-contain"
                                    onError={(e) => {
                                      console.error('❌ Failed to load video:', { url: imageUrl, attachment });
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
                    
                    {/* Single Image/Video - Show if ipfsHash exists but no attachments array (exclude music posts) */}
                    {!post.quotedPost && post.contentType !== 'music' && post.ipfsHash && (!post.metadata?.attachments || post.metadata.attachments.length === 0) && (
                      <div className="mt-3">
                        {post.contentType === 'image' && (
                          <div className="relative rounded-2xl overflow-hidden border border-border/50">
                            <img
                              src={`https://ipfs.io/ipfs/${post.ipfsHash}`}
                              alt="Post media"
                              className="w-full object-cover max-h-[600px]"
                              loading="lazy"
                              decoding="async"
                              style={{ 
                                contentVisibility: 'auto',
                                imageRendering: 'auto'
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://gateway.pinata.cloud/ipfs/${post.ipfsHash}`;
                              }}
                            />
                          </div>
                        )}
                        {post.contentType === 'video' && (
                          <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-black">
                            <video
                              src={`https://ipfs.io/ipfs/${post.ipfsHash}`}
                              controls
                              controlsList="nodownload"
                              preload="metadata"
                              className="w-full max-h-[600px] object-contain"
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions - Twitter Style */}
                  <div className="mt-4 flex items-center justify-between border-t border-b py-3">
                    {/* Left side: Comment, Repost, Like */}
                    <div className="flex items-center space-x-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-2 space-x-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.comments}</span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={`h-8 px-2 space-x-2 ${post.isReposted ? 'text-green-500' : 'text-muted-foreground hover:text-green-500'} hover:bg-green-500/10`}
                            disabled={isReposting}
                          >
                            <Repeat2 className="w-4 h-4" />
                            <span className="text-xs">{post.shares}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem 
                            onClick={() => handleRepost()}
                            className="cursor-pointer"
                          >
                            <Repeat2 className="w-4 h-4 mr-2" />
                            {post.isReposted ? 'Unrepost' : 'Repost'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={openQuoteModal}
                            className="cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        ref={likeButtonRef}
                        variant="ghost" 
                        size="sm" 
                        className={`h-8 px-2 space-x-2 ${post.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'} hover:bg-red-500/10 ${isAnimating ? 'scale-110' : ''} transition-transform duration-200`}
                        onClick={handleLike}
                        disabled={isLiking}
                      >
                        <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-red-500' : ''}`} />
                        <span className="text-xs">{post.likes}</span>
                      </Button>
                    </div>

                    {/* Right side: Bookmark, Share */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 px-2 transition-colors ${post && checkIsBookmarked(Number(post.id)) ? 'text-blue-500' : 'text-muted-foreground hover:text-blue-500'} hover:bg-blue-500/10`}
                        onClick={() => {
                          if (post?.id) {
                            toggleBookmark(Number(post.id));
                          }
                        }}
                        title={post && checkIsBookmarked(Number(post.id)) ? 'Remove bookmark' : 'Bookmark this post'}
                      >
                        <Bookmark className={`w-4 h-4 transition-all ${post && checkIsBookmarked(Number(post.id)) ? 'fill-current' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                        onClick={() => setShowShareModal(true)}
                        title="Share this post"
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Share Modal */}
                    {post && (
                      <SharePostModal
                        isOpen={showShareModal}
                        onClose={() => setShowShareModal(false)}
                        postId={post.id.toString()}
                        postContent={post.content}
                        postAuthor={post.authorProfile?.displayName || post.author}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Reply box with mention support */}
              <div className="mt-6">
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* User Avatar */}
                      <Avatar className="w-10 h-10 flex-shrink-0">
                        <AvatarImage src={getIPFSUrl(currentUserProfile?.avatarHash || userProfile?.avatar || '')} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {currentUserProfile?.displayName?.charAt(0).toUpperCase() || 
                           userProfile?.name?.charAt(0).toUpperCase() || 
                           'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CommentInput
                          onSubmit={handleComment}
                          placeholder="Reply publicly..."
                          displayName={currentUserProfile?.displayName || userProfile?.name || "You"}
                          autoFocus={false}
                          postAuthor={post?.author}
                          postId={post?.id ? String(post.id) : undefined}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Comments */}
                <div className="mt-4 space-y-3">
                  {comments.length > 0 ? (
                    <>
                      <h3 className="font-semibold text-sm text-muted-foreground px-2">
                        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                      </h3>
                      {comments.map((comment: any) => (
                        <Card key={comment.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              {/* Clickable Avatar */}
                              <Avatar 
                                className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                                onClick={() => comment.authorProfile?.username && navigate(`/profile/${comment.authorProfile.username}`)}
                                title={comment.authorProfile?.username ? `View @${comment.authorProfile.username}'s profile` : 'View profile'}
                              >
                                <AvatarImage src={getIPFSUrl(comment.authorProfile?.avatarHash || '')} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                                  {comment.authorProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {/* Clickable Name */}
                                  <span 
                                    className="font-medium cursor-pointer hover:underline transition-all"
                                    onClick={() => comment.authorProfile?.username && navigate(`/profile/${comment.authorProfile.username}`)}
                                    title={`View profile`}
                                  >
                                    {comment.authorProfile?.displayName || 'Unknown User'}
                                  </span>
                                  {/* Clickable Username */}
                                  <span 
                                    className="text-xs text-muted-foreground cursor-pointer hover:text-primary hover:underline transition-colors"
                                    onClick={() => comment.authorProfile?.username && navigate(`/profile/${comment.authorProfile.username}`)}
                                    title={`View profile`}
                                  >
                                    @{comment.authorProfile?.username || 'unknown'}
                                  </span>
                                  <span className="text-xs text-muted-foreground">· {formatTimeAgo(comment.timestamp)}</span>
                                </div>
                                {/* Parse mentions in comment content */}
                                <p className="text-sm mt-2">
                                  {parseContentWithMentionsAndTags(comment.content, navigate)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  ) : (
                    <Card className="border-border/50">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground text-center">
                          No comments yet. Be the first to reply!
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>

            {/* Right Sidebar - Same as Feed */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-20 space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-custom">


                {/* Explore Genres */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-clash font-semibold text-lg mb-3">Explore Genres</h3>
                    <div className="space-y-2">
                      {['Electronic', 'Hip Hop', 'Jazz', 'Ambient', 'Rock', 'Pop'].map((genre) => (
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="mr-2 mb-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Featured Playlists */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-clash font-semibold text-lg">Featured Playlists</h3>
                      <Link to="/myplaylist" className="text-sm text-primary hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          id: 1,
                          title: "Chill Electronic Vibes",
                          creator: "HiBeats AI",
                          tracks: 24,
                          cover: "/assets/default-cover.jpg",
                          description: "Perfect for coding sessions"
                        },
                        {
                          id: 2,
                          title: "Hip Hop Essentials",
                          creator: "Beat Masters",
                          tracks: 18,
                          cover: "/assets/default-cover.jpg",
                          description: "Classic beats and flows"
                        },
                        {
                          id: 3,
                          title: "Jazz Fusion Nights",
                          creator: "Jazz Collective",
                          tracks: 15,
                          cover: "/assets/default-cover.jpg",
                          description: "Smooth jazz for evenings"
                        },
                        {
                          id: 4,
                          title: "Ambient Focus",
                          creator: "Ambient Sounds",
                          tracks: 12,
                          cover: "/assets/default-cover.jpg",
                          description: "Concentration music"
                        }
                      ].map((playlist) => (
                        <div key={playlist.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                          <img
                            src={playlist.cover}
                            alt={playlist.title}
                            className="w-12 h-12 rounded-md object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{playlist.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{playlist.creator}</p>
                            <p className="text-xs text-muted-foreground">{playlist.tracks} tracks</p>
                          </div>
                          <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                            <Play className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Related Posts */}
                <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="font-clash font-semibold text-lg mb-3">Related</h3>
                    <div className="space-y-2 text-sm">
                      <Link to="/explore" className="block text-muted-foreground hover:text-foreground hover:underline transition-colors">
                        Explore more posts
                      </Link>
                      <Link to="/feed" className="block text-muted-foreground hover:text-foreground hover:underline transition-colors">
                        Back to feed
                      </Link>
                      {post.authorProfile?.username && (
                        <Link 
                          to={`/profile/${post.authorProfile.username}`} 
                          className="block text-muted-foreground hover:text-foreground hover:underline transition-colors"
                        >
                          View @{post.authorProfile.username}'s profile
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Footer Links - Twitter Style */}
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <a href="#" className="hover:underline">Terms of Service</a>
                    <a href="#" className="hover:underline">Privacy Policy</a>
                    <a href="#" className="hover:underline">Cookie Policy</a>
                    <a href="#" className="hover:underline">Accessibility</a>
                    <a href="#" className="hover:underline">Ads info</a>
                    <a href="#" className="hover:underline">More</a>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    © 2025 HiBeats Corp.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Quote Repost Modal */}
      {post && (
        <QuotePostModal
          isOpen={isQuoteModalOpen}
          onClose={closeQuoteModal}
          onSubmit={handleQuoteSubmit}
          quotedPost={{
            id: typeof post.id === 'string' ? Number(post.id) : post.id,
            author: post.author,
            content: post.content,
            timestamp: post.timestamp,
            authorProfile: post.authorProfile
          }}
          currentUserProfile={currentUserProfile}
        />
      )}
    </div>
  );
};

export default PostDetail;
