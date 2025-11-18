import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSequence } from "@/contexts/SequenceContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Link2,
  MoreHorizontal,
  Music,
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  Verified,
  Play,
  Bookmark,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PostCard from "@/components/feed/PostCard";
import QuotePostModal from "@/components/QuotePostModal";
import { Skeleton } from "@/components/ui/skeleton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { usePublicClient } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { USER_PROFILE_ABI } from "@/lib/abis/UserProfile";
import { somniaDatastreamService } from "@/services/somniaDatastreamService";
import { somniaDatastreamServiceV3 } from "@/services/somniaDatastreamService.v3";
import { InteractionType, TargetType, createInteractionId, ContentType, createPostId } from "@/config/somniaDataStreams.v3";
import { subgraphService } from "@/services/subgraphService";

// 🔥 LOCAL CACHE: Username to Address mapping
const usernameToAddressCache: { [username: string]: string } = {};

interface UserProfileData {
  userAddress: string;
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  bannerHash: string;
  isArtist: boolean;
  isVerified: boolean;
  location: string;
  website: string;
  createdAt: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
}

const UserProfile = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { walletAddress } = useAuth();
  const { 
    followUser, 
    unfollowUser, 
    smartAccountAddress, 
    isAccountReady
  } = useSequence();
  const publicClient = usePublicClient();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [userMedia, setUserMedia] = useState<any[]>([]);
  const [userLikes, setUserLikes] = useState<any[]>([]);
  const [userReposts, setUserReposts] = useState<any[]>([]);
  const [userReplies, setUserReplies] = useState<any[]>([]);
  const [userBookmarks, setUserBookmarks] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);
  const [isLoadingReposts, setIsLoadingReposts] = useState(false);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [userAlbums, setUserAlbums] = useState<any[]>([]);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [nftCount, setNftCount] = useState(0);
  
  // Quote modal state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedPostForQuote, setSelectedPostForQuote] = useState<any | null>(null);

  // Check if viewing own profile
  const isOwnProfile = smartAccountAddress?.toLowerCase() === profileData?.userAddress?.toLowerCase();

  // Fetch user profile from blockchain
  useEffect(() => {
    const fetchProfile = async () => {
      if (!username || !publicClient) return;

      setIsLoading(true);
      try {
        console.log('🔍 Fetching profile for username:', username);
        
        let userAddress: string | null = null;
        
        // ✅ Method 0: Check local cache first
        if (usernameToAddressCache[username.toLowerCase()]) {
          userAddress = usernameToAddressCache[username.toLowerCase()];
          console.log('✅ [Cache] Found address:', userAddress);
        }
        // ✅ Method 1: Check if username is actually a wallet address
        else if (username.startsWith('0x') && username.length === 42) {
          userAddress = username;
          console.log('✅ [Direct] Username is wallet address:', userAddress);
        } 
        // ✅ Method 2: Query Subgraph (PRIMARY METHOD - Most Reliable)
        else {
          console.log('🔍 [Subgraph] Querying for username:', username);
          try {
            const subgraphProfile = await subgraphService.getProfileByUsername(username);
            
            if (subgraphProfile && subgraphProfile.id) {
              userAddress = subgraphProfile.id; // id is the user address in subgraph
              // Cache it
              usernameToAddressCache[username.toLowerCase()] = userAddress;
              console.log('✅ [Subgraph] Found address:', userAddress);
              console.log('✅ [Subgraph] Profile data:', {
                username: subgraphProfile.username,
                displayName: subgraphProfile.displayName,
                bio: subgraphProfile.bio,
                isArtist: subgraphProfile.isArtist,
              });
            } else {
              console.warn('⚠️ [Subgraph] No profile found for username:', username);
            }
          } catch (error) {
            console.error('❌ [Subgraph] Query failed:', error);
            // Log detailed error
            if (error instanceof Error) {
              console.error('Error message:', error.message);
              console.error('Error stack:', error.stack);
            }
          }
        }
        
        // ✅ Method 3: Fallback to DataStream (if subgraph failed)
        if (!userAddress) {
          console.log('🔍 [DataStream] Checking for username:', username);
          try {
            const profiles = await somniaDatastreamService.getByKey(
              'hibeats_user_profiles_v1',
              '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile contract address
              'all_profiles'
            );

            if (profiles && Array.isArray(profiles)) {
              const matchingProfile = profiles.find((p: any) => 
                p.username?.toLowerCase() === username.toLowerCase()
              );

              if (matchingProfile && matchingProfile.userAddress) {
                userAddress = matchingProfile.userAddress;
                // Cache it
                usernameToAddressCache[username.toLowerCase()] = userAddress;
                console.log('✅ [DataStream] Found address:', userAddress);
              }
            }
          } catch (error) {
            console.warn('⚠️ [DataStream] Lookup failed:', error);
          }
        }

        // ✅ If still no user address found, show error
        if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
          console.error('❌ Could not find user address for username:', username);
          toast.error('Profile not found');
          navigate('/feed');
          return;
        }

        // ✅ Get profile data from contract using getProfile function
        const profile = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getProfile',
          args: [userAddress as `0x${string}`],
          authorizationList: []
        }) as any;

        console.log('✅ Profile data from contract:', profile);

        // Check if profile exists (username not empty)
        if (!profile.username || profile.username === '') {
          console.error('❌ Profile username is empty');
          toast.error('Profile not found');
          navigate('/feed');
          return;
        }

        // ✅ Get follower/following counts from DataStream V3
        let followerCount = 0;
        let followingCount = 0;
        try {
          const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
          
          followerCount = await somniaDatastreamServiceV3.getFollowerCount(userAddress);
          followingCount = await somniaDatastreamServiceV3.getFollowingCount(userAddress);
          
          console.log('✅ [V3] Follower/Following counts:', { followerCount, followingCount });
        } catch (error) {
          console.warn('⚠️ Could not fetch follower/following counts from DataStream:', error);
        }

        // ✅ Get post count from DataStream V3
        let postCount = 0;
        try {
          console.log('📊 [V3] Fetching post count from DataStream...');
          const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
          
          // Load all posts from DataStream
          const allPosts = await somniaDatastreamServiceV3.getAllPosts();
          
          // Count posts by this user (excluding deleted posts)
          postCount = allPosts.filter(post => 
            post.author.toLowerCase() === userAddress.toLowerCase() && !post.isDeleted
          ).length;
          
          console.log(`✅ [V3] User has ${postCount} posts`);
        } catch (error) {
          console.warn('⚠️ [V3] Could not fetch post count:', error);
        }

        // ✅ Get NFT count from Subgraph
        let totalNFTs = 0;
        try {
          console.log('🎨 [NFT] Fetching NFT count for user:', userAddress);
          
          // Get owned songs/music NFTs
          const ownedSongs = await subgraphService.getUserOwnedSongs(userAddress, 1000, 0);
          totalNFTs += ownedSongs.length;
          
          console.log(`✅ [NFT] User owns ${totalNFTs} NFTs (songs)`);
        } catch (error) {
          console.warn('⚠️ [NFT] Could not fetch NFT count:', error);
        }

        // Transform to our format
        setProfileData({
          userAddress: userAddress,
          username: profile.username || '',
          displayName: profile.displayName || profile.username || userAddress.slice(0, 6) + '...' + userAddress.slice(-4),
          bio: profile.bio || '',
          avatarHash: profile.avatarHash || '',
          bannerHash: profile.bannerHash || '',
          isArtist: profile.isArtist || false,
          isVerified: profile.isVerified || false,
          location: profile.location || '',
          website: profile.website || '',
          createdAt: Number(profile.createdAt) * 1000, // Convert to milliseconds
          followerCount,
          followingCount,
          postCount,
        });
        
        // Set NFT count
        setNftCount(totalNFTs);

        // ✅ Check if current user follows this profile (DataStream V3)
        if (smartAccountAddress && userAddress) {
          try {
            const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
            const isUserFollowing = await somniaDatastreamServiceV3.isFollowing(smartAccountAddress, userAddress);
            
            setIsFollowing(isUserFollowing);
            console.log('✅ [V3] Follow status:', isUserFollowing);
          } catch (error) {
            console.error('Error checking follow status from DataStream:', error);
          }
        }
      } catch (error) {
        console.error('❌ Error fetching profile:', error);
        toast.error('Failed to load profile');
        navigate('/feed');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [username, publicClient, smartAccountAddress, navigate]);

  // Fetch user posts from DataStream V3
  useEffect(() => {
    const fetchPosts = async () => {
      if (!profileData?.userAddress) return;

      setIsLoadingPosts(true);
      try {
        console.log('📝 [V3] Fetching posts for user:', profileData.userAddress);
        
        // Import DataStream service V3
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        const { profileService } = await import('@/services/profileService');
        const { InteractionType } = await import('@/config/somniaDataStreams.v3');
        
        // Load all posts from DataStream
        const allPosts = await somniaDatastreamServiceV3.getAllPosts();
        
        // Load all interactions for stats
        const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
        
        // Import aggregation helper
        const { aggregateInteractions, mergePostsWithStats, countQuotes, enrichPostsWithQuotes } = await import('@/config/somniaDataStreams.v3');
        
        // Aggregate stats
        const statsMap = aggregateInteractions(allInteractions, smartAccountAddress || undefined);
        const quoteCounts = countQuotes(allPosts);
        
        // ✅ Enrich all posts with quoted posts first
        const enrichedPosts = enrichPostsWithQuotes(allPosts);
        
        // ✅ Filter posts by this user (author matches profile address)
        // This includes: regular posts, quote posts (quotedPostId > 0), and replies (replyToId > 0)
        const userOwnPosts = enrichedPosts.filter(post => 
          post.author.toLowerCase() === profileData.userAddress.toLowerCase() && !post.isDeleted
        );
        
        // ✅ Get reposts by this user (simple reposts without quote)
        const userRepostInteractions = allInteractions.filter(interaction => 
          interaction.fromUser.toLowerCase() === profileData.userAddress.toLowerCase() &&
          interaction.interactionType === InteractionType.REPOST
        );
        const repostedPostIds = new Set(userRepostInteractions.map(i => i.targetId));
        
        // Filter to get only simple reposts (not quotes)
        // Quote posts are already included in userOwnPosts because user is the author
        const userRepostedPosts = enrichedPosts.filter(post => {
          // Must be reposted by user
          if (!repostedPostIds.has(post.id) || post.isDeleted) return false;
          
          // Exclude if user is the author (already in userOwnPosts)
          if (post.author.toLowerCase() === profileData.userAddress.toLowerCase()) return false;
          
          return true;
        });
        
        // ✅ Combine own posts (including quotes) and simple reposts
        const combinedPosts: any[] = [...userOwnPosts];
        
        // Add simple reposts with repost metadata
        userRepostedPosts.forEach(post => {
          combinedPosts.push({
            ...post,
            _isRepostedByUser: true // Mark as reposted
          });
        });
        
        console.log(`📊 [V3] Found ${userOwnPosts.length} own posts (including quotes) + ${userRepostedPosts.length} simple reposts = ${combinedPosts.length} total`);
        
        // Merge with stats
        const postsWithStats = mergePostsWithStats(combinedPosts, statsMap, quoteCounts);
        
        // Load author profiles for all posts
        const authorAddresses = [...new Set(postsWithStats.map((p: any) => p.author))];
        const profiles = await Promise.all(
          authorAddresses.map(addr => profileService.getProfile(addr))
        );
        const profilesMap = new Map(
          profiles.filter(p => p !== null).map(p => [p!.userAddress.toLowerCase(), p])
        );
        
        // Transform to PostCard format
        const transformedPosts = postsWithStats.map((post: any) => {
          const authorProfile = profilesMap.get(post.author.toLowerCase());
          
          // Parse media hashes
          const mediaHashes = post.mediaHashes ? post.mediaHashes.split(',').filter((h: string) => h.trim()) : [];
          const attachments = mediaHashes.map((hash: string) => {
            // Determine type based on contentType or file extension
            const isVideo = post.contentType === 2 || hash.toLowerCase().includes('.mp4') || hash.toLowerCase().includes('.webm');
            return {
              type: isVideo ? 'video' : 'image',
              ipfsHash: hash.trim()
            };
          });
          
          // Check if this is a reposted post (not authored by profile user)
          const isRepostedByProfileUser = post._isRepostedByUser || false;
          
          // ✅ Transform quoted post if exists
          let quotedPostData = null;
          if (post.quotedPost) {
            const quotedAuthorProfile = profilesMap.get(post.quotedPost.author.toLowerCase());
            const quotedMediaHashes = post.quotedPost.mediaHashes ? post.quotedPost.mediaHashes.split(',').filter((h: string) => h.trim()) : [];
            const quotedAttachments = quotedMediaHashes.map((hash: string) => ({
              type: 'image' as const,
              ipfsHash: hash.trim()
            }));
            
            quotedPostData = {
              id: post.quotedPost.id.toString(),
              author: post.quotedPost.author,
              content: post.quotedPost.content,
              contentType: post.quotedPost.contentType === 3 ? 'music' as const : 'text' as const,
              timestamp: post.quotedPost.timestamp,
              likes: post.quotedPost.likes || 0,
              comments: post.quotedPost.comments || 0,
              shares: post.quotedPost.reposts || 0,
              attachments: quotedAttachments,
              authorProfile: {
                username: quotedAuthorProfile?.username || post.quotedPost.author.slice(0, 8),
                displayName: quotedAuthorProfile?.displayName || post.quotedPost.author.slice(0, 8),
                avatarHash: quotedAuthorProfile?.avatarHash || '',
                isVerified: quotedAuthorProfile?.isVerified || false,
                isArtist: quotedAuthorProfile?.isArtist || false
              }
            };
          }
          
          return {
            id: post.id.toString(),
            author: post.author,
            content: post.content,
            contentType: post.contentType === 3 ? 'music' as const : 'text' as const,
            timestamp: post.timestamp,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.reposts || 0,
            isLiked: post.isLiked || false,
            isReposted: post.isReposted || false,
            // ✅ Add repost metadata if this is a repost
            ...(isRepostedByProfileUser && {
              isRepost: true,
              reposter: profileData.userAddress,
              reposterProfile: {
                username: profileData.username,
                displayName: profileData.displayName,
                avatarHash: profileData.avatarHash,
                isVerified: profileData.isVerified,
                isArtist: profileData.isArtist
              }
            }),
            // ✅ Add quoted post if exists
            ...(quotedPostData && {
              quotedPost: quotedPostData
            }),
            attachments,
            authorProfile: {
              username: authorProfile?.username || post.author.slice(0, 8),
              displayName: authorProfile?.displayName || post.author.slice(0, 8),
              avatarHash: authorProfile?.avatarHash || '',
              isVerified: authorProfile?.isVerified || false,
              isArtist: authorProfile?.isArtist || false
            }
          };
        });
        
        // Sort by timestamp (newest first)
        transformedPosts.sort((a, b) => b.timestamp - a.timestamp);
        
        setUserPosts(transformedPosts);

        // Filter posts with media (images/videos)
        const postsWithMedia = transformedPosts.filter(
          (post: any) => post.attachments && post.attachments.length > 0
        );
        setUserMedia(postsWithMedia);
        console.log(`📸 [V3] Found ${postsWithMedia.length} posts with media`);

      } catch (error) {
        console.error('❌ [V3] Error fetching posts:', error);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [profileData?.userAddress, smartAccountAddress]);

  // Fetch user liked posts from DataStream V3
  useEffect(() => {
    const fetchLikedPosts = async () => {
      if (!profileData?.userAddress) return;

      setIsLoadingLikes(true);
      try {
        console.log('❤️ [V3] Fetching liked posts for user:', profileData.userAddress);
        
        // Import DataStream service V3
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        const { profileService } = await import('@/services/profileService');
        const { InteractionType } = await import('@/config/somniaDataStreams.v3');
        
        // Load all posts and interactions
        const allPosts = await somniaDatastreamServiceV3.getAllPosts();
        const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
        
        // Filter interactions to find likes by this user
        const userLikeInteractions = allInteractions.filter(interaction => 
          interaction.fromUser.toLowerCase() === profileData.userAddress.toLowerCase() &&
          interaction.interactionType === InteractionType.LIKE
        );
        
        console.log(`📊 [V3] Found ${userLikeInteractions.length} likes by user`);
        
        // Get post IDs that user liked
        const likedPostIds = new Set(userLikeInteractions.map(i => i.targetId));
        
        // Filter posts that user liked
        const likedPostsData = allPosts.filter(post => 
          likedPostIds.has(post.id) && !post.isDeleted
        );
        
        // Import aggregation helper
        const { aggregateInteractions, mergePostsWithStats, countQuotes } = await import('@/config/somniaDataStreams.v3');
        
        // Aggregate stats
        const statsMap = aggregateInteractions(allInteractions, smartAccountAddress || undefined);
        const quoteCounts = countQuotes(allPosts);
        
        // Merge with stats
        const postsWithStats = mergePostsWithStats(likedPostsData, statsMap, quoteCounts);
        
        // Load author profiles
        const authorAddresses = [...new Set(postsWithStats.map(p => p.author))];
        const profiles = await Promise.all(
          authorAddresses.map(addr => profileService.getProfile(addr))
        );
        const profilesMap = new Map(
          profiles.filter(p => p !== null).map(p => [p!.userAddress.toLowerCase(), p])
        );
        
        // Transform to PostCard format
        const transformedPosts = postsWithStats.map(post => {
          const authorProfile = profilesMap.get(post.author.toLowerCase());
          
          // Parse media hashes
          const mediaHashes = post.mediaHashes ? post.mediaHashes.split(',').filter(h => h.trim()) : [];
          const attachments = mediaHashes.map(hash => ({
            type: 'image' as const,
            ipfsHash: hash.trim()
          }));
          
          return {
            id: post.id.toString(),
            author: post.author,
            content: post.content,
            contentType: post.contentType === 3 ? 'music' as const : 'text' as const,
            timestamp: post.timestamp,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.reposts || 0,
            isLiked: true, // Always true for liked posts
            isReposted: post.isReposted || false,
            attachments,
            authorProfile: {
              username: authorProfile?.username || post.author.slice(0, 8),
              displayName: authorProfile?.displayName || post.author.slice(0, 8),
              avatarHash: authorProfile?.avatarHash || '',
              isVerified: authorProfile?.isVerified || false,
              isArtist: authorProfile?.isArtist || false
            }
          };
        });
        
        // Sort by timestamp (newest first)
        transformedPosts.sort((a, b) => b.timestamp - a.timestamp);
        
        setUserLikes(transformedPosts);
        console.log(`✅ [V3] Loaded ${transformedPosts.length} liked posts`);

      } catch (error) {
        console.error('❌ [V3] Error fetching liked posts:', error);
      } finally {
        setIsLoadingLikes(false);
      }
    };

    if (activeTab === 'likes') {
      fetchLikedPosts();
    }
  }, [profileData?.userAddress, activeTab, smartAccountAddress]);

  // Fetch user reposts from DataStream V3
  useEffect(() => {
    const fetchReposts = async () => {
      if (!profileData?.userAddress) return;

      setIsLoadingReposts(true);
      try {
        console.log('🔄 [V3] Fetching reposts for user:', profileData.userAddress);
        
        // Import DataStream service V3
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        const { profileService } = await import('@/services/profileService');
        const { InteractionType } = await import('@/config/somniaDataStreams.v3');
        
        // Load all posts and interactions
        const allPosts = await somniaDatastreamServiceV3.getAllPosts();
        const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
        
        // Filter interactions to find reposts by this user
        const userRepostInteractions = allInteractions.filter(interaction => 
          interaction.fromUser.toLowerCase() === profileData.userAddress.toLowerCase() &&
          interaction.interactionType === InteractionType.REPOST
        );
        
        console.log(`📊 [V3] Found ${userRepostInteractions.length} reposts by user`);
        
        // Get post IDs that user reposted
        const repostedPostIds = new Set(userRepostInteractions.map(i => i.targetId));
        
        // Filter posts that user reposted
        const repostedPostsData = allPosts.filter(post => 
          repostedPostIds.has(post.id) && !post.isDeleted
        );
        
        // Import aggregation helper
        const { aggregateInteractions, mergePostsWithStats, countQuotes } = await import('@/config/somniaDataStreams.v3');
        
        // Aggregate stats
        const statsMap = aggregateInteractions(allInteractions, smartAccountAddress || undefined);
        const quoteCounts = countQuotes(allPosts);
        
        // Merge with stats
        const postsWithStats = mergePostsWithStats(repostedPostsData, statsMap, quoteCounts);
        
        // Load author profiles
        const authorAddresses = [...new Set(postsWithStats.map(p => p.author))];
        const profiles = await Promise.all(
          authorAddresses.map(addr => profileService.getProfile(addr))
        );
        const profilesMap = new Map(
          profiles.filter(p => p !== null).map(p => [p!.userAddress.toLowerCase(), p])
        );
        
        // Transform to PostCard format
        const transformedPosts = postsWithStats.map(post => {
          const authorProfile = profilesMap.get(post.author.toLowerCase());
          
          // Parse media hashes
          const mediaHashes = post.mediaHashes ? post.mediaHashes.split(',').filter(h => h.trim()) : [];
          const attachments = mediaHashes.map(hash => ({
            type: 'image' as const,
            ipfsHash: hash.trim()
          }));
          
          return {
            id: post.id.toString(),
            author: post.author,
            content: post.content,
            contentType: post.contentType === 3 ? 'music' as const : 'text' as const,
            timestamp: post.timestamp,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.reposts || 0,
            isLiked: post.isLiked || false,
            isReposted: true, // Always true for reposted posts
            isRepost: true, // Mark as repost to show indicator
            reposter: profileData.userAddress, // Current profile user is the reposter
            reposterProfile: {
              username: profileData.username,
              displayName: profileData.displayName,
              avatarHash: profileData.avatarHash,
              isVerified: profileData.isVerified,
              isArtist: profileData.isArtist
            },
            attachments,
            authorProfile: {
              username: authorProfile?.username || post.author.slice(0, 8),
              displayName: authorProfile?.displayName || post.author.slice(0, 8),
              avatarHash: authorProfile?.avatarHash || '',
              isVerified: authorProfile?.isVerified || false,
              isArtist: authorProfile?.isArtist || false
            }
          };
        });
        
        // Sort by timestamp (newest first)
        transformedPosts.sort((a, b) => b.timestamp - a.timestamp);
        
        setUserReposts(transformedPosts);
        console.log(`✅ [V3] Loaded ${transformedPosts.length} reposted posts`);

      } catch (error) {
        console.error('❌ [V3] Error fetching reposts:', error);
      } finally {
        setIsLoadingReposts(false);
      }
    };

    if (activeTab === 'reposts') {
      fetchReposts();
    }
  }, [profileData?.userAddress, activeTab, smartAccountAddress]);

  // Fetch user bookmarks from DataStream V3 (only for own profile)
  useEffect(() => {
    const fetchBookmarks = async () => {
      if (!profileData?.userAddress || !isOwnProfile) return;

      setIsLoadingBookmarks(true);
      try {
        console.log('🔖 [V3] Fetching bookmarks for user:', profileData.userAddress);
        
        // Import DataStream service V3
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        const { profileService } = await import('@/services/profileService');
        
        // Get bookmarked posts
        const bookmarkedPosts = await somniaDatastreamServiceV3.getBookmarkedPosts(profileData.userAddress);
        
        console.log(`✅ [V3] Found ${bookmarkedPosts.length} bookmarked posts`);
        
        // Format posts for UI
        const formattedPosts = await Promise.all(
          bookmarkedPosts.map(async (post) => {
            // Get author profile
            const authorProfile = await profileService.getProfile(post.author);
            
            return {
              id: post.id.toString(),
              author: post.author,
              content: post.content,
              contentType: ['text', 'music', 'image', 'video', 'quote'][post.contentType] as any,
              ipfsHash: post.mediaHashes?.split(',')[0] || '',
              timestamp: post.timestamp,
              likes: post.likes || 0,
              comments: post.comments || 0,
              shares: post.reposts || 0,
              isLiked: post.isLiked,
              isReposted: post.isReposted,
              authorProfile: authorProfile ? {
                username: authorProfile.username,
                displayName: authorProfile.displayName,
                avatarHash: authorProfile.avatarHash,
                isVerified: authorProfile.isVerified,
                isArtist: authorProfile.isArtist,
              } : undefined,
            };
          })
        );
        
        setUserBookmarks(formattedPosts);

      } catch (error) {
        console.error('❌ [V3] Error fetching bookmarks:', error);
      } finally {
        setIsLoadingBookmarks(false);
      }
    };

    if (activeTab === 'bookmarks' && isOwnProfile) {
      fetchBookmarks();
    }
  }, [profileData?.userAddress, activeTab, isOwnProfile]);

  // Fetch user albums from Subgraph
  useEffect(() => {
    const fetchAlbums = async () => {
      if (!profileData?.userAddress || !profileData.isArtist) return;

      setIsLoadingAlbums(true);
      try {
        console.log('🎵 [Albums] Fetching albums for artist:', profileData.userAddress);
        
        // Import subgraph service
        const { subgraphService } = await import('@/services/subgraphService');
        
        // Fetch albums from subgraph
        const albums = await subgraphService.getUserAlbums(profileData.userAddress, 50, 0);
        
        console.log(`✅ [Albums] Found ${albums.length} albums`);
        setUserAlbums(albums);

      } catch (error) {
        console.error('❌ [Albums] Error fetching albums:', error);
      } finally {
        setIsLoadingAlbums(false);
      }
    };

    if (activeTab === 'songs') {
      fetchAlbums();
    }
  }, [profileData?.userAddress, profileData?.isArtist, activeTab]);

  // Fetch user replies from DataStream V3
  useEffect(() => {
    const fetchReplies = async () => {
      if (!profileData?.userAddress) return;

      setIsLoadingReplies(true);
      try {
        console.log('💬 [V3] Fetching replies for user:', profileData.userAddress);
        
        // Import DataStream service V3
        const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
        const { profileService } = await import('@/services/profileService');
        const { InteractionType } = await import('@/config/somniaDataStreams.v3');
        
        // Load all posts and interactions
        const allPosts = await somniaDatastreamServiceV3.getAllPosts();
        const allInteractions = await somniaDatastreamServiceV3.getAllInteractions();
        
        // Filter posts that are replies (have replyToId > 0) by this user
        const userRepliesData = allPosts.filter(post => 
          post.author.toLowerCase() === profileData.userAddress.toLowerCase() &&
          post.replyToId > 0 &&
          !post.isDeleted
        );
        
        console.log(`📊 [V3] Found ${userRepliesData.length} replies by user`);
        
        // Import aggregation helper
        const { aggregateInteractions, mergePostsWithStats, countQuotes } = await import('@/config/somniaDataStreams.v3');
        
        // Aggregate stats
        const statsMap = aggregateInteractions(allInteractions, smartAccountAddress || undefined);
        const quoteCounts = countQuotes(allPosts);
        
        // Merge with stats
        const postsWithStats = mergePostsWithStats(userRepliesData, statsMap, quoteCounts);
        
        // Load author profiles
        const authorAddresses = [...new Set(postsWithStats.map(p => p.author))];
        const profiles = await Promise.all(
          authorAddresses.map(addr => profileService.getProfile(addr))
        );
        const profilesMap = new Map(
          profiles.filter(p => p !== null).map(p => [p!.userAddress.toLowerCase(), p])
        );
        
        // Transform to PostCard format
        const transformedPosts = postsWithStats.map(post => {
          const authorProfile = profilesMap.get(post.author.toLowerCase());
          
          // Parse media hashes
          const mediaHashes = post.mediaHashes ? post.mediaHashes.split(',').filter(h => h.trim()) : [];
          const attachments = mediaHashes.map(hash => ({
            type: 'image' as const,
            ipfsHash: hash.trim()
          }));
          
          return {
            id: post.id.toString(),
            author: post.author,
            content: post.content,
            contentType: post.contentType === 3 ? 'music' as const : 'text' as const,
            timestamp: post.timestamp,
            likes: post.likes || 0,
            comments: post.comments || 0,
            shares: post.reposts || 0,
            isLiked: post.isLiked || false,
            isReposted: post.isReposted || false,
            replyToId: post.replyToId, // Include replyToId for context
            attachments,
            authorProfile: {
              username: authorProfile?.username || post.author.slice(0, 8),
              displayName: authorProfile?.displayName || post.author.slice(0, 8),
              avatarHash: authorProfile?.avatarHash || '',
              isVerified: authorProfile?.isVerified || false,
              isArtist: authorProfile?.isArtist || false
            }
          };
        });
        
        // Sort by timestamp (newest first)
        transformedPosts.sort((a, b) => b.timestamp - a.timestamp);
        
        setUserReplies(transformedPosts);
        console.log(`✅ [V3] Loaded ${transformedPosts.length} replies`);

      } catch (error) {
        console.error('❌ [V3] Error fetching replies:', error);
      } finally {
        setIsLoadingReplies(false);
      }
    };

    if (activeTab === 'replies') {
      fetchReplies();
    }
  }, [profileData?.userAddress, activeTab, smartAccountAddress]);

  // Handle follow/unfollow
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followActionType, setFollowActionType] = useState<'follow' | 'unfollow' | null>(null);
  
  const handleFollowClick = async () => {
    if (!profileData?.userAddress || !smartAccountAddress) {
      toast.error('Please connect your wallet to follow users');
      return;
    }

    if (isFollowLoading) return; // Prevent double clicks

    setIsFollowLoading(true);
    const previousFollowState = isFollowing;
    const previousFollowerCount = profileData.followerCount;
    
    // Store action type BEFORE optimistic update
    const actionType = isFollowing ? 'unfollow' : 'follow';
    setFollowActionType(actionType);

    try {
      console.log(`🔄 ${actionType === 'unfollow' ? 'Unfollowing' : 'Following'} user:`, profileData.userAddress);
      
      // Optimistic update
      setIsFollowing(!isFollowing);
      setProfileData(prev => prev ? {
        ...prev,
        followerCount: actionType === 'unfollow'
          ? Math.max(0, prev.followerCount - 1)
          : prev.followerCount + 1
      } : null);

      if (actionType === 'unfollow') {
        await unfollowUser(profileData.userAddress);
        console.log('✅ Successfully unfollowed user');
      } else {
        await followUser(profileData.userAddress);
        console.log('✅ Successfully followed user');
      }
    } catch (error) {
      console.error('❌ Error following/unfollowing:', error);
      
      // Revert optimistic update on error
      setIsFollowing(previousFollowState);
      setProfileData(prev => prev ? {
        ...prev,
        followerCount: previousFollowerCount
      } : null);
      
      toast.error('Failed to update follow status. Please try again.');
    } finally {
      setIsFollowLoading(false);
      setFollowActionType(null);
    }
  };

  // Handle like post
  const handleLike = async (post: any) => {
    if (!isAccountReady || !smartAccountAddress) {
      toast.error('Please connect your wallet to like posts');
      return;
    }

    try {
      // Optimistic update
      const wasLiked = post.isLiked;
      const updatedPosts = userPosts.map(p => 
        p.id === post.id 
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
          : p
      );
      setUserPosts(updatedPosts);

      // Also update in likes, reposts, and replies if present
      if (userLikes.some(p => p.id === post.id)) {
        setUserLikes(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
            : p
        ));
      }
      if (userReposts.some(p => p.id === post.id)) {
        setUserReposts(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
            : p
        ));
      }
      if (userReplies.some(p => p.id === post.id)) {
        setUserReplies(prev => prev.map(p => 
          p.id === post.id 
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? Math.max(0, p.likes - 1) : p.likes + 1 }
            : p
        ));
      }

      // ⚡ Submit to blockchain using DataStream V3
      console.log('❤️ [V3-LIKE] Submitting like to blockchain:', post.id);
      
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      const interactionType = wasLiked ? InteractionType.UNLIKE : InteractionType.LIKE;
      const timestamp = Date.now();
      const interactionId = createInteractionId(interactionType, smartAccountAddress, timestamp, postIdNum);
      
      const interactionData = {
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

      // ⚡ Write to blockchain using V3 service
      const txHash = await somniaDatastreamServiceV3.createInteraction(interactionData, true);
      
      console.log('✅ [V3-LIKE] Transaction submitted:', txHash);
      toast.success(!wasLiked ? 'Post liked! ❤️' : 'Like removed');

    } catch (error) {
      console.error('Failed to toggle like:', error);
      
      // Revert optimistic update on error
      const revertedPosts = userPosts.map(p => 
        p.id === post.id 
          ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes + 1 : Math.max(0, p.likes - 1) }
          : p
      );
      setUserPosts(revertedPosts);
      
      toast.error('Failed to like post. Please try again.');
    }
  };

  // Open quote modal
  const openQuoteModal = (post: any) => {
    setSelectedPostForQuote(post);
    setIsQuoteModalOpen(true);
  };

  // Close quote modal
  const closeQuoteModal = () => {
    setIsQuoteModalOpen(false);
    setSelectedPostForQuote(null);
  };

  // Handle quote submit
  const handleQuoteSubmit = async (quoteText: string, attachments: any[]) => {
    if (!selectedPostForQuote || (!quoteText.trim() && attachments.length === 0)) return;
    await handleRepost(selectedPostForQuote, quoteText.trim(), attachments);
  };

  // Handle repost using DataStream V3
  const handleRepost = async (post: any, quoteText?: string, attachments?: any[]) => {
    if (!isAccountReady || !smartAccountAddress) {
      toast.error('Please connect your wallet to repost');
      return;
    }

    try {
      const postIdNum = typeof post.id === 'string' ? Number(post.id) : post.id;
      const timestamp = Date.now();
      const isQuote = !!quoteText;
      
      if (isQuote) {
        // ⚡ Quote repost - create new post with ContentType.QUOTE
        let mediaHashes = '';
        
        // Collect IPFS hashes from attachments (already uploaded)
        if (attachments && attachments.length > 0) {
          const stillUploading = attachments.some(att => att.uploading);
          if (stillUploading) {
            toast.error("Please wait for media upload to complete");
            return;
          }
          
          const hasFailed = attachments.some(att => att.uploadFailed);
          if (hasFailed) {
            toast.error("Some media uploads failed. Please remove and try again");
            return;
          }
          
          const validHashes = attachments
            .filter(att => att.ipfsHash)
            .map(att => att.ipfsHash);
          
          if (validHashes.length > 0) {
            mediaHashes = validHashes.join(',');
          }
        }

        const postId = createPostId(smartAccountAddress, timestamp);
        
        const postData = {
          id: postId,
          author: smartAccountAddress,
          content: quoteText.trim(),
          contentType: ContentType.QUOTE,
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
        
        console.log('📝 [V3-QUOTE] Creating quote post:', postIdNum);
        await somniaDatastreamServiceV3.createPost(postData, true);
        
        toast.success('Quote posted!');
        closeQuoteModal();
        
        // Reload posts after blockchain confirmation
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } else {
        // ⚡ Simple repost/unrepost
        const interactionId = createInteractionId(InteractionType.REPOST, smartAccountAddress, timestamp, postIdNum);
        
        const interactionData = {
          id: interactionId,
          interactionType: InteractionType.REPOST,
          targetId: postIdNum,
          targetType: TargetType.POST,
          fromUser: smartAccountAddress,
          content: '',
          parentId: 0,
          timestamp,
          tipAmount: 0,
        };
        
        console.log('🔄 [V3-REPOST] Submitting repost:', postIdNum);
        await somniaDatastreamServiceV3.createInteraction(interactionData, true);
        
        toast.success('Reposted!');
        
        // Reload posts after blockchain confirmation
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }

    } catch (error) {
      console.error('❌ [V3] Failed to repost:', error);
      toast.error('Failed to repost. Please try again.');
    }
  };

  // Format number (1234 -> 1.2K)
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Format date (e.g., "Joined March 2024")
  const formatJoinDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Get IPFS URL - with type safety
  const getIPFSUrl = (hash: any) => {
    if (!hash) return '';
    // Convert to string if needed
    const hashStr = typeof hash === 'string' ? hash : String(hash);
    if (hashStr.startsWith('http')) return hashStr;
    const cleanHash = hashStr.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cleanHash}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-16">
          {/* Header Skeleton */}
          <div className="border-b border-border">
            <div className="container max-w-3xl mx-auto px-4 py-3">
              <Skeleton className="h-6 w-32" />
            </div>
          </div>

          {/* Banner Skeleton */}
          <Skeleton className="w-full h-48 md:h-64" />

          {/* Profile Info Skeleton */}
          <div className="container max-w-3xl mx-auto px-4">
            <div className="relative">
              <Skeleton className="absolute -top-16 left-4 w-32 h-32 rounded-full border-4 border-background" />
            </div>
            <div className="pt-20 pb-4 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Back Button */}
      <div className="pt-16 pb-4">
        <div className="container mx-auto px-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Profile Header - Same as Artist */}
      <div className="relative border-b border-border/20 overflow-hidden min-h-[400px]">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: profileData.bannerHash 
              ? `url(${getIPFSUrl(profileData.bannerHash)})` 
              : 'linear-gradient(135deg, hsl(var(--primary) / 0.05) 0%, hsl(var(--background)) 50%, hsl(var(--secondary) / 0.05) 100%)'
          }}
        ></div>

        {/* Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background/80 to-secondary/5 backdrop-blur-sm"></div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-secondary/10 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="relative container mx-auto px-6 py-8 min-h-[400px] flex items-center">
          <div className="flex flex-col md:flex-row gap-8 items-start w-full">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 ring-4 ring-background/50 shadow-2xl">
                <AvatarImage src={getIPFSUrl(profileData.avatarHash)} alt={profileData.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-4xl md:text-5xl">
                  {profileData.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-clash font-semibold text-3xl md:text-4xl text-foreground">{profileData.displayName}</h1>
                  {profileData.isVerified && <VerifiedBadge size="lg" />}
                  {profileData.isArtist && (
                    <Badge variant="secondary" className="gap-1">
                      <Music className="w-3 h-3" />
                      Artist
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-lg">@{profileData.username}</p>
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(profileData.followerCount || 0)}</p>
                  <p className="text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(profileData.followingCount || 0)}</p>
                  <p className="text-muted-foreground">Following</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(nftCount)}</p>
                  <p className="text-muted-foreground">NFTs</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xl text-foreground">{formatNumber(profileData.postCount || 0)}</p>
                  <p className="text-muted-foreground">Posts</p>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                {profileData.bio && (
                  <p className="text-sm leading-relaxed max-w-2xl text-muted-foreground">{profileData.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profileData.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profileData.location}
                    </div>
                  )}
                  {profileData.website && (
                    <div className="flex items-center gap-1">
                      <Link2 className="w-4 h-4" />
                      <a
                        href={profileData.website.startsWith('http') ? profileData.website : `https://${profileData.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {profileData.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {formatJoinDate(profileData.createdAt)}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {isOwnProfile ? (
                  <Button
                    variant="outline"
                    className="px-8 border-border/50 hover:bg-muted/50"
                    asChild
                  >
                    <Link to="/settings">Edit profile</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleFollowClick}
                      disabled={isFollowLoading}
                      className={`px-8 shadow-lg ${
                        isFollowing 
                          ? 'bg-muted text-muted-foreground hover:bg-muted hover:bg-red-500/10 hover:text-red-500' 
                          : 'bg-primary hover:bg-primary/90 shadow-primary/25'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isFollowLoading ? (
                        <span className="flex items-center gap-2">
                          <span className="animate-spin">⏳</span>
                          {followActionType === 'unfollow' ? 'Unfollowing...' : 'Following...'}
                        </span>
                      ) : (
                        isFollowing ? 'Following' : 'Follow'
                      )}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:bg-muted/50">
                      <MessageCircle className="w-4 h-4" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" className="border-border/50 hover:bg-muted/50">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section with Tabs */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent h-auto p-0 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="posts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                Posts
              </TabsTrigger>
              <TabsTrigger
                value="songs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
              >
                <Music className="w-4 h-4" />
                Songs
              </TabsTrigger>
              <TabsTrigger
                value="replies"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                Replies
              </TabsTrigger>
              <TabsTrigger
                value="media"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                Media
              </TabsTrigger>
              <TabsTrigger
                value="likes"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4"
              >
                Likes
              </TabsTrigger>
              <TabsTrigger
                value="reposts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
              >
                <Repeat2 className="w-4 h-4" />
                Reposts
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger
                  value="bookmarks"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-4 flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  Bookmarks
                </TabsTrigger>
              )}
            </TabsList>

            {/* Posts Tab */}
            <TabsContent value="posts" className="mt-0">
              {isLoadingPosts ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userPosts.length > 0 ? (
                <div className="space-y-4">
                  {userPosts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post}
                      currentUserAddress={smartAccountAddress || undefined}
                      onLike={() => handleLike(post)}
                      onQuote={() => openQuoteModal(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-xl font-semibold mb-2">No posts yet</p>
                  <p className="text-sm">
                    {isOwnProfile ? "Start sharing your thoughts!" : `@${profileData.username} hasn't posted yet`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Songs Tab - Artist's Albums */}
            <TabsContent value="songs" className="mt-0">
              <div className="space-y-4">
                {profileData.isArtist ? (
                  isLoadingAlbums ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="overflow-hidden">
                          <Skeleton className="w-full aspect-square" />
                          <CardContent className="p-4 space-y-2">
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : userAlbums.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userAlbums.map((album) => (
                        <Link
                          key={album.id}
                          to={`/album/${album.albumId}`}
                          className="group"
                        >
                          <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                            <div className="relative aspect-square overflow-hidden bg-muted">
                              {album.coverImageHash ? (
                                <img
                                  src={getIPFSUrl(album.coverImageHash)}
                                  alt={album.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music className="w-16 h-16 text-muted-foreground/20" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                                {album.title}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="text-xs">
                                  {album.albumType}
                                </Badge>
                                <span>•</span>
                                <span>{album.songCount} {album.songCount === '1' ? 'track' : 'tracks'}</span>
                              </div>
                              {album.createdAt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(Number(album.createdAt) * 1000).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'short' 
                                  })}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-muted-foreground">
                      <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
                      <p className="text-xl font-semibold mb-2">No albums yet</p>
                      <p className="text-sm">
                        {isOwnProfile ? "Create your first album to share with the world!" : `@${profileData.username} hasn't released any albums yet`}
                      </p>
                      {isOwnProfile && (
                        <Button className="mt-4" asChild>
                          <Link to="/upload">Create Album</Link>
                        </Button>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xl font-semibold mb-2">Not an artist account</p>
                    <p className="text-sm">
                      {isOwnProfile ? "Upgrade to artist to create albums" : `@${profileData.username} is not an artist`}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Replies Tab */}
            <TabsContent value="replies" className="mt-0">
              {isLoadingReplies ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userReplies.length > 0 ? (
                <div className="space-y-4">
                  {userReplies.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post}
                      currentUserAddress={smartAccountAddress || undefined}
                      onLike={() => handleLike(post)}
                      onQuote={() => openQuoteModal(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-semibold mb-2">No replies yet</p>
                  <p className="text-sm">
                    {isOwnProfile ? "Your replies to posts will appear here" : `@${profileData.username}'s replies will appear here`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="mt-0">
              {userMedia.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {userMedia.map((post, idx) => (
                    <Link
                      key={post.id || idx}
                      to={`/post/${post.id}`}
                      className="aspect-square bg-muted hover:opacity-90 transition-opacity overflow-hidden relative group cursor-pointer"
                    >
                      {post.attachments[0].type === 'image' ? (
                        <img
                          src={getIPFSUrl(post.attachments[0].ipfsHash)}
                          alt="Media"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <video
                          src={getIPFSUrl(post.attachments[0].ipfsHash)}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                        />
                      )}
                      {/* Overlay with play icon for videos */}
                      {post.attachments[0].type === 'video' && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      {/* Show multiple media indicator */}
                      {post.attachments.length > 1 && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          +{post.attachments.length - 1}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Play className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-semibold mb-2">No media yet</p>
                  <p className="text-sm">
                    {isOwnProfile ? "Share photos and videos" : `@${profileData.username} hasn't shared media yet`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Likes Tab */}
            <TabsContent value="likes" className="mt-0">
              {isLoadingLikes ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userLikes.length > 0 ? (
                <div className="space-y-4">
                  {userLikes.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post}
                      currentUserAddress={smartAccountAddress || undefined}
                      onLike={() => handleLike(post)}
                      onQuote={() => openQuoteModal(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-semibold mb-2">No likes yet</p>
                  <p className="text-sm">
                    {isOwnProfile ? "Posts you like will appear here" : `@${profileData.username}'s liked posts will appear here`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Reposts Tab */}
            <TabsContent value="reposts" className="mt-0">
              {isLoadingReposts ? (
                <div className="divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex gap-3">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : userReposts.length > 0 ? (
                <div className="space-y-4">
                  {userReposts.map((post) => (
                    <PostCard 
                      key={post.id} 
                      post={post}
                      currentUserAddress={smartAccountAddress || undefined}
                      onLike={() => handleLike(post)}
                      onQuote={() => openQuoteModal(post)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Repeat2 className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-xl font-semibold mb-2">No reposts yet</p>
                  <p className="text-sm">
                    {isOwnProfile ? "Posts you repost will appear here" : `@${profileData.username}'s reposts will appear here`}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Bookmarks Tab - Only visible for own profile */}
            {isOwnProfile && (
              <TabsContent value="bookmarks" className="mt-0">
                {isLoadingBookmarks ? (
                  <div className="divide-y divide-border">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-6">
                        <div className="flex gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : userBookmarks.length > 0 ? (
                  <div className="divide-y divide-border">
                    {userBookmarks.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        currentUserAddress={smartAccountAddress || undefined}
                        onLike={() => handleLike(post)}
                        onQuote={() => openQuoteModal(post)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Bookmark className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-xl font-semibold mb-2">No bookmarks yet</p>
                    <p className="text-sm">
                      Posts you bookmark will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

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
          currentUserProfile={{
            username: profileData?.username || '',
            displayName: profileData?.displayName || '',
            avatarHash: profileData?.avatarHash || '',
            isVerified: profileData?.isVerified || false,
            isArtist: profileData?.isArtist || false
          }}
        />
      )}
    </div>
  );
};

export default UserProfile;
