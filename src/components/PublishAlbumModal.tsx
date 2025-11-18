// src/components/PublishAlbumModal.tsx
import { useState, useRef } from 'react';
import { X, Upload, Disc3, Album, Package, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { useSequence } from '../contexts/SequenceContext';
import ipfsService from '../services/ipfsService';

interface Song {
  tokenId: number;
  title: string;
  artist: string;
  duration: number;
  ipfsArtworkHash: string;
}

interface PublishAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSongIds: number[];
  songs: Song[];
  albumType: 'single' | 'ep' | 'album';
}

export default function PublishAlbumModal({
  isOpen,
  onClose,
  selectedSongIds,
  songs,
  albumType
}: PublishAlbumModalProps) {
  const { address } = useAccount();
  const { createAlbum, addSongToAlbum } = useSequence();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  const albumTypeMap = {
    single: { label: 'Single', value: 0, icon: Disc3, color: 'text-blue-500' },
    ep: { label: 'EP', value: 1, icon: Album, color: 'text-purple-500' },
    album: { label: 'Album', value: 2, icon: Package, color: 'text-pink-500' }
  };

  const currentType = albumTypeMap[albumType];

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Cover image must be less than 10MB');
      return;
    }

    setCoverFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!coverFile) {
      toast.error('Please upload a cover image');
      return;
    }

    // Validate song count based on album type
    const currentType = albumTypeMap[albumType];
    const songCount = selectedSongIds.length;
    
    if (albumType === 'single' && songCount !== 1) {
      toast.error('Single must have exactly 1 song');
      return;
    }
    
    if (albumType === 'ep' && (songCount < 3 || songCount > 6)) {
      toast.error('EP must have 3-6 songs');
      return;
    }
    
    if (albumType === 'album' && songCount < 7) {
      toast.error('Album must have at least 7 songs');
      return;
    }

    setIsPublishing(true);

    try {
      // Upload cover to IPFS
      toast.loading('Uploading cover to IPFS...', { id: 'publish-album' });
      const coverResult = await ipfsService.uploadFile(coverFile);
      const coverHash = coverResult.IpfsHash || coverResult.ipfsHash || coverResult.Hash || coverResult.hash;
      
      console.log('✅ Cover uploaded:', coverHash);

      // Create album metadata
      const metadata = {
        name: title,
        description,
        image: `ipfs://${coverHash}`,
        album_type: currentType.label,
        song_count: songs.length,
        total_duration: songs.reduce((acc, song) => acc + song.duration, 0),
        songs: songs.map(song => ({
          tokenId: song.tokenId,
          title: song.title,
          artist: song.artist,
          duration: song.duration
        })),
        created_by: address,
        created_at: new Date().toISOString(),
        platform: 'HiBeats',
        blockchain: 'Somnia',
        attributes: [
          { trait_type: 'Type', value: currentType.label },
          { trait_type: 'Songs', value: songs.length, display_type: 'number' },
          { trait_type: 'Total Duration', value: songs.reduce((acc, s) => acc + s.duration, 0), display_type: 'number' }
        ]
      };

      // Upload metadata to IPFS
      toast.loading('Creating album metadata...', { id: 'publish-album' });
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataResult = await ipfsService.uploadFile(metadataBlob as any);
      const metadataHash = metadataResult.IpfsHash || metadataResult.ipfsHash || metadataResult.Hash || metadataResult.hash;
      
      console.log('✅ Metadata uploaded:', metadataHash);

      // Create album on blockchain
      toast.loading('Creating album on blockchain...', { id: 'publish-album' });
      const albumTxHash = await createAlbum(
        title,
        description,
        coverHash,
        currentType.value,
        `ipfs://${metadataHash}`
      );

      console.log('✅ Album created:', albumTxHash);

      // 🔥 Wait for transaction and get album ID
      toast.loading('Getting album ID...', { id: 'publish-album' });
      
      let albumId: number | null = null;
      
      // Method 1: Parse transaction receipt for AlbumCreated event
      try {
        console.log('🔍 Method 1: Parsing transaction receipt for AlbumCreated event...');
        
        const { getPublicClient } = await import('@wagmi/core');
        const { wagmiConfig, CONTRACT_ADDRESSES } = await import('@/lib/web3-config');
        const { decodeEventLog } = await import('viem');
        const { ALBUM_MANAGER_ABI } = await import('@/lib/abis/AlbumManager');
        
        const publicClient = getPublicClient(wagmiConfig);
        
        console.log('⏳ Waiting for transaction receipt...');
        const receipt = await publicClient!.waitForTransactionReceipt({
          hash: albumTxHash as `0x${string}`,
          timeout: 30000
        });
        
        console.log('✅ Transaction receipt received, parsing logs...');
        
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() !== CONTRACT_ADDRESSES.albumManager.toLowerCase()) {
              continue;
            }
            
            const decoded: any = decodeEventLog({
              abi: ALBUM_MANAGER_ABI,
              data: log.data,
              topics: (log as any).topics
            });
            
            if (decoded.eventName === 'AlbumCreated') {
              albumId = Number(decoded.args.albumId);
              console.log('✅ Found album ID from event:', albumId);
              break;
            }
          } catch (err) {
            continue;
          }
        }
        
      } catch (error) {
        console.error('❌ Method 1 failed:', error);
      }
      
      // Method 2: Query contract for artist's albums (with longer wait)
      if (!albumId) {
        try {
          console.log('🔍 Method 2: Querying contract for artist albums...');
          
          const { readContract } = await import('@wagmi/core');
          const { wagmiConfig, CONTRACT_ADDRESSES } = await import('@/lib/web3-config');
          const { ALBUM_MANAGER_ABI } = await import('@/lib/abis/AlbumManager');
          
          // Wait longer for state to update on blockchain
          console.log('⏳ Waiting 3 seconds for blockchain state...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Get artist's album at index 0 (most recent)
          const artistAlbumId = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESSES.albumManager as `0x${string}`,
            abi: ALBUM_MANAGER_ABI,
            functionName: 'artistAlbums',
            args: [address as `0x${string}`, 0n],
            authorizationList: []
          }) as bigint;
          
          if (artistAlbumId && artistAlbumId > 0n) {
            albumId = Number(artistAlbumId);
            console.log('✅ Found album ID from contract:', albumId);
          } else {
            console.log('⚠️ artistAlbums returned 0 or invalid ID');
          }
        } catch (error) {
          console.error('❌ Method 2 failed:', error);
        }
      }
      
      // Method 3: Fallback to subgraph
      if (!albumId) {
        console.log('🔍 Method 3: Querying subgraph...');
        toast.loading('Querying subgraph for album ID...', { id: 'publish-album' });
        
        const maxRetries = 3;
        const retryDelay = 3000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`🔍 Subgraph attempt ${attempt}/${maxRetries}...`);
            
            const { subgraphService } = await import('@/services/subgraphService');
            const userAlbums = await subgraphService.getUserAlbums(address!, 1, 0);
            
            if (userAlbums.length > 0) {
              albumId = parseInt(userAlbums[0].albumId);
              console.log('✅ Found album ID from subgraph:', albumId);
              break;
            }
          } catch (err) {
            console.warn(`⚠️ Subgraph attempt ${attempt} failed:`, err);
          }
          
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }
      
      // If we still couldn't get album ID, show error but don't fail completely
      if (!albumId) {
        console.error('❌ Could not determine album ID after all methods');
        toast.dismiss('publish-album');
        toast.warning(`Album created but couldn't add songs automatically. Please add songs manually from My Collection.`, {
          duration: 8000
        });
        onClose();
        return;
      }

      // Add songs to album with better error handling and retry
      console.log(`🎵 Adding ${selectedSongIds.length} songs to album ${albumId}...`);
      toast.loading('Adding songs to album...', { id: 'publish-album' });
      
      let successCount = 0;
      let failCount = 0;
      const failedSongs: number[] = [];
      
      for (let i = 0; i < selectedSongIds.length; i++) {
        const songId = selectedSongIds[i];
        toast.loading(`Adding song ${i + 1}/${selectedSongIds.length}...`, { id: 'publish-album' });
        
        let retries = 0;
        const maxRetries = 2;
        let success = false;
        
        while (retries <= maxRetries && !success) {
          try {
            if (retries > 0) {
              console.log(`🔄 Retry ${retries}/${maxRetries} for song ${songId}...`);
              await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before retry
            }
            
            console.log(`🎵 Adding song ${songId} to album ${albumId}...`);
            await addSongToAlbum(albumId, songId);
            successCount++;
            success = true;
            console.log(`✅ Successfully added song ${songId} (${successCount}/${selectedSongIds.length})`);
          } catch (error) {
            retries++;
            if (retries > maxRetries) {
              failCount++;
              failedSongs.push(songId);
              console.error(`❌ Failed to add song ${songId} after ${maxRetries} retries:`, error);
            }
          }
        }
        
        // Delay between songs (already handled by transaction queue, but add small buffer)
        if (i < selectedSongIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      console.log(`✅ Finished adding songs: ${successCount} success, ${failCount} failed`);
      if (failedSongs.length > 0) {
        console.log(`❌ Failed song IDs:`, failedSongs);
      }

      toast.dismiss('publish-album');
      
      if (successCount === selectedSongIds.length) {
        toast.success(`🎉 ${currentType.label} published with ${successCount} songs!`);
      } else if (successCount > 0) {
        toast.warning(`${currentType.label} published with ${successCount}/${selectedSongIds.length} songs. ${failCount} failed.`, {
          duration: 6000
        });
      } else {
        toast.error(`${currentType.label} created but failed to add songs. Please add manually.`, {
          duration: 6000
        });
      }
      
      onClose();
    } catch (error: any) {
      console.error('Failed to publish album:', error);
      toast.dismiss('publish-album');
      toast.error(`Failed to publish: ${error.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <currentType.icon className={`w-8 h-8 ${currentType.color}`} />
            <div>
              <h2 className="text-2xl font-bold">Publish {currentType.label}</h2>
              <p className="text-sm text-muted-foreground">
                {songs.length} song{songs.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isPublishing}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Cover Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Cover Image *
            </label>
            <div 
              className="relative aspect-square max-w-xs mx-auto rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors cursor-pointer bg-muted/20"
              onClick={() => coverInputRef.current?.click()}
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Upload className="w-12 h-12" />
                  <p className="text-sm font-medium">Click to upload cover</p>
                  <p className="text-xs">PNG, JPG up to 10MB</p>
                </div>
              )}
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {currentType.label} Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Enter ${albumType} title...`}
              maxLength={100}
              disabled={isPublishing}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Description *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your release..."
              rows={4}
              maxLength={500}
              disabled={isPublishing}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 characters
            </p>
          </div>

          {/* Songs List */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Tracks ({songs.length})
            </label>
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div
                  key={song.tokenId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {index + 1}.
                  </span>
                  <img
                    src={`https://ipfs.io/ipfs/${song.ipfsArtworkHash.replace('ipfs://', '')}`}
                    alt={song.title}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <Badge variant="outline">
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <Card className="p-4 bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium mb-1">What happens when you publish?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Cover and metadata will be uploaded to IPFS</li>
                  <li>• {currentType.label} will be created on Somnia blockchain</li>
                  <li>• Selected songs will be added to the {albumType}</li>
                  <li>• Transactions are gasless - you pay nothing!</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isPublishing || !title || !description || !coverFile}
              className="flex-1 bg-primary hover:bg-primary/90 gap-2"
            >
              {isPublishing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Publish {currentType.label}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
