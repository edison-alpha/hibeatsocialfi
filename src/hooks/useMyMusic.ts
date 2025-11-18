// Hook to fetch user's music NFTs (songs) from blockchain
import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { SONG_NFT_ABI } from '@/lib/abis/SongNFT';

interface MusicNFT {
  tokenId: number;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  ipfsAudioHash: string;
  ipfsArtworkHash: string;
  metadataURI: string;
  royaltyPercentage: number;
  isExplicit: boolean;
  likeCount: number;
  playCount: number;
  createdAt: number;
}

export const useMyMusic = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [songs, setSongs] = useState<MusicNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMySongs = async () => {
    if (!address || !publicClient) {
      setSongs([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 [useMyMusic] Loading songs for:', address);

      // Get artist songs
      const tokenIds = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.songNFT as `0x${string}`,
        abi: SONG_NFT_ABI,
        functionName: 'getArtistSongs',
        args: [address as `0x${string}`],
      } as any) as bigint[];

      console.log('📀 [useMyMusic] Found token IDs:', tokenIds);

      if (tokenIds.length === 0) {
        setSongs([]);
        setIsLoading(false);
        return;
      }

      // Load metadata for each token
      const songPromises = tokenIds.map(async (tokenId) => {
        try {
          const metadata = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.songNFT as `0x${string}`,
            abi: SONG_NFT_ABI,
            functionName: 'getSongMetadata',
            args: [tokenId]
          } as any) as any;

          const tokenURI = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.songNFT as `0x${string}`,
            abi: SONG_NFT_ABI,
            functionName: 'tokenURI',
            args: [tokenId]
          } as any) as string;

          return {
            tokenId: Number(tokenId),
            title: metadata.title,
            artist: metadata.artist,
            genre: metadata.genre,
            duration: Number(metadata.duration),
            ipfsAudioHash: metadata.ipfsAudioHash,
            ipfsArtworkHash: metadata.ipfsArtworkHash,
            metadataURI: tokenURI,
            royaltyPercentage: Number(metadata.royaltyPercentage),
            isExplicit: metadata.isExplicit,
            likeCount: Number(metadata.likeCount),
            playCount: Number(metadata.playCount),
            createdAt: Number(metadata.createdAt),
          };
        } catch (error) {
          console.error(`Failed to load metadata for token ${tokenId}:`, error);
          return null;
        }
      });

      const loadedSongs = (await Promise.all(songPromises)).filter(Boolean) as MusicNFT[];
      
      console.log('✅ [useMyMusic] Loaded songs:', loadedSongs.length);
      setSongs(loadedSongs);
    } catch (error) {
      console.error('❌ [useMyMusic] Failed to load songs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load songs');
      setSongs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMySongs();
  }, [address, publicClient]);

  return {
    songs,
    isLoading,
    error,
    refetch: loadMySongs
  };
};
