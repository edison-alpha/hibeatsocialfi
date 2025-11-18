import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Wallet } from "lucide-react";
import { toast } from "sonner";

interface ReceiveTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
}

const ReceiveTokenModal = ({ isOpen, onClose, address }: ReceiveTokenModalProps) => {
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-background/98 backdrop-blur-xl border border-border/50 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            Receive Tokens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code Placeholder */}
          <div className="mx-auto w-56 h-56 bg-white dark:bg-muted/30 rounded-3xl p-4 flex items-center justify-center border border-border/30 shadow-xl">
            <div className="w-48 h-48 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center">
              <Wallet className="w-20 h-20 text-muted-foreground/40" />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-2">
                Your Wallet Address
              </div>
              <div className="p-4 bg-muted/20 rounded-xl border border-border/30 backdrop-blur-sm">
                <code className="text-[11px] font-mono break-all text-muted-foreground block">
                  {address}
                </code>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full h-11 rounded-xl border-border/30 hover:bg-accent/50 transition-all font-medium"
              onClick={copyAddress}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
          </div>

          {/* Info Card */}
          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl backdrop-blur-sm">
            <div className="text-[12px] text-muted-foreground/70 space-y-2">
              <div className="font-semibold text-foreground mb-3 text-[13px] tracking-tight">
                💡 How to Receive
              </div>
              <div>• Share this address with the sender</div>
              <div>• Or scan the QR code above</div>
              <div>• Supports all tokens on Somnia network</div>
              <div>• Gasless - No fees to receive!</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiveTokenModal;
