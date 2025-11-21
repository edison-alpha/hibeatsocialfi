import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, ArrowRight, ChevronRight } from "lucide-react";
import { useBalance } from "wagmi";
import { toast } from "sonner";
import { useSequence } from "@/contexts/SequenceContext";

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (address: string, amount: string) => Promise<void>;
}

export default function SendTokenModal({ isOpen, onClose, onSend }: SendTokenModalProps) {
  const { smartAccountAddress } = useSequence();
  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolvingUsername, setIsResolvingUsername] = useState(false);
  


  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRecipient("");
      setAmount("");
      setResolvedAddress(null);
      setIsResolvingUsername(false);
    }
  }, [isOpen]);



  // Resolve username to address
  useEffect(() => {
    const resolveUsername = async () => {
      if (!recipient || recipient.startsWith("0x")) {
        setResolvedAddress(null);
        return;
      }

      setIsResolvingUsername(true);
      try {
        // Import subgraphService dynamically
        const { subgraphService: service } = await import('@/services/subgraphService');
        
        // Search for user by username
        const users = await service.searchUsers(recipient, 1);
        if (users.length > 0 && users[0].username.toLowerCase() === recipient.toLowerCase()) {
          setResolvedAddress(users[0].id);
          console.log('✅ Resolved username to address:', users[0].id);
        } else {
          setResolvedAddress(null);
        }
      } catch (error) {
        console.error('Failed to resolve username:', error);
        setResolvedAddress(null);
      } finally {
        setIsResolvingUsername(false);
      }
    };

    const debounce = setTimeout(resolveUsername, 500);
    return () => clearTimeout(debounce);
  }, [recipient]);

  const handleSend = async () => {
    // 🔒 CRITICAL: Prevent double submission
    if (isLoading) {
      console.warn('⚠️ Transaction already in progress, ignoring duplicate call');
      return;
    }

    if (!recipient || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    // Determine final address (resolved from username or direct address)
    let finalAddress = recipient;
    if (!recipient.startsWith("0x")) {
      if (!resolvedAddress) {
        toast.error("Username not found", {
          description: "Please enter a valid wallet address or username",
        });
        return;
      }
      finalAddress = resolvedAddress;
    }

    // Validate address format (Ethereum address)
    if (!finalAddress.startsWith("0x") || finalAddress.length !== 42) {
      toast.error("Invalid wallet address", {
        description: "Address must be 42 characters starting with 0x",
      });
      return;
    }

    // Validate address checksum (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalAddress)) {
      toast.error("Invalid address format", {
        description: "Address contains invalid characters",
      });
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount", {
        description: "Amount must be greater than 0",
      });
      return;
    }

    // Check minimum amount (prevent dust transactions)
    if (amountNum < 0.0001) {
      toast.error("Amount too small", {
        description: "Minimum amount is 0.0001 STT",
      });
      return;
    }

    // Check balance
    if (balance && parseFloat(amount) > parseFloat(balance.formatted)) {
      toast.error("Insufficient balance", {
        description: `You only have ${parseFloat(balance.formatted).toFixed(4)} STT`,
      });
      return;
    }

    // Prevent sending to self
    if (finalAddress.toLowerCase() === smartAccountAddress?.toLowerCase()) {
      toast.error("Cannot send to yourself", {
        description: "Please enter a different recipient address",
      });
      return;
    }

    console.log('🚀 Starting send transaction:', { 
      finalAddress, 
      amount,
      recipient: recipient.startsWith("0x") ? "address" : "username"
    });
    setIsLoading(true);
    
    try {
      await onSend(finalAddress, amount);
      console.log('✅ Send transaction completed successfully');
      
      // Reset form and close modal on success
      setRecipient("");
      setAmount("");
      setResolvedAddress(null);
      onClose();
    } catch (error) {
      console.error('❌ Send transaction failed:', error);
      // Don't close modal on error so user can retry
      // Error toast is already shown by parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxAmount = () => {
    if (balance) {
      // Leave a small amount for gas (even though it's gasless, for safety)
      const maxAmount = Math.max(0, parseFloat(balance.formatted) - 0.0001);
      setAmount(maxAmount.toFixed(4));
    }
  };

  const isFormValid = recipient && amount && !isLoading && !isResolvingUsername;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/30 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <DialogTitle className="text-xl font-semibold">Send Tokens</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent/50"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-5">
          {/* Recipient Address Card */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Recipient Address</Label>
            <div className="bg-card/30 border border-border/30 rounded-xl p-4 hover:border-border/50 transition-colors">
              <Input
                placeholder="Enter wallet address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-transparent border-0 h-auto p-0 text-base placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {isResolvingUsername && (
              <div className="text-xs text-muted-foreground px-1">Resolving username...</div>
            )}
            {resolvedAddress && (
              <div className="text-xs text-green-500 px-1">
                ✓ Found: {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
              </div>
            )}
            {recipient && !recipient.startsWith("0x") && !resolvedAddress && !isResolvingUsername && (
              <div className="text-xs text-red-500 px-1">Username not found</div>
            )}
          </div>

          {/* Amount Card */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
            <div className="bg-card/30 border border-border/30 rounded-xl p-4 hover:border-border/50 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.0001"
                  min="0"
                  placeholder="0.0"
                  className="bg-transparent border-0 h-auto p-0 text-base placeholder:text-muted-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-1">
                    <img 
                      src="https://somnia.network/images/branding/somnia_logo_color.png" 
                      alt="STT"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-sm font-medium">STT</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
              <span>Balance: {balance ? parseFloat(balance.formatted).toFixed(4) : "0"} STT</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent"
                onClick={handleMaxAmount}
              >
                Max
              </Button>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-muted/20 border border-border/20 rounded-xl p-4 space-y-2">
            <div className="text-xs text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-green-500">⚡</span>
                <span className="font-medium text-foreground">Gasless Transaction</span>
              </div>
              <p>No fees required. Powered by Sequence Smart Wallet.</p>
              <p className="text-[11px] text-muted-foreground/60">
                • Sub-second finality on Somnia Network<br/>
                • Secure native STT token transfer<br/>
                • Transaction cannot be reversed
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 border-border/30 hover:bg-accent/50"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 bg-primary hover:bg-primary/90 disabled:opacity-50"
              onClick={handleSend}
              disabled={!isFormValid || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Send {amount} STT
                </>
              )}
            </Button>
          </div>
          
          {!isFormValid && (
            <p className="text-xs text-muted-foreground text-center">
              Fill in all fields to enable sending
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
