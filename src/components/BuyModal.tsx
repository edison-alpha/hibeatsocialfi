import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingCart,
  CreditCard,
  Wallet,
  CheckCircle,
  Music,
  Download,
  Heart,
  Share2
} from "lucide-react";

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: {
    id: number;
    title: string;
    artist: string;
    avatar: string;
    cover: string;
    genre: string;
    duration: string;
    price?: number;
  } | null;
}

const BuyModal = ({ isOpen, onClose, track }: BuyModalProps) => {
  const [step, setStep] = useState<'purchase' | 'payment' | 'success'>('purchase');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card'>('wallet');

  const price = track?.price || 299; // Default price in SOMI

  const handlePurchase = () => {
    setStep('payment');
  };

  const handlePayment = () => {
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  const handleClose = () => {
    setStep('purchase');
    setPaymentMethod('wallet');
    onClose();
  };

  if (!track) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === 'purchase' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Purchase Track
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Track Info */}
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <img
                  src={track.cover}
                  alt={track.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{track.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {track.genre}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{track.duration}</span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Track Price</span>
                  <span className="font-semibold text-lg">{price} SOMI</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Platform Fee</span>
                  <span className="text-sm text-muted-foreground">0 SOMI</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-xl text-primary">{price} SOMI</span>
                </div>
              </div>

              {/* What's Included */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">What's Included:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>High-quality MP3 download</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    <span>Full track ownership</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    <span>Commercial usage rights</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    <span>Support the artist</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handlePurchase} className="flex-1 gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Purchase
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Choose Payment Method
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Payment Methods */}
              <div className="space-y-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">SOMI Wallet</p>
                      <p className="text-sm text-muted-foreground">Balance: 1,250 SOMI</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">Credit Card</p>
                      <p className="text-sm text-muted-foreground">**** **** **** 1234</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
                <span className="font-semibold">Total to Pay</span>
                <span className="font-semibold text-xl text-primary">{price} SOMI</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('purchase')} className="flex-1">
                  Back
                </Button>
                <Button onClick={handlePayment} className="flex-1 gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pay Now
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Purchase Successful!
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 text-center">
              {/* Success Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              {/* Track Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{track.title}</h3>
                <p className="text-muted-foreground">by {track.artist}</p>
              </div>

              {/* Success Message */}
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Your purchase was successful! The track has been added to your library.
                </p>
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>Download link sent to email</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Download Now
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BuyModal;