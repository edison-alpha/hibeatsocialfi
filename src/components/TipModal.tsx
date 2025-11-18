import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Coins } from "lucide-react";
import { useBalance } from "wagmi";
import { parseEther } from "viem";
import { toast } from "sonner";
import { useSequence } from "@/contexts/SequenceContext";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientAddress: string;
  recipientName: string;
  recipientAvatar?: string;
  onTipSent?: () => void;
}

const TIP_AMOUNTS = [0.1, 0.5, 1, 5, 10];

export default function TipModal({
  isOpen,
  onClose,
  recipientAddress,
  recipientName,
  recipientAvatar,
  onTipSent,
}: TipModalProps) {
  const { smartAccountAddress, executeGaslessTransaction } = useSequence();
  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSendTip = async () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      toast.error("Please select or enter a tip amount");
      return;
    }

    if (balance && amount > parseFloat(balance.formatted)) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSending(true);
    try {
      toast.loading("Sending tip...", { id: "send-tip" });

      const txData = "0x";
      const amountWei = parseEther(amount.toString());

      const txHash = await executeGaslessTransaction(
        recipientAddress as `0x${string}`,
        txData,
        amountWei
      );

      toast.dismiss("send-tip");
      toast.success("Tip sent!", {
        description: `Sent ${amount} STT to ${recipientName}`,
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `https://shannon-explorer.somnia.network/tx/${txHash}`,
              "_blank"
            ),
        },
      });

      onTipSent?.();
      onClose();
    } catch (error: any) {
      console.error("Tip failed:", error);
      toast.dismiss("send-tip");
      toast.error(error.message || "Failed to send tip");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background border-border/50 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold">Send a tip</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Recipient Info */}
          <div className="flex items-center gap-3 p-4 bg-card/50 border border-border/50 rounded-xl">
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={recipientAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white">
                {recipientName?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{recipientName || 'User'}</div>
              <div className="text-xs text-muted-foreground">
                {recipientAddress?.slice(0, 6)}...{recipientAddress?.slice(-4)}
              </div>
            </div>
            <Coins className="w-5 h-5 text-primary" />
          </div>

          {/* Quick Tip Amounts */}
          <div className="space-y-3">
            <div className="text-sm font-semibold">Quick tip amounts</div>
            <div className="grid grid-cols-5 gap-2">
              {TIP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedAmount === amount ? "default" : "outline"}
                  className="h-12 flex flex-col items-center justify-center"
                  onClick={() => {
                    setSelectedAmount(amount);
                    setCustomAmount("");
                  }}
                >
                  <div className="text-xs font-semibold">{amount}</div>
                  <div className="text-[10px] text-muted-foreground">STT</div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">Or enter custom amount</div>
            <div className="relative">
              <input
                type="number"
                placeholder="0.0"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                className="w-full h-14 px-4 pr-16 bg-card/50 border border-border/50 rounded-xl text-lg focus:outline-none focus:ring-2 focus:ring-primary"
                step="0.01"
                min="0"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                STT
              </div>
            </div>
          </div>

          {/* Balance Info */}
          <div className="text-xs text-muted-foreground text-center">
            Your balance: {balance ? parseFloat(balance.formatted).toFixed(4) : "0"} STT
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              onClick={handleSendTip}
              disabled={(!selectedAmount && !customAmount) || isSending}
            >
              {isSending ? "Sending..." : `Send ${selectedAmount || customAmount || "0"} STT`}
            </Button>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <div className="flex items-center justify-center gap-1">
              <span className="text-green-500">⚡</span>
              <span>Gasless transaction - No fees required</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
