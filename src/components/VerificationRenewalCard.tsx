import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Verified, Clock, AlertTriangle, Sparkles, Coins } from "lucide-react";
import { useSequence } from "@/contexts/SequenceContext";
import { useBalance, usePublicClient } from "wagmi";
import { parseEther, encodeFunctionData } from "viem";
import { toast } from "sonner";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { USER_PROFILE_ABI } from "@/lib/abis/UserProfile";

interface VerificationRenewalCardProps {
  userAddress: string;
  isVerified: boolean;
  isArtist: boolean;
  onRenewalSuccess?: () => void;
}

export default function VerificationRenewalCard({
  userAddress,
  isVerified,
  isArtist,
  onRenewalSuccess,
}: VerificationRenewalCardProps) {
  const { smartAccountAddress, executeGaslessTransaction } = useSequence();
  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });
  const publicClient = usePublicClient();

  const [expiryTime, setExpiryTime] = useState<number>(0);
  const [daysUntilExpiry, setDaysUntilExpiry] = useState<number>(0);
  const [isRenewing, setIsRenewing] = useState(false);
  const [upgradeFee, setUpgradeFee] = useState<string>("10");

  // Fetch verification expiry
  useEffect(() => {
    const fetchExpiryInfo = async () => {
      if (!publicClient || !userAddress || !isArtist) return;

      try {
        // Get expiry timestamp
        const expiry = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getVerificationExpiry',
          args: [userAddress as `0x${string}`],
        }) as bigint;

        setExpiryTime(Number(expiry));

        // Get days until expiry
        const days = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getDaysUntilExpiry',
          args: [userAddress as `0x${string}`],
        }) as bigint;

        setDaysUntilExpiry(Number(days));

        // Get current upgrade fee
        const fee = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.userProfile as `0x${string}`,
          abi: USER_PROFILE_ABI,
          functionName: 'getArtistUpgradeFee',
          args: [],
        }) as bigint;

        setUpgradeFee((Number(fee) / 1e18).toString());
      } catch (error) {
        console.error("Error fetching expiry info:", error);
      }
    };

    fetchExpiryInfo();
  }, [publicClient, userAddress, isArtist]);

  const handleRenew = async () => {
    if (!smartAccountAddress) {
      toast.error("Please connect your wallet");
      return;
    }

    if (balance && parseFloat(balance.formatted) < parseFloat(upgradeFee)) {
      toast.error(`Insufficient balance. You need ${upgradeFee} SOMI`);
      return;
    }

    setIsRenewing(true);
    try {
      toast.loading("Renewing verification...", { id: "renew-verification" });

      // Encode function call for renewVerification
      const txData = encodeFunctionData({
        abi: USER_PROFILE_ABI,
        functionName: 'renewVerification',
        args: []
      });

      // Execute transaction with payment
      const txHash = await executeGaslessTransaction(
        CONTRACT_ADDRESSES.userProfile as `0x${string}`,
        txData,
        parseEther(upgradeFee)
      );

      toast.dismiss("renew-verification");
      toast.success("Verification renewed!", {
        description: `Your verified status has been extended for 4 more months!`,
        action: {
          label: "View",
          onClick: () =>
            window.open(
              `https://shannon-explorer.somnia.network/tx/${txHash}`,
              "_blank"
            ),
        },
      });

      onRenewalSuccess?.();
    } catch (error: any) {
      console.error("Renewal failed:", error);
      toast.dismiss("renew-verification");
      toast.error(error.message || "Failed to renew verification");
    } finally {
      setIsRenewing(false);
    }
  };

  // Don't show if not an artist
  if (!isArtist) return null;

  // Calculate status
  const isExpired = expiryTime > 0 && Date.now() / 1000 > expiryTime;
  const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  const hasNoExpiry = expiryTime === 0; // Manually verified by owner

  // Format expiry date
  const expiryDate = expiryTime > 0 ? new Date(expiryTime * 1000).toLocaleDateString() : "Never";

  return (
    <Card className={`border-2 ${
      isExpired 
        ? "border-red-500/50 bg-red-500/5" 
        : isExpiringSoon 
          ? "border-yellow-500/50 bg-yellow-500/5" 
          : "border-green-500/50 bg-green-500/5"
    }`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isExpired 
                ? "bg-red-500/20" 
                : isExpiringSoon 
                  ? "bg-yellow-500/20" 
                  : "bg-green-500/20"
            }`}>
              {isExpired ? (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              ) : (
                <Verified className="w-6 h-6 text-green-500" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Verification Status
                {isVerified && !isExpired && (
                  <Badge variant="default" className="bg-blue-500">
                    Active
                  </Badge>
                )}
                {isExpired && (
                  <Badge variant="destructive">
                    Expired
                  </Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasNoExpiry ? (
                  <span className="text-green-600 font-medium">✨ Lifetime Verification (No Expiry)</span>
                ) : isExpired ? (
                  "Your verification has expired. Renew to receive tips again."
                ) : isExpiringSoon ? (
                  `Expires in ${daysUntilExpiry} days - Renew now to avoid interruption`
                ) : (
                  `Active until ${expiryDate}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Expiry Info */}
        {!hasNoExpiry && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expiry Date</span>
              </div>
              <span className={`text-sm font-semibold ${
                isExpired ? "text-red-500" : isExpiringSoon ? "text-yellow-500" : "text-green-500"
              }`}>
                {expiryDate}
              </span>
            </div>

            {!isExpired && daysUntilExpiry > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Days Remaining</span>
                </div>
                <span className={`text-sm font-semibold ${
                  isExpiringSoon ? "text-yellow-500" : "text-green-500"
                }`}>
                  {daysUntilExpiry} days
                </span>
              </div>
            )}
          </div>
        )}

        {/* Renewal Section - Only show if not lifetime verification */}
        {!hasNoExpiry && (
          <>
            {/* Benefits Reminder */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                Why Renew?
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Keep receiving tips from fans</li>
                <li>✓ Maintain verified badge visibility</li>
                <li>✓ Continue accessing premium features</li>
                <li>✓ Show commitment to your audience</li>
              </ul>
            </div>

            {/* Renewal Button */}
            <div className="flex items-center gap-3">
              <Button
                className="flex-1 h-12 bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:opacity-90"
                onClick={handleRenew}
                disabled={isRenewing}
              >
                {isRenewing ? (
                  "Processing..."
                ) : (
                  <>
                    <Verified className="w-5 h-5 mr-2" />
                    {isExpired ? "Reactivate" : "Renew"} for {upgradeFee} SOMI
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-3">
              {isExpired 
                ? "Reactivate your verification to start receiving tips again" 
                : "Extend your verification for another 4 months (120 days)"}
            </p>
          </>
        )}

        {/* Lifetime Verification Info */}
        {hasNoExpiry && (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">👑</span>
              <h4 className="font-semibold text-sm">Lifetime Verification</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              You have been manually verified by the platform. Your verification never expires!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
