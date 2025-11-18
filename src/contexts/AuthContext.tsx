import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useOpenConnectModal } from '@0xsequence/connect';
import { useSequence } from './SequenceContext';
import { useCurrentUserProfile } from '@/hooks/useRealTimeProfile';
import { toast } from 'sonner';

interface UserProfile {
  name: string;
  avatar: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    bandcamp: string;
    soundcloud: string;
    appleMusic: string;
    spotify: string;
    other: string;
  };
}

interface AuthContextType {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  walletAddress: string | null;
  login: () => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => Promise<void>;
  showProfileCreation: boolean;
  setShowProfileCreation: (show: boolean) => void;
  checkingProfile: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { address, isConnected } = useAccount();
  const { setOpenConnectModal } = useOpenConnectModal();
  const { disconnect } = useDisconnect();
  const { profileExists, getProfile, isAccountReady, smartAccountAddress } = useSequence();

  // Utility function untuk IPFS URL
  const getIPFSUrl = (hash: string): string => {
    if (!hash) return '';
    
    if (hash.startsWith('http')) {
      return hash;
    }
    
    if (hash.startsWith('Qm') || hash.startsWith('baf') || hash.startsWith('ipfs://')) {
      const cleanHash = hash.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${cleanHash}`;
    }
    
    return hash;
  };

  const { 
    displayName, 
    avatarUrl, 
    hasProfile, 
    loading: profileLoading,
    isRealTimeConnected 
  } = useCurrentUserProfile();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileCreation, setShowProfileCreation] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);

  const isAuthenticated = isConnected;
  const walletAddress = address;

  // Auto-enable session after login
  const _sessionSetupRef = useRef(false);
  const { createSession, isSessionActive } = useSequence();
  
  useEffect(() => {
    const setupAutoApproveSession = async () => {
      // Only run once per connection
      if (!isConnected || !isAccountReady || !smartAccountAddress) return;
      if (_sessionSetupRef.current) return;
      // 🔥 Remove check for isSessionActive - always ensure it's enabled

      _sessionSetupRef.current = true;

      try {
        console.log('🔑 Setting up auto-approve session...');
        
        // Wait a bit for wallet to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create session
        await createSession();
        
        console.log('✅ Auto-approve enabled');
        
        // No toast notification - works silently in background
      } catch (error) {
        console.warn('⚠️ Failed to setup auto-approve session:', error);
        
        // Don't block the app if session setup fails
        _sessionSetupRef.current = false; // Allow retry
      }
    };

    setupAutoApproveSession();
  }, [isConnected, isAccountReady, smartAccountAddress, createSession]);

  // Reset session setup flag when disconnected
  useEffect(() => {
    if (!isConnected) {
      _sessionSetupRef.current = false;
    }
  }, [isConnected]);

  // Check if user has profile on mount and after login
  const _checkInFlightRef = useRef(false);
  useEffect(() => {
    const checkUserProfile = async () => {
      if (!isConnected || !walletAddress || !isAccountReady || !smartAccountAddress) {
        // Reset states when not connected
        setUserProfile(null);
        setShowProfileCreation(false);
        return;
      }

      // Prevent concurrent checks
      if (_checkInFlightRef.current) return;
      _checkInFlightRef.current = true;
      setCheckingProfile(true);
      
      try {
        console.log('Checking profile for address:', smartAccountAddress);
        const exists = await profileExists(smartAccountAddress);
        console.log('Profile exists:', exists);
        
        if (exists) {
          console.log('✅ Profile exists on blockchain, fetching profile data...');
          
          try {
            // Fetch actual profile data from blockchain using getProfile function
            const blockchainProfile = await getProfile(smartAccountAddress);
            
            if (blockchainProfile) {
              console.log('📊 Profile data fetched from blockchain:', blockchainProfile);
              
              // Map blockchain profile to UI profile structure
              const uiProfile = {
                name: blockchainProfile.displayName || blockchainProfile.username || '',
                avatar: getIPFSUrl(blockchainProfile.avatarHash),
                socialLinks: {
                  instagram: '',
                  twitter: '',
                  bandcamp: '',
                  soundcloud: '',
                  appleMusic: '',
                  spotify: '',
                  other: ''
                }
              };
              
              setUserProfile(uiProfile);
              console.log('✅ Profile loaded from blockchain with IPFS avatar:', {
                name: uiProfile.name,
                avatar: uiProfile.avatar,
                isRealTime: isRealTimeConnected
              });
            } else {
              // Fallback if profile data couldn't be fetched
              console.log('⚠️ Could not fetch profile data, using real-time hook data');
              const uiProfile = {
                name: displayName,
                avatar: avatarUrl,
                socialLinks: {
                  instagram: '',
                  twitter: '',
                  bandcamp: '',
                  soundcloud: '',
                  appleMusic: '',
                  spotify: '',
                  other: ''
                }
              };
              setUserProfile(uiProfile);
            }
          } catch (error) {
            console.error('❌ Failed to fetch profile from blockchain:', error);
            // Fallback to real-time hook data
            const uiProfile = {
              name: displayName,
              avatar: avatarUrl,
              socialLinks: {
                instagram: '',
                twitter: '',
                bandcamp: '',
                soundcloud: '',
                appleMusic: '',
                spotify: '',
                other: ''
              }
            };
            setUserProfile(uiProfile);
          }
          
          setShowProfileCreation(false);
          console.log('✅ Profile found on blockchain, hiding creation modal');
          
        } else {
          // User doesn't have profile on blockchain, show profile creation modal
          console.log('❌ No profile found on blockchain, showing creation modal');
          setUserProfile(null);
          setShowProfileCreation(true);
        }
      } catch (error) {
        console.error('Failed to check profile existence:', error);
        // On error, assume no profile and show creation modal
        setUserProfile(null);
        setShowProfileCreation(true);
      } finally {
        setCheckingProfile(false);
        _checkInFlightRef.current = false;
      }
    };

    checkUserProfile();
  }, [isConnected, walletAddress, isAccountReady, smartAccountAddress, profileExists]);

  // Update UI profile when real-time profile data changes
  useEffect(() => {
    if (hasProfile && displayName) {
      const uiProfile = {
        name: displayName,
        avatar: avatarUrl,
        socialLinks: {
          instagram: '',
          twitter: '',
          bandcamp: '',
          soundcloud: '',
          appleMusic: '',
          spotify: '',
          other: ''
        }
      };
      
      setUserProfile(uiProfile);
      console.log('🔄 Profile updated from real-time data:', displayName);
    }
  }, [displayName, avatarUrl, hasProfile]);

  const login = () => {
    // Open Sequence Connect modal (embedded wallet)
    setOpenConnectModal(true);
  };

  const logout = () => {
    disconnect();
    setUserProfile(null);
    setShowProfileCreation(false);
  };

  const updateProfile = async (profile: UserProfile) => {
    console.log('✅ Updating profile:', profile);
    
    try {
      // Just update local state for now
      // Blockchain profile updates are handled through SequenceContext methods directly
      setUserProfile(profile);
      setShowProfileCreation(false);
      
      console.log('✅ Profile updated locally');
      
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      // Still update local state as fallback
      setUserProfile(profile);
      setShowProfileCreation(false);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    userProfile,
    walletAddress,
    login,
    logout,
    updateProfile,
    showProfileCreation,
    setShowProfileCreation,
    checkingProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};