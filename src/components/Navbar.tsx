import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Search,
  Headphones,
  Mail,
  Plus,
  User,
  Settings,
  LogOut,
  HelpCircle,
  MessageSquare,
  Music,
  ListMusic,
  Sparkles,
  Package,
  History,
  Wallet,
  Trophy
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NotificationDropdown from "@/components/NotificationDropdown";
import CreateSongModal from "@/components/CreateSongModal";
import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import ArtistUpgradeModal from "@/components/ArtistUpgradeModal";
import WalletSidebar from "@/components/WalletSidebar";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import { useSequence } from "@/contexts/SequenceContext";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useBalance } from "wagmi";
import { useOpenConnectModal } from '@0xsequence/connect';
import hibeatsLogo from "@/assets/hibeats.png";
import beatsIcon from "@/assets/beats.png";

interface NavbarProps {
  showCreateSongButton?: boolean;
}

const Navbar = ({ showCreateSongButton = true }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCreateSongModalOpen, setIsCreateSongModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isWalletSidebarOpen, setIsWalletSidebarOpen] = useState(false);
  const { isAuthenticated, userProfile, logout } = useAuth();
  const { profileData } = useCurrentUserProfile(); // Get real-time profile data
  const { smartAccountAddress } = useSequence();
  const { setOpenConnectModal } = useOpenConnectModal(); // Sequence Connect modal
  
  // Get wallet balance
  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });
  
  // Mock BXP balance for now (TODO: Implement real BXP system)
  const bxpBalance = 1250; // Mock data
  
  // Check if user is artist from real-time profile data
  const isArtist = profileData?.isArtist || false;

  const handleCreatePlaylist = () => {
    navigate('/myplaylist?create=playlist');
  };

  // Direct Sequence login - no intermediate modal
  const handleLogin = () => {
    setOpenConnectModal(true);
  };

  const navItems = [
    { path: "/feed", label: "Feed", icon: Home },
    { path: "/explore", label: "Explore", icon: Search },
    { path: "/beats", label: "Beats", icon: Headphones },
    { path: "/myplaylist", label: "My Playlist", icon: ListMusic },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6">
          <div className="flex items-center h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center">
                <img
                  src={hibeatsLogo}
                  alt="HiBeats"
                  className="h-8 w-auto"
                />
              </Link>

              {/* Navigation Menu */}
              <nav className="hidden md:flex items-center gap-6">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`transition-colors ${
                        isActive
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Center Section - Search */}
            <div className="flex-1 flex items-center justify-center mx-8">
              {/* Search Bar */}
              <div className="hidden md:flex max-w-md flex-1">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search tracks, artists, or albums..."
                    className="pl-10 pr-4 py-2 w-full rounded-full border-border/50 focus:border-primary bg-background/50"
                  />
                </div>
              </div>
            </div>

            {/* Profile & Post Button */}
            <div className="flex items-center gap-3">
              {/* Wallet Button */}
              {isAuthenticated && (
                <Button
                  variant="outline"
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border-primary/20 hover:bg-primary/10"
                  onClick={() => setIsWalletSidebarOpen(true)}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {balance ? parseFloat(balance.formatted).toFixed(2) : "0.00"} {balance?.symbol || "STT"}
                  </span>
                </Button>
              )}

              {showCreateSongButton && isAuthenticated && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                      <Plus className="w-4 h-4" />
                      Create
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsCreateSongModalOpen(true)} className="cursor-pointer">
                      <Music className="w-4 h-4 mr-2" />
                      Create Song
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreatePlaylist} className="cursor-pointer">
                      <ListMusic className="w-4 h-4 mr-2" />
                      Create Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {isAuthenticated ? (
                <>
                  <Link to="/messages" className="hidden md:block">
                    <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                      <Mail className="w-4 h-4" />
                    </Button>
                  </Link>
                  <NotificationDropdown />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="w-8 h-8 cursor-pointer">
                        <AvatarImage src={userProfile?.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="flex items-center gap-2 p-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={userProfile?.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                            {userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium">{userProfile?.name || "Username"}</p>
                            {profileData?.isVerified && <VerifiedBadge size="sm" />}
                          </div>
                          <Link 
                            to={profileData?.username ? `/profile/${profileData.username}` : "/settings"} 
                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                      
                      {/* BXP Balance */}
                      <div className="px-2 py-3 bg-primary/5 border-y border-border/30">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img 
                              src={beatsIcon} 
                              alt="BXP" 
                              className="w-5 h-5"
                            />
                            <span className="text-sm font-medium">BXP</span>
                          </div>
                          <span className="text-sm font-bold text-primary">
                            {bxpBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Show "Become Artist" for non-artists */}
                      {!isArtist && (
                        <>
                          <DropdownMenuItem 
                            onClick={() => setIsUpgradeModalOpen(true)} 
                            className="cursor-pointer text-primary font-medium"
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Become an Artist
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/dashboard">
                          <User className="w-4 h-4 mr-2" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/my-collection">
                          <Package className="w-4 h-4 mr-2" />
                          My Collection
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link to="/settings">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer">
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Feedback
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={logout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button
                  onClick={handleLogin}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border/20 lg:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
          {showCreateSongButton && isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex flex-col items-center gap-1 p-2 text-muted-foreground">
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">Create</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem onClick={() => setIsCreateSongModalOpen(true)} className="cursor-pointer">
                  <Music className="w-4 h-4 mr-2" />
                  Create Song
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCreatePlaylist} className="cursor-pointer">
                  <ListMusic className="w-4 h-4 mr-2" />
                  Create Playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Create Song Modal */}
      <CreateSongModal
        isOpen={isCreateSongModalOpen}
        onClose={() => setIsCreateSongModalOpen(false)}
      />

      {/* Create Playlist Modal - placeholder, actual usage in MyPlaylist page */}
      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
        onCreate={() => {}}
      />

      {/* Upgrade to Artist Modal */}
      <ArtistUpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          // Refresh profile or navigate to artist dashboard
          window.location.reload();
        }}
      />

      {/* Wallet Sidebar */}
      <WalletSidebar
        isOpen={isWalletSidebarOpen}
        onClose={() => setIsWalletSidebarOpen(false)}
      />
    </>
  );
};

export default Navbar;