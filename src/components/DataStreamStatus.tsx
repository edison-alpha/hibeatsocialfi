import { 
  Wifi, 
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useSomniaDatastream } from '@/contexts/SomniaDatastreamContext';
import { Badge } from '@/components/ui/badge';

const DataStreamStatus = () => {
  const { isConnected } = useSomniaDatastream();

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <Badge variant="outline" className="text-xs border-green-500/20 bg-green-500/10 text-green-600">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            Live
          </Badge>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          <Badge variant="outline" className="text-xs border-red-500/20 bg-red-500/10 text-red-600">
            Offline
          </Badge>
        </>
      )}
    </div>
  );
};

export default DataStreamStatus;