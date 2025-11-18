import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSequence } from "@/contexts/SequenceContext";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import DataStreamStatus from "@/components/DataStreamStatus";

interface Transaction {
  txHash: string;
  type: string;
}

interface RightSidebarProps {
  recentTransactions?: Transaction[];
  showTransactions?: boolean;
  showProfile?: boolean;
  showGenres?: boolean;
}

const RightSidebar = ({ 
  recentTransactions = [], 
  showTransactions = true,
  showProfile = true,
  showGenres = true 
}: RightSidebarProps) => {
  const { userProfile } = useAuth();
  const { smartAccountAddress } = useSequence();
  const { profileData: currentUserProfile } = useCurrentUserProfile();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="hidden lg:block lg:col-span-1">
      <div className="sticky top-20 space-y-6 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-custom">
        {/* Recent Blockchain Transactions */}
        {showTransactions && recentTransactions.length > 0 && (
          <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Recent Transactions
              </h3>
              <div className="space-y-2">
                {recentTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.txHash} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span>
                        {tx.type === 'post' && '📝'}
                        {tx.type === 'comment' && '💬'}
                        {tx.type === 'like' && '❤️'}
                      </span>
                      <span className="capitalize">{tx.type}</span>
                    </div>
                    <button
                      onClick={() => window.open(`https://shannon-explorer.somnia.network/tx/${tx.txHash}`, '_blank')}
                      className="text-primary hover:text-primary/80 font-mono"
                    >
                      {tx.txHash.slice(0, 6)}...
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-2 border-t border-border/20">
                <div className="text-xs text-muted-foreground text-center">
                  All transactions are gasless via Sequence
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Profile Card */}
        {showProfile && (
          <Card className="border-border/50 bg-background/80 backdrop-blur-sm relative">
            <div className="absolute top-2 right-2">
              <DataStreamStatus />
            </div>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={userProfile?.avatar ? (userProfile.avatar.startsWith('http') ? userProfile.avatar : `https://ipfs.io/ipfs/${userProfile.avatar}`) : ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold">{userProfile?.name || 'Your Profile'}</p>
                    {currentUserProfile?.isVerified && (
                      <VerifiedBadge size="sm" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentUserProfile?.username ? `@${currentUserProfile.username}` : 
                     smartAccountAddress ? 
                       `${smartAccountAddress.slice(0, 6)}...${smartAccountAddress.slice(-4)}` : 
                       '@username'
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <span className="font-semibold">{formatNumber(currentUserProfile?.followingCount || 0)}</span>
                  <span className="text-muted-foreground ml-1">Following</span>
                </div>
                <div>
                  <span className="font-semibold">{formatNumber(currentUserProfile?.followerCount || 0)}</span>
                  <span className="text-muted-foreground ml-1">Followers</span>
                </div>
              </div>
              <Button className="w-full" size="sm" asChild>
                <Link to="/settings">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Music Genres */}
        {showGenres && (
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
        )}

        {/* Trending Songs */}
        <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <h3 className="font-clash font-semibold text-lg mb-3">Trending Songs</h3>
            <div className="space-y-3">
              {[
                { title: 'Neon Dreams', artist: 'Synthwave Collective', plays: '12.5K' },
                { title: 'Midnight Groove', artist: 'Jazz Fusion', plays: '8.9K' },
                { title: 'Urban Pulse', artist: 'Beat Masters', plays: '21.6K' },
                { title: 'Ocean Waves', artist: 'Ambient Sounds', plays: '6.3K' }
              ].map((song, index) => (
                <div key={song.title} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors">
                  <span className="text-xs font-semibold text-muted-foreground w-4">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{song.plays}</span>
                </div>
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
  );
};

export default RightSidebar;
