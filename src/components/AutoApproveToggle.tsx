import { useState } from 'react';
import { useSequence } from '@/contexts/SequenceContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Zap, Clock, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { toast } from 'sonner';

export function AutoApproveToggle() {
  const { isSessionActive, createSession, closeSession } = useSequence();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true);
    try {
      if (checked) {
        // Enable auto-approve permanently (no expiry)
        await createSession();
        // Silent - no toast notification
      } else {
        // Disable auto-approve
        closeSession();
        // Silent - no toast notification
      }
    } catch (error) {
      console.error('Failed to toggle auto-approve:', error);
      toast.error('❌ Failed to change settings', {
        description: 'Please try again or check your wallet'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openSequenceSettings = () => {
    // Open Sequence wallet (akan membuka extension atau redirect)
    toast.info('📱 Opening Sequence Wallet...', {
      description: 'Please enable auto-approve in wallet settings'
    });
    
    // Trigger wallet open (jika ada API)
    console.log('💡 Manual: Open Sequence wallet extension and go to Settings → Connected Sites');
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle>Auto-Approve Transactions</CardTitle>
        </div>
        <CardDescription>
          Enable seamless transactions without confirmation popups
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Important Notice */}
        <Alert className="bg-blue-500/10 border-blue-500">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700 dark:text-blue-300">
            Manual Setup Required
          </AlertTitle>
          <AlertDescription className="text-sm text-blue-600 dark:text-blue-400">
            To enable auto-approve, you need to configure it in your Sequence Wallet settings.
            This toggle only tracks the status in the app.
          </AlertDescription>
        </Alert>

        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-approve" 
              checked={isSessionActive}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
            <Label htmlFor="auto-approve" className="cursor-pointer">
              {isSessionActive ? (
                <span className="text-green-600 dark:text-green-400 font-medium">
                  ✅ Enabled in App
                </span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">
                  ❌ Disabled
                </span>
              )}
            </Label>
          </div>
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          )}
        </div>

        {/* Status Banner */}
        {isSessionActive && (
          <Alert className="bg-yellow-500/10 border-yellow-500">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm text-yellow-700 dark:text-yellow-300">
              <strong>Status in app: Enabled</strong><br />
              If you still see popups, follow the setup steps below.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Instructions */}
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            How to Enable Auto-Approve:
          </h3>
          <ol className="space-y-2 text-sm text-muted-foreground pl-6">
            <li className="list-decimal">
              Open <strong>Sequence Wallet</strong> extension or app
            </li>
            <li className="list-decimal">
              Go to <strong>Settings</strong> → <strong>Connected Sites</strong>
            </li>
            <li className="list-decimal">
              Find <strong>this website</strong> in the list
            </li>
            <li className="list-decimal">
              Enable "<strong>Auto-confirm transactions</strong>"
            </li>
            <li className="list-decimal">
              Set spending limits (recommended: 0.01 ETH per tx)
            </li>
            <li className="list-decimal">
              Save and reload this page
            </li>
          </ol>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium">What You'll Get:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>100% Gasless (Free transactions)</span>
            </li>
            <li className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>No confirmation popups (after setup)</span>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              <span>Instant transactions (1-2 seconds)</span>
            </li>
          </ul>
        </div>

        {/* Warning */}
        <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Security Note:</strong> Only enable auto-approve for trusted sites. 
              Set transaction limits to protect your funds.
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={openSequenceSettings}
          >
            <Shield className="h-4 w-4 mr-2" />
            Open Wallet
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open('https://docs.sequence.xyz/wallet/guides/sign-transactions', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Guide
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SessionStatusBanner() {
  // Component disabled - auto-approve works silently in background
  return null;
}
