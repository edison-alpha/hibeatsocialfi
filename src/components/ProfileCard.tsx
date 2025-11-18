// Komponen ProfileCard yang ringan untuk digunakan di berbagai tempat
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Music, 
  Users, 
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { useProfileData } from '@/hooks/useProfileData';
import { Link } from 'react-router-dom';
import { VerifiedBadge } from '@/components/VerifiedBadge';

interface ProfileCardProps {
  userAddress: string;
  showFollowButton?: boolean;
  showStats?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userAddress,
  showFollowButton = false,
  showStats = true,
  size = 'md',
  className = ''
}) => {
  const {
    profile,
    isLoading,
    error,
    hasProfile
  } = useProfileData({
    userAddress,
    autoLoad: true,
    enableRealTime: true
  });

  // Size configurations
  const sizeConfig = {
    sm: {
      avatar: 'h-10 w-10',
      title: 'text-sm font-medium',
      subtitle: 'text-xs',
      padding: 'p-3'
    },
    md: {
      avatar: 'h-12 w-12',
      title: 'text-base font-medium',
      subtitle: 'text-sm',
      padding: 'p-4'
    },
    lg: {
      avatar: 'h-16 w-16',
      title: 'text-lg font-semibold',
      subtitle: 'text-base',
      padding: 'p-6'
    }
  };

  const config = sizeConfig[size];

  // Get avatar URL
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

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className={config.padding}>
          <div className="flex items-center space-x-3">
            <Skeleton className={`${config.avatar} rounded-full`} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={`border-red-200 ${className}`}>
        <CardContent className={config.padding}>
          <div className="flex items-center space-x-3 text-red-600">
            <User className={config.avatar.replace('h-', 'h-').replace('w-', 'w-')} />
            <div>
              <div className={config.title}>Error loading profile</div>
              <div className={`${config.subtitle} text-gray-500`}>
                {error}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No profile state
  if (!hasProfile || !profile) {
    return (
      <Card className={`border-gray-200 ${className}`}>
        <CardContent className={config.padding}>
          <div className="flex items-center space-x-3 text-gray-500">
            <User className={config.avatar.replace('h-', 'h-').replace('w-', 'w-')} />
            <div>
              <div className={config.title}>No profile</div>
              <div className={config.subtitle}>
                User hasn't created a profile
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main profile card
  return (
    <Card className={`hover:shadow-md transition-shadow ${className}`}>
      <CardContent className={config.padding}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <Avatar className={config.avatar}>
              <AvatarImage src={getAvatarUrl()} alt={getDisplayName()} />
              <AvatarFallback>
                {getDisplayName() ? getDisplayName().charAt(0).toUpperCase() : 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className={`${config.title} truncate`}>
                  {getDisplayName()}
                </h3>
                {profile.isVerified && <VerifiedBadge />}
                {profile.isArtist && (
                  <Music className="h-4 w-4 text-purple-500 flex-shrink-0" />
                )}
              </div>
              
              <div className={`${config.subtitle} text-gray-500 truncate`}>
                @{profile.username}
              </div>
              
              {showStats && (profile.followerCount !== undefined || profile.followingCount !== undefined) && (
                <div className="flex items-center space-x-4 mt-1">
                  {profile.followerCount !== undefined && (
                    <div className={`${config.subtitle} text-gray-500 flex items-center space-x-1`}>
                      <Users className="h-3 w-3" />
                      <span>{profile.followerCount}</span>
                    </div>
                  )}
                  {profile.followingCount !== undefined && (
                    <div className={`${config.subtitle} text-gray-500 flex items-center space-x-1`}>
                      <UserPlus className="h-3 w-3" />
                      <span>{profile.followingCount}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Badges */}
            <div className="flex flex-col space-y-1">
              {profile.isArtist && size !== 'sm' && (
                <Badge variant="secondary" className="text-xs">
                  Artist
                </Badge>
              )}
              {profile.reputationScore !== undefined && profile.reputationScore > 0 && size !== 'sm' && (
                <Badge variant="outline" className="text-xs">
                  Rep: {profile.reputationScore}
                </Badge>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex space-x-1">
              {showFollowButton && (
                <Button size="sm" variant="outline">
                  Follow
                </Button>
              )}
              
              <Button size="sm" variant="ghost" asChild>
                <Link to={`/profile/${userAddress}`}>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bio for larger sizes */}
        {size === 'lg' && profile.bio && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-700 line-clamp-2">
              {profile.bio}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Specialized components
export const CompactProfileCard: React.FC<{
  userAddress: string;
  className?: string;
}> = ({ userAddress, className }) => (
  <ProfileCard
    userAddress={userAddress}
    size="sm"
    showStats={false}
    className={className}
  />
);

export const DetailedProfileCard: React.FC<{
  userAddress: string;
  showFollowButton?: boolean;
  className?: string;
}> = ({ userAddress, showFollowButton = true, className }) => (
  <ProfileCard
    userAddress={userAddress}
    size="lg"
    showFollowButton={showFollowButton}
    showStats={true}
    className={className}
  />
);

export default ProfileCard;