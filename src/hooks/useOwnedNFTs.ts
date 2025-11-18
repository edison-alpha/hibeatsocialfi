import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';

export interface OwnedNFT {
  tokenId: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  ipfsAudioHash: string;
  ipfsArtworkHash: string;
  ipfsMetadataHash: string;
  royaltyPercentage: number;
  isExplicit: boolean;
  artistAddress: string;
  createdAt: number;
  likeCount: number;
  playCount: number;
  imageUrl: string;
  audioUrl: string;
  metadataUrl: string;
  // Additional metadata for categorization
  metadata?: {
    title?: string;
    artist?: string;
    genre?: string;
    duration?: number;
    image?: string;
    type?: 'single' | 'playlist' | 'album';
    creator?: string;
    trackCount?: number;
    description?: string;
    year?: number;
  };
}

export interface OwnedNFTsData {
  singles: OwnedNFT[];
  playlists: OwnedNFT[];
  albums: OwnedNFT[];
}

export const useOwnedNFTs = () => {
  const { address } = useAccount();
  const { isConnected: datastreamConnected, readMusicEvents } = useSomniaDatastream();
  const [ownedNFTs, setOwnedNFTs] = useState<OwnedNFTsData>({ singles: [], playlists: [], albums: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SONG_NFT_ADDRESS = '0x328f1d2448897109b8Bc1C20b684088b83bb4127';

  // Query owned NFTs from DataStream cache
  const queryOwnedNFTsFromDataStream = async (userAddress: string): Promise<OwnedNFTsData | null> => {
    try {
      // Query NFT ownership data from DataStream schema
      const ownershipData = await somniaDatastreamService.getAllPublisherDataForSchema(
        'hibeats_nft_ownership_v1',
        userAddress.toLowerCase()
      );

      if (!ownershipData || ownershipData.length === 0) {
        return null;
      }

      // Categorize NFTs based on metadata
      const categorizedNFTs: OwnedNFTsData = {
        singles: [],
        playlists: [],
        albums: []
      };

      for (const ownershipRecord of ownershipData) {
        const nft: OwnedNFT = {
          tokenId: ownershipRecord.tokenId,
          title: ownershipRecord.title || 'Untitled',
          artist: ownershipRecord.artist || 'Unknown Artist',
          genre: ownershipRecord.genre || 'Music',
          duration: ownershipRecord.duration || 0,
          ipfsAudioHash: ownershipRecord.ipfsAudioHash || '',
          ipfsArtworkHash: ownershipRecord.ipfsArtworkHash || '',
          ipfsMetadataHash: ownershipRecord.ipfsMetadataHash || '',
          royaltyPercentage: ownershipRecord.royaltyPercentage || 0,
          isExplicit: ownershipRecord.isExplicit || false,
          artistAddress: ownershipRecord.artistAddress || '',
          createdAt: ownershipRecord.createdAt || Date.now(),
          likeCount: ownershipRecord.likeCount || 0,
          playCount: ownershipRecord.playCount || 0,
          imageUrl: ownershipRecord.imageUrl || '',
          audioUrl: ownershipRecord.audioUrl || '',
          metadataUrl: ownershipRecord.metadataUrl || '',
          metadata: ownershipRecord.metadata || {}
        };

        // Categorize based on metadata type
        const type = nft.metadata?.type;
        if (type === 'playlist') {
          categorizedNFTs.playlists.push(nft);
        } else if (type === 'album') {
          categorizedNFTs.albums.push(nft);
        } else {
          categorizedNFTs.singles.push(nft);
        }
      }

      return categorizedNFTs;
    } catch (error: any) {
      // NoData() error is expected when no data exists yet
      if (error?.message?.includes('NoData()')) {
        console.log('📭 No NFT ownership data found in DataStream');
        return null;
      }
      console.error('Failed to query NFTs from DataStream:', error);
      return null;
    }
  };

  // Query owned NFTs from blockchain
  const queryOwnedNFTsFromBlockchain = async (userAddress: string): Promise<OwnedNFTsData> => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // SongNFT contract ABI (minimal for reading)
      const songNFTABI = [
        "function balanceOf(address owner) external view returns (uint256)",
        "function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)",
        "function getSongMetadata(uint256 tokenId) external view returns (tuple(string title, string artist, string genre, uint256 duration, string ipfsAudioHash, string ipfsArtworkHash, uint256 royaltyPercentage, address artistAddress, uint256 createdAt, bool isExplicit, uint256 likeCount, uint256 playCount))",
        "function tokenURI(uint256 tokenId) external view returns (string)"
      ];

      const songNFTContract = new ethers.Contract(
        SONG_NFT_ADDRESS,
        songNFTABI,
        provider
      );

      console.log('🔍 Querying NFT balance for:', userAddress);

      // Get balance of NFTs owned by user with error handling
      let balance;
      try {
        balance = await songNFTContract.balanceOf(userAddress);
      } catch (balanceError) {
        console.error('❌ Failed to get NFT balance (contract may not exist):', balanceError);
        // Return empty result if contract doesn't exist or fails
        return { singles: [], playlists: [], albums: [] };
      }

      const balanceNumber = parseInt(balance.toString());
      console.log('✅ NFT balance:', balanceNumber);

      const categorizedNFTs: OwnedNFTsData = {
        singles: [],
        playlists: [],
        albums: []
      };

      if (balanceNumber === 0) {
        console.log('ℹ️ No NFTs owned');
        return categorizedNFTs;
      }

      // Get all token IDs owned by user
      for (let i = 0; i < balanceNumber; i++) {
        try {
          const tokenId = await songNFTContract.tokenOfOwnerByIndex(userAddress, i);
          const tokenIdString = tokenId.toString();

          // Get metadata for this token
          const metadata = await songNFTContract.getSongMetadata(tokenId);

          // Get token URI for additional metadata
          const tokenURI = await songNFTContract.tokenURI(tokenId);

          // Try to fetch and parse metadata JSON for categorization
          let parsedMetadata: any = {};
          try {
            if (tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '');
              const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
              if (response.ok) {
                parsedMetadata = await response.json();
              }
            }
          } catch (metadataError) {
            console.warn(`Failed to fetch metadata for token ${tokenIdString}:`, metadataError);
          }

          const nft: OwnedNFT = {
            tokenId: tokenIdString,
            title: metadata.title,
            artist: metadata.artist,
            genre: metadata.genre,
            duration: parseInt(metadata.duration.toString()),
            ipfsAudioHash: metadata.ipfsAudioHash,
            ipfsArtworkHash: metadata.ipfsArtworkHash,
            ipfsMetadataHash: tokenURI.replace('ipfs://', ''),
            royaltyPercentage: parseInt(metadata.royaltyPercentage.toString()),
            isExplicit: metadata.isExplicit,
            artistAddress: metadata.artistAddress,
            createdAt: parseInt(metadata.createdAt.toString()),
            likeCount: parseInt(metadata.likeCount.toString()),
            playCount: parseInt(metadata.playCount.toString()),
            imageUrl: metadata.ipfsArtworkHash ? `https://ipfs.io/ipfs/${metadata.ipfsArtworkHash}` : '',
            audioUrl: metadata.ipfsAudioHash ? `https://ipfs.io/ipfs/${metadata.ipfsAudioHash}` : '',
            metadataUrl: tokenURI,
            metadata: parsedMetadata
          };

          // Categorize based on metadata attributes
          const type = parsedMetadata.attributes?.find((attr: any) => attr.trait_type === 'Type')?.value ||
                      parsedMetadata.type;
          if (type === 'playlist') {
            categorizedNFTs.playlists.push(nft);
          } else if (type === 'album') {
            categorizedNFTs.albums.push(nft);
          } else {
            categorizedNFTs.singles.push(nft);
          }
        } catch (tokenError) {
          console.error(`Failed to fetch metadata for token index ${i}:`, tokenError);
          // Continue with other tokens
        }
      }

      return categorizedNFTs;
    } catch (error) {
      console.error('❌ Failed to query NFTs from blockchain:', error);
      // Return empty result on error
      return { singles: [], playlists: [], albums: [] };
    }
  };

  // Index owned NFTs in DataStream for caching
  const indexOwnedNFTsInDataStream = async (userAddress: string, nftsData: OwnedNFTsData) => {
    try {
      const allNFTs = [...nftsData.singles, ...nftsData.playlists, ...nftsData.albums];

      for (const nft of allNFTs) {
        const ownershipRecord = {
          tokenId: nft.tokenId,
          ownerAddress: userAddress.toLowerCase(),
          title: nft.title,
          artist: nft.artist,
          genre: nft.genre,
          duration: nft.duration,
          ipfsAudioHash: nft.ipfsAudioHash,
          ipfsArtworkHash: nft.ipfsArtworkHash,
          ipfsMetadataHash: nft.ipfsMetadataHash,
          royaltyPercentage: nft.royaltyPercentage,
          isExplicit: nft.isExplicit,
          artistAddress: nft.artistAddress,
          createdAt: nft.createdAt,
          likeCount: nft.likeCount,
          playCount: nft.playCount,
          imageUrl: nft.imageUrl,
          audioUrl: nft.audioUrl,
          metadataUrl: nft.metadataUrl,
          metadata: nft.metadata,
          indexedAt: Date.now(),
          contractAddress: SONG_NFT_ADDRESS
        };

        // Store in DataStream schema for future queries
        await somniaDatastreamService.storeByKey(
          'hibeats_nft_ownership_v1',
          `${userAddress.toLowerCase()}_${nft.tokenId}`,
          ownershipRecord
        );
      }

      console.log(`✅ Indexed ${allNFTs.length} NFTs for user ${userAddress} in DataStream`);
    } catch (error) {
      console.error('Failed to index NFTs in DataStream:', error);
      throw error;
    }
  };

  const fetchOwnedNFTs = async () => {
    if (!address || !window.ethereum) {
      setOwnedNFTs({ singles: [], playlists: [], albums: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First try to get data from DataStream cache
      if (datastreamConnected) {
        try {
          console.log('🔍 Querying owned NFTs from DataStream cache...');
          const cachedNFTs = await queryOwnedNFTsFromDataStream(address);
          if (cachedNFTs && (cachedNFTs.singles.length > 0 || cachedNFTs.playlists.length > 0 || cachedNFTs.albums.length > 0)) {
            console.log('✅ Found cached NFT data in DataStream');
            setOwnedNFTs(cachedNFTs);
            setIsLoading(false);
            return;
          }
        } catch (datastreamError) {
          console.warn('⚠️ DataStream query failed, falling back to blockchain:', datastreamError);
        }
      }

      // Fallback to direct blockchain query
      console.log('🔗 Querying owned NFTs from blockchain...');
      const blockchainNFTs = await queryOwnedNFTsFromBlockchain(address);

      // Index the results in DataStream for future queries
      if (datastreamConnected && blockchainNFTs) {
        try {
          await indexOwnedNFTsInDataStream(address, blockchainNFTs);
          console.log('✅ Indexed NFT ownership data in DataStream');
        } catch (indexError) {
          console.warn('⚠️ Failed to index NFTs in DataStream:', indexError);
        }
      }

      setOwnedNFTs(blockchainNFTs);
    } catch (error) {
      console.error('Failed to fetch owned NFTs:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch NFTs');
      setOwnedNFTs({ singles: [], playlists: [], albums: [] });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnedNFTs();
  }, [address]);

  const refetch = () => {
    fetchOwnedNFTs();
  };

  return {
    ownedNFTs,
    isLoading,
    error,
    refetch
  };
};