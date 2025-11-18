// Komponen untuk menampilkan profile data dengan real-time updates
import React, { useState } from 'react';
import { useProfileData, useCurrentUserProfile } from '@/hooks/useProfileData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  MapPin, 
  Calendar, 
  Users, 
  UserPlus, 
  Star, 
  RefreshCw,
  Music
} from 'lucide-react';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface ProfileDisplayProps {
  userAddress?: string;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProfileDisplay: React.FC<ProfileDisplayProps> = ({
  userAddress,
  showActions = true,
  compact = false,
  className = ''
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    profile,
    isLoading,
    error,
    hasProfile,
    refetch,
    clearCache
  } = useProfileData({
    userAddress,
    autoLoad: true,
    enableRealTime: true
  });

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle clear cache
  const handleClearCache = () => {
    clearCache();
    handleRefresh();
  };

  // Get avatar URL with fallback
  const getAvatarUrl = () => {
    if (!profile?.avatarHash) return '';
    
    if (profile.avatarHash.startsWith('http')) {
      return profile.avatarHash;
    }
    
    if (profile.avatarHash.startsWith('Qm') || 
        profile.avatarHash.startsWith('baf') || 
        profile.avatarHash.startsWith('ipfs://')) {
      const hash = profile.avatarHash.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }
    
    return profile.avatarHash;
  };

  // Get display name - hanya dari blockchain data
  const getDisplayName = () => {
    if (!profile) return '';
    return profile.displayName || profile.username || '';
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </CardHeader>
        {!compact && (
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Error loading profile</p>
            <p className="text-xs text-gray-500 mt-1">{error}</p>
            {showActions && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="mt-2"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // No profile state
  if (!hasProfile || !profile) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No profile found</p>
            <p className="text-xs mt-1">This user hasn't created a profile yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact view
  if (compact) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <Avatar className="h-10 w-10">
          <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
          <AvatarFallback>
            {getDisplayName() ? getDisplayName().charAt(0).toUpperCase() : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium truncate">
              {getDisplayName()}
            </p>
            {profile.isVerified && <VerifiedBadge />}
            {profile.isArtist && (
              <Music className="h-4 w-4 text-purple-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">
            @{profile.username}
          </p>
        </div>
      </div>
    );
  }

  // Full profile view
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
              <AvatarFallback className="text-lg">
                {getDisplayName().charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-xl">
                  {getDisplayName()}
                </CardTitle>
                {profile.isVerified && <VerifiedBadge size="lg" />}
              </div>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              <div className="flex items-center space-x-2">
                {profile.isArtist && (
                  <Badge variant="secondary" className="text-xs">
                    <Music className="h-3 w-3 mr-1" />
                    Artist
                  </Badge>
                )}
                {profile.reputationScore && profile.reputationScore > 1000 && (
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {profile.reputationScore}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {showActions && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bio */}
        {profile.bio && (
          <div>
            <p className="text-sm text-gray-700">{profile.bio}</p>
          </div>
        )}

        {/* Website */}
        {profile.website && (
          <div>
            <a 
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {profile.website}
            </a>
          </div>
        )}

        {/* Social Links */}
        {profile.socialLinks && Object.values(profile.socialLinks).some(link => link) && (
          <div className="flex flex-wrap gap-2">
            {profile.socialLinks.instagram && (
              <a 
                href={`https://instagram.com/${profile.socialLinks.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded"
              >
                Instagram
              </a>
            )}
            {profile.socialLinks.twitter && (
              <a 
                href={`https://twitter.com/${profile.socialLinks.twitter}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
              >
                Twitter
              </a>
            )}
            {profile.socialLinks.spotify && (
              <a 
                href={profile.socialLinks.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
              >
                Spotify
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          {profile.followerCount !== undefined && (
            <div className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>{profile.followerCount} followers</span>
            </div>
          )}
          {profile.followingCount !== undefined && (
            <div className="flex items-center space-x-1">
              <UserPlus className="h-4 w-4" />
              <span>{profile.followingCount} following</span>
            </div>
          )}
        </div>

        {/* Location and Join Date */}
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          {profile.location && (
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{profile.location}</span>
            </div>
          )}
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>Joined {formatDate(profile.createdAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Komponen khusus untuk current user
export const CurrentUserProfile: React.FC<{
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}> = ({ showActions = true, compact = false, className = '' }) => {
  const { profile, isLoading, error } = useCurrentUserProfile();

  if (!profile && !isLoading && !error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">Create your profile to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ProfileDisplay
      userAddress={profile?.userAddress}
      showActions={showActions}
      compact={compact}
      className={className}
    />
  );
};

export default ProfileDisplay;