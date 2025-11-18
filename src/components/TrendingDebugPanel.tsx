// src/components/TrendingDebugPanel.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccount } from 'wagmi';
import { recordMusicPlay } from '@/utils/playCountHelper';
import { somniaDatastreamServiceV3 } from '@/services/somniaDatastreamService.v3';
import { Play, RefreshCw, Database, TrendingUp, Music } from 'lucide-react';
import { toast } from 'sonner';

export const TrendingDebugPanel = () => {
  const { address } = useAccount();
  const [isRecording, setIsRecording] = useState(false);
  const [playEventCount, setPlayEventCount] = useState<number | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleTestPlayEvent = async () => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsRecording(true);
    try {
      // Test with a dummy NFT token ID
      const testTokenId = 1; // Change this to a real token ID if you have one
      
      console.log('🧪 [Debug] Recording test play event...');
      await recordMusicPlay(testTokenId, address, 180, 'explore');
      
      toast.success('✅ Test play event recorded!');
      
      // Wait a bit then check count
      setTimeout(() => checkPlayEvents(), 2000);
    } catch (error) {
      console.error('❌ [Debug] Failed to record test play event:', error);
      toast.error('Failed to record play event');
    } finally {
      setIsRecording(false);
    }
  };

  const checkPlayEvents = async () => {
    setIsChecking(true);
    try {
      await somniaDatastreamServiceV3.connect();
      const events = await somniaDatastreamServiceV3.getAllPlayEvents();
      setPlayEventCount(events.length);
      
      console.log('📊 [Debug] Total play events:', events.length);
      console.log('🔍 [Debug] Sample events:', events.slice(0, 5));
      
      toast.success(`Found ${events.length} play events`);
    } catch (error) {
      console.error('❌ [Debug] Failed to check play events:', error);
      toast.error('Failed to check play events');
    } finally {
      setIsChecking(false);
    }
  };

  const checkNFTs = async () => {
    try {
      console.log('📀 [Debug] Checking NFTs from subgraph...');
      const { subgraphService } = await import('@/services/subgraphService');
      const nfts = await subgraphService.getAllSongs(100, 0);
      
      console.log('📊 [Debug] Total NFTs:', nfts.length);
      console.log('🔍 [Debug] Sample NFTs:', nfts.slice(0, 3));
      
      toast.success(`Found ${nfts.length} NFTs`);
    } catch (error) {
      console.error('❌ [Debug] Failed to check NFTs:', error);
      toast.error('Failed to check NFTs');
    }
  };

  const flushBatch = async () => {
    try {
      console.log('🔄 [Debug] Flushing batch...');
      await somniaDatastreamServiceV3.forceBatchFlush();
      toast.success('✅ Batch flushed!');
      
      // Check count after flush
      setTimeout(() => checkPlayEvents(), 2000);
    } catch (error) {
      console.error('❌ [Debug] Failed to flush batch:', error);
      toast.error('Failed to flush batch');
    }
  };

  return (
    <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
          <TrendingUp className="w-5 h-5" />
          Trending Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Debug Mode
          </Badge>
          {playEventCount !== null && (
            <Badge variant="secondary" className="text-xs">
              {playEventCount} play events
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={handleTestPlayEvent}
            disabled={isRecording || !address}
            className="w-full gap-2"
            size="sm"
          >
            <Play className="w-4 h-4" />
            {isRecording ? 'Recording...' : 'Record Test Play Event'}
          </Button>

          <Button
            onClick={checkPlayEvents}
            disabled={isChecking}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Database className="w-4 h-4" />
            {isChecking ? 'Checking...' : 'Check Play Events'}
          </Button>

          <Button
            onClick={flushBatch}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
            Flush Batch
          </Button>

          <Button
            onClick={checkNFTs}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Music className="w-4 h-4" />
            Check NFTs
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Click "Record Test Play Event" to create a test play</p>
          <p>• Click "Check Play Events" to see total count</p>
          <p>• Click "Flush Batch" if using batch mode</p>
          <p>• Check console for detailed logs</p>
        </div>

        {!address && (
          <div className="text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
            ⚠️ Connect wallet to test play events
          </div>
        )}
      </CardContent>
    </Card>
  );
};
