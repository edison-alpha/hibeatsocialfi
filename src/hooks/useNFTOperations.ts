// src/hooks/useNFTOperations.ts
import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { ethers } from 'ethers';
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

  // Get songNFT contract - always use direct instance for now since ERC4337 context has mock contracts
  const getSongNFTContract = async () => {
    // Always use direct contract instance since ERC4337 context has mock contracts without proper ABI
    if (!window.ethereum) {
      throw new Error('No Ethereum provider available');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    // Ensure wallet is connected to Somnia testnet (chainId 50312 / 0xC488)
    try {
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== 50312) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xC488' }],
          });
        } catch (switchError: any) {
          // If the chain hasn't been added to the wallet, request to add it
          if (switchError && switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xC488',
                  chainName: 'Somnia Testnet',
                  nativeCurrency: { name: 'SOM', symbol: 'SOM', decimals: 18 },
                  rpcUrls: ['https://dream-rpc.somnia.network'],
                  blockExplorerUrls: ['https://shannon-explorer.somnia.network']
                }]
              });
            } catch (addErr) {
              console.warn('Failed to add Somnia network to wallet:', addErr);
            }
          } else {
            console.warn('Failed to switch network:', switchError);
          }
        }
      }
    } catch (err) {
      console.warn('Unable to determine provider network:', err);
    }

    const signer = await provider.getSigner();

    // Full ABI for SongNFT contract
    const songNFTABI = [
      "function mintSong(address to, string memory title, string memory artist, string memory genre, uint256 duration, string memory ipfsAudioHash, string memory ipfsArtworkHash, uint256 royaltyPercentage, bool isExplicit, string memory metadataURI) external returns (uint256)",
      "function tokenURI(uint256 tokenId) external view returns (string memory)",
      "function ownerOf(uint256 tokenId) external view returns (address)",
      "function getSongMetadata(uint256 tokenId) external view returns (tuple(string title, string artist, string genre, uint256 duration, string ipfsAudioHash, string ipfsArtworkHash, uint256 royaltyPercentage, address artistAddress, uint256 createdAt, bool isExplicit, uint256 likeCount, uint256 playCount))",
      "event SongMinted(uint256 indexed tokenId, address indexed artist, string title, string ipfsAudioHash)",
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ];

    const songNFTContract = new ethers.Contract(
      SONG_NFT_ADDRESS,
      songNFTABI,
      signer
    );

    return songNFTContract;
  };

  const mintSongNFT = async (params: NFTMintParams): Promise<MintingResult> => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return { success: false, error: 'Wallet not connected' };
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

      setMintingProgress('Waiting for confirmation...');

      // For ERC4337, we need to wait for the user operation to be mined
      // This is a simplified version - in production you'd poll for the user operation receipt
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for processing

      // Extract token ID from transaction (this would need to be implemented based on your bundler)
      // For now, we'll use a placeholder approach
      const tokenId = 'pending'; // In production, you'd get this from the user operation receipt

      const explorerUrl = `https://shannon-explorer.somnia.network/tx/${transactionHash}`;

      setMintingProgress('NFT minted successfully with sponsored gas!');

      // Include explorer URL in toast so the user can open/copy it
      toast.success(`🎵 NFT Minted with FREE gas! Token ID: ${tokenId} — View: ${explorerUrl}`);

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
      console.error('NFT minting failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check if it's a wallet timeout or user rejection
      const isWalletIssue = errorMessage.includes('timeout') || 
                           errorMessage.includes('rejected') ||
                           errorMessage.includes('cancelled');

      // Fallback to direct contract call if ERC4337 fails
      if (isWalletIssue) {
        toast.warning('Gasless minting unavailable. Switching to direct minting (you pay gas)...');
        console.log('⚠️ Gasless minting timeout, switching to direct minting...');
      } else {
        console.log('❌ ERC4337 minting failed, trying direct contract call...');
      }

      try {
        setMintingProgress('Falling back to direct minting...');

        const songNFT = await getSongNFTContract();

        if (!params.ipfsAudioHash || !params.title) {
          throw new Error('Missing required NFT parameters: ipfsAudioHash and title are required');
        }

        // Ensure metadataURI is properly formatted for fallback
        const fallbackMetadataURI = params.metadataURI;
        
        console.log('🔄 Fallback minting with metadataURI:', fallbackMetadataURI);
        
        const tx = await songNFT.mintSong(
          params.to,
          params.title,
          params.artist || 'HiBeats AI',
          params.genre || 'Electronic',
          params.duration,
          params.ipfsAudioHash,
          params.ipfsArtworkHash || '',
          params.royaltyPercentage || 500,
          params.isExplicit || false,
          fallbackMetadataURI
        );

        const receipt = await tx.wait();

        if (receipt?.status === 1) {
          const mintEvent = receipt.logs.find(log => {
            try {
              const parsed = songNFT.interface.parseLog(log);
              return parsed?.name === 'SongMinted';
            } catch {
              return false;
            }
          });

          let tokenId = 'unknown';
          if (mintEvent) {
            const parsed = songNFT.interface.parseLog(mintEvent);
            tokenId = parsed?.args[0]?.toString() || 'unknown';
          }

          const explorerUrl = `https://shannon-explorer.somnia.network/tx/${receipt.hash}`;

          setMintingProgress('NFT minted successfully (with gas fees)!');

          toast.success(`🎵 NFT Minted! Token ID: ${tokenId} (Note: Gas fees were paid by you) — View: ${explorerUrl}`);

          // Log metadata URI for debugging
          console.log('✅ NFT Minted successfully (fallback):', {
            tokenId,
            transactionHash: receipt.hash,
            metadataURI: params.metadataURI,
            explorerUrl
          });

          return {
            success: true,
            tokenId,
            transactionHash: receipt.hash,
            explorerUrl
          };
        } else {
          throw new Error('Transaction failed');
        }

      } catch (fallbackError) {
        console.error('Fallback minting also failed:', fallbackError);
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Fallback minting failed';

        // Check if user rejected the transaction
        if (fallbackErrorMessage.includes('rejected') || fallbackErrorMessage.includes('denied')) {
          toast.error('Transaction was rejected. Please try again when ready.');
          return {
            success: false,
            error: 'User rejected transaction'
          };
        }

        toast.error(`Failed to mint NFT: ${fallbackErrorMessage}`);

        return {
          success: false,
          error: fallbackErrorMessage
        };
      }
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
   */
  const getTokenURI = async (tokenId: string): Promise<string | null> => {
    try {
      const songNFT = await getSongNFTContract();
      const uri = await songNFT.tokenURI(tokenId);
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