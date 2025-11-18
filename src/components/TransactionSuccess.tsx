import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  ExternalLink, 
  Copy,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface TransactionSuccessProps {
  txHash: string;
  type: 'post' | 'comment' | 'like' | 'follow';
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const TransactionSuccess = ({ 
  txHash, 
  type, 
  onClose, 
  autoClose = true, 
  duration = 5000 
}: TransactionSuccessProps) => {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);

  const explorerUrl = `https://shannon-explorer.somnia.network/tx/${txHash}`;
  const shortHash = `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;

  const typeLabels = {
    post: 'Post Created',
    comment: 'Comment Added',
    like: 'Like Updated',
    follow: 'Follow Updated'
  };

  const typeEmojis = {
    post: '📝',
    comment: '💬',
    like: '❤️',
    follow: '👥'
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(txHash);
      toast({
        title: "Copied!",
        description: "Transaction hash copied to clipboard",
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  // Auto close
  if (autoClose) {
    setTimeout(() => {
      if (isVisible) {
        handleClose();
      }
    }, duration);
  }

  if (!isVisible) return null;

  return (
    <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 animate-in slide-in-from-top-2">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{typeEmojis[type]}</span>
              <h4 className="font-semibold text-green-800 dark:text-green-200">
                {typeLabels[type]}
              </h4>
              <Badge variant="outline" className="text-green-700 border-green-300 dark:text-green-300 dark:border-green-700">
                On-chain
              </Badge>
            </div>
            
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              Your {type} has been successfully recorded on the Somnia blockchain.
            </p>
            
            <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
              <span>Transaction:</span>
              <code className="bg-green-100 dark:bg-green-900/50 px-2 py-1 rounded font-mono">
                {shortHash}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                onClick={copyToClipboard}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-green-700 border-green-300 hover:bg-green-100 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-900/50"
                onClick={() => window.open(explorerUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View on Explorer
              </Button>
            </div>
          </div>
          
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              onClick={handleClose}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionSuccess;