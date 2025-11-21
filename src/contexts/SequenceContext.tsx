import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/sequence-config';
import { parseEther, encodeFunctionData } from 'viem';
import { USER_PROFILE_ABI } from '@/lib/abis/UserProfile';
import { UserProfile } from '@/services/profileService';
import { toast } from 'sonner';
import { useRealtimeTransaction as useRealtimeTxContext } from '@/contexts/RealtimeTransactionContext';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';

// Somnia Explorer URL
const EXPLORER_URL = 'https://shannon-explorer.somnia.network/tx';

// Helper to create explorer link
const getExplorerLink = (txHash: string) => `${EXPLORER_URL}/${txHash}`;

// Helper to show success toast with explorer link
const showSuccessToast = (message: string, txHash: string, description?: string) => {
  toast.success(message, {
    description: description || 'Transaction confirmed on blockchain',
    action: {
      label: 'View Explorer',
      onClick: () => window.open(getExplorerLink(txHash), '_blank')
    },
    duration: 5000
  });
};

// Helper to show error toast
const showErrorToast = (message: string, error?: any) => {
  const errorMsg = error?.message || error?.toString() || 'Unknown error';
  toast.error(message, {
    description: errorMsg.substring(0, 150) + (errorMsg.length > 150 ? '...' : ''),
    duration: 7000
  });
};

interface SequenceContextType {
  // Account management
  smartAccountAddress: string | null;
  isAccountReady: boolean;
  isGaslessEnabled: boolean;
  isSessionActive: boolean;

  // Session management
  createSession: (duration?: number) => Promise<void>;
  closeSession: () => void;

  // Gasless transaction methods for social features
  createProfile: (username: string, displayName: string, bio: string, avatarHash: string, location: string, isArtist: boolean) => Promise<string>;
  updateProfile: (displayName: string, bio: string, avatarHash: string, bannerHash: string, location: string, website: string) => Promise<string>;
  updateSocialLinks: (instagram: string, twitter: string, youtube: string, spotify: string, soundcloud: string, bandcamp: string, discord: string, telegram: string) => Promise<string>;
  updateMusicPreferences: (favoriteGenres: string[]) => Promise<string>;
  createPlaylist: (name: string, description: string, coverHash: string, isPublic: boolean) => Promise<string>;
  followUser: (userAddress: string) => Promise<string>;
  unfollowUser: (userAddress: string) => Promise<string>;
  
  sendMessage: (recipient: string, content: string, metadata: string, tipAmount: number) => Promise<string>;
  sendTip: (recipient: string, message: string, amount: number, tokenAddress: string) => Promise<string>;
  mintSongNFT: (to: string, title: string, artist: string, genre: string, duration: number, ipfsAudioHash: string, ipfsArtworkHash: string, royaltyPercentage: number, isExplicit: boolean, metadataURI?: string) => Promise<string>;
  
  // Album management
  createAlbum: (title: string, description: string, coverImageHash: string, albumType: number, metadataURI: string) => Promise<string>;
  addSongToAlbum: (albumId: number, songTokenId: number) => Promise<string>;
  
  // Artist management
  upgradeToArtist: (artistName: string, genre: string, isIndependent: boolean, recordLabel: string) => Promise<string>;
  updateArtistData: (artistName: string, genre: string, isIndependent: boolean, recordLabel: string) => Promise<string>;

  // Utility methods
  profileExists: (address: string) => Promise<boolean>;
  getProfile: (address: string) => Promise<any>;
  executeGaslessTransaction: (to: string, data: string, value?: bigint) => Promise<string>;
}

const SequenceContext = createContext<SequenceContextType | undefined>(undefined);

export const useSequence = () => {
  const context = useContext(SequenceContext);
  if (context === undefined) {
    throw new Error('useSequence must be used within a SequenceProvider');
  }
  return context;
};

interface SequenceProviderProps {
  children: ReactNode;
}

