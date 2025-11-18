import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LogIn, Wallet, Zap, Shield, Clock } from "lucide-react";
import { useOpenConnectModal } from '@0xsequence/connect';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: () => void; // Made optional since we use Sequence Connect directly
}

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
  const { setOpenConnectModal } = useOpenConnectModal();

  const handleLogin = () => {
    // Close our custom modal
    onClose();
    // Open Sequence Connect modal (embedded wallet)
    setOpenConnectModal(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-2xl font-clash font-semibold text-center">
          Welcome to HiBeats
        </DialogTitle>
        <DialogDescription className="text-center text-muted-foreground">
          Sign in to access your music and social features
        </DialogDescription>

        <CardContent className="space-y-6 pt-6">
          <Button
            onClick={handleLogin}
            className="w-full gap-3 h-14 text-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Wallet className="w-6 h-6" />
            Connect Wallet
          </Button>
          
          <div className="space-y-3">
            <div className="text-xs font-medium text-center text-muted-foreground">
              Login Options:
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-center">
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <span>�</span>
                <span>Email</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <span>🔍</span>
                <span>Google</span>
              </div>
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                <span>🦊</span>
                <span>MetaMask</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="text-xs font-semibold text-center text-primary mb-3">
              ✨ What You Get:
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-500">100% Gasless</div>
                  <div className="text-muted-foreground">All transactions are free</div>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Clock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-purple-500">Session Active 24h</div>
                  <div className="text-muted-foreground">Seamless experience like Web2</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};

export default LoginModal;