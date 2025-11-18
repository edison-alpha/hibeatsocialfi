import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  Save,
  Upload,
  Globe,
  Music,
  CreditCard,
  Sparkles
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useSequence } from "@/contexts/SequenceContext";
import { useAuth } from "@/contexts/AuthContext";
import { ipfsService } from "@/services/ipfsService";
import { useToast } from "@/hooks/use-toast";
import { useAccount, usePublicClient } from 'wagmi';
import ProfileCreation from "@/components/ProfileCreation";
import BlockchainDebugPanel from "@/components/BlockchainDebugPanel";
import { CurrentUserProfile } from "@/components/ProfileDisplay";
import { useCurrentUserProfile } from "@/hooks/useProfileData";
import SettingsSkeleton from "@/components/SettingsSkeleton";
import { SessionModeToggle } from "@/components/SessionModeToggle";
import { AutoApproveToggle, SessionStatusBanner } from "@/components/AutoApproveToggle";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { subgraphService } from "@/services/subgraphService";
import ArtistUpgradeModal from "@/components/ArtistUpgradeModal";
import VerificationRenewalCard from "@/components/VerificationRenewalCard";

const Settings = () => {
  const { updateProfile, updateSocialLinks, updateMusicPreferences, profileExists, isAccountReady, smartAccountAddress, getProfile } = useSequence();
  const { userProfile, isAuthenticated, walletAddress } = useAuth();
  const { address } = useAccount();
  const { toast } = useToast();
  const { profile: currentUserProfile } = useCurrentUserProfile();
  const publicClient = usePublicClient();
  
  // Helper function to format numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Profile form state - expanded to include all fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState(""); // Banner image
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    twitter: "",
    youtube: "",
    spotify: "",
    soundcloud: "",
    bandcamp: "",
    discord: "",
    telegram: ""
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [showArtistUpgrade, setShowArtistUpgrade] = useState(false);

  // Stats state - same as UserProfile
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [nftCount, setNftCount] = useState(0);

  // Profile display state - for showing read-only info
  const [profileInfo, setProfileInfo] = useState<{
    userAddress: string;
    beatsId: number;
    username: string;
    isVerified: boolean;
    isArtist: boolean;
    reputationScore: number;
    createdAt: number;
    updatedAt: number;
  } | null>(null);

  // Load current profile data and check profile existence
  useEffect(() => {
    const loadProfileData = async () => {
      if (!isAuthenticated || !smartAccountAddress || !isAccountReady) {
        setCheckingProfile(false);
        setHasProfile(false);
        return;
      }

      setCheckingProfile(true);

      try {
        console.log('Loading profile for address:', smartAccountAddress);
        
        // Check if profile exists using SequenceContext method
        const exists = await profileExists(smartAccountAddress);
        console.log('✅ Profile exists check result:', exists);
        
        setHasProfile(exists);

        if (exists) {
          // Get profile data from blockchain using SequenceContext getProfile
          console.log('✅ Profile exists, fetching data from blockchain...');
          
          try {
            const blockchainProfile = await getProfile(smartAccountAddress);
            
            if (blockchainProfile) {
              console.log('📊 Profile data fetched from blockchain:', blockchainProfile);
              
              // Populate form dengan data dari blockchain
              setDisplayName(blockchainProfile.displayName || blockchainProfile.username || '');
              setBio(blockchainProfile.bio || '');
              setLocation(blockchainProfile.location || '');
              setWebsite(blockchainProfile.website || '');
              
              // Set avatar dari IPFS hash jika ada
              if (blockchainProfile.avatarHash) {
                const avatarUrl = blockchainProfile.avatarHash.startsWith('http') 
                  ? blockchainProfile.avatarHash 
                  : `https://ipfs.io/ipfs/${blockchainProfile.avatarHash}`;
                setAvatar(avatarUrl);
              }

              // Set banner dari IPFS hash jika ada
              if (blockchainProfile.bannerHash) {
                const bannerUrl = blockchainProfile.bannerHash.startsWith('http') 
                  ? blockchainProfile.bannerHash 
                  : `https://ipfs.io/ipfs/${blockchainProfile.bannerHash}`;
                setBanner(bannerUrl);
              }
              
              // Set social links dari blockchain
              setSocialLinks({
                instagram: blockchainProfile.socialLinks?.instagram || '',
                twitter: blockchainProfile.socialLinks?.twitter || '',
                youtube: blockchainProfile.socialLinks?.youtube || '',
                spotify: blockchainProfile.socialLinks?.spotify || '',
                soundcloud: blockchainProfile.socialLinks?.soundcloud || '',
                bandcamp: blockchainProfile.socialLinks?.bandcamp || '',
                discord: blockchainProfile.socialLinks?.discord || '',
                telegram: blockchainProfile.socialLinks?.telegram || ''
              });

              // Set music preferences dari blockchain
              setMusicPreferences({
                favoriteGenres: blockchainProfile.musicPreferences?.favoriteGenres || []
              });

              // Set read-only profile information
              setProfileInfo({
                userAddress: blockchainProfile.userAddress || smartAccountAddress || '',
                beatsId: Number(blockchainProfile.beatsId) || 0,
                username: blockchainProfile.username || '',
                isVerified: Boolean(blockchainProfile.isVerified),
                isArtist: Boolean(blockchainProfile.isArtist),
                reputationScore: Number(blockchainProfile.reputationScore) || 0,
                createdAt: Number(blockchainProfile.createdAt) || Date.now(),
                updatedAt: Number(blockchainProfile.updatedAt) || Date.now()
              });
              
              console.log('✅ Form populated with blockchain data');
            } else {
              console.log('⚠️ No blockchain profile data, using AuthContext fallback');
              
              // Fallback ke AuthContext data
              if (userProfile) {
                setDisplayName(userProfile.name || '');
                setAvatar(userProfile.avatar || '');
                
                setSocialLinks({
                  instagram: userProfile.socialLinks?.instagram || '',
                  twitter: userProfile.socialLinks?.twitter || '',
                  youtube: '',
                  spotify: userProfile.socialLinks?.spotify || '',
                  soundcloud: userProfile.socialLinks?.soundcloud || '',
                  bandcamp: userProfile.socialLinks?.bandcamp || '',
                  discord: '',
                  telegram: ''
                });

                // Set default music preferences
                setMusicPreferences({
                  favoriteGenres: []
                });
              }
            }
          } catch (profileError) {
            console.error('❌ Error fetching blockchain profile:', profileError);
            
            // Fallback ke AuthContext
            if (userProfile) {
              console.log('📋 Using AuthContext fallback data');
              setDisplayName(userProfile.name || '');
              setAvatar(userProfile.avatar || '');
              
              setSocialLinks({
                instagram: userProfile.socialLinks?.instagram || '',
                twitter: userProfile.socialLinks?.twitter || '',
                youtube: '',
                spotify: userProfile.socialLinks?.spotify || '',
                soundcloud: userProfile.socialLinks?.soundcloud || '',
                bandcamp: userProfile.socialLinks?.bandcamp || '',
                discord: '',
                telegram: ''
              });

              // Set default music preferences
              setMusicPreferences({
                favoriteGenres: []
              });

              // Set basic profile info from AuthContext
              setProfileInfo({
                userAddress: smartAccountAddress || '',
                beatsId: 0,
                username: (userProfile as any).username || address?.slice(0, 8) || '',
                isVerified: false,
                isArtist: false,
                reputationScore: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
              });
            }
          }

          setShowProfileCreation(false);
        } else {
          console.log('No profile found, showing creation modal');
          setShowProfileCreation(true);
          toast({
            title: "Profile Required",
            description: "You need to create a profile first before accessing settings.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        setHasProfile(false);
        setShowProfileCreation(true);
      } finally {
        setCheckingProfile(false);
      }
    };

    loadProfileData();
  }, [isAuthenticated, smartAccountAddress, isAccountReady, userProfile, walletAddress, profileExists, toast]);

  // Fetch stats - same as UserProfile
  useEffect(() => {
    const fetchStats = async () => {
      if (!smartAccountAddress || !publicClient) return;

      try {
        console.log('📊 [Settings] Fetching stats for user:', smartAccountAddress);

        // ✅ Get follower/following counts from DataStream V3
        try {
          const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
          
          const followerCountResult = await somniaDatastreamServiceV3.getFollowerCount(smartAccountAddress);
          const followingCountResult = await somniaDatastreamServiceV3.getFollowingCount(smartAccountAddress);

          setFollowerCount(followerCountResult);
          setFollowingCount(followingCountResult);
          console.log(`✅ [Settings V3] Follower: ${followerCountResult}, Following: ${followingCountResult}`);
        } catch (error) {
          console.warn('⚠️ [Settings] Could not fetch follower/following counts from DataStream:', error);
        }

        // ✅ Get post count from DataStream V3
        try {
          console.log('📊 [Settings] Fetching post count from DataStream...');
          const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
          
          // Load all posts from DataStream
          const allPosts = await somniaDatastreamServiceV3.getAllPosts();
          
          // Count posts by this user (excluding deleted posts)
          const userPostCount = allPosts.filter(post => 
            post.author.toLowerCase() === smartAccountAddress.toLowerCase() && !post.isDeleted
          ).length;
          
          setPostCount(userPostCount);
          console.log(`✅ [Settings] User has ${userPostCount} posts`);
        } catch (error) {
          console.warn('⚠️ [Settings] Could not fetch post count:', error);
        }

        // ✅ Get NFT count from Subgraph
        try {
          console.log('🎨 [Settings] Fetching NFT count for user:', smartAccountAddress);
          
          // Get owned songs/music NFTs
          const ownedSongs = await subgraphService.getUserOwnedSongs(smartAccountAddress, 1000, 0);
          const totalNFTs = ownedSongs.length;
          
          setNftCount(totalNFTs);
          console.log(`✅ [Settings] User owns ${totalNFTs} NFTs (songs)`);
        } catch (error) {
          console.warn('⚠️ [Settings] Could not fetch NFT count:', error);
        }

      } catch (error) {
        console.error('❌ [Settings] Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [smartAccountAddress, publicClient]);

  const handleProfileSave = async (profileData: any) => {
    console.log('Profile saved, updating settings form:', profileData);
    
    // Update form fields with new profile data
    setDisplayName(profileData.name || '');
    setAvatar(profileData.avatar || '');
    
    // Update social links
    setSocialLinks(prev => ({
      ...prev,
      instagram: profileData.socialLinks?.instagram || '',
      twitter: profileData.socialLinks?.twitter || '',
      spotify: profileData.socialLinks?.spotify || '',
      soundcloud: profileData.socialLinks?.soundcloud || '',
      bandcamp: profileData.socialLinks?.bandcamp || '',
    }));

    // Close modal
    setShowProfileCreation(false);
    
    // ✅ PENTING: Clear cache dan re-check profile existence dari contract
    if (smartAccountAddress) {
      try {
        // Clear profile cache
        const { profileService } = await import('../services/profileService');
        profileService.clearProfileCache(smartAccountAddress);
        
        // Wait a bit for transaction to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Re-check profile existence from contract
        const exists = await profileExists(smartAccountAddress);
        console.log('✅ Profile re-checked after creation:', exists);
        
        setHasProfile(exists);
        
        if (exists) {
          toast({
            title: "Profile Created!",
            description: "Your profile has been created successfully.",
          });
        } else {
          console.warn('⚠️ Profile creation pending confirmation...');
          toast({
            title: "Profile Pending",
            description: "Your profile is being created. Please wait...",
          });
        }
      } catch (error) {
        console.error('Failed to verify profile creation:', error);
        setHasProfile(true); // Fallback to true if check fails
      }
    }
    
    setCheckingProfile(false);
  };

  const handleProfileBack = () => {
    setShowProfileCreation(false);
  };

  // Music preferences state
  const [musicPreferences, setMusicPreferences] = useState({
    favoriteGenres: [] as string[]
  });

  const handleSaveProfile = async () => {
    if (!isAccountReady || !smartAccountAddress) {
      toast({
        title: "Wallet Not Ready",
        description: "Please wait for your wallet to initialize before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      console.log('Saving profile updates...');

      // Upload banner to IPFS if provided
      let bannerHash = "";
      if (banner && banner.startsWith('data:')) {
        const response = await fetch(banner);
        const blob = await response.blob();
        const file = new File([blob], 'banner.jpg', { type: 'image/jpeg' });

        const uploadResult = await ipfsService.uploadFile(file);
        bannerHash = uploadResult.IpfsHash;
        console.log('Banner uploaded to IPFS:', bannerHash);
      }

      // Upload avatar to IPFS if provided
      let avatarHash = "";
      if (avatar && avatar.startsWith('data:')) {
        const response = await fetch(avatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

        const uploadResult = await ipfsService.uploadFile(file);
        avatarHash = uploadResult.IpfsHash;
        console.log('Avatar uploaded to IPFS:', avatarHash);
      }

      // Update profile on blockchain
      console.log('Updating profile on blockchain...');
      const txHash = await updateProfile(
        displayName.trim(),
        bio.trim(),
        avatarHash,
        bannerHash,
        location.trim(),
        website.trim()
      );

      // Update social links if any are provided
      const hasSocialLinks = Object.values(socialLinks).some(link => link.trim());
      if (hasSocialLinks) {
        console.log('Updating social links:', Object.entries(socialLinks).filter(([_, value]) => value.trim()));
        try {
          await updateSocialLinks(
            socialLinks.instagram,
            socialLinks.twitter,
            socialLinks.youtube,
            socialLinks.spotify,
            socialLinks.soundcloud,
            socialLinks.bandcamp,
            socialLinks.discord,
            socialLinks.telegram
          );
        } catch (socialError: any) {
          console.error('Social links update failed, but continuing with other updates:', socialError);
          // Don't throw here - allow other updates to continue
          // We'll show a warning to the user after all updates complete
          toast({
            title: "Social Links Update Failed",
            description: "Your social links couldn't be updated. Other changes were saved successfully.",
            variant: "destructive",
          });
        }
      } else {
        console.log('No social links to update - all fields are empty');
      }

      // Update music preferences if any are selected
      if (musicPreferences.favoriteGenres.length > 0) {
        console.log('Updating music preferences...');
        await updateMusicPreferences(musicPreferences.favoriteGenres);
      }

    } catch (error: any) {
      console.error('Failed to update profile:', error);

      // Provide specific error messages based on error type
      let errorTitle = "Profile Update Failed";
      let errorDescription = "An error occurred while updating your profile.";

      if (error?.message?.includes('opening wallet timed out')) {
        errorTitle = "Wallet Timeout";
        errorDescription = "Your wallet took too long to respond. Please try again.";
      } else if (error?.message?.includes('User rejected')) {
        errorTitle = "Transaction Rejected";
        errorDescription = "The transaction was rejected by your wallet.";
      } else if (error?.message?.includes('insufficient funds')) {
        errorTitle = "Insufficient Funds";
        errorDescription = "You don't have enough funds for this transaction.";
      } else if (error?.message) {
        errorDescription = error.message;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSocialLink = (platform: keyof typeof socialLinks, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  // Removed unused functions - handlePrivacyChange and handleNotificationChange

  const toggleGenre = (genre: string) => {
    setMusicPreferences(prev => ({
      ...prev,
      favoriteGenres: prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre]
    }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBanner(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Session Status Banner - Shows when auto-approve is active */}
      <SessionStatusBanner />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-clash font-semibold text-4xl mb-2">Settings</h1>
            <p className="text-muted-foreground text-lg">Manage your account and preferences</p>
          </div>

          {/* Loading skeleton while checking profile */}
          {checkingProfile ? (
            <SettingsSkeleton />
          ) : hasProfile === false ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-2">Profile Required</h2>
                  <p className="text-muted-foreground mb-4">You need to create a profile first before accessing settings.</p>
                  <Button onClick={() => setShowProfileCreation(true)}>
                    Create Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Profile Header - iOS/OpenSea Style */}
              <div className="relative">
                {/* Banner */}
                <div className="h-48 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-2xl overflow-hidden relative">
                  {banner ? (
                    <img
                      src={banner}
                      alt="Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-purple-500 via-pink-500 to-red-500"></div>
                  )}
                  <div className="absolute inset-0 bg-black/20"></div>

                  {/* Banner Upload Overlay */}
                  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/40 flex items-center justify-center rounded-2xl">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      id="banner-upload"
                    />
                    <Label
                      htmlFor="banner-upload"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl cursor-pointer transition-colors text-white font-medium"
                    >
                      <Upload className="w-5 h-5" />
                      Change Banner
                    </Label>
                  </div>
                </div>

                {/* Profile Picture & Basic Info */}
                <div className="relative -mt-16 px-6">
                  <div className="flex items-end gap-6">
                    <div className="relative">
                      <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white font-bold text-3xl">
                          {displayName.charAt(0).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Avatar Upload */}
                      <div className="absolute -bottom-2 -right-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <Label
                          htmlFor="avatar-upload"
                          className="inline-flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 rounded-full cursor-pointer transition-colors shadow-lg"
                        >
                          <Upload className="w-4 h-4 text-primary-foreground" />
                        </Label>
                      </div>
                    </div>

                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold">{displayName || 'Your Name'}</h1>
                        {profileInfo?.isVerified && <VerifiedBadge size="lg" />}
                        {profileInfo?.isArtist && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            🎵 Artist
                          </Badge>
                        )}
                        {/* Upgrade to Artist Button - Only show if not already an artist */}
                        {profileInfo && !profileInfo.isArtist && (
                          <Button
                            size="sm"
                            className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90"
                            onClick={() => setShowArtistUpgrade(true)}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Become Artist
                          </Button>
                        )}
                      </div>
                      <p className="text-muted-foreground text-lg">@{profileInfo?.username || 'username'}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        {profileInfo?.beatsId && profileInfo.beatsId > 0 && (
                          <span className="font-mono bg-primary/10 px-2 py-0.5 rounded">
                            BID: {profileInfo.beatsId}
                          </span>
                        )}
                        <span>📍 {location || 'Location not set'}</span>
                        <span>⭐ {profileInfo?.reputationScore || 0} reputation</span>
                        <span>📅 Joined {profileInfo ? new Date(profileInfo.createdAt).toLocaleDateString() : 'Recently'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Stats Cards */}
              {profileInfo && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-primary">{formatNumber(followerCount)}</div>
                    <div className="text-sm text-muted-foreground">Followers</div>
                  </div>
                  <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-primary">{formatNumber(followingCount)}</div>
                    <div className="text-sm text-muted-foreground">Following</div>
                  </div>
                  <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-primary">{formatNumber(postCount)}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-primary">{formatNumber(nftCount)}</div>
                    <div className="text-sm text-muted-foreground">NFTs</div>
                  </div>
                </div>
              )}

              {/* Settings Sections */}
              <div className="space-y-6">
                {/* Verification Renewal Card - Show for artists */}
                {profileInfo?.isArtist && (
                  <VerificationRenewalCard
                    userAddress={smartAccountAddress || ''}
                    isVerified={profileInfo.isVerified}
                    isArtist={profileInfo.isArtist}
                    onRenewalSuccess={async () => {
                      // Refresh profile data after renewal
                      if (smartAccountAddress) {
                        const { profileService } = await import('../services/profileService');
                        profileService.clearProfileCache(smartAccountAddress);
                        
                        // Wait for transaction to confirm
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        
                        // Reload page to refresh all data
                        window.location.reload();
                      }
                    }}
                  />
                )}

                {/* Session Mode Toggle - NEW: Auto-approve like Farcaster/Lens */}
                <SessionModeToggle />

                {/* Basic Information */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-semibold">Basic Information</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Display Name</Label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        className="rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Location</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="rounded-xl h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mt-6">
                    <Label className="text-sm font-medium">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="min-h-[100px] rounded-xl resize-none"
                    />
                  </div>

                  <div className="space-y-2 mt-6">
                    <Label className="text-sm font-medium">Website</Label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourwebsite.com"
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <Globe className="w-5 h-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Social Links</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: 'instagram.com/you' },
                      { key: 'twitter', label: 'Twitter', icon: '🐦', placeholder: 'x.com/you' },
                      { key: 'spotify', label: 'Spotify', icon: '🎵', placeholder: 'open.spotify.com/artist/you' },
                      { key: 'soundcloud', label: 'SoundCloud', icon: '☁️', placeholder: 'soundcloud.com/you' },
                      { key: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'youtube.com/@you' },
                      { key: 'bandcamp', label: 'Bandcamp', icon: '🎸', placeholder: 'you.bandcamp.com' },
                      { key: 'discord', label: 'Discord', icon: '💬', placeholder: 'username#1234' },
                      { key: 'telegram', label: 'Telegram', icon: '✈️', placeholder: '@username' }
                    ].map(({ key, label, icon, placeholder }) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span>{icon}</span>
                          {label}
                        </Label>
                        <Input
                          value={socialLinks[key as keyof typeof socialLinks]}
                          onChange={(e) => updateSocialLink(key as keyof typeof socialLinks, e.target.value)}
                          placeholder={placeholder}
                          className="rounded-xl h-12"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Music Preferences */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <Music className="w-5 h-5 text-green-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Music Preferences</h2>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-medium">Favorite Genres</Label>
                    <div className="flex flex-wrap gap-3">
                      {["Electronic", "Hip Hop", "Jazz", "Ambient", "Rock", "Pop", "R&B", "Classical", "Folk", "Reggae"].map((genre) => {
                        const isSelected = musicPreferences.favoriteGenres.includes(genre);
                        return (
                          <Badge
                            key={genre}
                            variant={isSelected ? "default" : "outline"}
                            className={`px-4 py-2 rounded-full cursor-pointer transition-colors text-sm ${
                              isSelected 
                                ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                                : "hover:bg-primary hover:text-primary-foreground"
                            }`}
                            onClick={() => toggleGenre(genre)}
                          >
                            {genre}
                          </Badge>
                        );
                      })}
                    </div>
                    {musicPreferences.favoriteGenres.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {musicPreferences.favoriteGenres.join(", ")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-orange-500" />
                    </div>
                    <h2 className="text-xl font-semibold">Account Information</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <Label className="text-sm font-medium text-muted-foreground">Beats ID (BID)</Label>
                        <p className="font-mono text-2xl font-bold text-primary mt-1">
                          {profileInfo?.beatsId && profileInfo.beatsId > 0 ? profileInfo.beatsId : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Your unique identifier</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <Label className="text-sm font-medium text-muted-foreground">Wallet Address</Label>
                        <p className="font-mono text-xs break-all mt-1">{profileInfo?.userAddress}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/30 rounded-xl text-center">
                        <div className="text-lg font-semibold">{profileInfo?.isVerified ? 'Verified' : 'Unverified'}</div>
                        <div className="text-sm text-muted-foreground">Status</div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl text-center">
                        <div className="text-lg font-semibold">{profileInfo?.isArtist ? 'Artist' : 'User'}</div>
                        <div className="text-sm text-muted-foreground">Role</div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl text-center">
                        <div className="text-lg font-semibold">{profileInfo?.reputationScore}</div>
                        <div className="text-sm text-muted-foreground">Reputation</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-center pt-6">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!isAccountReady || isUpdating}
                    size="lg"
                    className="px-12 py-3 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    {isUpdating ? "Updating Profile..." : !isAccountReady ? "Initializing..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Profile Creation Modal */}
      <ProfileCreation
        isOpen={showProfileCreation}
        onClose={() => setShowProfileCreation(false)}
        onSave={handleProfileSave}
        onBack={handleProfileBack}
      />

      {/* Artist Upgrade Modal */}
      <ArtistUpgradeModal
        isOpen={showArtistUpgrade}
        onClose={() => setShowArtistUpgrade(false)}
        onSuccess={async () => {
          // Refresh profile data after upgrade
          if (smartAccountAddress) {
            const { profileService } = await import('../services/profileService');
            profileService.clearProfileCache(smartAccountAddress);
            
            // Wait for transaction to confirm
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Reload page to refresh all data
            window.location.reload();
          }
        }}
      />
    </div>
  );
};

export default Settings;