import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useSequence } from '@/contexts/SequenceContext';
import { useToast } from '@/hooks/use-toast';

interface UpgradeToArtistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const UpgradeToArtistModal = ({ isOpen, onClose, onSuccess }: UpgradeToArtistModalProps) => {
  const { upgradeToArtist, isAccountReady, smartAccountAddress } = useSequence();
  const { toast } = useToast();
  
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [isIndependent, setIsIndependent] = useState(true);
  const [recordLabel, setRecordLabel] = useState('');

  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 
    'Classical', 'Country', 'Reggae', 'Latin', 'Metal', 'Other'
  ];

  const handleUpgrade = async () => {
    if (!artistName.trim()) {
      toast({
        title: "Artist Name Required",
        description: "Please enter your artist name",
        variant: "destructive"
      });
      return;
    }

    if (!genre) {
      toast({
        title: "Genre Required",
        description: "Please select your music genre",
        variant: "destructive"
      });
      return;
    }

    if (!isIndependent && !recordLabel.trim()) {
      toast({
        title: "Record Label Required",
        description: "Please enter your record label name",
        variant: "destructive"
      });
      return;
    }

    setIsUpgrading(true);

    try {
      // Call smart contract to upgrade to artist
      const txHash = await upgradeToArtist(
        artistName,
        genre,
        isIndependent,
        isIndependent ? '' : recordLabel
      );

      console.log('✅ Artist upgrade successful:', txHash);

      // Success notification will be shown by the upgradeToArtist function
      onSuccess?.();
      onClose();

      // Reset form
      setArtistName('');
      setGenre('');
      setIsIndependent(true);
      setRecordLabel('');

    } catch (error) {
      console.error('Failed to upgrade to artist:', error);
      toast({
        title: "Upgrade Failed",
        description: error instanceof Error ? error.message : "An error occurred during upgrade",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            Upgrade to Artist
          </DialogTitle>
          <DialogDescription className="text-sm">
            Unlock the ability to upload, sell, and monetize your music
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-2">
          {/* Benefits Section - Compact */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 space-y-1.5">
            <h4 className="font-semibold flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              Artist Benefits
            </h4>
            <ul className="text-xs space-y-0.5 text-muted-foreground ml-5">
              <li>✓ Upload unlimited tracks</li>
              <li>✓ Mint music as NFTs</li>
              <li>✓ Sell in marketplace</li>
              <li>✓ Receive tips from fans</li>
              <li>✓ Earn royalties</li>
              <li>✓ Get verified badge</li>
            </ul>
          </div>

          {/* Artist Info Form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="artistName" className="text-sm">Artist Name *</Label>
              <Input
                id="artistName"
                placeholder="Your artist or band name"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                disabled={isUpgrading}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="genre" className="text-sm">Primary Genre *</Label>
              <Select value={genre} onValueChange={setGenre} disabled={isUpgrading}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select your music genre" />
                </SelectTrigger>
                <SelectContent>
                  {genres.map((g) => (
                    <SelectItem key={g} value={g.toLowerCase()}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="artistType" className="text-sm">Artist Type</Label>
              <Select 
                value={isIndependent ? 'independent' : 'label'} 
                onValueChange={(v) => setIsIndependent(v === 'independent')}
                disabled={isUpgrading}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent Artist</SelectItem>
                  <SelectItem value="label">Signed to Label</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isIndependent && (
              <div className="space-y-1.5">
                <Label htmlFor="recordLabel" className="text-sm">Record Label</Label>
                <Input
                  id="recordLabel"
                  placeholder="Enter record label name"
                  value={recordLabel}
                  onChange={(e) => setRecordLabel(e.target.value)}
                  disabled={isUpgrading}
                  className="h-9"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-2 pt-3 border-t flex-shrink-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpgrading}
            className="flex-1 h-9"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading || !isAccountReady}
            className="flex-1 h-9 bg-primary hover:bg-primary/90"
          >
            {isUpgrading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Upgrading...
              </>
            ) : (
              <>
                <Music className="w-3.5 h-3.5 mr-1.5" />
                Become an Artist
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeToArtistModal;
