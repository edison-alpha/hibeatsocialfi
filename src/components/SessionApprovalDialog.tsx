import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Shield, Loader2 } from 'lucide-react';

interface SessionApprovalDialogProps {
  isOpen: boolean;
}

/**
 * Session Approval Dialog
 * Shows when waiting for user to approve session setup
 */
export const SessionApprovalDialog = ({ isOpen }: SessionApprovalDialogProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-6 h-6 text-primary" />
            Session Setup Required
          </DialogTitle>
          <DialogDescription className="space-y-4 pt-4">
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <Shield className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              <div className="text-center space-y-2">
                <p className="font-semibold text-lg">
                  Please approve in your wallet
                </p>
                <p className="text-sm text-muted-foreground">
                  We need to set up a secure session to enable auto-approve for all your transactions.
                </p>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Why this is needed:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Approve <strong>once</strong> now</li>
                <li><strong>No more popups</strong> for future transactions</li>
                <li>All transactions will be <strong>auto-approved</strong></li>
                <li>Session is <strong>permanent</strong> while wallet is connected</li>
              </ul>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              This is a one-time setup. After approval, you can enjoy a seamless Web3 experience! 🎉
            </p>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default SessionApprovalDialog;
