// src/pages/MyCollection.tsx
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { toast } from 'sonner';
import { Music, Disc3, Album, Plus, Play, Pause, ExternalLink, Package, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';
import { SONG_NFT_ABI } from '@/lib/abis/SongNFT';
import PublishAlbumModal from '@/components/PublishAlbumModal';
import Navbar from '@/components/Navbar';
import { GeneratedMusicHistory } from '@/components/GeneratedMusicHistory';
import { useSequence } from '@/contexts/SequenceContext';
import { useAudio } from '@/contexts/AudioContext';
import { useGeneratedMusic } from '@/hooks/useGeneratedMusic';
import { recordMusicPlay } from '@/utils/playCountHelper';
import { usePlayCounts } from '@/hooks/usePlayCounts';

interface SongNFT {
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
  isInAlbum?: boolean;
}

export default function MyCollection() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { smartAccountAddress, isAccountReady } = useSequence();
  const { playTrack, pauseTrack, currentTrack, isPlaying: audioIsPlaying } = useAudio();
  const { generatedMusic } = useGeneratedMusic();
  
  const [songs, setSongs] = useState<SongNFT[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishType, setPublishType] = useState<'single' | 'ep' | 'album'>('single');
  const [myAlbums, setMyAlbums] = useState<any[]>([]);
  
  // Use play counts hook with auto-refresh
  const tokenIds = songs.map(s => s.tokenId);
  const { playCounts, recordPlay, getPlayCount } = usePlayCounts(tokenIds);
  const [isLoadingAlbums, setIsLoadingAlbums] = useState(false);
  const [datastreamSongs, setDatastreamSongs] = useState<any[]>([]);

  useEffect(() => {
    if (isAccountReady && smartAccountAddress) {
      console.log('✅ [MyCollection] Loading NFTs for smart account:', smartAccountAddress);
      loadMyNFTs();
    }
  }, [isAccountReady, smartAccountAddress]);

  useEffect(() => {
    console.log('🔍 [MyCollection] useEffect triggered:', { 
      isAccountReady, 
      smartAccountAddress,
      hasSmartAccount: !!smartAccountAddress 
    });
    
    if (isAccountReady && smartAccountAddress) {
      console.log('✅ [MyCollection] Conditions met, loading albums...');
      loadMyAlbums();
    } else {
      console.log('⏳ [MyCollection] Waiting for smart account...', {
        isAccountReady,
        hasSmartAccount: !!smartAccountAddress
      });
    }
  }, [isAccountReady, smartAccountAddress]);

  const loadMyAlbums = async () => {
    if (!smartAccountAddress) {
      console.log('⚠️ Smart account address not ready yet');
      return;
    }

    setIsLoadingAlbums(true);
    try {
      console.log('🎵 Loading your albums for smart account:', smartAccountAddress);
      
      const { subgraphService } = await import('@/services/subgraphService');
      // Use smart account address (albums are created with smart account)
      const albums = await subgraphService.getUserAlbums(smartAccountAddress.toLowerCase(), 50, 0);
      
      console.log('✅ Loaded albums from subgraph:', albums.length, albums);
      
      // 🔥 TEMPORARY FIX: Fetch coverImageHash from blockchain for albums without cover
      if (albums.length > 0 && publicClient) {
        const { ALBUM_MANAGER_ABI } = await import('@/lib/abis/AlbumManager');
        
        const albumsWithCovers = await Promise.all(
          albums.map(async (album) => {
            // If album already has cover, skip
            if (album.coverImageHash) {
              return album;
            }
            
            try {
              // Read album data from contract
              const albumData = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.albumManager as `0x${string}`,
                abi: ALBUM_MANAGER_ABI,
                functionName: 'getAlbum',
                args: [BigInt(album.albumId)]
              } as any) as any;
              
              return {
                ...album,
                coverImageHash: albumData.coverImageHash || '',
                description: albumData.description || album.description
              };
            } catch (error) {
              console.error(`Failed to fetch cover for album ${album.albumId}:`, error);
              return album;
            }
          })
        );
        
        console.log('✅ Albums with covers loaded:', albumsWithCovers);
        setMyAlbums(albumsWithCovers);
      } else {
        setMyAlbums(albums);
      }
    } catch (error) {
      console.error('❌ Error loading albums:', error);
      toast.error('Failed to load albums');
    } finally {
      setIsLoadingAlbums(false);
    }
  };

  const loadMyNFTs = async () => {
    if (!smartAccountAddress || !publicClient) {
      console.log('⚠️ [MyCollection] Smart account not ready yet');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔍 [MyCollection] Loading NFTs owned by smart account:', smartAccountAddress);

      // Use subgraph to get owned songs (NFTs owned by smart account)
      const subgraphService = (await import('@/services/subgraphService')).default;
      
      // 🔥 DEBUG: Expose to window for testing
      if (typeof window !== 'undefined') {
        (window as any).testSubgraphQuery = async () => {
          console.log('🧪 Testing subgraph query...');
          const result = await subgraphService.getUserOwnedSongs(smartAccountAddress.toLowerCase(), 100, 0);
          console.log('Result:', result);
          return result;
        };
      }
      
      const ownedSongs = await subgraphService.getUserOwnedSongs(smartAccountAddress.toLowerCase(), 100, 0);

      console.log('📀 [MyCollection] Found owned songs from subgraph:', ownedSongs.length);
      console.log('📀 [MyCollection] Raw songs data:', ownedSongs);

      if (ownedSongs.length === 0) {
        console.warn('⚠️ [MyCollection] No songs found! Checking possible issues...');
        console.warn('   Smart Account:', smartAccountAddress);
        console.warn('   Query Address:', smartAccountAddress.toLowerCase());
        console.warn('   Expected: 6 songs for 0x82010a989edda6ccb1758b79defc3fe3429a201a');
        
        setSongs([]);
        setIsLoading(false); // ✅ Fix: Set loading false before return
        toast.info('No songs in your collection yet');
        return;
      }

      // Convert to SongNFT format and enrich with blockchain data if needed
      const nftPromises = ownedSongs.map(async (song) => {
        // Check if data is incomplete (missing cover or genre)
        const needsBlockchainData = !song.coverHash || !song.genre || song.genre === 'Unknown';
        
        if (needsBlockchainData) {
          try {
            // Fetch complete metadata from blockchain
            const metadata = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.songNFT as `0x${string}`,
              abi: SONG_NFT_ABI,
              functionName: 'getSongMetadata',
              args: [BigInt(song.tokenId)]
            } as any) as any;

            console.log(`📝 Enriched data for token ${song.tokenId} from blockchain:`, {
              genre: metadata.genre,
              hasCover: !!metadata.ipfsArtworkHash,
              artistAddress: metadata.artistAddress
            });

            // Get artist name - if it's "HiBeats AI", try to get real name from artistAddress
            let artistName = metadata.artist || song.artist?.displayName || song.artist?.username || 'Unknown Artist';
            
            // If artist is "HiBeats AI" and we have artistAddress, use the actual artist info from subgraph
            if (artistName === 'HiBeats AI' && song.artist?.displayName) {
              artistName = song.artist.displayName;
            } else if (artistName === 'HiBeats AI' && song.artist?.username) {
              artistName = song.artist.username;
            }

            return {
              tokenId: Number(song.tokenId),
              title: metadata.title || song.title || 'Untitled',
              artist: artistName,
              genre: metadata.genre || song.genre || 'Unknown',
              duration: Number(metadata.duration) || Number(song.duration) || 0,
              ipfsAudioHash: metadata.ipfsAudioHash || song.audioHash || '',
              ipfsArtworkHash: metadata.ipfsArtworkHash || song.coverHash || '',
              metadataURI: '',
              royaltyPercentage: Number(metadata.royaltyPercentage) || Number(song.royaltyPercentage) || 0,
              isExplicit: metadata.isExplicit || false,
              likeCount: Number(metadata.likeCount) || Number(song.likeCount) || 0,
              playCount: Number(metadata.playCount) || Number(song.playCount) || 0,
              createdAt: Number(metadata.createdAt) || Number(song.createdAt) || 0,
              isInAlbum: (song.albums?.length || 0) > 0
            };
          } catch (error) {
            console.error(`Failed to enrich data for token ${song.tokenId}:`, error);
            // Fallback to subgraph data
          }
        }

        // Use subgraph data as-is
        return {
          tokenId: Number(song.tokenId),
          title: song.title || 'Untitled',
          artist: song.artist?.displayName || song.artist?.username || 'Unknown Artist',
          genre: song.genre || 'Unknown',
          duration: Number(song.duration) || 0,
          ipfsAudioHash: song.audioHash || '',
          ipfsArtworkHash: song.coverHash || '',
          metadataURI: '',
          royaltyPercentage: Number(song.royaltyPercentage) || 0,
          isExplicit: false,
          likeCount: Number(song.likeCount) || 0,
          playCount: Number(song.playCount) || 0,
          createdAt: Number(song.createdAt) || 0,
          isInAlbum: (song.albums?.length || 0) > 0
        };
      });

      const nfts = (await Promise.all(nftPromises)).filter(Boolean) as SongNFT[];

      setSongs(nfts);
      
      console.log('✅ Loaded owned NFTs:', nfts);
      toast.success(`Loaded ${nfts.length} song${nfts.length !== 1 ? 's' : ''} in your collection`);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      toast.error('Failed to load your music collection');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectSong = (tokenId: number) => {
    // Check if song is already in an album
    const song = songs.find(s => s.tokenId === tokenId);
    if (song?.isInAlbum) {
      toast.error('This song is already in an album and cannot be selected');
      return;
    }
    
    setSelectedSongs(prev => 
      prev.includes(tokenId) 
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    );
  };

  const handlePublish = (type: 'single' | 'ep' | 'album') => {
    if (type === 'single' && selectedSongs.length !== 1) {
      toast.error('Please select exactly 1 song for a Single');
      return;
    }
    if (type === 'ep' && (selectedSongs.length < 3 || selectedSongs.length > 6)) {
      toast.error('Please select 3-6 songs for an EP');
      return;
    }
    if (type === 'album' && selectedSongs.length < 7) {
      toast.error('Please select at least 7 songs for an Album');
      return;
    }

    setPublishType(type);
    setShowPublishModal(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getGatewayUrl = (ipfsHash: string | null | undefined) => {
    if (!ipfsHash) {
      return 'https://via.placeholder.com/300x300?text=No+Cover';
    }
    const hash = ipfsHash.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  };

  const availableSongs = songs.filter(song => !song.isInAlbum);

  if (!isConnected) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-background flex items-center justify-center pt-16">
          <Card className="p-8 text-center max-w-md">
            <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Please connect your wallet to view your music collection
            </p>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-16">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Package className="w-10 h-10" />
              My Music Collection
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your NFT collection, listening history, and publish as singles, EPs, or albums
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('🔄 [MyCollection] Force refresh NFTs...');
                // Clear Apollo cache
                const { apolloClient } = await import('@/lib/apollo-client');
                await apolloClient.clearStore();
                console.log('✅ [MyCollection] Apollo cache cleared');
                // Reload NFTs
                loadMyNFTs();
                toast.success('Refreshing NFT collection...');
              }}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              Refresh NFTs
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Songs</p>
                <p className="text-2xl font-bold">{songs.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Disc3 className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{availableSongs.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Album className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">In Albums</p>
                <p className="text-2xl font-bold">{songs.length - availableSongs.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Plays</p>
                <p className="text-2xl font-bold">
                  {songs.reduce((acc, song) => acc + (getPlayCount(song.tokenId) || song.playCount), 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Publish Actions */}
        {selectedSongs.length > 0 && (
          <Card className="p-6 mb-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-1">
                  {selectedSongs.length} song{selectedSongs.length !== 1 ? 's' : ''} selected
                </h3>
                <p className="text-sm text-muted-foreground">
                  Publish your selection as a Single, EP, or Album
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePublish('single')}
                  disabled={selectedSongs.length !== 1}
                  variant="outline"
                >
                  <Disc3 className="w-4 h-4 mr-2" />
                  Single (1)
                </Button>
                <Button
                  onClick={() => handlePublish('ep')}
                  disabled={selectedSongs.length < 3 || selectedSongs.length > 6}
                  variant="outline"
                >
                  <Album className="w-4 h-4 mr-2" />
                  EP (3-6)
                </Button>
                <Button
                  onClick={() => handlePublish('album')}
                  disabled={selectedSongs.length < 7}
                  variant="outline"
                >
                  <Package className="w-4 h-4 mr-2" />
                  Album (7+)
                </Button>
                <Button
                  onClick={() => setSelectedSongs([])}
                  variant="ghost"
                >
                  Clear
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Main Tabs - NFT Collection, Albums & History */}
        <Tabs defaultValue="nft-collection" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="nft-collection">
              <Package className="w-4 h-4 mr-2" />
              NFT Collection
            </TabsTrigger>
            <TabsTrigger value="albums">
              <Album className="w-4 h-4 mr-2" />
              My Albums
            </TabsTrigger>
            <TabsTrigger value="history">
              <Clock className="w-4 h-4 mr-2" />
              History Create Song
            </TabsTrigger>
          </TabsList>

          {/* NFT Collection Tab */}
          <TabsContent value="nft-collection" className="mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your collection...</p>
              </div>
            ) : songs.length === 0 ? (
              <Card className="p-12 text-center">
                <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No songs yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start creating and minting your music as NFTs
                </p>
                <Button onClick={() => window.location.href = '/create'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Music
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {songs.map((song) => (
                  <SongCard
                    key={song.tokenId}
                    song={song}
                    isSelected={selectedSongs.includes(song.tokenId)}
                    onSelect={() => !song.isInAlbum && toggleSelectSong(song.tokenId)}
                    isPlaying={currentTrack?.id === song.tokenId && audioIsPlaying}
                    onPlayPause={() => {
                      // Create track object for audio player
                      const track = {
                        id: song.tokenId,
                        title: song.title,
                        artist: song.artist,
                        avatar: getGatewayUrl(song.ipfsArtworkHash),
                        cover: getGatewayUrl(song.ipfsArtworkHash),
                        genre: song.genre,
                        duration: formatDuration(song.duration),
                        audioUrl: getGatewayUrl(song.ipfsAudioHash),
                        likes: song.likeCount,
                        plays: song.playCount,
                      };
                      
                      console.log('🎵 [MyCollection] Playing track:', track);
                      
                      // Toggle play/pause
                      if (currentTrack?.id === song.tokenId && audioIsPlaying) {
                        pauseTrack();
                      } else {
                        playTrack(track);
                        // Record play event (no await - run in background)
                        recordMusicPlay(song.tokenId, smartAccountAddress, song.duration, 'collection');
                      }
                    }}
                    getGatewayUrl={getGatewayUrl}
                    formatDuration={formatDuration}
                    getPlayCount={getPlayCount}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Albums Tab */}
          <TabsContent value="albums" className="mt-6">
            {isLoadingAlbums ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading your albums...</p>
              </div>
            ) : myAlbums.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myAlbums.map((album) => (
                  <Card
                    key={album.id}
                    className="group overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => window.location.href = `/album/${album.albumId}`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {album.coverImageHash ? (
                        <img
                          src={`https://ipfs.io/ipfs/${album.coverImageHash.replace('ipfs://', '')}`}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music className="w-16 h-16 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {album.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {album.albumType}
                        </Badge>
                        <span>•</span>
                        <span>{album.songCount} {album.songCount === '1' ? 'track' : 'tracks'}</span>
                      </div>
                      {album.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(Number(album.createdAt) * 1000).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Album className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl font-semibold mb-2">No Albums Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first album by selecting songs and publishing them
                </p>
                <Button onClick={() => {
                  // Switch to NFT Collection tab
                  const nftTab = document.querySelector('[value="nft-collection"]') as HTMLElement;
                  nftTab?.click();
                }}>
                  <Music className="w-4 h-4 mr-2" />
                  Go to NFT Collection
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Listening History Tab */}
          <TabsContent value="history" className="mt-6">
            {/* Blockchain History (Primary) */}
            <GeneratedMusicHistory />
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishAlbumModal
          isOpen={showPublishModal}
          onClose={() => {
            setShowPublishModal(false);
            setSelectedSongs([]);
            loadMyNFTs(); // Reload after publish
          }}
          selectedSongIds={selectedSongs}
          songs={songs.filter(s => selectedSongs.includes(s.tokenId))}
          albumType={publishType}
        />
      )}
    </div>
  );
}

interface SongCardProps {
  song: SongNFT;
  isSelected: boolean;
  onSelect: () => void;
  isPlaying: boolean;
  onPlayPause: () => void;
  getGatewayUrl: (hash: string) => string;
  formatDuration: (seconds: number) => string;
  getPlayCount: (tokenId: number) => number;
}

function SongCard({
  song,
  isSelected,
  onSelect,
  isPlaying,
  onPlayPause,
  getGatewayUrl,
  formatDuration,
  getPlayCount
}: SongCardProps) {
  return (
    <Card 
      className={`group relative overflow-hidden transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${song.isInAlbum ? 'opacity-50' : ''}`}
    >
      {/* Cover Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={getGatewayUrl(song.ipfsArtworkHash)}
          alt={song.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Cover';
          }}
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('🎵 [SongCard] Play button clicked for:', song.title);
              console.log('🎵 [SongCard] Is playing:', isPlaying);
              onPlayPause();
            }}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            asChild
          >
            <a
              href={getGatewayUrl(song.metadataURI)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-5 h-5 text-white" />
            </a>
          </Button>
        </div>

        {/* Selection Checkbox */}
        {!song.isInAlbum && (
          <div className="absolute top-2 right-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="w-5 h-5 rounded border-2 border-white cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Album Badge */}
        {song.isInAlbum && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="secondary" className="bg-black/80 text-white backdrop-blur-sm">
              <Album className="w-3 h-3 mr-1" />
              In Album
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1 truncate">{song.title}</h3>
        <p className="text-sm text-muted-foreground mb-2 truncate">{song.artist}</p>
        
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge variant="outline">{song.genre}</Badge>
          <Badge variant="outline">{formatDuration(song.duration)}</Badge>
          {song.isExplicit && (
            <Badge variant="destructive">Explicit</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Play className="w-3 h-3" />
            {getPlayCount(song.tokenId) || song.playCount || 0}
          </span>
          <span>Token #{song.tokenId}</span>
        </div>
      </div>
    </Card>
  );
}