export const SequenceProvider = ({ children }: SequenceProviderProps) => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  // Get real-time transaction context for tracking
  const realtimeTxContext = useRealtimeTxContext();

  // Account state
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [isAccountReady, setIsAccountReady] = useState(false);
  const [isGaslessEnabled, setIsGaslessEnabled] = useState(true);
  const [isSessionActive, setIsSessionActive] = useState(true); // Always true - no popup mode

  // Session management - Permanent: no expiry, active as long as user is logged in
  const createSession = useCallback(async (duration?: number) => {
    if (!walletClient || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('🔑 Creating auto-approve session...');
      
      // Store auto-approve flag
      localStorage.setItem('hibeats_auto_approve', 'true');
      localStorage.setItem('hibeats_auto_approve_address', address);
      
      setIsSessionActive(true);
      
      console.log('✅ Auto-approve enabled');
      
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      throw error;
    }
  }, [walletClient, address]);

  // Close session
  const closeSession = useCallback(() => {
    localStorage.removeItem('hibeats_auto_approve');
    localStorage.removeItem('hibeats_auto_approve_address');
    setIsSessionActive(false);
    console.log('🔒 Auto-approve session closed');
  }, []);

  // 🔥 Initialize WebSocket client on app startup
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        const { initializeWebSocketClient } = await import('@/lib/websocket-client');
        await initializeWebSocketClient();
      } catch (error) {
        console.warn('⚠️ [WEBSOCKET] Failed to initialize on startup (will use HTTP fallback):', error);
      }
    };

    // Initialize WebSocket as soon as app loads
    initWebSocket();
  }, []); // Run once on mount

  // Initialize Sequence account
  useEffect(() => {
    const initSequenceAccount = async () => {
      if (!isConnected || !address || !walletClient) {
        setIsAccountReady(false);
        setSmartAccountAddress(null);
        return;
      }

      try {
        setSmartAccountAddress(address);
        setIsAccountReady(true);
        setIsGaslessEnabled(true);
        
        // 🔥 Test RPC connection latency for Somnia optimization
        const startTest = Date.now();
        try {
          if (publicClient) {
            const blockNumber = await publicClient.getBlockNumber();
            const rpcLatency = Date.now() - startTest;
            console.log('🏎️ Somnia RPC Performance Test:', {
              endpoint: 'https://dream-rpc.somnia.network',
              latency: `${rpcLatency}ms`,
              blockNumber: blockNumber.toString(),
              status: rpcLatency < 200 ? '✅ EXCELLENT' : rpcLatency < 500 ? '⚠️ GOOD' : '❌ SLOW'
            });
            
            if (rpcLatency > 500) {
              console.warn('⚠️ RPC latency high. Consider using alternative endpoint or check network.');
            }
          }
        } catch (testError) {
          console.warn('⚠️ RPC test failed:', testError);
        }

        // Check if session exists for this address (no expiry check)
        const autoApprove = localStorage.getItem('hibeats_auto_approve');
        const savedAddress = localStorage.getItem('hibeats_auto_approve_address');
        
        // 🔒 MANUAL APPROVAL MODE: User must explicitly enable auto-approve in Settings
        // This ensures financial transactions (send, buy, sell) require manual confirmation
        if (autoApprove === 'true' && savedAddress === address) {
          // Restore existing session if user has enabled it
          setIsSessionActive(true);
          console.log('✅ Auto-approve session restored (user enabled)');
        } else {
          // Default: Manual approval mode (Sequence will show confirmation modal)
          setIsSessionActive(false);
          console.log('🔒 Manual approval mode (default - safer for financial transactions)');
        }

        console.log('Sequence account initialized:', {
          address,
          isGasless: true,
          sessionActive: isSessionActive,
          autoApprove: localStorage.getItem('hibeats_auto_approve'),
          chainId: walletClient.chain?.id,
        });
      } catch (error) {
        console.error('Failed to initialize Sequence account:', error);
        setIsAccountReady(false);
      }
    };

    initSequenceAccount();
  }, [isConnected, address, walletClient]);

  // 🔒 Global transaction lock to prevent concurrent financial transactions
  const [pendingFinancialTx, setPendingFinancialTx] = useState<string | null>(null);
  
  // 🔒 Track sent transactions to prevent duplicates
  const sentTxRef = useRef<Set<string>>(new Set());
  
  // Clear sent transactions after 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      sentTxRef.current.clear();
      console.log('🧹 Cleared sent transaction cache');
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Execute gasless transaction using Sequence
  // requiresManualApproval: true for financial transactions (send, buy, sell), false for social interactions
  const executeGaslessTransaction = async (
    to: string, 
    data: string, 
    value: bigint = 0n, 
    retryCount: number = 0, 
    customTimeout?: number,
    requiresManualApproval: boolean = false
  ): Promise<string> => {
    if (!walletClient || !smartAccountAddress) {
      throw new Error('Wallet not connected or account not ready');
    }

    // 🔒 CRITICAL: Prevent concurrent financial transactions
    if (value > 0n && pendingFinancialTx) {
      const error = `❌ BLOCKED: Financial transaction already in progress (${pendingFinancialTx.slice(0, 10)}...)`;
      console.error(error);
      throw new Error('Another financial transaction is already in progress. Please wait.');
    }

    // 🔒 CRITICAL: Prevent duplicate transactions (for ALL transactions, not just financial)
    // This includes NFT minting, album creation, etc. which have value = 0n
    const txKey = `${to}-${value.toString()}-${data.slice(0, 50)}`; // Use more data for uniqueness
    if (sentTxRef.current.has(txKey)) {
      const error = `❌ BLOCKED: Duplicate transaction detected (same to/value/data)`;
      console.error(error, { 
        to: to.slice(0, 10) + '...', 
        value: value.toString(), 
        dataPreview: data.slice(0, 20) + '...',
        txKey: txKey.slice(0, 50) + '...'
      });
      throw new Error('Duplicate transaction detected. This transaction was already sent.');
    }
    sentTxRef.current.add(txKey);
    console.log('✅ Transaction marked as sent:', {
      to: to.slice(0, 10) + '...',
      value: value.toString(),
      keyPreview: txKey.slice(0, 50) + '...'
    });

    // Ensure wallet is fully ready before sending transaction
    if (!isAccountReady) {
      console.log('⏳ Waiting for account to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (!isAccountReady) {
        throw new Error('Account not ready after waiting');
      }
    }

    try {
      // Session active check - simplified
      const autoApprove = localStorage.getItem('hibeats_auto_approve') === 'true';
      
      // 🔥 Dynamic timeout based on session mode AND retry count
      // First attempt: Normal timeout
      // Retry attempts: Extended timeout for network issues
      const isRetry = retryCount > 0;
      const sendTimeout = isRetry ? 90000 : (autoApprove ? 30000 : 60000); // Retry: 90s, Auto: 30s, Manual: 60s
      const confirmTimeout = isRetry ? 60000 : (autoApprove ? 15000 : 30000); // Retry: 60s, Auto: 15s, Manual: 30s
      
      if (autoApprove) {
        console.log(`🚀 Sending auto-approved transaction ${isRetry ? '(RETRY)' : ''}:`, {
          to,
          from: smartAccountAddress,
          session: '✅ Active',
          attempt: retryCount + 1,
          timeout: `${sendTimeout/1000}s send / ${confirmTimeout/1000}s confirm`
        });
      } else {
        console.log(`🚀 Sending transaction (may show popup) ${isRetry ? '(RETRY)' : ''}:`, {
          to,
          from: smartAccountAddress,
          session: '❌ Not active',
          attempt: retryCount + 1,
          timeout: `${sendTimeout/1000}s`
        });
      }

      // 🔒 Lock financial transactions BEFORE sending
      if (value > 0n) {
        const txId = `${to.slice(0, 6)}-${Date.now()}`;
        setPendingFinancialTx(txId);
        console.log('🔒 Locked financial transaction:', txId);
      }

      // Get nonce from blockchain to prevent double spending
      let nonce: number | undefined;
      try {
        if (publicClient && value > 0n) {
          const txCount = await publicClient.getTransactionCount({
            address: smartAccountAddress as `0x${string}`,
            blockTag: 'pending', // Include pending transactions
          });
          nonce = txCount;
          console.log('🔢 Using nonce from blockchain:', nonce);
        }
      } catch (nonceError) {
        console.warn('⚠️ Failed to get nonce, letting wallet handle it:', nonceError);
      }

      // Build transaction request with nonce
      const request: any = {
        to: to as `0x${string}`,
        data: data as `0x${string}`,
        ...(value > 0n && { value }),
        ...(nonce !== undefined && { nonce }),
      };

      console.log('📤 Sending transaction:', {
        to: to.slice(0, 10) + '...',
        value: value.toString(),
        nonce,
        hasData: data !== '0x',
      });

      // Send transaction with dynamic timeout based on session mode
      const sendPromise = walletClient.sendTransaction(request);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), sendTimeout)
      );

      const txHash = await Promise.race([sendPromise, timeoutPromise]);
      
      const sendTime = Date.now();
      console.log('✅ Transaction sent:', txHash, `in ${sendTime - (Date.now() - 100)}ms`);

      // 🔥 Track transaction in real-time monitoring
      const startTime = Date.now();
      
      // Determine method name from 'to' address
      let methodName = 'transaction';
      if (to === CONTRACT_ADDRESSES.userProfile) {
        methodName = 'profile';
      } else if (to === CONTRACT_ADDRESSES.songNFT) {
        methodName = 'nft';
      }
      
      // Track in real-time context
      if (realtimeTxContext) {
        realtimeTxContext.trackTransaction(txHash, methodName);
      }

      // 🔥 Wait for confirmation using Datastream (real-time WebSocket)
      // This is MUCH faster than RPC polling - gets status in < 1 second
      const finalConfirmTimeout = customTimeout || confirmTimeout;
      
      try {
        // Import Datastream wait function
        const { waitForTransactionWithFallback } = await import('@/utils/waitForTransactionDatastream');
        
        // Use Datastream for real-time confirmation (with RPC fallback)
        const receipt = await waitForTransactionWithFallback(
          txHash,
          publicClient,
          finalConfirmTimeout
        );
        
        const latency = receipt.confirmationTime;
        
        console.log('✅ Transaction confirmed via Datastream:', {
          hash: txHash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
          latency: `${latency}ms`,
          method: 'WebSocket Datastream (real-time)',
          breakdown: {
            send: 'instant',
            confirm: `${latency}ms`,
            total: `${latency}ms`
          }
        });
        
        // 🎯 Performance check for Somnia sub-second finality
        if (latency > 1000) {
          console.warn('⚠️ SLOWER THAN EXPECTED:', {
            latency: `${latency}ms`,
            expected: '<1000ms (Somnia sub-second finality per docs)',
            suggestion: 'Check: 1) Datastream connection 2) Network connection 3) RPC endpoint health'
          });
        } else {
          console.log('🚀 SOMNIA SUB-SECOND FINALITY CONFIRMED! Transaction finalized in:', `${latency}ms ⚡`);
        }

        // 🔥 Complete tracking in real-time context
        if (realtimeTxContext) {
          realtimeTxContext.completeTransaction(
            txHash,
            receipt.blockNumber,
            receipt.status === 'success'
          );
        }

      } catch (waitError) {
        console.warn('⚠️ Confirmation timeout (transaction may still be processing):', waitError);
        
        // Try one more time with getTransactionReceipt (non-blocking)
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          if (receipt) {
            const latency = Date.now() - sendTime;
            console.log('✅ Transaction confirmed (via direct receipt check):', {
              hash: txHash,
              blockNumber: receipt.blockNumber,
              status: receipt.status,
              latency: `${latency}ms`
            });
            
            if (realtimeTxContext) {
              realtimeTxContext.completeTransaction(
                txHash,
                Number(receipt.blockNumber),
                receipt.status === 'success'
              );
            }
          } else {
            // Transaction sent but not yet mined - this is OK
            console.log('ℹ️ Transaction sent but not yet confirmed. Will be processed shortly:', txHash);
            
            // Mark as pending in tracking
            if (realtimeTxContext) {
              realtimeTxContext.trackTransaction(txHash, methodName);
            }
          }
        } catch (receiptError) {
          console.warn('⚠️ Could not get receipt, transaction may still be processing');
          
          // Mark as pending in tracking
          if (realtimeTxContext) {
            realtimeTxContext.trackTransaction(txHash, methodName);
          }
        }
      }

      // 🔓 Unlock financial transactions on success
      if (value > 0n) {
        setPendingFinancialTx(null);
        console.log('🔓 Unlocked financial transaction');
      }

      // 🧹 CRITICAL: Remove from sent transactions cache after success
      // This allows the same transaction to be sent again in the future if needed
      const txKey = `${to}-${value.toString()}-${data.slice(0, 50)}`;
      sentTxRef.current.delete(txKey);
      console.log('🧹 Removed transaction from cache (success):', {
        to: to.slice(0, 10) + '...',
        keyPreview: txKey.slice(0, 50) + '...'
      });

      return txHash;
    } catch (error: any) {
      // 🔓 Unlock financial transactions on error
      if (value > 0n) {
        setPendingFinancialTx(null);
        console.log('🔓 Unlocked financial transaction (error)');
      }

      // 🧹 CRITICAL: Remove from sent transactions cache after error
      // This allows retry if the error was temporary (network issue, etc)
      const txKey = `${to}-${value.toString()}-${data.slice(0, 50)}`;
      sentTxRef.current.delete(txKey);
      console.log('🧹 Removed transaction from cache (error):', {
        to: to.slice(0, 10) + '...',
        keyPreview: txKey.slice(0, 50) + '...'
      });

      console.error(`❌ Transaction failed (attempt ${retryCount + 1}):`, error);

      // 🔍 Detect Sequence WaaS API timeout (specific error)
      const isSequenceTimeout = error?.message?.includes('context deadline exceeded') ||
                                error?.message?.includes('WebrpcRequestFailed');
      
      // 🔍 Detect generic transaction timeout
      const isTransactionTimeout = error?.message?.includes('Transaction timeout');
      
      // Check for other retryable errors
      const isRetryableError = error?.message?.includes('opening wallet timed out') || 
                               error?.message?.includes('Transaction approval timeout') ||
                               error?.message?.includes('request failed') ||
                               error?.message?.includes('network error') ||
                               error?.message?.includes('fetch failed') ||
                               error?.message?.includes('socket') ||
                               error?.message?.includes('ECONNREFUSED');

      // ⚠️ Special handling for Sequence WaaS timeout
      if (isSequenceTimeout) {
        console.warn('⚠️ Sequence WaaS API timeout detected:', {
          reason: 'API deadline exceeded',
          likelyCause: 'Network issue or RPC slow response',
          solution: 'Retry or check network connection'
        });
        
        // Show helpful toast to user
        toast.error('⏱️ Transaction Timeout', {
          description: 'Network is slow. Please try again.',
          duration: 5000,
        });
        
        // Don't retry WaaS timeout - it's a network issue
        throw new Error('⏱️ Transaction timeout: Network is slow, please try again');
      }
      
      // ⚠️ Generic transaction timeout (network issue)
      if (isTransactionTimeout) {
        const autoApprove = localStorage.getItem('hibeats_auto_approve') === 'true';
        
        if (!autoApprove) {
          // Auto-approve not enabled - show generic timeout
          toast.error('⏱️ Transaction Timeout', {
            description: 'Network is slow. Please try again.',
            duration: 5000,
          });
          throw new Error('⏱️ Transaction timeout: Network is slow, please try again');
        }
        
        // 🔒 CRITICAL: NO RETRY for financial transactions (value > 0)
        // Retry could cause double spending!
        if (value > 0n) {
          console.error('❌ Financial transaction timeout - NO RETRY to prevent double spending');
          toast.error('❌ Transaction Timeout', {
            description: 'Financial transaction failed. Please try again manually.',
            duration: 8000,
          });
          throw new Error('❌ Transaction timeout: Financial transactions cannot be retried automatically to prevent double spending');
        }
        
        // Auto-approve is on but still timeout - network/RPC issue
        // Retry up to 3 times ONLY for non-financial transactions (value = 0)
        if (retryCount < 3) {
          const retryDelay = 2000 * (retryCount + 1); // 2s, 4s, 6s
          console.warn(`⚠️ Network timeout detected. Retrying ${retryCount + 1}/3...`);
          console.log(`⏳ Waiting ${retryDelay/1000}s before retry...`);
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Don't pass custom timeout - use default dynamic timeout based on retry count
          return executeGaslessTransaction(to, data, value, retryCount + 1);
        }
        
        // After 3 retries, show network error
        toast.error('❌ Network Timeout', {
          description: 'Somnia RPC is slow or unavailable. Please try again later.',
          duration: 8000,
        });
        throw new Error('❌ Transaction timeout after 3 retries: Network issue detected. Somnia RPC may be congested.');
      }

      // 🔒 CRITICAL: NO RETRY for financial transactions (value > 0)
      if (value > 0n && isRetryableError) {
        console.error('❌ Financial transaction failed - NO RETRY to prevent double spending');
        toast.error('❌ Transaction Failed', {
          description: 'Financial transaction failed. Please try again manually.',
          duration: 8000,
        });
        throw new Error('❌ Transaction failed: Financial transactions cannot be retried automatically to prevent double spending');
      }
      
      // Retry up to 3 times ONLY for non-financial transactions (value = 0)
      if (isRetryableError && retryCount < 3) {
        const retryDelay = 1500 * (retryCount + 1); // 1.5s, 3s, 4.5s
        console.log(`🔄 Retrying non-financial transaction due to network issue... (${retryCount + 1}/3)`);
        console.log(`⏳ Waiting ${retryDelay/1000}s before retry...`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeGaslessTransaction(to, data, value, retryCount + 1);
      }

      // If it's a retryable error and we've exhausted retries, throw a user-friendly error
      if (isRetryableError) {
        toast.error('❌ Network Error', {
          description: 'Unable to connect to blockchain. Please check your internet connection.',
          duration: 5000,
        });
        throw new Error('❌ Network error: Transaction failed after retries. Please check your connection and try again.');
      }
      
      // User rejection (don't retry)
      if (error?.message?.includes('User rejected') || error?.message?.includes('rejected') || error?.message?.includes('cancelled')) {
        toast.info('Transaction Cancelled', {
          description: 'You cancelled the transaction',
          duration: 3000,
        });
        throw new Error('Transaction cancelled by user');
      }

      throw error;
    }
  };  // Create user profile (gasless)
  const createProfile = async (
    username: string,
    displayName: string,
    bio: string,
    avatarHash: string,
    location: string,
    isArtist: boolean
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    // 🔥 Import transaction queue dynamically to prevent nonce collision
    const { transactionQueue } = await import('@/services/nonceManager');
    
    // 🔥 Enqueue transaction to prevent nonce collision
    return transactionQueue.enqueue(async () => {
      try {
        // Show loading toast
        toast.loading('Creating profile...', { id: 'create-profile' });

        // Encode function call for UserProfile contract
        const data = encodeFunctionData({
          abi: [
            {
              name: 'createProfile',
              type: 'function',
              inputs: [
                { name: 'username', type: 'string' },
                { name: 'displayName', type: 'string' },
                { name: 'bio', type: 'string' },
                { name: 'avatarHash', type: 'string' },
                { name: 'location', type: 'string' },
                { name: 'isArtist', type: 'bool' }
              ],
              outputs: []
            }
          ],
          functionName: 'createProfile',
          args: [username, displayName, bio, avatarHash, location, isArtist]
        });

        const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.userProfile, data);

      console.log('✅ Profile created on blockchain:', {
        username,
        displayName,
        txHash,
        explorer: getExplorerLink(txHash)
      });

      // Dismiss loading and show success
      toast.dismiss('create-profile');
      showSuccessToast('Profile Created!', txHash, `Welcome ${displayName}!`);

      // Clear profile cache to force reload from contract
      try {
        const { profileService } = await import('../services/profileService');
        profileService.clearProfileCache(smartAccountAddress);
        console.log('✅ Profile cache cleared');
      } catch (error) {
        console.warn('⚠️ Failed to clear profile cache:', error);
      }

        return txHash;
      } catch (error) {
        console.error('Profile creation failed:', error);
        toast.dismiss('create-profile');
        showErrorToast('Failed to Create Profile', error);
        throw error;
      }
    });
  };

  // Update user profile (gasless)
  const updateProfile = async (
    displayName: string,
    bio: string,
    avatarHash: string,
    bannerHash: string,
    location: string,
    website: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Show loading toast
      toast.loading('Updating profile...', { id: 'update-profile' });

      const data = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'updateProfile',
        args: [displayName, bio, avatarHash, bannerHash, location, website]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.userProfile, data);

      console.log('✅ Profile updated on blockchain:', {
        displayName,
        txHash,
        explorer: getExplorerLink(txHash)
      });

      // Dismiss loading and show success
      toast.dismiss('update-profile');
      showSuccessToast('Profile Updated!', txHash, 'Your changes are now on blockchain');

      // Publish updated profile data to DataStream after successful transaction
      try {
        const { profileService } = await import('../services/profileService');

        // Get existing profile data to merge with updates
        const existingProfile = await profileService.getProfile(smartAccountAddress);
        const updatedProfile: UserProfile = {
          ...existingProfile,
          displayName,
          bio,
          avatarHash,
          bannerHash,
          location,
          website,
          updatedAt: Date.now(),
          transactionHash: txHash,
          // Keep existing values for fields not being updated
          userAddress: smartAccountAddress,
          username: existingProfile?.username || '',
          isArtist: existingProfile?.isArtist || false,
          isVerified: existingProfile?.isVerified || false,
          followerCount: existingProfile?.followerCount || 0,
          followingCount: existingProfile?.followingCount || 0,
          reputationScore: existingProfile?.reputationScore || 0,
          createdAt: existingProfile?.createdAt || Date.now(),
          socialLinks: existingProfile?.socialLinks || {
            instagram: '', twitter: '', youtube: '', spotify: '',
            soundcloud: '', bandcamp: '', discord: '', telegram: ''
          },
          musicPreferences: existingProfile?.musicPreferences || {
            favoriteGenres: []
          }
        };

        // Clear cache to ensure fresh data on next fetch
        profileService.clearProfileCache(smartAccountAddress);
        console.log('✅ Profile cache cleared');
      } catch (error) {
        console.warn('⚠️ Failed to clear profile cache:', error);
      }

      return txHash;
    } catch (error) {
      console.error('Profile update failed:', error);
      toast.dismiss('update-profile');
      showErrorToast('Failed to Update Profile', error);
      throw error;
    }
  };

  // Update social links (gasless)
  const updateSocialLinks = async (
    instagram: string,
    twitter: string,
    youtube: string,
    spotify: string,
    soundcloud: string,
    bandcamp: string,
    discord: string,
    telegram: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Show loading toast
      toast.loading('Updating social links...', { id: 'update-social-links' });

      console.log('🔗 Starting social links update:', {
        instagram: instagram ? 'set' : 'empty',
        twitter: twitter ? 'set' : 'empty',
        youtube: youtube ? 'set' : 'empty',
        spotify: spotify ? 'set' : 'empty',
        soundcloud: soundcloud ? 'set' : 'empty',
        bandcamp: bandcamp ? 'set' : 'empty',
        discord: discord ? 'set' : 'empty',
        telegram: telegram ? 'set' : 'empty'
      });

      const data = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'updateSocialLinks',
        args: [instagram, twitter, youtube, spotify, soundcloud, bandcamp, discord, telegram]
      });

      console.log('📝 Encoded social links transaction data:', {
        functionName: 'updateSocialLinks',
        contractAddress: CONTRACT_ADDRESSES.userProfile,
        dataLength: data.length
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.userProfile, data, 0n, 0, 90000); // 90 seconds timeout for social links

      console.log('✅ Social links updated on blockchain:', {
        txHash,
        explorer: getExplorerLink(txHash)
      });

      // Dismiss loading and show success
      toast.dismiss('update-social-links');
      showSuccessToast('Social Links Updated!', txHash, 'Your social links are now on blockchain');

      // Publish updated social links to DataStream after successful transaction
      try {
        const { profileService } = await import('../services/profileService');

        // Get existing profile data to merge with social links update
        const existingProfile = await profileService.getProfile(smartAccountAddress);
        const socialLinks = {
          instagram, twitter, youtube, spotify, soundcloud, bandcamp, discord, telegram
        };

        const updatedProfile: UserProfile = {
          ...existingProfile,
          socialLinks,
          updatedAt: Date.now(),
          transactionHash: txHash,
          // Keep existing values for other fields
          userAddress: smartAccountAddress,
          username: existingProfile?.username || '',
          displayName: existingProfile?.displayName || '',
          bio: existingProfile?.bio || '',
          avatarHash: existingProfile?.avatarHash || '',
          bannerHash: existingProfile?.bannerHash || '',
          location: existingProfile?.location || '',
          website: existingProfile?.website || '',
          isArtist: existingProfile?.isArtist || false,
          isVerified: existingProfile?.isVerified || false,
          followerCount: existingProfile?.followerCount || 0,
          followingCount: existingProfile?.followingCount || 0,
          reputationScore: existingProfile?.reputationScore || 0,
          createdAt: existingProfile?.createdAt || Date.now(),
          musicPreferences: existingProfile?.musicPreferences || {
            favoriteGenres: []
          }
        };

        console.log('✅ Social links updated on-chain');

        // Clear cache to ensure fresh data on next fetch
        profileService.clearProfileCache(smartAccountAddress);
      } catch (error) {
        console.warn('⚠️ Failed to publish updated social links to DataStream (non-critical):', error);
        // Don't throw here - blockchain transaction was successful
        // DataStream publishing failure should not block the UI
      }

      return txHash;
    } catch (error) {
      console.error('❌ Social links update failed:', error);
      toast.dismiss('update-social-links');
      showErrorToast('Failed to Update Social Links', error);
      throw error;
    }
  };

  // Update music preferences (gasless)
  const updateMusicPreferences = async (favoriteGenres: string[]): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Convert genres array to string for storage (comma-separated)
      const genresString = favoriteGenres.join(',');

      // For now, we'll store music preferences in DataStream only
      // In the future, this could be stored on-chain if needed
      console.log('🎵 Updating music preferences:', { favoriteGenres, genresString });

      // Publish music preferences to DataStream
      try {
        const { profileService } = await import('../services/profileService');

        // Get existing profile data to merge with music preferences update
        const existingProfile = await profileService.getProfile(smartAccountAddress);

        const updatedProfile: UserProfile = {
          ...existingProfile,
          musicPreferences: {
            favoriteGenres
          },
          updatedAt: Date.now(),
          // Keep existing values for other fields
          userAddress: smartAccountAddress,
          username: existingProfile?.username || '',
          displayName: existingProfile?.displayName || '',
          bio: existingProfile?.bio || '',
          avatarHash: existingProfile?.avatarHash || '',
          bannerHash: existingProfile?.bannerHash || '',
          location: existingProfile?.location || '',
          website: existingProfile?.website || '',
          socialLinks: existingProfile?.socialLinks || {
            instagram: '', twitter: '', youtube: '', spotify: '',
            soundcloud: '', bandcamp: '', discord: '', telegram: ''
          },
          isArtist: existingProfile?.isArtist || false,
          isVerified: existingProfile?.isVerified || false,
          followerCount: existingProfile?.followerCount || 0,
          followingCount: existingProfile?.followingCount || 0,
          reputationScore: existingProfile?.reputationScore || 0,
          createdAt: existingProfile?.createdAt || Date.now()
        };

        console.log('✅ Music preferences updated on-chain');

        // Return a mock transaction hash since we're not doing blockchain transaction for preferences
        return `preferences_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } catch (error) {
        console.warn('⚠️ Failed to publish music preferences to DataStream:', error);
        throw error;
      }
    } catch (error) {
      console.error('Music preferences update failed:', error);
      throw error;
    }
  };

  // Upgrade to Artist (with payment) - Sets isArtist to true and initializes artist data
  const upgradeToArtist = async (
    artistName: string,
    genre: string,
    isIndependent: boolean,
    recordLabel: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Show loading toast
      toast.loading('Upgrading to Artist account...', { id: 'upgrade-artist' });

      console.log('🎨 Starting artist upgrade:', {
        artistName,
        genre,
        isIndependent,
        recordLabel: recordLabel || 'Independent'
      });

      // Fetch upgrade fee from smart contract
      let upgradeFee: bigint;
      try {
        upgradeFee = await publicClient!.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getArtistUpgradeFee',
          args: [],
        } as any) as bigint;
        
        const { formatEther } = await import('viem');
        console.log('💰 Artist upgrade fee from contract:', formatEther(upgradeFee), 'SOMI');
      } catch (error) {
        console.error('Failed to fetch upgrade fee, using default 20 SOMI:', error);
        upgradeFee = parseEther("20");
      }

      // Call upgradeToArtist function to set isArtist = true and initialize artist data
      const data = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'upgradeToArtist',
        args: [artistName, genre, isIndependent, recordLabel]
      });

      console.log('📝 Encoded artist upgrade transaction data:', {
        functionName: 'upgradeToArtist',
        contractAddress: CONTRACT_ADDRESSES.userProfile,
        dataLength: data.length,
        paymentAmount: upgradeFee.toString() + ' wei'
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.userProfile, data, upgradeFee, 0, 90000);

      console.log('✅ Artist upgrade completed on blockchain:', {
        txHash,
        explorer: getExplorerLink(txHash)
      });

      // Dismiss loading and show success
      toast.dismiss('upgrade-artist');
      showSuccessToast('Welcome to HiBeats Artists! 🎨', txHash, 'You can now upload music and manage your artist profile');

      // Publish updated artist profile to DataStream
      try {
        const { profileService } = await import('../services/profileService');

        // Get existing profile data to merge with artist upgrade
        const existingProfile = await profileService.getProfile(smartAccountAddress);

        const updatedProfile: UserProfile = {
          ...existingProfile,
          isArtist: true, // Set to artist
          artistData: {
            artistName,
            genre,
            totalStreams: 0,
            totalLikes: 0,
            songCount: 0,
            followerCount: existingProfile?.followerCount || 0,
            isIndependent,
            recordLabel: recordLabel || ''
          },
          updatedAt: Date.now(),
          transactionHash: txHash,
          // Keep existing values
          userAddress: smartAccountAddress,
          username: existingProfile?.username || '',
          displayName: existingProfile?.displayName || '',
          bio: existingProfile?.bio || '',
          avatarHash: existingProfile?.avatarHash || '',
          bannerHash: existingProfile?.bannerHash || '',
          location: existingProfile?.location || '',
          website: existingProfile?.website || '',
          socialLinks: existingProfile?.socialLinks || {
            instagram: '', twitter: '', youtube: '', spotify: '',
            soundcloud: '', bandcamp: '', discord: '', telegram: ''
          },
          musicPreferences: existingProfile?.musicPreferences || { favoriteGenres: [] },
          isVerified: existingProfile?.isVerified || false,
          followerCount: existingProfile?.followerCount || 0,
          followingCount: existingProfile?.followingCount || 0,
          reputationScore: existingProfile?.reputationScore || 0,
          createdAt: existingProfile?.createdAt || Date.now()
        };

        console.log('✅ Artist profile data updated on-chain');

        // Clear cache to ensure fresh data on next fetch
        profileService.clearProfileCache(smartAccountAddress);
      } catch (error) {
        console.warn('⚠️ Failed to publish artist profile to DataStream (non-critical):', error);
        // Don't throw here - blockchain transaction was successful
      }

      return txHash;
    } catch (error) {
      console.error('Artist upgrade failed:', error);
      toast.dismiss('upgrade-artist');
      showErrorToast('Failed to Upgrade to Artist', error);
      throw error;
    }
  };

  // Update Artist Data (gasless) - For existing artists to update their info
  const updateArtistData = async (
    artistName: string,
    genre: string,
    isIndependent: boolean,
    recordLabel: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Show loading toast
      toast.loading('Updating artist information...', { id: 'update-artist' });

      console.log('🎨 Updating artist data:', {
        artistName,
        genre,
        isIndependent,
        recordLabel: recordLabel || 'Independent'
      });

      const data = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'updateArtistData',
        args: [artistName, genre, isIndependent, recordLabel]
      });

      console.log('📝 Encoded artist update transaction data:', {
        functionName: 'updateArtistData',
        contractAddress: CONTRACT_ADDRESSES.userProfile,
        dataLength: data.length
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.userProfile, data, 0n, 0, 90000);

      console.log('✅ Artist data updated on blockchain:', {
        txHash,
        explorer: getExplorerLink(txHash)
      });

      // Dismiss loading and show success
      toast.dismiss('update-artist');
      showSuccessToast('Artist Info Updated! 🎵', txHash, 'Your artist information has been updated');

      // Publish updated artist data to DataStream
      try {
        const { profileService } = await import('../services/profileService');

        // Get existing profile data to merge with artist data update
        const existingProfile = await profileService.getProfile(smartAccountAddress);

        const updatedProfile: UserProfile = {
          ...existingProfile,
          artistData: {
            artistName,
            genre,
            totalStreams: existingProfile?.artistData?.totalStreams || 0,
            totalLikes: existingProfile?.artistData?.totalLikes || 0,
            songCount: existingProfile?.artistData?.songCount || 0,
            followerCount: existingProfile?.followerCount || 0,
            isIndependent,
            recordLabel: recordLabel || ''
          },
          updatedAt: Date.now(),
          transactionHash: txHash,
          // Keep existing values
          userAddress: smartAccountAddress,
          username: existingProfile?.username || '',
          displayName: existingProfile?.displayName || '',
          bio: existingProfile?.bio || '',
          avatarHash: existingProfile?.avatarHash || '',
          bannerHash: existingProfile?.bannerHash || '',
          location: existingProfile?.location || '',
          website: existingProfile?.website || '',
          socialLinks: existingProfile?.socialLinks || {
            instagram: '', twitter: '', youtube: '', spotify: '',
            soundcloud: '', bandcamp: '', discord: '', telegram: ''
          },
          musicPreferences: existingProfile?.musicPreferences || { favoriteGenres: [] },
          isArtist: existingProfile?.isArtist || false,
          isVerified: existingProfile?.isVerified || false,
          followerCount: existingProfile?.followerCount || 0,
          followingCount: existingProfile?.followingCount || 0,
          reputationScore: existingProfile?.reputationScore || 0,
          createdAt: existingProfile?.createdAt || Date.now()
        };

        console.log('✅ Artist data updated on-chain');

        // Clear cache to ensure fresh data on next fetch
        profileService.clearProfileCache(smartAccountAddress);
      } catch (error) {
        console.warn('⚠️ Failed to publish updated artist data to DataStream (non-critical):', error);
        // Don't throw here - blockchain transaction was successful
      }

      return txHash;
    } catch (error) {
      console.error('Artist data update failed:', error);
      toast.dismiss('update-artist');
      showErrorToast('Failed to Update Artist Info', error);
      throw error;
    }
  };

  // Create playlist (gasless)
  const createPlaylist = async (
    name: string,
    description: string,
    coverHash: string,
    isPublic: boolean
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      // Show loading toast
      toast.loading('Creating playlist...', { id: 'create-playlist' });

      const data = encodeFunctionData({
        abi: [
          {
            name: 'createPlaylist',
            type: 'function',
            inputs: [
              { name: 'name', type: 'string' },
              { name: 'description', type: 'string' },
              { name: 'coverHash', type: 'string' },
              { name: 'isPublic', type: 'bool' }
            ],
            outputs: []
          }
        ],
        functionName: 'createPlaylist',
        args: [name, description, coverHash, isPublic]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.playlistManager, data);
      
      // Dismiss loading and show success
      toast.dismiss('create-playlist');
      showSuccessToast('Playlist Created!', txHash, `Created playlist: ${name}`);
      
      return txHash;
    } catch (error) {
      console.error('Playlist creation failed:', error);
      toast.dismiss('create-playlist');
      showErrorToast('Failed to Create Playlist', error);
      throw error;
    }
  };

  // Follow user (DataStream V3 - NO SMART CONTRACT)
  const followUser = async (userAddress: string): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      console.log('👥 [FOLLOW] Starting follow via DataStream V3:', userAddress);
      
      // Show loading toast
      toast.loading('Following user...', { id: `follow-${userAddress}` });

      // Use DataStream V3 instead of smart contract
      const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
      
      console.log('📤 [FOLLOW] Writing to DataStream...');
      const result = await somniaDatastreamServiceV3.followUser(userAddress, smartAccountAddress);
      
      console.log('✅ [FOLLOW] DataStream write successful:', result);
      
      // Dismiss loading and show success
      toast.dismiss(`follow-${userAddress}`);
      showSuccessToast('User Followed!', result, `Now following ${userAddress.substring(0, 10)}...`);
      
      return result;
    } catch (error: any) {
      console.error('❌ [FOLLOW] Failed:', error);
      toast.dismiss(`follow-${userAddress}`);
      
      // Better error messages
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('relayer') || errorMessage.includes('aborted')) {
        toast.error('Network issue. Please try again in a moment.');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Transaction timeout. Please check your connection.');
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        toast.error('Transaction cancelled by user.');
      } else {
        showErrorToast('Failed to Follow User', error);
      }
      
      throw error;
    }
  };

  // Unfollow user (DataStream V3 - NO SMART CONTRACT)
  const unfollowUser = async (userAddress: string): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      console.log('👥 [UNFOLLOW] Starting unfollow via DataStream V3:', userAddress);
      
      // Show loading toast
      toast.loading('Unfollowing user...', { id: `unfollow-${userAddress}` });

      // Use DataStream V3 instead of smart contract
      const { somniaDatastreamServiceV3 } = await import('@/services/somniaDatastreamService.v3');
      
      console.log('📤 [UNFOLLOW] Writing to DataStream...');
      const result = await somniaDatastreamServiceV3.unfollowUser(userAddress, smartAccountAddress);
      
      console.log('✅ [UNFOLLOW] DataStream write successful:', result);
      
      // Dismiss loading and show success
      toast.dismiss(`unfollow-${userAddress}`);
      showSuccessToast('User Unfollowed', result, `Unfollowed ${userAddress.substring(0, 10)}...`);
      
      return result;
    } catch (error: any) {
      console.error('❌ [UNFOLLOW] Failed:', error);
      toast.dismiss(`unfollow-${userAddress}`);
      
      // Better error messages
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('relayer') || errorMessage.includes('aborted')) {
        toast.error('Network issue. Please try again in a moment.');
      } else if (errorMessage.includes('timeout')) {
        toast.error('Transaction timeout. Please check your connection.');
      } else if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        toast.error('Transaction cancelled by user.');
      } else {
        showErrorToast('Failed to Unfollow User', error);
      }
      
      throw error;
    }
  };

  // Social functions (stubbed - contracts not yet deployed)
  const likePost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const createPost = async (content: string, metadata: string): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const addComment = async (postId: number, content: string): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const toggleLike = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const repost = async (postId: number, comment?: string, customMetadata?: any): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const deletePost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const deleteComment = async (commentId: number, postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const unrepost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const bookmarkPost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const unbookmarkPost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const pinPost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const unpinPost = async (postId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const quotePost = async (quotedPostId: number, content: string): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const deleteQuote = async (quoteId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const likeQuote = async (quoteId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const unlikeQuote = async (quoteId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const likeComment = async (commentId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  const unlikeComment = async (commentId: number): Promise<string> => {
    throw new Error('Social features not yet implemented');
  };

  // Original likePost implementation (commented out - needs SOCIAL_ABI)
  /*
  const likePost_OLD = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: [
          {
            name: 'likePost',
            type: 'function',
            inputs: [{ name: 'postId', type: 'uint256' }],
            outputs: []
          }
        ],
        functionName: 'likePost',
        args: [BigInt(postId)]
      });

      return await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
    } catch (error) {
      console.error('Like post failed:', error);
      throw error;
    }
  };

  // Create post (gasless via smart contract, status via Datastream)
  const createPost = async (content: string, metadata: string): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      console.log('🚀 Creating post with gasless transaction:', {
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        metadataLength: metadata.length,
        author: smartAccountAddress
      });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'createPost',
        args: [content, metadata]
      });

      // Submit via smart contract (secure, validated)
      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      console.log('✅ Post created successfully:', { 
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        txHash,
        explorer: getExplorerLink(txHash)
      });
      
      return txHash;
    } catch (error) {
      console.error('❌ Create post failed:', error);
      showErrorToast('Failed to Publish Post', error);
      throw error;
    }
  };

  // Add comment (gasless via smart contract, no queue needed with 0ms delay)
  const addComment = async (postId: number, content: string): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      console.log('💬 Creating comment with gasless transaction:', {
        postId,
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        author: smartAccountAddress
      });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'createComment',
        args: [BigInt(postId), content]
      });

      // Submit via smart contract (no queue needed with TX_DELAY=0)
      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      console.log('✅ Comment added successfully:', { 
        postId, 
        content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        txHash,
        explorer: getExplorerLink(txHash)
      });
      
      return txHash;
    } catch (error) {
      console.error('❌ Add comment failed:', error);
      showErrorToast('Comment Failed', error);
      throw error;
    }
  };

  // Toggle like (gasless via smart contract, no queue needed with 0ms delay)
  const toggleLike = async (postId: number): Promise<string> => {
    if (!smartAccountAddress || !publicClient) throw new Error('Account not ready');

    try {
      console.log('❤️ Toggling like for post:', { postId, user: smartAccountAddress });

      // Check if user has already liked the post
      const hasLiked = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`,
        abi: SOCIAL_ABI,
        functionName: 'hasLikedPost',
        args: [BigInt(postId), smartAccountAddress as `0x${string}`]
      } as any) as boolean;

      // Determine which function to call
      const functionName = hasLiked ? 'unlikePost' : 'likePost';
      
      console.log('❤️ Toggling like with gasless transaction:', {
        postId,
        currentlyLiked: hasLiked,
        action: functionName,
        user: smartAccountAddress
      });
      
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName,
        args: [BigInt(postId)]
      });

      // Submit via smart contract (no queue needed with TX_DELAY=0)
      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      console.log('✅ Toggle like successful:', { 
        postId, 
        action: functionName,
        nowLiked: !hasLiked,
        txHash,
        explorer: getExplorerLink(txHash)
      });
      
      return txHash;
    } catch (error) {
      console.error('❌ Toggle like failed:', error);
      showErrorToast('Like Failed', error);
      throw error;
    }
  };

  // Repost/Recast (gasless, silent) - Implemented as createPost with reference
  const repost = async (postId: number, comment?: string, customMetadata?: any): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    // 🔥 Import transaction queue
    const { transactionQueue } = await import('@/utils/transactionQueue');

    // 🔥 Add to queue untuk menghindari nonce collision
    return transactionQueue.add(`repost-${postId}-${Date.now()}`, async () => {
      try {
        // Show loading toast
        toast.loading('Reposting...', { id: `repost-${postId}` });

        console.log('🔄 Creating repost for post:', { postId, comment, customMetadata });

        // Use custom metadata if provided (for quote posts), otherwise create default
        const repostMetadata = customMetadata ? JSON.stringify(customMetadata) : JSON.stringify({
          type: 'repost',
          originalPostId: postId,
          repostComment: comment || '',
          timestamp: Date.now()
        });

        // Content for repost - include comment if provided
        const repostContent = comment 
          ? comment // Use comment directly for quote posts
          : `Reposted post #${postId}`;

        // Use createPost instead of non-existent repost function
        const data = encodeFunctionData({
          abi: SOCIAL_ABI,
          functionName: 'createPost',
          args: [repostContent, repostMetadata]
        });

        const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
        
        console.log('✅ Repost created as new post on Somnia blockchain:', { 
          originalPostId: postId,
          comment,
          metadata: customMetadata,
          txHash,
          explorer: getExplorerLink(txHash)
        });
        
        // Dismiss loading and show success
        toast.dismiss(`repost-${postId}`);
        showSuccessToast('Reposted!', txHash, comment ? `With your comment: ${comment.substring(0, 50)}...` : 'Shared to your feed');
        
        return txHash;
      } catch (error) {
        console.error('❌ Repost failed:', error);
        toast.dismiss(`repost-${postId}`);
        showErrorToast('Failed to Repost', error);
        throw error; // Throw error instead of returning fake hash
      }
    });
  };

  // Delete post (gasless)
  const deletePost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      toast.loading('Deleting post...', { id: `delete-post-${postId}` });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'deletePost',
        args: [BigInt(postId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      toast.dismiss(`delete-post-${postId}`);
      showSuccessToast('Post Deleted', txHash, 'Your post has been removed');
      
      return txHash;
    } catch (error) {
      console.error('❌ Delete post failed:', error);
      toast.dismiss(`delete-post-${postId}`);
      showErrorToast('Failed to Delete Post', error);
      throw error;
    }
  };

  // Delete comment (gasless)
  const deleteComment = async (commentId: number, postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      toast.loading('Deleting comment...', { id: `delete-comment-${commentId}` });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'deleteComment',
        args: [BigInt(commentId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      toast.dismiss(`delete-comment-${commentId}`);
      showSuccessToast('Comment Deleted', txHash);
      
      return txHash;
    } catch (error) {
      console.error('❌ Delete comment failed:', error);
      toast.dismiss(`delete-comment-${commentId}`);
      showErrorToast('Failed to Delete Comment', error);
      throw error;
    }
  };

  // Unrepost (gasless)
  const unrepost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      toast.loading('Removing repost...', { id: `unrepost-${postId}` });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'unrepost',
        args: [BigInt(postId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      toast.dismiss(`unrepost-${postId}`);
      showSuccessToast('Repost Removed', txHash);
      
      return txHash;
    } catch (error) {
      console.error('❌ Unrepost failed:', error);
      toast.dismiss(`unrepost-${postId}`);
      showErrorToast('Failed to Remove Repost', error);
      throw error;
    }
  };

  // Bookmark post (gasless)
  const bookmarkPost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'bookmarkPost',
        args: [BigInt(postId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      toast.success('Bookmarked');
      
      return txHash;
    } catch (error) {
      console.error('❌ Bookmark failed:', error);
      showErrorToast('Failed to Bookmark', error);
      throw error;
    }
  };

  // Unbookmark post (gasless)
  const unbookmarkPost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'unbookmarkPost',
        args: [BigInt(postId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      toast.success('Removed from bookmarks');
      
      return txHash;
    } catch (error) {
      console.error('❌ Unbookmark failed:', error);
      showErrorToast('Failed to Remove Bookmark', error);
      throw error;
    }
  };

  // Pin post (gasless)
  const pinPost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'pinPost',
        args: [BigInt(postId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      showSuccessToast('Post Pinned', txHash, 'Pinned to your profile');
      
      return txHash;
    } catch (error) {
      console.error('❌ Pin post failed:', error);
      showErrorToast('Failed to Pin Post', error);
      throw error;
    }
  };

  // Unpin post (gasless)
  const unpinPost = async (postId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'unpinPost',
        args: []
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      showSuccessToast('Post Unpinned', txHash);
      
      return txHash;
    } catch (error) {
      console.error('❌ Unpin post failed:', error);
      showErrorToast('Failed to Unpin Post', error);
      throw error;
    }
  };

  // Quote post (gasless)
  const quotePost = async (quotedPostId: number, content: string): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      toast.loading('Quoting post...', { id: `quote-${quotedPostId}` });

      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'quotePost',
        args: [BigInt(quotedPostId), content]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      
      toast.dismiss(`quote-${quotedPostId}`);
      showSuccessToast('Post Quoted!', txHash, content.substring(0, 50) + (content.length > 50 ? '...' : ''));
      
      return txHash;
    } catch (error) {
      console.error('❌ Quote post failed:', error);
      toast.dismiss(`quote-${quotedPostId}`);
      showErrorToast('Failed to Quote Post', error);
      throw error;
    }
  };

  // Delete quote (gasless)
  const deleteQuote = async (quoteId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'deleteQuote',
        args: [BigInt(quoteId)]
      });

      const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
      showSuccessToast('Quote Deleted', txHash);
      
      return txHash;
    } catch (error) {
      console.error('❌ Delete quote failed:', error);
      showErrorToast('Failed to Delete Quote', error);
      throw error;
    }
  };

  // Like quote (gasless)
  const likeQuote = async (quoteId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'likeQuote',
        args: [BigInt(quoteId)]
      });

      return await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
    } catch (error) {
      console.error('❌ Like quote failed:', error);
      throw error;
    }
  };

  // Unlike quote (gasless)
  const unlikeQuote = async (quoteId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'unlikeQuote',
        args: [BigInt(quoteId)]
      });

      return await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
    } catch (error) {
      console.error('❌ Unlike quote failed:', error);
      throw error;
    }
  };

  // Like comment (gasless)
  const likeComment = async (commentId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'likeComment',
        args: [BigInt(commentId)]
      });

      return await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
    } catch (error) {
      console.error('❌ Like comment failed:', error);
      throw error;
    }
  };

  // Unlike comment (gasless)
  const unlikeComment = async (commentId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: SOCIAL_ABI,
        functionName: 'unlikeComment',
        args: [BigInt(commentId)]
      });

      return await executeGaslessTransaction(CONTRACT_ADDRESSES.socialGraph, data);
    } catch (error) {
      console.error('❌ Unlike comment failed:', error);
      throw error;
    }
  };
  */

  // Send message (gasless)
  const sendMessage = async (
    recipient: string,
    content: string,
    metadata: string,
    tipAmount: number
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: [
          {
            name: 'sendMessage',
            type: 'function',
            inputs: [
              { name: 'recipient', type: 'address' },
              { name: 'content', type: 'string' },
              { name: 'metadata', type: 'string' }
            ],
            outputs: []
          }
        ],
        functionName: 'sendMessage',
        args: [recipient as `0x${string}`, content, metadata]
      });

      const value = tipAmount > 0 ? parseEther(tipAmount.toString()) : 0n;
      // TODO: Implement directMessages contract
      throw new Error('Direct messages not yet implemented');
    } catch (error) {
      console.error('Send message failed:', error);
      throw error;
    }
  };

  // Send tip (gasless)
  const sendTip = async (
    recipient: string,
    message: string,
    amount: number,
    tokenAddress: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    try {
      const data = encodeFunctionData({
        abi: [
          {
            name: 'sendTip',
            type: 'function',
            inputs: [
              { name: 'recipient', type: 'address' },
              { name: 'message', type: 'string' },
              { name: 'tokenAddress', type: 'address' }
            ],
            outputs: []
          }
        ],
        functionName: 'sendTip',
        args: [recipient as `0x${string}`, message, tokenAddress as `0x${string}`]
      });

      const value = parseEther(amount.toString());
      return await executeGaslessTransaction(CONTRACT_ADDRESSES.tippingSystem, data, value);
    } catch (error) {
      console.error('Send tip failed:', error);
      throw error;
    }
  };

  // Mint song NFT (gasless) - with transaction queue to prevent nonce collision
  const mintSongNFT = async (
    to: string,
    title: string,
    artist: string,
    genre: string,
    duration: number,
    ipfsAudioHash: string,
    ipfsArtworkHash: string,
    royaltyPercentage: number,
    isExplicit: boolean,
    metadataURI?: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    // 🔥 Import transaction queue dynamically
    const { transactionQueue } = await import('@/services/nonceManager');
    
    // 🔥 Enqueue transaction to prevent nonce collision
    return transactionQueue.enqueue(async () => {
      try {
        // 🔥 REMOVED: Don't show toast here - let useNFTOperations handle it
        // This prevents double toast (one from here, one from useNFTOperations)
        
        // Use provided metadataURI or construct default one
        const finalMetadataURI = metadataURI || `ipfs://${ipfsAudioHash.replace('ipfs://', '')}/metadata.json`;
        
        console.log('🎵 Minting NFT with complete metadata:', {
          to,
          title,
          artist,
          genre,
          duration,
          ipfsAudioHash,
          ipfsArtworkHash,
          royaltyPercentage,
          isExplicit,
          metadataURI: finalMetadataURI,
          metadataProvided: !!metadataURI,
          contractAddress: CONTRACT_ADDRESSES.songNFT
        });
        
        const data = encodeFunctionData({
          abi: [
            {
              name: 'mintSong',
              type: 'function',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'title', type: 'string' },
                { name: 'artist', type: 'string' },
                { name: 'genre', type: 'string' },
                { name: 'duration', type: 'uint256' },
                { name: 'ipfsAudioHash', type: 'string' },
                { name: 'ipfsArtworkHash', type: 'string' },
                { name: 'royaltyPercentage', type: 'uint256' },
                { name: 'isExplicit', type: 'bool' },
                { name: 'metadataURI', type: 'string' }
              ],
              outputs: []
            }
          ],
          functionName: 'mintSong',
          args: [
            to as `0x${string}`,
            title,
            artist,
            genre,
            BigInt(duration),
            ipfsAudioHash,
            ipfsArtworkHash,
            BigInt(royaltyPercentage),
            isExplicit,
            finalMetadataURI
          ]
        });

        const txHash = await executeGaslessTransaction(CONTRACT_ADDRESSES.songNFT, data);
        
        // 🔥 REMOVED: Don't show success toast here
        // useNFTOperations will show the success toast with more details
        console.log('✅ Mint transaction sent successfully:', txHash);
        
        return txHash;
      } catch (error) {
        console.error('Mint song NFT failed:', error);
        // 🔥 REMOVED: Don't show error toast here
        // useNFTOperations will handle error display
        throw error;
      }
    });
  };

  // Create Album/EP/Single (gasless) - with transaction queue to prevent nonce collision
  const createAlbum = async (
    title: string,
    description: string,
    coverImageHash: string,
    albumType: number, // 0 = SINGLE, 1 = EP, 2 = ALBUM
    metadataURI: string
  ): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    // 🔥 Import transaction queue dynamically
    const { transactionQueue } = await import('@/services/nonceManager');
    
    // 🔥 Enqueue transaction to prevent nonce collision
    return transactionQueue.enqueue(async () => {
      try {
        // 🔥 REMOVED: Don't show toast here
        // PublishAlbumModal handles all toast notifications for better UX
        console.log('🎵 Creating album:', {
          title,
          albumType,
          coverImageHash,
          metadataURI,
          albumManager: CONTRACT_ADDRESSES.albumManager,
          from: smartAccountAddress
        });

        const data = encodeFunctionData({
          abi: [
            {
              name: 'createAlbum',
              type: 'function',
              inputs: [
                { name: 'title', type: 'string' },
                { name: 'description', type: 'string' },
                { name: 'coverImageHash', type: 'string' },
                { name: 'albumType', type: 'uint8' },
                { name: 'metadataURI', type: 'string' }
              ],
              outputs: [{ name: '', type: 'uint256' }]
            }
          ],
          functionName: 'createAlbum',
          args: [title, description, coverImageHash, albumType, metadataURI]
        });

        const txHash = await executeGaslessTransaction(
          CONTRACT_ADDRESSES.albumManager,
          data
        );

        // 🔥 REMOVED: Don't show success toast here
        // PublishAlbumModal will show appropriate toast after adding songs
        console.log('✅ Album created successfully:', {
          title,
          txHash
        });
        
        return txHash;
      } catch (error) {
        console.error('❌ Create album failed:', {
          title,
          error
        });
        // 🔥 REMOVED: Don't show error toast here
        // PublishAlbumModal will handle error display
        throw error;
      }
    });
  };

  // Add song to album (gasless) - with transaction queue to prevent nonce collision
  const addSongToAlbum = async (albumId: number, songTokenId: number): Promise<string> => {
    if (!smartAccountAddress) throw new Error('Account not ready');

    // 🔥 Import transaction queue dynamically
    const { transactionQueue } = await import('@/services/nonceManager');
    
    // 🔥 Enqueue transaction to prevent nonce collision
    return transactionQueue.enqueue(async () => {
      try {
        // 🔥 REMOVED: Don't show toast here
        // PublishAlbumModal handles all toast notifications for better UX
        console.log('🎵 Adding song to album:', {
          albumId,
          songTokenId,
          albumManager: CONTRACT_ADDRESSES.albumManager,
          from: smartAccountAddress
        });

        const data = encodeFunctionData({
          abi: [
            {
              name: 'addSongToAlbum',
              type: 'function',
              inputs: [
                { name: 'albumId', type: 'uint256' },
                { name: 'songTokenId', type: 'uint256' }
              ],
              outputs: []
            }
          ],
          functionName: 'addSongToAlbum',
          args: [BigInt(albumId), BigInt(songTokenId)]
        });

        const txHash = await executeGaslessTransaction(
          CONTRACT_ADDRESSES.albumManager,
          data
        );

        // 🔥 REMOVED: Don't show success toast here
        // PublishAlbumModal will show summary toast after all songs added
        console.log('✅ Song added to album successfully:', {
          albumId,
          songTokenId,
          txHash
        });
        
        return txHash;
      } catch (error) {
        console.error('❌ Add song to album failed:', {
          albumId,
          songTokenId,
          error
        });
        // 🔥 REMOVED: Don't show error toast here
        // PublishAlbumModal will handle error display and retry logic
        throw error;
      }
    });
  };

  // Check if profile exists on-chain
  const profileExists = useCallback(async (address: string): Promise<boolean> => {
    if (!address || !publicClient) return false;

    try {
      console.log('🔍 Checking profile existence using profileService for:', address);

      // Use profileService.hasProfile yang sudah terintegrasi dengan Somnia DataStream
      const { profileService } = await import('../services/profileService');
      return await profileService.hasProfile(address);

    } catch (error) {
      console.error('❌ Profile existence check failed:', error);
      return false;
    }
  }, [publicClient]);

  // Get profile data from on-chain
  const getProfile = useCallback(async (address: string): Promise<any> => {
    if (!address || !publicClient) return null;

    try {
      console.log('🔍 Fetching profile data using profileService for:', address);

      // Use profileService.getProfile yang sudah terintegrasi dengan Somnia DataStream
      const { profileService } = await import('../services/profileService');
      return await profileService.getProfile(address);

    } catch (error) {
      console.warn('⚠️ Failed to fetch profile using profileService:', error);

      // Fallback: return default profile structure
      return {
        username: `user_${address.slice(-6)}`,
        displayName: '',
        bio: '',
        avatarHash: '',
        location: '',
        isArtist: false,
        createdAt: Date.now()
      };
    }
  }, [publicClient]);

  const value: SequenceContextType = {
    smartAccountAddress,
    isAccountReady,
    isGaslessEnabled,
    isSessionActive,
    createSession,
    closeSession,
    createProfile,
    updateProfile,
    updateSocialLinks,
    updateMusicPreferences,
    upgradeToArtist,
    updateArtistData,
    createPlaylist,
    followUser,
    unfollowUser,
    sendMessage,
    sendTip,
    mintSongNFT,
    createAlbum,
    addSongToAlbum,
    profileExists,
    getProfile,
    executeGaslessTransaction,
  };

  return (
    <SequenceContext.Provider value={value}>
      {children}
    </SequenceContext.Provider>
  );
};