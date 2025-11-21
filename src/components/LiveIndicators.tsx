// Live Indicators Component - Shows real-time view counts and typing indicators
// Showcases Somnia Data Streams real-time capabilities

import { Eye, MessageCircle } from 'lucide-react';
import { useLiveIndicators } from '@/hooks/useLiveIndicators';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface LiveIndicatorsProps {
  postId: string;
  className?: string;
}

export function LiveIndicators({ postId, className = '' }: LiveIndicatorsProps) {
  const { viewerCount, activeTypers } = useLiveIndicators(postId);

  // Debug logging
  console.log(`🎨 [LiveIndicators] Rendering for post ${postId.substring(0, 10)}:`, {
    viewerCount,
    activeTypers: activeTypers.length,
    hasViewers: viewerCount > 0,
    hasTypers: activeTypers.length > 0
  });

  return (
    <div className={`flex items-center gap-4 text-sm text-muted-foreground ${className}`}>
      {/* Live View Count - Always show for debugging */}
      {true && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1.5"
        >
          <div className="relative">
            <Eye className="h-4 w-4" />
            {viewerCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <span className="font-medium">{viewerCount || 0}</span>
          <span className="text-xs">{viewerCount === 1 ? 'viewer' : 'viewing'}</span>
        </motion.div>
      )}

      {/* Typing Indicators */}
      <AnimatePresence>
        {activeTypers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4 text-blue-500" />
            <div className="flex -space-x-2">
              {activeTypers.slice(0, 3).map((typer, index) => (
                <Avatar key={typer} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-xs bg-blue-500 text-white">
                    {typer.slice(2, 4).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs">
              {activeTypers.length === 1 ? 'typing...' : `${activeTypers.length} typing...`}
            </span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Typing Indicator for Comment Input
interface TypingIndicatorInputProps {
  postId: string;
  onTyping?: (isTyping: boolean) => void;
}

export function TypingIndicatorInput({ postId, onTyping }: TypingIndicatorInputProps) {
  const { updateTyping } = useLiveIndicators(postId);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const isTyping = (e.target as HTMLInputElement).value.length > 0;
    updateTyping(isTyping);
    onTyping?.(isTyping);
  };

  return {
    onInput: handleInput,
    onBlur: () => updateTyping(false),
  };
}
