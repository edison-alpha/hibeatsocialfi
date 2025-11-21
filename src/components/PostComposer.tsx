import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  Image,
  Video,
  Smile,
  AtSign,
  Hash,
  Music,
  X,
  Upload,
  Play,
  Pause,
  Volume2,
  Disc,
  ListMusic,
  Music2,
  Loader2,
  AlertCircle,
  Send
} from "lucide-react";
import EmojiPicker from 'emoji-picker-react';
import { useState, useRef, useMemo, useEffect } from "react";
import { useOwnedNFTs } from "@/hooks/useOwnedNFTs";
import { useMyMusic } from "@/hooks/useMyMusic";
import { useSequence } from "@/contexts/SequenceContext";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { useSomniaDatastream } from "@/contexts/SomniaDatastreamContext";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { ipfsService } from "@/services/ipfsService";
import { toast } from "sonner";
import { useWalletClient } from "wagmi";

interface PostComposerProps {
  onPost: (content: string, attachments: any[]) => void;
  placeholder?: string;
  className?: string;
}

const PostComposer = ({ onPost, placeholder = "What's happening in music?", className }: PostComposerProps) => {
  const { isAccountReady, smartAccountAddress } = useSequence();
  const { profileData: currentUserProfile, avatarUrl, displayName, loading: profileLoading } = useCurrentUserProfile();
  const { data: walletClient } = useWalletClient();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [musicType, setMusicType] = useState<'single' | 'playlist' | 'album'>('single');
  const [isPosting, setIsPosting] = useState(false);
  const [postingStatus, setPostingStatus] = useState<'idle' | 'uploading' | 'posting'>('idle');
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use my music hook for songs
  const { songs: mySongs, isLoading: isLoadingSongs, error: songsError } = useMyMusic();
  const { ownedNFTs, isLoading: isLoadingNFTs, error: nftError } = useOwnedNFTs(); // For playlists and albums
  const { readAllUserProfiles, isConnected, recentEvents } = useSomniaDatastream();
  
  // Debug logging
  useEffect(() => {
    console.log('🎵 [PostComposer] My Songs:', {
      isLoading: isLoadingSongs,
      error: songsError,
      count: mySongs?.length || 0,
      songs: mySongs
    });
  }, [mySongs, isLoadingSongs, songsError]);

  // Fetch all users from datastream
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        console.log('🔍 [MENTION] Fetching users from Subgraph + DataStream...');
        console.log('🔍 [MENTION] isConnected:', isConnected);
        
        // Strategy 1: Fetch from Subgraph (primary source - indexed and fast)
        let subgraphUsers: any[] = [];
        try {
          const { apolloClient } = await import('@/lib/apollo-client');
          const { GET_ALL_USERS } = await import('@/graphql/queries');

          console.log('📡 [MENTION] Querying Subgraph...');
          const result = await apolloClient.query({
            query: GET_ALL_USERS,
            variables: {
              first: 100,
              skip: 0,
              orderBy: 'createdAt',
              orderDirection: 'desc'
            },
            fetchPolicy: 'network-only'
          });

          console.log('📡 [MENTION] Subgraph result:', result);

          if ((result.data as any)?.userProfiles && (result.data as any).userProfiles.length > 0) {
            subgraphUsers = (result.data as any).userProfiles
              .filter((p: any) => p.username) // Only users with username
              .map((p: any) => ({
                username: p.username,
                displayName: p.displayName || p.username,
                avatar: p.avatarHash || '',
                isArtist: p.isArtist || false,
                isVerified: p.isVerified || false,
                userAddress: p.id,
                source: 'subgraph'
              }));
            
            console.log(`✅ [MENTION] Loaded ${subgraphUsers.length} users from Subgraph`);
          } else {
            console.log('📭 [MENTION] No users in Subgraph result');
          }
        } catch (error) {
          console.error('❌ [MENTION] Subgraph fetch failed:', error);
        }

        // Strategy 2: Fetch from DataStream (real-time source - for latest updates)
        let datastreamUsers: any[] = [];
        if (isConnected) {
          try {
            const profiles = await readAllUserProfiles();
            if (profiles && profiles.length > 0) {
              datastreamUsers = profiles
                .filter((p: any) => p.username)
                .map((p: any) => ({
                  username: p.username,
                  displayName: p.displayName || p.username,
                  avatar: p.avatarHash || p.avatar || '',
                  isArtist: p.isArtist || false,
                  isVerified: p.isVerified || false,
                  userAddress: p.userAddress,
                  source: 'datastream'
                }));
              
              console.log(`✅ [MENTION] Loaded ${datastreamUsers.length} users from DataStream`);
            } else {
              console.log('📭 [MENTION] No users found in DataStream yet');
            }
          } catch (error: any) {
            // NoData() error is expected when no data exists yet
            if (error?.message?.includes('NoData()')) {
              console.log('📭 [MENTION] No DataStream data available yet');
            } else {
              console.warn('⚠️ [MENTION] DataStream fetch failed:', error);
            }
          }
        }

        // Merge and deduplicate users (Subgraph + DataStream)
        const userMap = new Map<string, any>();
        
        // Add Subgraph users first (they have more metadata like followerCount)
        subgraphUsers.forEach(user => {
          const key = user.username.toLowerCase();
          userMap.set(key, user);
        });
        
        // Add DataStream users (only if not already in map - for real-time updates)
        datastreamUsers.forEach(user => {
          const key = user.username.toLowerCase();
          if (!userMap.has(key)) {
            userMap.set(key, user);
          }
        });

        const mergedUsers = Array.from(userMap.values())
          .sort((a, b) => {
            // Sort by: verified > artist > username
            if (a.isVerified && !b.isVerified) return -1;
            if (!a.isVerified && b.isVerified) return 1;
            if (a.isArtist && !b.isArtist) return -1;
            if (!a.isArtist && b.isArtist) return 1;
            return a.username.localeCompare(b.username);
          })
          .slice(0, 100); // Limit to 100 users

        setAllUsers(mergedUsers);
        console.log(`✅ [MENTION] Total users loaded: ${mergedUsers.length} (Subgraph: ${subgraphUsers.length}, DataStream: ${datastreamUsers.length})`);
        
        // Log sample users
        if (mergedUsers.length > 0) {
          console.log('📋 [MENTION] Sample users:', mergedUsers.slice(0, 3).map(u => ({
            username: u.username,
            displayName: u.displayName,
            source: u.source,
            isArtist: u.isArtist,
            isVerified: u.isVerified
          })));
        } else {
          console.warn('⚠️ [MENTION] No users loaded! Check Subgraph and DataStream');
        }
      } catch (error) {
        console.error('❌ [MENTION] Failed to fetch users:', error);
        console.error('Error details:', error);
        setAllUsers([]);
      } finally {
        setIsLoadingUsers(false);
      }
    };

    // Fetch immediately
    fetchUsers();
    
    // Refresh user list every 10 seconds for real-time updates
    const intervalId = setInterval(fetchUsers, 10000);
    
    return () => clearInterval(intervalId);
  }, [isConnected, readAllUserProfiles]);

  // Listen for profile updates from DataStream
  useEffect(() => {
    if (!isConnected || !recentEvents) return;

    // Check for profile_created or profile_updated events
    const profileEvents = recentEvents.filter(
      event => event.type === 'profile_created' || event.type === 'profile_updated'
    );

    if (profileEvents.length > 0) {
      console.log('👤 [REALTIME] Profile updates detected, refreshing user list...');
      
      // Debounce: Only refresh once even if multiple events
      const timeoutId = setTimeout(() => {
        const fetchUsers = async () => {
          if (!isConnected) return;
          
          try {
            const profiles = await readAllUserProfiles();
            if (!profiles || profiles.length === 0) return;

            const users = profiles
              .filter((p: any) => p.username)
              .map((p: any) => ({
                username: p.username,
                displayName: p.displayName || p.username,
                avatar: p.avatarHash || p.avatar || '',
                isArtist: p.isArtist || false,
                isVerified: p.isVerified || false,
                userAddress: p.userAddress
              }))
              .slice(0, 100);

            setAllUsers(users);
            console.log('✅ [REALTIME] User list updated:', users.length);
          } catch (error) {
            console.error('❌ [REALTIME] Failed to refresh users:', error);
          }
        };

        fetchUsers();
      }, 1000); // Wait 1 second to batch multiple events

      return () => clearTimeout(timeoutId);
    }
  }, [recentEvents, isConnected, readAllUserProfiles]);

  // Filter users based on mention search
  const filteredUsers = useMemo(() => {
    if (!allUsers || allUsers.length === 0) {
      return [];
    }

    if (!mentionSearch) {
      // Show artists first, then recent users
      const artists = allUsers.filter(u => u.isArtist).slice(0, 3);
      const others = allUsers.filter(u => !u.isArtist).slice(0, 2);
      return [...artists, ...others];
    }

    // Search by username or display name
    return allUsers
      .filter(user => 
        user.username.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        user.displayName.toLowerCase().includes(mentionSearch.toLowerCase())
      )
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.username.toLowerCase() === mentionSearch.toLowerCase();
        const bExact = b.username.toLowerCase() === mentionSearch.toLowerCase();
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize artists
        if (a.isArtist && !b.isArtist) return -1;
        if (!a.isArtist && b.isArtist) return 1;
        
        // Then verified users
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        
        return 0;
      })
      .slice(0, 5);
  }, [allUsers, mentionSearch]);

  // Debug: Log wallet connection status and profile data
  useEffect(() => {
    console.log('🔍 PostComposer - Status:', {
      isAccountReady,
      smartAccountAddress,
      hasAddress: !!smartAccountAddress,
      profileLoading,
      hasProfile: !!currentUserProfile,
      avatarUrl,
      avatarHash: currentUserProfile?.avatarHash,
      displayName,
      username: currentUserProfile?.username,
      profileData: currentUserProfile
    });
  }, [isAccountReady, smartAccountAddress, currentUserProfile, avatarUrl, displayName, profileLoading]);

  // Helper function to get avatar URL
  const getAvatarUrl = () => {
    if (!currentUserProfile?.avatarHash) {
      console.log('⚠️ No avatar hash found');
      return '';
    }
    
    // console.log('🖼️ Processing avatar hash:', currentUserProfile.avatarHash);
    
    // If it's already a full URL, return as is
    if (currentUserProfile.avatarHash.startsWith('http')) {
      console.log('✅ Avatar is full URL:', currentUserProfile.avatarHash);
      return currentUserProfile.avatarHash;
    }
    
    // If it's an IPFS hash, construct IPFS URL
    if (currentUserProfile.avatarHash.startsWith('Qm') || 
        currentUserProfile.avatarHash.startsWith('baf') || 
        currentUserProfile.avatarHash.startsWith('ipfs://')) {
      const hash = currentUserProfile.avatarHash.replace('ipfs://', '');
      const ipfsUrl = `https://ipfs.io/ipfs/${hash}`;
      // console.log('✅ Avatar is IPFS, constructed URL:', ipfsUrl);
      return ipfsUrl;
    }
    
    console.log('✅ Avatar hash as-is:', currentUserProfile.avatarHash);
    return currentUserProfile.avatarHash;
  };

  const emojis = [
    "🎵", "🎶", "🎸", "🎹", "🎤", "🎧", "🎼", "🎷", "🥁", "🎺",
    "💿", "�️", "�️", "�️", "📻", "�", "�", "�", "�", "�"
  ];

  // Compress image to reduce file size
  const compressImage = async (file: File, maxWidthOrHeight: number = 1920, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidthOrHeight) {
              height = Math.round((height * maxWidthOrHeight) / width);
              width = maxWidthOrHeight;
            }
          } else {
            if (height > maxWidthOrHeight) {
              width = Math.round((width * maxWidthOrHeight) / height);
              height = maxWidthOrHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log(`🗜️ Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressedFile.size / 1024).toFixed(2)}KB`);
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📷 Media upload triggered:', event.target.files);
    const files = event.target.files;
    
    if (!files || files.length === 0) {
      console.warn('⚠️ No files selected');
      return;
    }

    console.log(`📷 Processing ${files.length} file(s)`);
    
    for (const file of Array.from(files)) {
      console.log('📷 File details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        console.warn('⚠️ File is not an image or video:', file.type);
        toast.error('Please upload only images or videos');
        continue;
      }

      let processedFile = file;

      // Compress image if it's larger than 1MB
      if (isImage && file.size > 1024 * 1024) {
        try {
          console.log('🗜️ Compressing image...');
          processedFile = await compressImage(file);
          console.log(`✅ Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB`);
        } catch (error) {
          console.error('❌ Compression failed:', error);
          processedFile = file;
        }
      }

      // Check file size after compression
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (processedFile.size > maxSize) {
        console.error('❌ File too large:', processedFile.size);
        toast.error(`${isVideo ? 'Video' : 'Image'} must be less than ${isVideo ? '50MB' : '5MB'}`);
        continue;
      }

      // ⚡ INSTANT UPLOAD: Upload to IPFS immediately when file is selected
      const uploadId = `upload-${Date.now()}-${Math.random()}`;
      
      // Create preview URL first
      const reader = new FileReader();
      reader.onload = async (e) => {
        const previewUrl = e.target?.result as string;
        if (!previewUrl) return;

        // Add to attachments with preview URL and uploading state
        const tempAttachment = {
          type: isVideo ? 'video' : 'image',
          url: previewUrl,
          file: processedFile,
          name: processedFile.name,
          uploading: true,
          uploadProgress: 0,
          uploadId
        };

        setAttachments(prev => [...prev, tempAttachment]);
        console.log(`📷 Added ${isVideo ? 'video' : 'image'} to attachments, starting IPFS upload...`);

        // ⚡ Upload to IPFS in background
        try {
          // Simulate progress (IPFS doesn't provide real progress)
          const progressInterval = setInterval(() => {
            setAttachments(prev => prev.map(att => 
              att.uploadId === uploadId && att.uploadProgress < 90
                ? { ...att, uploadProgress: att.uploadProgress + 10 }
                : att
            ));
          }, 300);

          const ipfsResult = await ipfsService.uploadFile(processedFile);
          
          clearInterval(progressInterval);
          
          const hash = typeof ipfsResult === 'string' 
            ? ipfsResult 
            : (ipfsResult.IpfsHash || ipfsResult.ipfsHash);

          if (!hash) {
            throw new Error('No IPFS hash returned');
          }

          console.log(`✅ ${isVideo ? 'Video' : 'Image'} uploaded to IPFS:`, hash);

          // Update attachment with IPFS hash and complete progress
          setAttachments(prev => prev.map(att => 
            att.uploadId === uploadId
              ? {
                  ...att,
                  ipfsHash: hash,
                  url: `https://ipfs.io/ipfs/${hash}`,
                  uploading: false,
                  uploadProgress: 100
                }
              : att
          ));

        } catch (error) {
          console.error(`❌ Failed to upload ${isVideo ? 'video' : 'image'} to IPFS:`, error);
          
          // Mark as failed
          setAttachments(prev => prev.map(att => 
            att.uploadId === uploadId
              ? { ...att, uploading: false, uploadFailed: true }
              : att
          ));
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
        toast.error('Failed to load file. Please try again.');
      };
      
      reader.readAsDataURL(processedFile);
    }

    // Reset input value to allow selecting the same file again
    event.target.value = '';
  };

  const handleEmojiClick = (emojiData: any) => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const emoji = emojiData.emoji;
      const newContent = content.substring(0, start) + emoji + content.substring(end);
      setContent(newContent);
      setShowEmojiPicker(false);

      // Focus back to textarea and set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  const handleMention = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || content.length;
      const newContent = content.substring(0, start) + "@" + content.substring(start);
      setContent(newContent);
      setShowMentionSuggestions(true);
      setMentionSearch('');
      setMentionPosition(start + 1);
      setSelectedMentionIndex(0);

      // Focus and set cursor after @
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 1, start + 1);
      }, 0);
    }
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);

    // Detect @ mention
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = newContent.substring(0, cursorPos);
      
      // Find the last @ before cursor
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        
        // Check if there's no space after @
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setShowMentionSuggestions(true);
          setMentionSearch(textAfterAt);
          setMentionPosition(lastAtIndex);
          setSelectedMentionIndex(0);
        } else {
          setShowMentionSuggestions(false);
        }
      } else {
        setShowMentionSuggestions(false);
      }
    }
  };

  const selectMention = (username: string) => {
    const beforeMention = content.substring(0, mentionPosition);
    const afterCursor = content.substring(textareaRef.current?.selectionStart || content.length);
    const newContent = beforeMention + '@' + username + ' ' + afterCursor;
    
    setContent(newContent);
    setShowMentionSuggestions(false);
    setMentionSearch('');
    
    // Focus textarea and set cursor after mention
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newCursorPos = beforeMention.length + username.length + 2; // +2 for @ and space
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleHashtag = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || content.length;
      const newContent = content.substring(0, start) + "#" + content.substring(start);
      setContent(newContent);

      setTimeout(() => {
        textarea.focus();
        const newPosition = start + 1;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 10);
    } else {
      // Fallback if textarea ref is not available
      setContent(content + "#");
    }
  };

  const handleMusicSelect = (item: any, type: 'single' | 'playlist' | 'album') => {
    // Format NFT data for posting
    const formattedItem = {
      ...item,
      // Core NFT info
      tokenId: item.tokenId,
      contractAddress: CONTRACT_ADDRESSES.songNFT,
      
      // Display info
      title: item.metadata?.title || item.title || 'Untitled',
      artist: item.metadata?.artist || item.artist || 'Unknown Artist',
      cover: item.imageUrl || (item.metadata?.image || '/assets/default-cover.jpg'),
      
      // Media URLs
      audioUrl: item.audioUrl,
      imageUrl: item.imageUrl,
      
      // IPFS Hashes
      ipfsHash: item.ipfsMetadataHash,
      ipfsAudioHash: item.ipfsAudioHash,
      ipfsImageHash: item.ipfsArtworkHash,
      
      // Metadata
      genre: item.metadata?.genre || item.genre,
      duration: item.metadata?.duration || item.duration,
      description: item.metadata?.description,
      creator: item.metadata?.creator || item.artist,
      trackCount: item.metadata?.trackCount,
      year: item.metadata?.year,
      
      // NFT specific
      isNFT: true,
      royaltyPercentage: item.royaltyPercentage,
      artistAddress: item.artistAddress,
      createdAt: item.createdAt,
      type: type
    };

    setSelectedTrack(formattedItem);
    setAttachments(prev => [...prev, {
      type: 'music',
      musicType: type,
      item: formattedItem
    }]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    if (selectedTrack && attachments[index]?.type === 'music') {
      setSelectedTrack(null);
    }
  };

  // Use useMemo to ensure canPost updates correctly
  const canPost = useMemo(() => {
    const hasContent = content.trim().length > 0;
    const hasAttachments = attachments.length > 0;
    const result = hasContent || hasAttachments;
    return result;
  }, [content, attachments]);

  const handleSubmit = async () => {
    console.log('🔍 PostComposer handleSubmit called:', {
      canPost,
      contentLength: content.trim().length,
      attachmentsCount: attachments.length,
      content: content.substring(0, 50),
      isAccountReady,
      smartAccountAddress
    });

    if (!canPost) {
      console.warn('⚠️ Posting not allowed - no content or attachments');
      return;
    }

    if (!isAccountReady || !smartAccountAddress) {
      console.warn('⚠️ Account not ready');
      return;
    }

    // ⚡ Check if any attachments are still uploading
    const stillUploading = attachments.some(att => att.uploading);
    if (stillUploading) {
      console.warn('⚠️ Still uploading, please wait...');
      return;
    }
    
    // Check if any uploads failed
    const hasFailed = attachments.some(att => att.uploadFailed);
    if (hasFailed) {
      console.warn('⚠️ Some uploads failed, please remove and try again');
      return;
    }

    console.log('✅ Posting allowed, processing...');
    
    // Save current content and attachments
    const contentToPost = content;
    const attachmentsToPost = [...attachments];
    
    // Clear form immediately for better UX (optimistic)
    setContent("");
    setAttachments([]);
    setSelectedTrack(null);
    setIsRecording(false);
    setShowEmojiPicker(false);
    
    // Set posting state
    setIsPosting(true);
    setPostingStatus('posting');
    
    try {
      // ⚡ NO UPLOAD NEEDED: Files already uploaded to IPFS when selected!
      // Just filter out music attachments and pass through
      const validAttachments = attachmentsToPost.filter(att => {
        // Music attachments are kept as-is
        if (att.type === 'music') return true;
        
        // Image/video must have ipfsHash (already uploaded)
        if ((att.type === 'image' || att.type === 'video') && att.ipfsHash) {
          return true;
        }
        
        console.warn('⚠️ Attachment missing IPFS hash:', att);
        return false;
      });
      
      console.log('✅ All attachments ready, posting...');
      
      // Call onPost callback with attachments (already have IPFS hashes)
      await onPost(contentToPost, validAttachments);
      
      console.log('✅ Post submitted successfully');
      
      // 🔔 Send mention notifications (non-blocking)
      if (smartAccountAddress && contentToPost) {
        try {
          console.log('🔔 [POST] Checking for mentions in post...');
          const { sendMentionNotifications } = await import('@/utils/mentionHelper');
          
          // Generate temporary post ID (will be replaced with actual post ID from blockchain)
          const tempPostId = `post_${Date.now()}_${smartAccountAddress}`;
          
          // Send mention notifications in background
          sendMentionNotifications(contentToPost, smartAccountAddress, tempPostId, allUsers)
            .then(() => console.log('✅ [POST] Mention notifications sent'))
            .catch(error => console.error('❌ [POST] Failed to send mention notifications:', error));
        } catch (error) {
          console.error('❌ [POST] Failed to process mentions:', error);
        }
      }
      
      toast.success('✅ Post created!');
    } catch (error) {
      console.error('❌ Error submitting post:', error);
      toast.error('Failed to create post. Please try again.');
      
      // Restore content on error
      setContent(contentToPost);
      setAttachments(attachmentsToPost);
    } finally {
      setIsPosting(false);
      setPostingStatus('idle');
      setUploadProgress('');
    }
  };

  return (
    <Card className={`border-border/50 ${className}`}>
      <CardContent className="p-4">
        {/* Warning banner hanya jika belum ready */}
        {!isAccountReady && (
          <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2 text-xs">
            <AlertCircle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
            <span className="text-yellow-700 dark:text-yellow-400">
              {smartAccountAddress 
                ? 'Wallet connected. Preparing account...' 
                : 'Please connect your wallet to post.'}
            </span>
          </div>
        )}
        
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage 
              src={getAvatarUrl() || avatarUrl} 
              alt={displayName || currentUserProfile?.username || 'User'} 
            />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {displayName 
                ? displayName.slice(0, 2).toUpperCase()
                : currentUserProfile?.username
                  ? currentUserProfile.username.slice(0, 2).toUpperCase()
                  : smartAccountAddress 
                    ? smartAccountAddress.slice(2, 4).toUpperCase() 
                    : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="min-h-[100px] border-none resize-y focus:ring-0 p-0 text-lg placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                // Handle mention autocomplete
                if (showMentionSuggestions && filteredUsers.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) => 
                      prev < filteredUsers.length - 1 ? prev + 1 : prev
                    );
                    return;
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedMentionIndex((prev) => prev > 0 ? prev - 1 : 0);
                    return;
                  } else if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    selectMention(filteredUsers[selectedMentionIndex].username);
                    return;
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setShowMentionSuggestions(false);
                    return;
                  }
                }

                // Allow Ctrl/Cmd + Enter to submit
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  if (canPost && isAccountReady) {
                    handleSubmit();
                  }
                }
              }}
            />

            {/* Mention Autocomplete Dropdown */}
            {showMentionSuggestions && (
              <div className="absolute z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg max-w-sm w-full">
                {isLoadingUsers ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <>
                    <div className="py-1">
                      {filteredUsers.map((user, index) => (
                    <div
                      key={user.username}
                      className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                        index === selectedMentionIndex 
                          ? 'bg-accent text-accent-foreground' 
                          : 'hover:bg-accent/50'
                      }`}
                      onClick={() => selectMention(user.username)}
                      onMouseEnter={() => setSelectedMentionIndex(index)}
                    >
                      <Avatar className="w-8 h-8 border-2 border-border">
                        <AvatarImage 
                          src={user.avatar ? (
                            user.avatar.startsWith('http') 
                              ? user.avatar 
                              : `https://ipfs.io/ipfs/${user.avatar.replace('ipfs://', '')}`
                          ) : undefined}
                          alt={user.displayName}
                        />
                        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                          {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{user.displayName}</p>
                          {user.isVerified === true && (
                            <VerifiedBadge size="sm" />
                          )}
                          {user.isArtist === true && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none">
                              🎵 Artist
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-3 py-1 border-t border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      ↑↓ navigate • Enter/Tab select • Esc close
                    </p>
                    <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {allUsers.length} users from blockchain
                    </p>
                  </div>
                </div>
              </>
              ) : (
                <div className="py-8 text-center px-4">
                  {!isConnected ? (
                    <>
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">DataStream not connected</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Waiting for blockchain connection...
                      </p>
                    </>
                  ) : allUsers.length === 0 ? (
                    <>
                      <AtSign className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No users on blockchain yet</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Be the first to create a profile!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">No users found</p>
                      {mentionSearch && (
                        <p className="text-xs text-muted-foreground mt-1">
                          No matches for "@{mentionSearch}"
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
              </div>
            )}

            {/* Helper text for mentions and hashtags */}
            {content.length === 0 && !showMentionSuggestions && (
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <AtSign className="w-3 h-3" />
                  <span>@username to mention</span>
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>#hashtag to tag</span>
                </span>
              </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="relative">
                    {attachment.type === 'image' && (
                      <div className="relative inline-block">
                        <img
                          src={attachment.url}
                          alt="Upload"
                          className={`max-w-full h-32 rounded-lg object-cover ${attachment.uploading ? 'opacity-60' : ''}`}
                        />
                        {attachment.uploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-white mb-2" />
                            <div className="w-3/4 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${attachment.uploadProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-white text-xs mt-1">{attachment.uploadProgress || 0}%</span>
                          </div>
                        )}
                        {attachment.uploadFailed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                            <span className="text-red-500 text-xs font-semibold">Upload Failed</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {attachment.type === 'video' && (
                      <div className="relative inline-flex justify-center bg-black rounded-lg">
                        <video
                          src={attachment.url}
                          controls
                          controlsList="nodownload"
                          className={`rounded-lg max-h-48 object-contain ${attachment.uploading ? 'opacity-60' : ''}`}
                          style={{ aspectRatio: 'auto' }}
                        >
                          Your browser does not support the video tag.
                        </video>
                        {attachment.uploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-lg">
                            <Loader2 className="w-6 h-6 animate-spin text-white mb-2" />
                            <div className="w-3/4 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${attachment.uploadProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-white text-xs mt-1">{attachment.uploadProgress || 0}%</span>
                          </div>
                        )}
                        {attachment.uploadFailed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20 rounded-lg">
                            <span className="text-red-500 text-xs font-semibold">Upload Failed</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full z-10"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {attachment.type === 'music' && attachment.item && (
                      <Card className="border-border/30 bg-muted/30">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img
                                src={
                                  attachment.item.ipfsImageHash || attachment.item.ipfsArtworkHash
                                    ? `https://ipfs.io/ipfs/${attachment.item.ipfsImageHash || attachment.item.ipfsArtworkHash}`
                                    : attachment.item.cover || attachment.item.imageUrl || '/assets/default-cover.jpg'
                                }
                                alt={attachment.item.title}
                                className="w-12 h-12 rounded-md object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const hash = attachment.item.ipfsImageHash || attachment.item.ipfsArtworkHash;
                                  if (target.src.includes('ipfs.io') && hash) {
                                    target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                                  } else if (target.src.includes('gateway.pinata.cloud') && hash) {
                                    target.src = `https://cloudflare-ipfs.com/ipfs/${hash}`;
                                  } else {
                                    target.src = '/assets/default-cover.jpg';
                                  }
                                }}
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                {attachment.musicType === 'single' && <Music2 className="w-3 h-3 text-primary" />}
                                {attachment.musicType === 'playlist' && <ListMusic className="w-3 h-3 text-primary" />}
                                {attachment.musicType === 'album' && <Disc className="w-3 h-3 text-primary" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold text-sm truncate">{attachment.item.title}</h4>
                                {attachment.item.isNFT && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 text-purple-600 border-purple-600">
                                    NFT #{attachment.item.tokenId}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  {attachment.musicType === 'single' && 'Single'}
                                  {attachment.musicType === 'playlist' && 'Playlist'}
                                  {attachment.musicType === 'album' && 'Album'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {attachment.musicType === 'single' && (attachment.item.artist || 'Unknown Artist')}
                                {attachment.musicType === 'playlist' && `by ${attachment.item.creator || 'You'}`}
                                {attachment.musicType === 'album' && (attachment.item.artist || 'Unknown Artist')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.musicType === 'single' && attachment.item.duration && `${Math.floor(attachment.item.duration / 60)}:${String(Math.floor(attachment.item.duration % 60)).padStart(2, '0')}`}
                                {attachment.musicType === 'playlist' && `${attachment.item.trackCount || 0} tracks`}
                                {attachment.musicType === 'album' && `${attachment.item.trackCount || 0} tracks • ${attachment.item.year || 'N/A'}`}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-8 h-8 p-0 rounded-full"
                            >
                              <Play className="w-4 h-4 ml-0.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="w-6 h-6 p-0 rounded-full"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Music Selection Modal */}
            {isRecording && (
              <div className="mt-3 p-4 border border-border/50 rounded-lg bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-sm">Share music content</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsRecording(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Tabs value={musicType} onValueChange={(value: any) => setMusicType(value)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="single" className="flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      Single
                    </TabsTrigger>
                    <TabsTrigger value="playlist" className="flex items-center gap-1">
                      <ListMusic className="w-3 h-3" />
                      Playlist
                    </TabsTrigger>
                    <TabsTrigger value="album" className="flex items-center gap-1">
                      <Disc className="w-3 h-3" />
                      Album
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="single" className="mt-3">
                    {isLoadingSongs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">Loading your music...</span>
                      </div>
                    ) : songsError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Failed to load your music</p>
                        <p className="text-xs text-red-500 mt-1">{songsError}</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                          Retry
                        </Button>
                      </div>
                    ) : mySongs && mySongs.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {mySongs.map((track: any) => {
                          const formatDuration = (seconds: number) => {
                            const mins = Math.floor(seconds / 60);
                            const secs = seconds % 60;
                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                          };
                          
                          return (
                            <div
                              key={track.tokenId}
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => {
                                handleMusicSelect(track, 'single');
                                setIsRecording(false);
                              }}
                            >
                              <img
                                src={(() => {
                                  // Clean IPFS hash
                                  const hash = track.ipfsArtworkHash?.replace?.('ipfs://', '') || '';
                                  const url = hash 
                                    ? `https://ipfs.io/ipfs/${hash}` 
                                    : track.imageUrl || '/assets/default-cover.jpg';
                                  console.log('🖼️ [PostComposer] Song image:', { 
                                    title: track.title, 
                                    ipfsArtworkHash: track.ipfsArtworkHash,
                                    cleanHash: hash,
                                    url 
                                  });
                                  return url;
                                })()}
                                alt={track.title || 'Music'}
                                className="w-10 h-10 rounded object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  console.error('❌ Failed to load image:', target.src);
                                  if (target.src.includes('ipfs.io') && track.ipfsArtworkHash) {
                                    const hash = track.ipfsArtworkHash.replace('ipfs://', '');
                                    target.src = `https://gateway.pinata.cloud/ipfs/${hash}`;
                                    console.log('🔄 Trying Pinata gateway');
                                  } else if (target.src.includes('gateway.pinata.cloud') && track.ipfsArtworkHash) {
                                    const hash = track.ipfsArtworkHash.replace('ipfs://', '');
                                    target.src = `https://cloudflare-ipfs.com/ipfs/${hash}`;
                                    console.log('🔄 Trying Cloudflare gateway');
                                  } else {
                                    target.src = '/assets/default-cover.jpg';
                                    console.log('📷 Using default cover');
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{track.title || 'Untitled'}</p>
                                <p className="text-xs text-muted-foreground truncate">{track.artist || 'Unknown Artist'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs px-1 py-0">
                                    {track.genre || 'Music'}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">{formatDuration(track.duration)}</span>
                                </div>
                              </div>
                              <Play className="w-4 h-4 text-muted-foreground" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Music2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No songs found</p>
                        <p className="text-xs text-muted-foreground mt-1">Create some music NFTs to share!</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="playlist" className="mt-3">
                    {isLoadingNFTs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">Loading your playlists...</span>
                      </div>
                    ) : nftError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Failed to load your playlists</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                          Retry
                        </Button>
                      </div>
                    ) : ownedNFTs?.playlists?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {ownedNFTs.playlists.map((playlist: any) => (
                          <div
                            key={playlist.tokenId}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              handleMusicSelect(playlist, 'playlist');
                              setIsRecording(false);
                            }}
                          >
                            <img
                              src={playlist.metadata?.image || '/assets/default-cover.jpg'}
                              alt={playlist.metadata?.title || 'NFT Playlist'}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{playlist.metadata?.title || 'Untitled Playlist'}</p>
                              <p className="text-xs text-muted-foreground truncate">by {playlist.metadata?.creator || 'You'}</p>
                              <p className="text-xs text-muted-foreground truncate">{playlist.metadata?.description || 'Your playlist'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground">{playlist.metadata?.trackCount || 0} tracks</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{playlist.metadata?.duration || 'N/A'}</span>
                              </div>
                            </div>
                            <ListMusic className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ListMusic className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No owned playlists found</p>
                        <p className="text-xs text-muted-foreground mt-1">Create playlists to share!</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="album" className="mt-3">
                    {isLoadingNFTs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span className="ml-2 text-sm text-muted-foreground">Loading your albums...</span>
                      </div>
                    ) : nftError ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Failed to load your albums</p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
                          Retry
                        </Button>
                      </div>
                    ) : ownedNFTs?.albums?.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {ownedNFTs.albums.map((album: any) => (
                          <div
                            key={album.tokenId}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              handleMusicSelect(album, 'album');
                              setIsRecording(false);
                            }}
                          >
                            <img
                              src={album.metadata?.image || '/assets/default-cover.jpg'}
                              alt={album.metadata?.title || 'NFT Album'}
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{album.metadata?.title || 'Untitled Album'}</p>
                              <p className="text-xs text-muted-foreground truncate">{album.metadata?.artist || 'Unknown Artist'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {album.metadata?.genre || 'Music'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{album.metadata?.year || 'N/A'}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">{album.metadata?.trackCount || 0} tracks</span>
                              </div>
                            </div>
                            <Disc className="w-4 h-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Disc className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">No owned albums found</p>
                        <p className="text-xs text-muted-foreground mt-1">Create albums to share!</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="mt-3 border border-border/50 rounded-lg bg-background overflow-hidden max-h-80 emoji-picker-container">
                <style dangerouslySetInnerHTML={{
                  __html: `
                    .emoji-picker-container .epr-body::-webkit-scrollbar {
                      width: 6px;
                    }
                    .emoji-picker-container .epr-body::-webkit-scrollbar-track {
                      background: transparent;
                    }
                    .emoji-picker-container .epr-body::-webkit-scrollbar-thumb {
                      background: hsl(var(--muted-foreground) / 0.3);
                      border-radius: 3px;
                    }
                    .emoji-picker-container .epr-body::-webkit-scrollbar-thumb:hover {
                      background: hsl(var(--muted-foreground) / 0.5);
                    }
                  `
                }} />
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  width="100%"
                  height={320}
                  theme={"auto" as any}
                  searchPlaceHolder="Search emoji..."
                  previewConfig={{
                    showPreview: false
                  }}
                  skinTonesDisabled
                  emojiStyle={"native" as any}
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isPosting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  disabled={isPosting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('📷 Image button clicked, refs:', {
                      fileInputRef: !!fileInputRef.current,
                      isPosting
                    });
                    if (fileInputRef.current) {
                      fileInputRef.current.click();
                    } else {
                      console.error('❌ File input ref not available');
                    }
                  }}
                  title="Upload image or video"
                >
                  <Image className="w-4 h-4" />
                  <Video className="w-3 h-3 ml-0.5" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  disabled={isPosting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('😊 Emoji button clicked');
                    setShowEmojiPicker(!showEmojiPicker);
                  }}
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  disabled={isPosting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('@ Mention button clicked');
                    handleMention();
                  }}
                  title="Mention user (@)"
                >
                  <AtSign className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  disabled={isPosting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('# Hashtag button clicked');
                    handleHashtag();
                  }}
                  title="Add hashtag (#)"
                >
                  <Hash className="w-4 h-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary disabled:opacity-50"
                  disabled={isPosting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎵 Music button clicked');
                    setIsRecording(!isRecording);
                  }}
                  title="Share music"
                >
                  <Music className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {uploadProgress && (
                  <span className="text-xs text-muted-foreground">
                    {uploadProgress}
                  </span>
                )}
                {!uploadProgress && (
                  <span className={`text-xs ${content.length > 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {content.length}/280
                  </span>
                )}
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🖱️ Post button clicked:', {
                      canPost,
                      isAccountReady,
                      smartAccountAddress: !!smartAccountAddress,
                      contentLength: content.length,
                      attachmentsCount: attachments.length
                    });
                    handleSubmit();
                  }}
                  disabled={
                    !canPost || 
                    content.length > 280 || 
                    !isAccountReady || 
                    isPosting || 
                    attachments.some(att => att.uploading) ||
                    attachments.some(att => att.uploadFailed)
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    attachments.some(att => att.uploading)
                      ? 'Waiting for uploads to complete...'
                      : attachments.some(att => att.uploadFailed)
                        ? 'Some uploads failed, please remove and try again'
                        : !isAccountReady 
                          ? 'Please connect your wallet first' 
                          : !canPost 
                            ? 'Add content or attachments to post' 
                            : content.length > 280 
                              ? 'Content exceeds 280 characters' 
                              : 'Post to blockchain'
                  }
                >
                  {attachments.some(att => att.uploading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isPosting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {!isAccountReady ? 'Connect Wallet' : 'Post'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostComposer;