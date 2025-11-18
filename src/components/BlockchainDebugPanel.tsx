import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bug, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database,
  User,
  FileText,
  Network
} from 'lucide-react';
import BlockchainDebugger from '@/utils/blockchainDebug';
import { useSequence } from '@/contexts/SequenceContext';

interface DebugResult {
  connected: boolean;
  contractExists: boolean;
  totalPosts: number;
  userPosts: any[];
  recentPosts: any[];
  error?: string;
}

const BlockchainDebugPanel = () => {
  const { smartAccountAddress, isAccountReady } = useSequence();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);

  const runDiagnostic = async () => {
    if (!smartAccountAddress) {
      setResult({
        connected: false,
        contractExists: false,
        totalPosts: 0,
        userPosts: [],
        recentPosts: [],
        error: 'No wallet connected'
      });
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      console.log('🚀 Starting blockchain diagnostic...');

      // Test connection
      const connected = await BlockchainDebugger.testConnection();
      
      // Test contract
      const contractExists = await BlockchainDebugger.testContractAddress();
      
      // Get data
      const totalPosts = await BlockchainDebugger.getTotalPosts();
      const userPosts = await BlockchainDebugger.getUserPosts(smartAccountAddress);
      const recentPosts = await BlockchainDebugger.getRecentPosts();

      setResult({
        connected,
        contractExists,
        totalPosts,
        userPosts,
        recentPosts
      });

    } catch (error) {
      console.error('Diagnostic failed:', error);
      setResult({
        connected: false,
        contractExists: false,
        totalPosts: 0,
        userPosts: [],
        recentPosts: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Blockchain Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Account Status:</span>
            {isAccountReady ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Not Ready
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning || !isAccountReady}
            size="sm"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Bug className="w-4 h-4 mr-2" />
                Run Diagnostic
              </>
            )}
          </Button>
        </div>

        {smartAccountAddress && (
          <div className="text-xs text-muted-foreground">
            Address: {smartAccountAddress}
          </div>
        )}

        <Separator />

        {/* Results */}
        {result && (
          <div className="space-y-4">
            
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span className="text-sm">Somnia Network</span>
              </div>
              {result.connected ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              )}
            </div>

            {/* Contract Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                <span className="text-sm">SocialGraph Contract</span>
              </div>
              {result.contractExists ? (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Found
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Found
                </Badge>
              )}
            </div>

            {/* Posts Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{result.totalPosts}</div>
                <div className="text-xs text-muted-foreground">Total Posts</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{result.userPosts.length}</div>
                <div className="text-xs text-muted-foreground">Your Posts</div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{result.recentPosts.length}</div>
                <div className="text-xs text-muted-foreground">Recent Posts</div>
              </div>
            </div>

            {/* Error */}
            {result.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="text-sm text-destructive font-medium">Error:</div>
                <div className="text-xs text-destructive/80 mt-1">{result.error}</div>
              </div>
            )}

            {/* Recent Posts Preview */}
            {result.recentPosts.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Recent Posts:</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.recentPosts.slice(0, 3).map((post, index) => (
                    <div key={index} className="p-2 bg-muted/30 rounded text-xs">
                      <div className="font-medium">#{post.id}</div>
                      <div className="text-muted-foreground truncate">{post.content}</div>
                      <div className="text-muted-foreground">{post.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Your Posts Preview */}
            {result.userPosts.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Your Posts:</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {result.userPosts.slice(0, 3).map((post, index) => (
                    <div key={index} className="p-2 bg-primary/10 rounded text-xs">
                      <div className="font-medium">#{post.id}</div>
                      <div className="text-muted-foreground truncate">{post.content}</div>
                      <div className="text-muted-foreground">{post.timestamp}</div>
                      <div className="flex gap-2 mt-1">
                        <span>❤️ {post.likes}</span>
                        <span>💬 {post.comments}</span>
                        <span>🔄 {post.shares}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {result.totalPosts === 0 && result.connected && result.contractExists && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                  ⚠️ No posts found on contract
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                  This could mean the contract is newly deployed or posts aren't being created successfully.
                </div>
              </div>
            )}

          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default BlockchainDebugPanel;