import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  ExternalLink,
  Wallet,
  Image as ImageIcon,
  Activity,
  Send as SendIcon,
  Download,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Music,
  Settings,
  LogOut,
} from "lucide-react";
import { useSequence } from "@/contexts/SequenceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBalance, usePublicClient, useDisconnect } from "wagmi";
import { toast } from "sonner";
import { subgraphService } from "@/services/subgraphService";
import { formatEther, parseEther } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NFT {
  tokenId: string;
  title: string;
  artist: string;
  imageUrl: string;
  collection: string;
}

interface Transaction {
  hash: string;
  type: "send" | "receive" | "mint" | "interact";
  amount?: string;
  token?: string;
  timestamp: number;
  status: "success" | "pending" | "failed";
  from?: string;
  to?: string;
}

const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { smartAccountAddress, isAccountReady, executeGaslessTransaction } = useSequence();
  const { userProfile } = useAuth();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();

  // Balance state
  const { data: balance, isLoading: isLoadingBalance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
  });

  // NFTs state
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const [nftError, setNftError] = useState<string | null>(null);

  // Activity state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  // Send/Receive state
  const [activeTab, setActiveTab] = useState("tokens");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Debug: Log tab changes
  useEffect(() => {
    console.log("🔄 [WalletModal] Active tab changed to:", activeTab);
  }, [activeTab]);

  // Copy address
  const copyAddress = () => {
    if (smartAccountAddress) {
      navigator.clipboard.writeText(smartAccountAddress);
      toast.success("Address copied to clipboard!");
    }
  };

  // Format address
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("tokens");
      setNfts([]);
      setTransactions([]);
      setNftError(null);
    }
  }, [isOpen]);

  // Load NFTs
  useEffect(() => {
    const loadNFTs = async () => {
      if (!smartAccountAddress) {
        console.log("❌ [WalletModal] No smart account address");
        setIsLoadingNFTs(false);
        setNftError("No wallet connected");
        return;
      }

      console.log("🎨 [WalletModal] Starting NFT load for:", smartAccountAddress);
      console.log("🎨 [WalletModal] Modal open:", isOpen, "Active tab:", activeTab);
      
      setIsLoadingNFTs(true);
      setNftError(null);
      
      try {
        console.log("📡 [WalletModal] Calling subgraphService.getUserOwnedSongs...");
        
        // Get owned songs from subgraph
        const ownedSongs = await subgraphService.getUserOwnedSongs(smartAccountAddress, 100, 0);
        
        console.log("✅ [WalletModal] Subgraph response:", {
          count: ownedSongs.length,
          songs: ownedSongs
        });

        if (!Array.isArray(ownedSongs)) {
          throw new Error("Invalid response from subgraph");
        }

        const nftList: NFT[] = ownedSongs.map((song: any) => {
          console.log("🎵 [WalletModal] Processing song:", song);
          return {
            tokenId: song.id,
            title: song.title || "Untitled",
            artist: song.artist || "Unknown Artist",
            imageUrl: song.ipfsArtworkHash
              ? `https://ipfs.io/ipfs/${song.ipfsArtworkHash}`
              : "/placeholder-music.png",
            collection: "HiBeats Music NFT",
          };
        });

        console.log("✅ [WalletModal] NFT list created:", nftList);
        setNfts(nftList);
        setNftError(null);
        console.log("✅ [WalletModal] NFT state updated with", nftList.length, "items");
      } catch (error) {
        console.error("❌ [WalletModal] Failed to load NFTs:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setNftError(errorMessage);
        
        if (error instanceof Error) {
          console.error("❌ [WalletModal] Error details:", {
            message: error.message,
            stack: error.stack
          });
        }
        
        toast.error("Failed to load NFTs", {
          description: errorMessage
        });
      } finally {
        console.log("🏁 [WalletModal] NFT loading finished");
        setIsLoadingNFTs(false);
      }
    };

    // Only load when modal is open AND NFTs tab is active
    if (isOpen && activeTab === "nfts") {
      console.log("🚀 [WalletModal] Triggering NFT load...");
      loadNFTs();
    } else {
      console.log("⏸️ [WalletModal] Skipping NFT load - modal open:", isOpen, "active tab:", activeTab);
    }
  }, [smartAccountAddress, isOpen, activeTab]);

  // Load activity/transactions
  useEffect(() => {
    const loadActivity = async () => {
      if (!smartAccountAddress || !publicClient) return;

      setIsLoadingActivity(true);
      try {
        // Get recent blocks
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(1000); // Last ~1000 blocks

        // Get transaction logs for this address
        // This is a simplified version - you may want to use a more robust solution
        const mockTransactions: Transaction[] = [
          {
            hash: "0x1234...5678",
            type: "mint",
            timestamp: Date.now() - 3600000,
            status: "success",
            to: smartAccountAddress,
          },
          {
            hash: "0xabcd...efgh",
            type: "interact",
            timestamp: Date.now() - 7200000,
            status: "success",
            from: smartAccountAddress,
          },
        ];

        setTransactions(mockTransactions);
      } catch (error) {
        console.error("Failed to load activity:", error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    if (isOpen && activeTab === "activity") {
      loadActivity();
    }
  }, [smartAccountAddress, publicClient, isOpen, activeTab]);

  // Handle send
  const handleSend = async () => {
    if (!sendAddress || !sendAmount || !smartAccountAddress) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSending(true);
    try {
      // Validate address
      if (!sendAddress.startsWith("0x") || sendAddress.length !== 42) {
        throw new Error("Invalid address");
      }

      toast.loading("Sending transaction...", { id: "send-tx" });

      // Send native token (STT) using executeGaslessTransaction
      // Create transaction data for native transfer
      const txData = "0x"; // Empty data for native transfer
      const amount = parseEther(sendAmount);

      // Execute gasless transaction
      const txHash = await executeGaslessTransaction(
        sendAddress as `0x${string}`,
        txData,
        amount
      );

      toast.dismiss("send-tx");
      toast.success("Transaction sent successfully!", {
        description: `Sent ${sendAmount} ${balance?.symbol || "STT"} to ${formatAddress(sendAddress)}`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(
              `https://shannon-explorer.somnia.network/tx/${txHash}`,
              "_blank"
            ),
        },
      });

      // Reset form
      setSendAddress("");
      setSendAmount("");
    } catch (error: any) {
      console.error("Send failed:", error);
      toast.dismiss("send-tx");
      toast.error(error.message || "Failed to send transaction");
    } finally {
      setIsSending(false);
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    onClose();
    toast.success("Wallet disconnected");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden">
        {/* Header - macOS style */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11 ring-2 ring-primary/10">
                <AvatarImage src={userProfile?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-medium">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight">
                  {userProfile?.name || "My Wallet"}
                </DialogTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-muted-foreground font-mono tracking-tight">
                    {smartAccountAddress && formatAddress(smartAccountAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-accent/50 rounded-md transition-all"
                    onClick={copyAddress}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 hover:bg-accent/50 rounded-md transition-all"
                    onClick={() =>
                      window.open(
                        `https://shannon-explorer.somnia.network/address/${smartAccountAddress}`,
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="h-8 w-8 p-0 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Balance Display - macOS style with glassmorphism */}
        <div className="px-6 py-8 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
          
          <div className="text-center relative z-10">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-2 font-medium">
              Total Balance
            </div>
            <div className="text-5xl font-semibold mb-2 tracking-tight">
              {isLoadingBalance ? (
                <span className="text-muted-foreground/50">Loading...</span>
              ) : balance ? (
                <>
                  <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                    ${parseFloat(balance.formatted).toFixed(2)}
                  </span>
                  <span className="text-base text-muted-foreground/60 ml-2 font-normal">
                    {balance.symbol}
                  </span>
                </>
              ) : (
                "$0.00"
              )}
            </div>
            {balance && (
              <div className="text-[11px] text-muted-foreground/60 font-mono">
                {parseFloat(balance.formatted).toFixed(6)} {balance.symbol}
              </div>
            )}
          </div>

          {/* Send/Receive Buttons - macOS style */}
          <div className="flex gap-2.5 mt-6 relative z-10">
            <Button
              className="flex-1 h-10 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] font-medium"
              onClick={() => setActiveTab("send")}
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Send
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-10 border-border/50 hover:bg-accent/50 rounded-xl transition-all hover:scale-[1.02] font-medium backdrop-blur-sm"
              onClick={() => setActiveTab("receive")}
            >
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Receive
            </Button>
          </div>
        </div>

        {/* Tabs - macOS style */}
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            console.log("🔄 [WalletModal] Tab changed to:", value);
            setActiveTab(value);
          }} 
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-4 rounded-none border-b border-border/30 bg-transparent h-11 p-0">
            <TabsTrigger 
              value="tokens"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] font-medium transition-all"
            >
              Tokens
            </TabsTrigger>
            <TabsTrigger 
              value="nfts"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] font-medium transition-all"
            >
              NFTs {nfts.length > 0 && <span className="ml-1 text-[11px] opacity-60">({nfts.length})</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="activity"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] font-medium transition-all"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="receive"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[13px] font-medium transition-all"
            >
              Receive
            </TabsTrigger>
          </TabsList>

          {/* Tokens Tab - macOS style */}
          <TabsContent value="tokens" className="p-5 space-y-5 max-h-[420px] overflow-y-auto scrollbar-thin">
            {/* Send Form - macOS style */}
            <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-border/30 rounded-xl overflow-hidden backdrop-blur-sm">
              <CardContent className="p-4 space-y-3">
                <div className="text-[13px] font-semibold mb-2 tracking-tight">Send Tokens</div>
                <div className="space-y-2.5">
                  <Input
                    placeholder="Recipient address (0x...)"
                    value={sendAddress}
                    onChange={(e) => setSendAddress(e.target.value)}
                    className="font-mono text-xs h-10 rounded-lg border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      className="flex-1 h-10 rounded-lg border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <Button
                      size="sm"
                      onClick={handleSend}
                      disabled={!sendAddress || !sendAmount || isSending}
                      className="px-6 h-10 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </Button>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                    <span className="text-yellow-500">⚡</span>
                    Gasless - No fees required!
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Token List - macOS style */}
            <div className="space-y-3">
              <div className="text-[13px] font-semibold tracking-tight px-1">Your Tokens</div>
              <Card className="hover:bg-accent/30 transition-all cursor-pointer border-border/30 rounded-xl overflow-hidden backdrop-blur-sm hover:shadow-md group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-xl group-hover:shadow-purple-500/30 transition-all">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold text-[14px] tracking-tight">{balance?.symbol || "STT"}</div>
                        <div className="text-[12px] text-muted-foreground/70 font-mono">
                          {balance ? parseFloat(balance.formatted).toFixed(4) : "0.0000"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-[14px] tracking-tight">
                        ${balance ? parseFloat(balance.formatted).toFixed(2) : "0.00"}
                      </div>
                      <div className="text-[11px] text-green-500 flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3" />
                        +0.00%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="text-center text-[11px] text-muted-foreground/50 py-6">
                No other tokens found
              </div>
            </div>
          </TabsContent>

          {/* NFTs Tab - macOS style */}
          <TabsContent value="nfts" className="p-5 max-h-[420px] overflow-y-auto scrollbar-thin">
            {/* Debug Info - Remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-3 p-3 bg-muted/30 backdrop-blur-sm rounded-lg text-[11px] font-mono space-y-1 border border-border/30">
                <div>Loading: {isLoadingNFTs ? "✅ true" : "❌ false"}</div>
                <div>NFTs count: {nfts.length}</div>
                <div>Error: {nftError || "none"}</div>
                <div>Smart Account: {smartAccountAddress?.slice(0, 10)}...</div>
                <div>Modal Open: {isOpen ? "✅" : "❌"}</div>
                <div>Active Tab: {activeTab}</div>
              </div>
            )}
            
            {nftError && !isLoadingNFTs ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center backdrop-blur-sm">
                  <ImageIcon className="w-10 h-10 text-destructive" />
                </div>
                <div className="text-[13px] font-semibold mb-1.5 text-destructive tracking-tight">Failed to Load NFTs</div>
                <div className="text-[11px] text-muted-foreground/70 mb-5 max-w-[240px] mx-auto">
                  {nftError}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-border/50 hover:bg-accent/50 transition-all"
                  onClick={() => {
                    setNftError(null);
                    setActiveTab("tokens");
                    setTimeout(() => setActiveTab("nfts"), 100);
                  }}
                >
                  Try Again
                </Button>
              </div>
            ) : isLoadingNFTs ? (
              <div className="space-y-4">
                <div className="text-center text-[13px] text-muted-foreground/70 mb-5 tracking-tight">
                  Loading your NFTs...
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="overflow-hidden rounded-xl border-border/30">
                      <div className="aspect-square bg-muted/50 animate-pulse" />
                      <CardContent className="p-3 space-y-2">
                        <div className="h-4 bg-muted/50 rounded-md animate-pulse" />
                        <div className="h-3 bg-muted/50 rounded-md w-2/3 animate-pulse" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : nfts.length > 0 ? (
              <div className="space-y-4">
                <div className="text-[13px] font-semibold tracking-tight px-1">
                  Your NFTs ({nfts.length})
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {nfts.map((nft) => (
                    <Card
                      key={nft.tokenId}
                      className="overflow-hidden rounded-xl border-border/30 hover:shadow-xl hover:shadow-primary/10 transition-all hover:scale-[1.02] cursor-pointer group backdrop-blur-sm"
                      onClick={() => {
                        window.open(
                          `https://shannon-explorer.somnia.network/token/${CONTRACT_ADDRESSES.songNFT}/instance/${nft.tokenId}`,
                          "_blank"
                        );
                      }}
                    >
                      <div className="aspect-square bg-muted/30 relative overflow-hidden">
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder-music.png";
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <ExternalLink className="w-6 h-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform" />
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="text-[10px] backdrop-blur-md bg-background/90 border-border/30 rounded-lg px-2 py-0.5">
                            <Music className="w-2.5 h-2.5 mr-1" />
                            Music
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-3 bg-gradient-to-b from-background/50 to-background/80 backdrop-blur-sm">
                        <div className="font-semibold text-[13px] truncate tracking-tight">{nft.title}</div>
                        <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                          {nft.artist}
                        </div>
                        <div className="text-[10px] text-muted-foreground/50 mt-1 font-mono">
                          #{nft.tokenId}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center backdrop-blur-sm">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <div className="text-[13px] font-semibold mb-1.5 tracking-tight">No NFTs Yet</div>
                <div className="text-[11px] text-muted-foreground/70 mb-5">
                  Start collecting music NFTs on HiBeats
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 rounded-lg border-border/50 hover:bg-accent/50 transition-all"
                  onClick={() => {
                    onClose();
                    window.location.href = "/explore";
                  }}
                >
                  Explore NFTs
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
            {isLoadingActivity ? (
              <div className="space-y-3">
                <div className="text-center text-sm text-muted-foreground mb-4">
                  Loading activity...
                </div>
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
                          <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm font-semibold mb-2">
                  Recent Activity
                </div>
                {transactions.map((tx) => (
                  <Card
                    key={tx.hash}
                    className="hover:bg-accent/50 transition-colors cursor-pointer group"
                    onClick={() =>
                      window.open(
                        `https://shannon-explorer.somnia.network/tx/${tx.hash}`,
                        "_blank"
                      )
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === "send"
                                ? "bg-red-500/10"
                                : tx.type === "receive"
                                ? "bg-green-500/10"
                                : "bg-blue-500/10"
                            }`}
                          >
                            {tx.type === "send" ? (
                              <ArrowUpRight className="w-5 h-5 text-red-500" />
                            ) : tx.type === "receive" ? (
                              <ArrowDownLeft className="w-5 h-5 text-green-500" />
                            ) : (
                              <Activity className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold capitalize flex items-center gap-2">
                              {tx.type}
                              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleDateString()} at{" "}
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.amount && (
                            <div className="font-semibold">
                              {tx.type === "send" ? "-" : "+"}
                              {tx.amount} {tx.token}
                            </div>
                          )}
                          <Badge
                            variant={
                              tx.status === "success"
                                ? "default"
                                : tx.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="w-10 h-10 text-muted-foreground" />
                </div>
                <div className="text-sm font-semibold mb-1">No Activity Yet</div>
                <div className="text-xs text-muted-foreground">
                  Your transaction history will appear here
                </div>
              </div>
            )}
          </TabsContent>

          {/* Receive Tab */}
          <TabsContent value="receive" className="p-4 space-y-4">
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-4">
                  Scan QR code or copy address to receive tokens
                </div>

                {/* QR Code Placeholder */}
                <div className="mx-auto w-48 h-48 bg-white rounded-xl p-4 mb-4 flex items-center justify-center border-2 border-border">
                  <div className="text-center">
                    <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                      <Wallet className="w-16 h-16 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground mb-2">Your Wallet Address</div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <code className="flex-1 text-xs font-mono break-all">
                    {smartAccountAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={copyAddress}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400">
                  💡 This is your Sequence Smart Account address. You can receive any tokens on Somnia network.
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default WalletModal;
