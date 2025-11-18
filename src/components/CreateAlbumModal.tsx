import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Disc3, Image as ImageIcon, Loader2, Plus, X, Music } from 'lucide-react';
import { toast } from 'sonner';
import { ipfsService } from '@/services/ipfsService';
import { useSequence } from '@/contexts/SequenceContext';

interface Song {
  tokenId: number;
  title: string;
  artist: string;
  coverHash: string;
}

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSongs: Song[]; // Songs that can be added to album
  onSuccess?: () => void;
}

type AlbumType = 'single' | 'ep' | 'album';

const CreateAlbumModal = ({ isOpen, onClose, availableSongs, onSuccess }: CreateAlbumModalProps) => {
  const { isAccountReady, createAlbum, addSongToAlbum } = useSequence();
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [albumType, setAlbumType] = useState<AlbumType>('album');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [selectedSongs, setSelectedSongs] = useState<number[]>([]);
  const [releaseDate, setReleaseDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const albumTypeInfo = {
    single: { name: 'Single', min: 1, max: 1, desc: 'One track release' },
    ep: { name: 'EP', min: 2, max: 6, desc: '2-6 tracks' },
    album: { name: 'Album', min: 7, max: 99, desc: '7+ tracks' }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, WEBP)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      toast.success(`Cover image selected: ${file.name}`);
    }
  };

  const toggleSong = (tokenId: number) => {
    if (selectedSongs.includes(tokenId)) {
      setSelectedSongs(selectedSongs.filter(id => id !== tokenId));
    } else {
      const info = albumTypeInfo[albumType];
      if (selectedSongs.length >= info.max) {
        toast.error(`${info.name} can have maximum ${info.max} song(s)`);
        return;
      }
      setSelectedSongs([...selectedSongs, tokenId]);
    }
  };

  const handleCreate = async () => {
    if (!albumTitle.trim()) {
      toast.error('Please enter album title');
      return;
    }

    const info = albumTypeInfo[albumType];
    if (selectedSongs.length < info.min) {
      toast.error(`${info.name} must have at least ${info.min} song(s)`);
      return;
    }

    if (selectedSongs.length > info.max) {
      toast.error(`${info.name} can have maximum ${info.max} song(s)`);
      return;
    }

    if (!coverFile) {
      toast.error('Please upload a cover image');
      return;
    }

    setIsCreating(true);

    try {
      toast.loading('Uploading cover to IPFS...', { id: 'create-album' });
      
      // Upload cover to IPFS
      const coverHash = await ipfsService.uploadFile(coverFile);
      console.log('✅ Cover uploaded:', coverHash);

      toast.loading('Creating album metadata...', { id: 'create-album' });
      
      // Create metadata
      const metadata = {
        name: albumTitle,
        description: albumDescription || `${albumTitle} - ${albumTypeInfo[albumType].name}`,
        image: `ipfs://${coverHash}`,
        albumType: albumType.toUpperCase(),
        totalTracks: selectedSongs.length,
        releaseDate: releaseDate || new Date().toISOString(),
        platform: 'HiBeats',
        attributes: [
          { trait_type: 'Type', value: albumTypeInfo[albumType].name },
          { trait_type: 'Total Tracks', value: selectedSongs.length },
          { trait_type: 'Platform', value: 'HiBeats' }
        ]
      };

      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataHash = await ipfsService.uploadFile(metadataBlob as any);
      console.log('✅ Metadata uploaded:', metadataHash);

      toast.loading('Creating album on blockchain...', { id: 'create-album' });

      // Map albumType to enum: 0 = SINGLE, 1 = EP, 2 = ALBUM
      const albumTypeEnum = albumType === 'single' ? 0 : albumType === 'ep' ? 1 : 2;

      // Create album on blockchain
      const txHash = await createAlbum(
        albumTitle,
        albumDescription || `${albumTitle} - ${albumTypeInfo[albumType].name}`,
        coverHash,
        albumTypeEnum,
        `ipfs://${metadataHash}`
      );

      console.log('✅ Album created with tx:', txHash);

      // Note: In production, we would parse the transaction receipt to get the albumId
      // and then add songs to the album using addSongToAlbum(albumId, songTokenId)
      // For now, we'll just show success

      toast.dismiss('create-album');
      toast.success(`🎵 ${albumTypeInfo[albumType].name} created successfully!`, {
        description: `Created: ${albumTitle}`,
        action: {
          label: 'View Explorer',
          onClick: () => window.open(`https://shannon-explorer.somnia.network/tx/${txHash}`, '_blank')
        }
      });

      // Reset form
      setAlbumTitle('');
      setAlbumDescription('');
      setAlbumType('album');
      setCoverFile(null);
      setCoverPreview('');
      setSelectedSongs([]);
      setReleaseDate('');

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('❌ Failed to create album:', error);
      toast.dismiss('create-album');
      toast.error(`Failed to create album: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="w-5 h-5 text-primary" />
            Create Album/EP/Single
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Album Type */}
          <div className="space-y-2">
            <Label>Release Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              {(['single', 'ep', 'album'] as AlbumType[]).map((type) => (
                <Card
                  key={type}
                  className={`p-4 cursor-pointer transition-all ${
                    albumType === type 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-300 hover:border-primary/50'
                  }`}
                  onClick={() => {
                    setAlbumType(type);
                    setSelectedSongs([]);
                  }}
                >
                  <div className="text-center">
                    <Music className={`w-6 h-6 mx-auto mb-2 ${albumType === type ? 'text-primary' : 'text-gray-400'}`} />
                    <h4 className="font-semibold text-sm">{albumTypeInfo[type].name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{albumTypeInfo[type].desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Album Title */}
          <div className="space-y-2">
            <Label htmlFor="albumTitle">Title *</Label>
            <Input
              id="albumTitle"
              placeholder="Enter album/EP/single title"
              value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="albumDescription">Description</Label>
            <Textarea
              id="albumDescription"
              placeholder="Describe your release..."
              value={albumDescription}
              onChange={(e) => setAlbumDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>Cover Image *</Label>
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => coverInputRef.current?.click()}
            >
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              {coverPreview ? (
                <div className="relative inline-block">
                  <img src={coverPreview} alt="Cover preview" className="w-32 h-32 object-cover rounded-lg" />
                  <Button
                    size="sm"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverFile(null);
                      setCoverPreview('');
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">Click to upload cover image</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (max 5MB)</p>
                </div>
              )}
            </div>
          </div>

          {/* Release Date */}
          <div className="space-y-2">
            <Label htmlFor="releaseDate">Release Date (Optional)</Label>
            <Input
              id="releaseDate"
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
            />
          </div>

          {/* Song Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Select Songs * 
                <span className="text-xs text-muted-foreground ml-2">
                  ({selectedSongs.length}/{albumTypeInfo[albumType].max})
                </span>
              </Label>
              <Badge variant="secondary">
                {albumTypeInfo[albumType].min}-{albumTypeInfo[albumType].max} songs
              </Badge>
            </div>
            
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
              {availableSongs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No songs available. Upload songs first!
                </p>
              ) : (
                availableSongs.map((song) => (
                  <Card
                    key={song.tokenId}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedSongs.includes(song.tokenId)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleSong(song.tokenId)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                        <Music className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{song.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                      </div>
                      {selectedSongs.includes(song.tokenId) && (
                        <Badge variant="default" className="flex-shrink-0">Selected</Badge>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !albumTitle.trim() ||
                !coverFile ||
                selectedSongs.length < albumTypeInfo[albumType].min ||
                selectedSongs.length > albumTypeInfo[albumType].max ||
                isCreating
              }
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create {albumTypeInfo[albumType].name}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateAlbumModal;
