// src/components/GeneratedMusicHistory.tsx
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, RefreshCw, Play, CheckCircle, Clock, Database, ChevronLeft, ChevronRight, Coins, Loader2 } from 'lucide-react';
import { somniaDatastreamServiceV3 } from '@/services/somniaDatastreamService.v3';
import { GeneratedMusicData, GeneratedMusicStatus } from '@/config/somniaDataStreams.v3';
import { toast } from 'sonner';
import { useSequence } from '@/contexts/SequenceContext';
import { useNFTOperations } from '@/hooks/useNFTOperations';
import { useCurrentUserProfile } from '@/hooks/useRealTimeProfile';

export const GeneratedMusicHistory = () => {
  const { address } = useAccount();
  const { smartAccountAddress } = useSequence();
  const { profileData } = useCurrentUserProfile();
  const { mintSongNFT, isMinting } = useNFTOperations();
  const [datastreamMusic, setDatastreamMusic] = useState<GeneratedMusicData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'minted'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [mintingMusicId, setMintingMusicId] = useState<number | null>(null);
  const SONGS_PER_PAGE = 8;

  // Load music on mount
  useEffect(() => {
    if (smartAccountAddress) {
      loadAllMusic();
    }
  }, [smartAccountAddress]);

  const loadAllMusic = async () => {
    setIsLoading(true);
    try {
      console.log('📦 [HISTORY] Loading music from blockchain...');
      console.log('📦 [HISTORY] Smart Account Address:', smartAccountAddress);
      console.log('📦 [HISTORY] EOA Address:', address);
      
      // Load from datastream only
      await somniaDatastreamServiceV3.connect();
      console.log('📦 [HISTORY] Datastream connected');
      
      // Clear cache to get fresh data
      somniaDatastreamServiceV3.clearCacheFor('all_generated_music');
      
      const dsMusic = await somniaDatastreamServiceV3.getAllGeneratedMusic();
      console.log('📦 [HISTORY] Raw data from datastream:', dsMusic);
      console.log(`📦 [HISTORY] Loaded ${dsMusic.length} songs from blockchain`);
      
      // Log all unique owners for debugging
      const uniqueOwners = [...new Set(dsMusic.map(m => m.owner.toLowerCase()))];
      console.log('📦 [HISTORY] Unique owners in blockchain:', uniqueOwners);
      
      // Filter by smart account address (sama seperti Feed)
      const userMusic = dsMusic.filter(music => 
        music.owner.toLowerCase() === smartAccountAddress?.toLowerCase()
      );
      console.log(`📦 [HISTORY] Filtered to ${userMusic.length} songs for smart account ${smartAccountAddress}`);
      
      // Sort by timestamp (newest first)
      const sortedMusic = userMusic.sort((a, b) => b.timestamp - a.timestamp);
      
      if (sortedMusic.length > 0) {
        console.log('📦 [HISTORY] Sample songs:', sortedMusic.slice(0, 3).map(m => ({
          title: m.title,
          owner: m.owner.substring(0, 10) + '...',
          status: GeneratedMusicStatus[m.status],
          timestamp: new Date(m.timestamp).toLocaleString()
        })));
      }
      
      setDatastreamMusic(sortedMusic);
    } catch (error) {
      console.error('❌ [HISTORY] Failed to load music history:', error);
      console.error('❌ [HISTORY] Error details:', error);
      toast.error('Failed to load music history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      somniaDatastreamServiceV3.clearCacheFor('all_generated_music');
      await loadAllMusic();
      setCurrentPage(1); // Reset to first page
      toast.success('History refreshed');
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('Failed to refresh history');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get filtered and paginated songs
  const getFilteredSongs = () => {
    return datastreamMusic.filter(song => {
      if (filterStatus === 'all') return true;
      if (filterStatus === 'completed') return song.status === GeneratedMusicStatus.COMPLETED;
      if (filterStatus === 'minted') return song.status === GeneratedMusicStatus.MINTED;
      return true;
    });
  };

  const getPaginatedSongs = () => {
    const filtered = getFilteredSongs();
    const startIndex = (currentPage - 1) * SONGS_PER_PAGE;
    const endIndex = startIndex + SONGS_PER_PAGE;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredSongs();
    return Math.ceil(filtered.length / SONGS_PER_PAGE);
  };

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: 'all' | 'completed' | 'minted') => {
    setFilterStatus(newFilter);
    setCurrentPage(1);
  };

  // Handle manual mint
  const handleMintNFT = async (song: GeneratedMusicData) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (song.status === GeneratedMusicStatus.MINTED) {
      toast.info('This song is already minted as NFT');
      return;
    }

    // Check if song has required data
    if (!song.audioUrl || !song.imageUrl) {
      toast.error('Cannot mint: Missing audio or image URL');
      return;
    }

    setMintingMusicId(song.id);

    try {
      // 🔥 REMOVED: Don't show loading toast here
      // useNFTOperations will handle all toast notifications
      console.log('🎵 Starting mint process for:', song.title);

      // Get artist name from profile
      const artistName = profileData?.displayName || profileData?.username || 
                        `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'Unknown Artist';

      // Parse genre from style
      const genre = song.style.split(',').map(s => s.trim()).join(', ') || 'AI Generated';

      // Estimate duration (default to 150 seconds if not available)
      const duration = 150;

      // For songs from blockchain, we need to check if they have IPFS hashes
      // If not, we'll upload them to IPFS first
      let ipfsAudioHash = '';
      let ipfsImageHash = '';
      let metadataURI = '';

      const { ipfsService } = await import('@/services/ipfsService');

      // Try to extract IPFS hash from URL
      if (song.audioUrl.includes('ipfs://')) {
        ipfsAudioHash = song.audioUrl.replace('ipfs://', '');
      } else if (song.audioUrl.includes('/ipfs/')) {
        const match = song.audioUrl.match(/\/ipfs\/([^/?]+)/);
        if (match) ipfsAudioHash = match[1];
      }

      if (song.imageUrl.includes('ipfs://')) {
        ipfsImageHash = song.imageUrl.replace('ipfs://', '');
      } else if (song.imageUrl.includes('/ipfs/')) {
        const match = song.imageUrl.match(/\/ipfs\/([^/?]+)/);
        if (match) ipfsImageHash = match[1];
      }

      // If no IPFS hashes found, upload files to IPFS
      if (!ipfsAudioHash || !ipfsImageHash) {
        console.log('📤 Uploading files to IPFS...');
        
        try {
          // Upload audio if needed
          if (!ipfsAudioHash) {
            console.log('📤 Uploading audio to IPFS...');
            const audioResponse = await fetch(song.audioUrl);
            const audioBlob = await audioResponse.blob();
            const audioFile = new File([audioBlob], `${song.title}.mp3`, { type: 'audio/mpeg' });
            const audioResult = await ipfsService.uploadFile(audioFile);
            ipfsAudioHash = audioResult.IpfsHash || audioResult.ipfsHash || audioResult.Hash || audioResult.hash;
            console.log('✅ Audio uploaded to IPFS:', ipfsAudioHash);
          }

          // Upload image if needed
          if (!ipfsImageHash) {
            console.log('📤 Uploading cover image to IPFS...');
            const imageResponse = await fetch(song.imageUrl);
            const imageBlob = await imageResponse.blob();
            const imageFile = new File([imageBlob], `${song.title}-cover.jpg`, { type: 'image/jpeg' });
            const imageResult = await ipfsService.uploadFile(imageFile);
            ipfsImageHash = imageResult.IpfsHash || imageResult.ipfsHash || imageResult.Hash || imageResult.hash;
            console.log('✅ Image uploaded to IPFS:', ipfsImageHash);
          }
        } catch (uploadError: any) {
          console.error('❌ Failed to upload to IPFS:', uploadError);
          toast.error(`Failed to upload to IPFS: ${uploadError.message}`);
          return;
        }
      }

      // Create metadata object
      const metadata = {
        name: song.title,
        description: `AI-generated music. Prompt: "${song.prompt}"`,
        image: `ipfs://${ipfsImageHash}`,
        audio_url: `ipfs://${ipfsAudioHash}`,
        attributes: [
          { trait_type: "Task ID", value: song.taskId },
          { trait_type: "Style", value: song.style },
          { trait_type: "Status", value: GeneratedMusicStatus[song.status] },
        ]
      };

      // Upload metadata to IPFS
      console.log('📤 Uploading metadata to IPFS...');
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataResult = await ipfsService.uploadFile(metadataBlob as any);
      const metadataHash = metadataResult.IpfsHash || metadataResult.ipfsHash || metadataResult.Hash || metadataResult.hash;
      metadataURI = `ipfs://${metadataHash}`;
      
      console.log('✅ Metadata uploaded to IPFS:', metadataHash);

      // 🔥 REMOVED: Don't show loading toast here
      // useNFTOperations will handle minting progress and toast
      console.log('🎵 Minting NFT with FREE gas...');

      const mintResult = await mintSongNFT({
        to: address,
        title: song.title,
        artist: artistName,
        genre: genre,
        duration: duration,
        ipfsAudioHash: ipfsAudioHash,
        ipfsArtworkHash: ipfsImageHash,
        royaltyPercentage: 500, // 5% royalty
        isExplicit: false,
        metadataURI: metadataURI,
        sunoId: song.taskId,
        taskId: song.taskId,
        prompt: song.prompt
      });

      if (mintResult.success) {
        // 🔥 REMOVED: Don't show duplicate success toast
        // useNFTOperations already shows success toast with "View Transaction" button
        console.log('✅ NFT minted successfully:', mintResult.tokenId);

        // Update status in datastream
        try {
          await somniaDatastreamServiceV3.updateMusicStatus(
            song.id,
            GeneratedMusicStatus.MINTED,
            song
          );
          
          // Reload music list
          await loadAllMusic();
          
          console.log('✅ Music status updated in datastream');
        } catch (updateError) {
          console.error('⚠️ Failed to update status in datastream:', updateError);
          // Still success since NFT was minted
        }
      } else {
        // 🔥 REMOVED: Don't show duplicate error toast
        // useNFTOperations already shows error toast with details
        console.error('❌ NFT minting failed:', mintResult.error);
      }
    } catch (error: any) {
      // 🔥 CRITICAL: Only show error toast for unexpected errors
      // useNFTOperations handles most errors already
      console.error('❌ Unexpected error during minting:', error);
      
      // Only show toast if it's not a minting error (which useNFTOperations handles)
      if (!error.message?.includes('Minting') && 
          !error.message?.includes('NFT') &&
          !error.message?.includes('transaction')) {
        toast.error(`Unexpected error: ${error.message}`);
      }
    } finally {
      setMintingMusicId(null);
    }
  };



  const getStatusBadge = (status: GeneratedMusicStatus) => {
    switch (status) {
      case GeneratedMusicStatus.MINTED:
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><CheckCircle className="w-3 h-3 mr-1" />Minted</Badge>;
      case GeneratedMusicStatus.COMPLETED:
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Clock className="w-3 h-3 mr-1" />Ready</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5" />
              Song History
              {datastreamMusic.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {datastreamMusic.length}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Your generated songs ({datastreamMusic.length} total)
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Tabs */}
        {datastreamMusic.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('all')}
            >
              All ({datastreamMusic.length})
            </Button>
            <Button
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('completed')}
            >
              Ready to Mint ({datastreamMusic.filter(s => s.status === GeneratedMusicStatus.COMPLETED).length})
            </Button>
            <Button
              variant={filterStatus === 'minted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange('minted')}
            >
              Minted ({datastreamMusic.filter(s => s.status === GeneratedMusicStatus.MINTED).length})
            </Button>
          </div>
        )}
        
        <div className="space-y-3">
            {isLoading ? (
              // Skeleton Loading - 8 cards
              <>
                {Array.from({ length: 8 }).map((_, idx) => (
                  <Card key={idx} className="border-border/30 animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Skeleton Image */}
                        <div className="w-16 h-16 rounded-lg bg-muted" />
                        
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Skeleton Title */}
                          <div className="h-5 bg-muted rounded w-3/4" />
                          {/* Skeleton Style */}
                          <div className="h-4 bg-muted rounded w-1/2" />
                          {/* Skeleton Badges */}
                          <div className="flex items-center gap-2">
                            <div className="h-5 bg-muted rounded w-16" />
                            <div className="h-4 bg-muted rounded w-20" />
                          </div>
                        </div>
                        
                        {/* Skeleton Button */}
                        <div className="w-8 h-8 bg-muted rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : datastreamMusic.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No songs found on blockchain</p>
                <p className="text-xs mt-1">Generate new music to see it here</p>
              </div>
            ) : (() => {
              const filteredSongs = getFilteredSongs();
              const paginatedSongs = getPaginatedSongs();
              const totalPages = getTotalPages();
              
              if (filteredSongs.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No {filterStatus === 'completed' ? 'ready to mint' : filterStatus} songs</p>
                    <p className="text-xs mt-1">Try a different filter</p>
                  </div>
                );
              }
              
              return (
                <>
                  {paginatedSongs.map((song) => (
                <Card key={song.id} className="border-border/30 hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={song.imageUrl || '/assets/default-cover.jpg'}
                        alt={song.title}
                        className="w-16 h-16 rounded-lg object-cover shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/assets/default-cover.jpg';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base truncate">{song.title}</h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{song.style}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getStatusBadge(song.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(song.timestamp)}
                          </span>
                        </div>
                        {song.prompt && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            Prompt: {song.prompt}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-8 h-8 p-0"
                          onClick={() => {
                            if (song.audioUrl) {
                              window.open(song.audioUrl, '_blank');
                            }
                          }}
                          title="Play audio"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        {song.status === GeneratedMusicStatus.COMPLETED && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs px-2 py-1 h-auto gap-1"
                            onClick={() => handleMintNFT(song)}
                            disabled={isMinting || mintingMusicId === song.id}
                            title="Mint as NFT"
                          >
                            {mintingMusicId === song.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Minting...
                              </>
                            ) : (
                              <>
                                <Coins className="w-3 h-3" />
                                Mint
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} • Showing {paginatedSongs.length} of {filteredSongs.length} songs
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {(() => {
                        // Show max 5 page numbers
                        const maxVisible = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
                        
                        // Adjust if we're near the end
                        if (endPage - startPage < maxVisible - 1) {
                          startPage = Math.max(1, endPage - maxVisible + 1);
                        }
                        
                        const pages = [];
                        
                        // First page
                        if (startPage > 1) {
                          pages.push(
                            <Button
                              key={1}
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(1)}
                              className="w-8 h-8 p-0"
                            >
                              1
                            </Button>
                          );
                          if (startPage > 2) {
                            pages.push(<span key="dots1" className="px-2">...</span>);
                          }
                        }
                        
                        // Middle pages
                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={i}
                              variant={currentPage === i ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(i)}
                              className="w-8 h-8 p-0"
                            >
                              {i}
                            </Button>
                          );
                        }
                        
                        // Last page
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(<span key="dots2" className="px-2">...</span>);
                          }
                          pages.push(
                            <Button
                              key={totalPages}
                              variant="outline"
                              size="sm"
                              onClick={() => setCurrentPage(totalPages)}
                              className="w-8 h-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          );
                        }
                        
                        return pages;
                      })()}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
                </>
              );
            })()}
        </div>
      </CardContent>
    </Card>
  );
};
