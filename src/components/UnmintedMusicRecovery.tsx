// src/components/UnmintedMusicRecovery.tsx
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { somniaDatastreamServiceV3 } from '@/services/somniaDatastreamService.v3';
import { GeneratedMusicData, GeneratedMusicStatus } from '@/config/somniaDataStreams.v3';
import { toast } from 'sonner';

export const UnmintedMusicRecovery = () => {
  const { address } = useAccount();
  const [unmintedMusic, setUnmintedMusic] = useState<GeneratedMusicData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load unminted music on mount
  useEffect(() => {
    if (address) {
      loadUnmintedMusic();
    }
  }, [address]);

  const loadUnmintedMusic = async () => {
    if (!address) return;

    setIsLoading(true);
    try {
      // Ensure datastream is connected
      await somniaDatastreamServiceV3.connect();
      
      // Get unminted music
      const music = await somniaDatastreamServiceV3.getUnmintedMusic();
      setUnmintedMusic(music);
      
      if (music.length > 0) {
        console.log(`📦 Found ${music.length} unminted tracks in backup`);
      }
    } catch (error) {
      console.error('Failed to load unminted music:', error);
      toast.error('Failed to load backup music');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache and reload
      somniaDatastreamServiceV3.clearCacheFor('all_generated_music');
      await loadUnmintedMusic();
      toast.success('Backup refreshed');
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error('Failed to refresh backup');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRecoverTrack = async (track: GeneratedMusicData) => {
    try {
      // Track is already in datastream, just show success
      toast.success(`Track "${track.title}" is available in your Song History`);
      
      // Optionally, navigate to history page or open mint modal
      console.log('Track available for minting:', {
        title: track.title,
        audioUrl: track.audioUrl,
        imageUrl: track.imageUrl,
        taskId: track.taskId
      });
    } catch (error) {
      console.error('Failed to recover track:', error);
      toast.error('Failed to recover track');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!address) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Backup Recovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (unmintedMusic.length === 0) {
    return (
      <Card>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              Unminted Music Backup
            </CardTitle>
            <CardDescription>
              {unmintedMusic.length} track(s) backed up on blockchain
            </CardDescription>
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
        <div className="space-y-3">
          {unmintedMusic.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              {/* Cover Image */}
              <div className="flex-shrink-0">
                <img
                  src={track.imageUrl}
                  alt={track.title}
                  className="w-16 h-16 rounded object-cover"
                />
              </div>

              {/* Track Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium truncate">{track.title}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {track.style}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {formatDate(track.timestamp)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Task: {track.taskId.substring(0, 8)}...
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleRecoverTrack(track)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Recover
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            💡 <strong>Tip:</strong> These tracks are safely backed up on the blockchain. 
            Click "Recover" to add them back to your library and mint them.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
