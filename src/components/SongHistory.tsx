import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Music,
  Play,
  Pause,
  Sparkles,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Coins
} from "lucide-react";
import { SongStorage, StoredSong } from "@/utils/songStorage";
import { useNFTOperations } from "@/hooks/useNFTOperations";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { GeneratedMusic } from "@/types/music";
import { useGeneratedMusicContext } from "@/contexts/GeneratedMusicContext";

interface SongHistoryProps {
  onSongSelect?: (song: StoredSong) => void;
}

const SongHistory = ({ onSongSelect }: SongHistoryProps) => {
  const [songs, setSongs] = useState<StoredSong[]>([]);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unminted' | 'minted'>('all');

  const { address } = useAccount();
  const { mintSongNFT, isMinting, mintingProgress } = useNFTOperations();
  
  // 🔥 NEW: Get minting state from context to prevent double mint
  const { mintingTracks, mintedTracks } = useGeneratedMusicContext();

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = () => {
    const allSongs = SongStorage.getAllSongs();
    setSongs(allSongs);
  };

  const handleMintNFT = async (song: StoredSong) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!song.ipfsHash || !song.ipfsAudioHash) {
      toast.error('Cannot mint NFT: Song not uploaded to IPFS');
      return;
    }

    // Validate metadataURI
    const metadataURI = song.ipfsHash ? `ipfs://${song.ipfsHash}` : '';
    if (!metadataURI || metadataURI === 'ipfs://') {
      toast.error('Cannot mint NFT: Invalid metadata URI');
      return;
    }
    
    // 🔥 NEW: Check if already minted or currently minting using taskId
    const trackIdentifier = song.taskId || song.id;
    
    if (mintedTracks.has(trackIdentifier)) {
      toast.warning('This song has already been minted as NFT');
      return;
    }
    
    if (mintingTracks.has(trackIdentifier)) {
      toast.info('This song is currently being minted. Please wait...');
      return;
    }

    try {
      const mintResult = await mintSongNFT({
        to: address,
        title: song.title,
        artist: song.artist,
        genre: song.genre.join(', '),
        duration: Math.round(song.duration),
        ipfsAudioHash: song.ipfsAudioHash,
        ipfsArtworkHash: song.ipfsImageHash || '',
        royaltyPercentage: 500,
        isExplicit: false,
        metadataURI: metadataURI
      });

      if (mintResult.success) {
        // Update the song in storage with NFT data
        const updatedSong: StoredSong = {
          ...song,
          tokenId: mintResult.tokenId,
          isMinted: true,
          mintTransactionHash: mintResult.transactionHash
        };

        SongStorage.updateSong(song.id, updatedSong);
        loadSongs(); // Refresh the list

        toast.success(`🎵 NFT Minted! Token ID: ${mintResult.tokenId}`);
      } else {
        toast.error(`Failed to mint NFT: ${mintResult.error}`);
      }
    } catch (error) {
      console.error('Minting failed:', error);
      toast.error('Failed to mint NFT');
    }
  };

  const handleDeleteSong = (songId: string) => {
    if (confirm('Are you sure you want to delete this song from history?')) {
      SongStorage.deleteSong(songId);
      loadSongs();
      toast.success('Song deleted from history');
    }
  };

  const getFilteredSongs = () => {
    switch (activeTab) {
      case 'unminted':
        return songs.filter(song => !song.isMinted);
      case 'minted':
        return songs.filter(song => song.isMinted);
      default:
        return songs;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSongs = getFilteredSongs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Song History</h2>
          <p className="text-muted-foreground">
            Your generated songs ({songs.length} total)
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {SongStorage.getStorageStats().unminted} unminted • {SongStorage.getStorageStats().minted} minted
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Songs ({songs.length})</TabsTrigger>
          <TabsTrigger value="unminted">
            Unminted ({SongStorage.getStorageStats().unminted})
          </TabsTrigger>
          <TabsTrigger value="minted">
            Minted ({SongStorage.getStorageStats().minted})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredSongs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Music className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No songs found</h3>
                <p className="text-muted-foreground text-center">
                  {activeTab === 'unminted'
                    ? 'All your songs have been minted as NFTs!'
                    : activeTab === 'minted'
                    ? 'You haven\'t minted any NFTs yet.'
                    : 'Generate your first song to see it here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSongs.map((song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center overflow-hidden">
                        {song.imageUrl ? (
                          <img
                            src={song.imageUrl}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-8 h-8 text-primary" />
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute -bottom-2 -right-2 w-8 h-8 p-0 rounded-full"
                        onClick={() => setIsPlaying(isPlaying === song.id ? null : song.id)}
                      >
                        {isPlaying === song.id ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                      </Button>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{song.title}</h3>
                        {song.isMinted && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                            <Sparkles className="w-3 h-3 mr-1" />
                            NFT
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{song.artist}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {song.genre.join(', ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDate(song.storedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!song.isMinted && song.ipfsHash && (() => {
                        // 🔥 Check minting status for this specific track
                        const trackIdentifier = song.taskId || song.id;
                        const isCurrentlyMinting = mintingTracks.has(trackIdentifier);
                        const isAlreadyMinted = mintedTracks.has(trackIdentifier);
                        const isDisabled = isMinting || isCurrentlyMinting || isAlreadyMinted;
                        
                        return (
                          <Button
                            onClick={() => handleMintNFT(song)}
                            disabled={isDisabled}
                            size="sm"
                            className="gap-2"
                            title={
                              isAlreadyMinted 
                                ? 'Already minted' 
                                : isCurrentlyMinting 
                                ? 'Currently minting...' 
                                : 'Mint as NFT'
                            }
                          >
                            <Coins className="w-4 h-4" />
                            {isAlreadyMinted 
                              ? 'Already Minted' 
                              : isCurrentlyMinting 
                              ? 'Minting...' 
                              : isMinting 
                              ? 'Minting...' 
                              : 'Mint NFT'}
                          </Button>
                        );
                      })()}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSong(song.id)}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Audio Player */}
                  {song.audioUrl && (
                    <div className="space-y-2 mb-4">
                      <audio
                        controls
                        src={song.audioUrl}
                        className="w-full"
                        preload="metadata"
                      />
                    </div>
                  )}

                  {/* Status and Links */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      {song.ipfsHash ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          On IPFS
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                          Fallback URL
                        </div>
                      )}
                      {song.isMinted && song.mintTransactionHash && (
                        <div className="flex items-center gap-1 text-purple-600">
                          <CheckCircle className="w-4 h-4" />
                          NFT Minted
                        </div>
                      )}
                    </div>

                    {song.isMinted && song.mintTransactionHash && (
                      <a
                        href={`https://shannon-explorer.somnia.network/tx/${song.mintTransactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-800 underline flex items-center gap-1 text-sm"
                      >
                        View on Explorer
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Minting Progress */}
                  {isMinting && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-800 mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-sm font-medium">Minting NFT...</span>
                      </div>
                      <p className="text-xs text-blue-700">{mintingProgress}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SongHistory;