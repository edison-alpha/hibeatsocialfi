import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Music, Verified, Coins, CheckCircle2, Sparkles } from "lucide-react";
import { useSequence } from "@/contexts/SequenceContext";
import { useBalance, usePublicClient } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { USER_PROFILE_ABI } from "@/lib/abis/UserProfile";

interface ArtistUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ArtistUpgradeModal({
  isOpen,
  onClose,
  onSuccess,
}: ArtistUpgradeModalProps) {
  const { smartAccountAddress, executeGaslessTransaction } = useSequence();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });

  const [artistName, setArtistName] = useState("");
  const [genre, setGenre] = useState("");
  const [isIndependent, setIsIndependent] = useState(true);
  const [recordLabel, setRecordLabel] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeFee, setUpgradeFee] = useState<bigint | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(true);

  // Fetch upgrade fee from smart contract
  useEffect(() => {
    const fetchUpgradeFee = async () => {
      if (!publicClient) return;
      
      try {
        setIsLoadingFee(true);
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getArtistUpgradeFee',
        }) as bigint;
        
        setUpgradeFee(fee);
        console.log('✅ Artist upgrade fee from contract:', formatEther(fee), 'SOMI');
      } catch (error) {
        console.error('Failed to fetch upgrade fee:', error);
        toast.error('Failed to load upgrade fee');
        // Fallback to default 20 SOMI
        setUpgradeFee(parseEther("20"));
      } finally {
        setIsLoadingFee(false);
      }
    };

    if (isOpen) {
      fetchUpgradeFee();
    }
  }, [isOpen, publicClient]);

  const handleUpgrade = async () => {
    if (!artistName.trim()) {
      toast.error("Please enter your artist name");
      return;
    }

    if (!genre.trim()) {
      toast.error("Please select a genre");
      return;
    }

    if (!upgradeFee) {
      toast.error("Upgrade fee not loaded yet");
      return;
    }

    // Check balance
    if (balance && balance.value < upgradeFee) {
      const feeInSomi = formatEther(upgradeFee);
      toast.error(`Insufficient balance. You need ${feeInSomi} SOMI`);
      return;
    }

    setIsUpgrading(true);
    try {
      toast.loading("Upgrading to Artist...", { id: "upgrade-artist" });

      // Encode function call for upgradeToArtist
      const { encodeFunctionData } = await import('viem');
      
      const txData = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'upgradeToArtist',
        args: [
          artistName.trim(),
          genre.trim(),
          isIndependent,
          recordLabel.trim()
        ]
      });

      // Execute transaction with payment (fee from smart contract)
      const txHash = await executeGaslessTransaction(
        CONTRACT_ADDRESSES.userProfile as `0x${string}`,
        txData,
        upgradeFee // Use fee from smart contract
      );

      toast.dismiss("upgrade-artist");
      toast.success("Successfully upgraded to Artist!", {
        description: "You are now a verified artist and can receive tips!",
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `https://shannon-explorer.somnia.network/tx/${txHash}`,
              "_blank"
            ),
        },
      });

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Upgrade failed:", error);
      toast.dismiss("upgrade-artist");
      toast.error(error.message || "Failed to upgrade to artist");
    } finally {
      setIsUpgrading(false);
    }
  };

  const genres = [
    "Electronic", "Hip Hop", "Jazz", "Ambient", "Rock", 
    "Pop", "R&B", "Classical", "Folk", "Reggae", "Other"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-background border-border/50 p-0 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 sticky top-0 bg-background z-10">
          <div>
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              Upgrade to Artist
            </DialogTitle>
            <DialogDescription className="mt-1">
              Become a verified artist and unlock exclusive features
            </DialogDescription>
          </div>
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
          {/* Subscription Plan Card */}
          <div className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border-2 border-primary/30 rounded-2xl overflow-hidden">
            {/* Plan Header */}
            <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Artist Verification Plan
                  </h3>
                  <p className="text-sm text-white/80 mt-1">Unlock premium features and monetization</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {isLoadingFee ? "..." : upgradeFee ? formatEther(upgradeFee) : "20"}
                  </div>
                  <div className="text-sm text-white/80">SOMI</div>
                </div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-5 space-y-4">
              {/* What's Included */}
              <div>
                <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                  What's Included
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Permanent Artist Badge 🎵</div>
                      <div className="text-xs text-muted-foreground">Purple artist badge - yours forever</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Verified Badge ✓ (4 months)</div>
                      <div className="text-xs text-muted-foreground">Blue checkmark for 120 days</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Receive Tips 💰</div>
                      <div className="text-xs text-muted-foreground">Monetize your content (while verified)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Priority Support & Analytics</div>
                      <div className="text-xs text-muted-foreground">Track performance & get help faster</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Terms */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs">ℹ️</span>
                  </div>
                  <div className="flex-1 text-xs text-muted-foreground space-y-1">
                    <p><strong className="text-foreground">Artist badge is permanent</strong> - you keep it forever</p>
                    <p><strong className="text-foreground">Verified badge expires after 4 months</strong> - renew to keep receiving tips</p>
                    <p>You'll be notified 7 days before expiration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>



          {/* Artist Information Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Artist Name *</Label>
              <Input
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Your artist/stage name"
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary Genre *</Label>
              <div className="flex flex-wrap gap-2">
                {genres.map((g) => (
                  <Badge
                    key={g}
                    variant={genre === g ? "default" : "outline"}
                    className={`px-4 py-2 rounded-full cursor-pointer transition-colors ${
                      genre === g
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-primary hover:text-primary-foreground"
                    }`}
                    onClick={() => setGenre(g)}
                  >
                    {g}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Artist Type</Label>
              <div className="flex gap-3">
                <Badge
                  variant={isIndependent ? "default" : "outline"}
                  className={`px-6 py-3 rounded-xl cursor-pointer transition-colors ${
                    isIndependent
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary hover:text-primary-foreground"
                  }`}
                  onClick={() => setIsIndependent(true)}
                >
                  Independent Artist
                </Badge>
                <Badge
                  variant={!isIndependent ? "default" : "outline"}
                  className={`px-6 py-3 rounded-xl cursor-pointer transition-colors ${
                    !isIndependent
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-primary hover:text-primary-foreground"
                  }`}
                  onClick={() => setIsIndependent(false)}
                >
                  Signed Artist
                </Badge>
              </div>
            </div>

            {!isIndependent && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Record Label</Label>
                <Input
                  value={recordLabel}
                  onChange={(e) => setRecordLabel(e.target.value)}
                  placeholder="Your record label name"
                  className="h-12 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b border-border">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-500" />
                Payment Summary
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subscription Fee</span>
                <span className="font-semibold">
                  {isLoadingFee ? "Loading..." : upgradeFee ? `${formatEther(upgradeFee)} SOMI` : "20 SOMI"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">4 months (120 days)</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gas Fee</span>
                <span className="font-semibold text-green-600 dark:text-green-400">FREE ⚡</span>
              </div>
              
              <div className="border-t border-border pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total Due Today</span>
                  <span className="text-2xl font-bold text-primary">
                    {isLoadingFee ? "..." : upgradeFee ? formatEther(upgradeFee) : "20"} SOMI
                  </span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">Your Balance</span>
                  <span className="font-medium">
                    {balance ? parseFloat(balance.formatted).toFixed(4) : "0"} SOMI
                  </span>
                </div>
                {balance && upgradeFee && balance.value < upgradeFee && (
                  <div className="text-red-500 mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>Insufficient balance</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-xl"
              onClick={onClose}
              disabled={isUpgrading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90"
              onClick={handleUpgrade}
              disabled={!artistName.trim() || !genre.trim() || isUpgrading || isLoadingFee || !upgradeFee}
            >
              {isUpgrading ? (
                "Upgrading..."
              ) : isLoadingFee ? (
                "Loading fee..."
              ) : (
                <>
                  <Verified className="w-5 h-5 mr-2" />
                  Upgrade for {upgradeFee ? formatEther(upgradeFee) : "20"} SOMI
                </>
              )}
            </Button>
          </div>

          {/* Terms & Conditions */}
          <div className="text-xs text-muted-foreground text-center space-y-1 pt-2 border-t border-border/50">
            <p>By upgrading, you agree to our <span className="text-primary cursor-pointer hover:underline">Terms of Service</span></p>
            <p>Payment is non-refundable. Verification auto-expires after 4 months.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
