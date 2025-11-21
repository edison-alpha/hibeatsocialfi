// src/hooks/useNFTOperations.ts
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { useSequence } from '../contexts/SequenceContext';
import { NFTMintParams } from '../types/music';
import { CONTRACT_ADDRESSES } from '../lib/web3-config';

// Extend window type for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface MintingResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  explorerUrl?: string;
  error?: string;
}

export const useNFTOperations = () => {
  const { address } = useAccount();
  const { mintSongNFT: sequenceMintSongNFT } = useSequence();

  const [isMinting, setIsMinting] = useState(false);
  const [mintingProgress, setMintingProgress] = useState<string>('');

  // Contract address from web3-config
  const SONG_NFT_ADDRESS = CONTRACT_ADDRESSES.songNFT;

  // 🔥 REMOVED: getSongNFTContract fallback
  // Reason: Triggers MetaMask/OKX for Sequence users (logged in with Gmail)
  // All minting should use gasless Sequence WaaS only
  // If gasless fails, show error instead of fallback to paid transaction

  const mintSongNFT = async (params: NFTMintParams): Promise<MintingResult> => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return { success: false, error: 'Wallet not connected' };
    }

    // 🔒 CRITICAL: Prevent concurrent minting
    if (isMinting) {
      console.warn('⚠️ Minting already in progress, rejecting duplicate call');
      return { 
        success: false, 
        error: 'Minting already in progress. Please wait for the current operation to complete.' 
      };
    }

    setIsMinting(true);
    setMintingProgress('Preparing NFT minting...');

    try {
      // Ensure metadataURI is properly formatted and required
      const metadataURI = params.metadataURI;
      
      // Validate required fields
      if (!metadataURI) {
        throw new Error('metadataURI is required for minting NFT with proper metadata');
      }
      
      if (!params.ipfsAudioHash) {
        throw new Error('ipfsAudioHash is required for minting NFT');
      }
      
      console.log('🎵 Minting NFT with params:', {
        to: params.to,
        title: params.title,
        artist: params.artist,
        metadataURI,
        ipfsAudioHash: params.ipfsAudioHash,
        ipfsArtworkHash: params.ipfsArtworkHash
      });

      // Use ERC4337 gasless minting with paymaster sponsorship
      setMintingProgress('Minting NFT with sponsored gas...');
      
      console.log('🎵 Minting NFT with auto-approved transaction...');

      const transactionHash = await sequenceMintSongNFT(
        params.to,
        params.title,
        params.artist || 'HiBeats AI',
        params.genre || 'Electronic',
        params.duration,
        params.ipfsAudioHash,
        params.ipfsArtworkHash || '',
        params.royaltyPercentage || 500,
        params.isExplicit || false,
        metadataURI
      );

      setMintingProgress('Waiting for blockchain confirmation...');

      // 🔥 CRITICAL: Wait for blockchain confirmation using Datastream (faster than RPC polling)
      console.log('⏳ Waiting for transaction confirmation:', transactionHash);
      
      try {
        // Import Datastream wait function (same as SequenceContext uses)
        const { waitForTransactionWithFallback } = await import('@/utils/waitForTransactionDatastream');
        const { getPublicClient } = await import('@wagmi/core');
        const { wagmiConfig } = await import('@/lib/web3-config');
        
        const publicClient = getPublicClient(wagmiConfig);
        
        if (!publicClient) {
          console.warn('⚠️ Public client not available, using fallback delay');
          // Wait a bit for transaction to be mined (Somnia has sub-second finality)
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          // Use Datastream for real-time confirmation (much faster than RPC polling)
          const receipt = await waitForTransactionWithFallback(
            transactionHash,
            publicClient,
            10000 // 10s timeout
          );

          console.log('✅ Transaction confirmed via Datastream:', {
            hash: transactionHash,
            blockNumber: receipt.blockNumber,
            status: receipt.status,
            latency: `${receipt.confirmationTime}ms`
          });

          if (receipt.status !== 'success') {
            throw new Error('Transaction reverted on blockchain');
          }
        }
      } catch (waitError: any) {
        // 🔥 CRITICAL: Don't throw error if it's just a timeout or confirmation issue
        // Transaction was already sent successfully, just confirmation is slow
        const errorMsg = waitError?.message || String(waitError);
        const isTimeout = errorMsg.includes('timeout') || 
                         errorMsg.includes('deadline exceeded') ||
                         errorMsg.includes('timed out') ||
                         errorMsg.includes('ETIMEDOUT');
        
        const isNetworkIssue = errorMsg.includes('network') ||
                              errorMsg.includes('fetch failed') ||
                              errorMsg.includes('ECONNREFUSED');
        
        if (isTimeout || isNetworkIssue) {
          console.warn('⚠️ Confirmation timeout/network issue, but transaction was sent successfully:', transactionHash);
          console.warn('⚠️ Transaction will be confirmed shortly. Check explorer:', `https://shannon-explorer.somnia.network/tx/${transactionHash}`);
          console.warn('⚠️ Error details:', errorMsg);
          // Don't throw - transaction was sent successfully, just confirmation is slow
          // Continue to show success toast
        } else {
          // Real error (transaction reverted, etc) - throw it
          console.error('❌ Transaction confirmation failed with real error:', waitError);
          throw waitError;
        }
      }

      // Extract token ID from transaction
      // For now, we'll use a placeholder approach
      const tokenId = 'pending'; // In production, you'd get this from the user operation receipt

      const explorerUrl = `https://shannon-explorer.somnia.network/tx/${transactionHash}`;

      setMintingProgress('NFT minted successfully with sponsored gas!');

      // 🔥 FIXED: Show success toast only once with all details
      toast.success('🎵 NFT Minted with FREE gas!', {
        description: `Token ID: ${tokenId}`,
        duration: 5000,
        action: {
          label: 'View Transaction',
          onClick: () => window.open(explorerUrl, '_blank')
        }
      });

      // Log metadata URI for debugging
      console.log('✅ NFT Minted successfully:', {
        tokenId,
        transactionHash,
        metadataURI: params.metadataURI,
        explorerUrl
      });

      return {
        success: true,
        tokenId,
        transactionHash,
        explorerUrl
      };

    } catch (error) {
      // 🔍 DEBUG: Log detailed error information
      console.error('❌ NFT minting failed - OUTER CATCH:', error);
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if user rejected or cancelled
      if (errorMessage.includes('rejected') || 
          errorMessage.includes('cancelled') || 
          errorMessage.includes('User rejected')) {
        toast.info('Minting cancelled', {
          description: 'You cancelled the transaction',
          duration: 3000
        });
        
        return {
          success: false,
          error: 'User cancelled transaction'
        };
      }
      
      // Check if it's a duplicate transaction (already sent)
      if (errorMessage.includes('Duplicate transaction') || 
          errorMessage.includes('already in progress')) {
        toast.warning('Transaction already in progress', {
          description: 'Please wait for the current minting to complete',
          duration: 4000
        });
        
        return {
          success: false,
          error: 'Duplicate transaction'
        };
      }
      
      // For other errors (real minting failures), show error
      console.error('❌ Gasless minting failed with error:', errorMessage);
      
      toast.error('Failed to mint NFT', {
        description: errorMessage.includes('insufficient') 
          ? 'Insufficient balance or gas' 
          : errorMessage.includes('Account not ready')
          ? 'Please wait for wallet to be ready'
          : 'Please try again or contact support',
        duration: 6000
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsMinting(false);
      setMintingProgress('');
    }
  };

  const getNFTExplorerUrl = (txHash: string): string => {
    return `https://shannon-explorer.somnia.network/tx/${txHash}`;
  };

  const getNFTDetailsUrl = (tokenId: string): string => {
    return `https://shannon-explorer.somnia.network/token/${CONTRACT_ADDRESSES.songNFT}?a=${tokenId}`;
  };

  /**
   * Get token URI from blockchain to verify metadata
   * Uses publicClient instead of direct contract call to avoid MetaMask popup
   */
  const getTokenURI = async (tokenId: string): Promise<string | null> => {
    try {
      const { getPublicClient } = await import('@wagmi/core');
      const { wagmiConfig } = await import('@/lib/web3-config');
      
      const publicClient = getPublicClient(wagmiConfig);
      
      if (!publicClient) {
        console.warn('Public client not available');
        return null;
      }
      
      const uri = await publicClient.readContract({
        address: SONG_NFT_ADDRESS as `0x${string}`,
        abi: [
          {
            name: 'tokenURI',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            outputs: [{ name: '', type: 'string' }]
          }
        ] as const,
        functionName: 'tokenURI',
        args: [BigInt(tokenId)]
      } as any) as string;
      
      console.log(`📋 Token URI for token #${tokenId}:`, uri);
      return uri;
    } catch (error) {
      console.error('Failed to get token URI:', error);
      return null;
    }
  };

  /**
   * Verify NFT metadata is accessible
   */
  const verifyNFTMetadata = async (tokenId: string): Promise<boolean> => {
    try {
      const uri = await getTokenURI(tokenId);
      if (!uri) return false;

      // Try to fetch metadata from IPFS
      const metadataUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
      const response = await fetch(metadataUrl);
      
      if (response.ok) {
        const metadata = await response.json();
        console.log('✅ NFT Metadata verified:', {
          tokenId,
          name: metadata.name,
          image: metadata.image,
          audio_url: metadata.audio_url,
          attributesCount: metadata.attributes?.length || 0
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to verify NFT metadata:', error);
      return false;
    }
  };

  return {
    mintSongNFT,
    isMinting,
    mintingProgress,
    getNFTExplorerUrl,
    getNFTDetailsUrl,
    getTokenURI,
    verifyNFTMetadata
  };
};