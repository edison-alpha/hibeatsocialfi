/**
 * Post Actions dengan Datastream Integration
 * 
 * Like, Comment, Repost menggunakan Datastream untuk kecepatan maksimal
 * Sama persis dengan DataStreamSocialTest
 */

import { useState } from 'react';
import { Heart, MessageCircle, Repeat2, Share } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface DatastreamPostActionsProps {
  postId: string;
  likes: number;
  comments: number;
  reposts: number;
  quotes?: number;
  isLiked?: boolean;
  isReposted?: boolean;
  onLike?: () => void;
  onCommentClick?: () => void;
  onRepost?: () => void;
  onQuoteClick?: () => void;
  onShareClick?: () => void;
  onViewLikes?: () => void;
  onViewReposts?: () => void;
  showViewLikes?: boolean;
  showViewReposts?: boolean;
  className?: string;
}

export function DatastreamPostActions({
  postId,
  likes,
  comments,
  reposts,
  quotes = 0,
  isLiked = false,
  isReposted = false,
  onLike,
  onCommentClick,
  onRepost,
  onQuoteClick,
  onShareClick,
  onViewLikes,
  onViewReposts,
  showViewLikes = false,
  showViewReposts = false,
  className
}: DatastreamPostActionsProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {/* Like Button */}
      <div className="flex flex-col items-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onViewLikes) onViewLikes();
          }}
          className={cn(
            'gap-2 transition-colors',
            isLiked ? 'text-red-500 hover:text-red-600' : 'hover:text-red-400'
          )}
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isLiked ? 'fill-red-500 stroke-red-500' : 'fill-none stroke-current'
            )}
          />
          {likes}
        </Button>
        {showViewLikes && likes > 0 && (
          <button
            onClick={onViewLikes}
            className="text-xs text-muted-foreground hover:underline ml-2"
          >
            View likes
          </button>
        )}
      </div>

      {/* Comment Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCommentClick}
        className="gap-2"
      >
        <MessageCircle className="w-4 h-4" />
        {comments || 0}
      </Button>

      {/* Repost Button */}
      <div className="flex flex-col items-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRepost}
          className={cn(
            'gap-2 transition-colors',
            isReposted ? 'text-green-500 hover:text-green-600' : ''
          )}
        >
          <Repeat2 className={cn('w-4 h-4', isReposted && 'font-bold')} />
          {reposts}
        </Button>
        {showViewReposts && reposts > 0 && (
          <button
            onClick={onViewReposts}
            className="text-xs text-muted-foreground hover:underline ml-2"
          >
            View reposts
          </button>
        )}
      </div>

      {/* Quote Button */}
      {quotes > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onQuoteClick}
          className="gap-2 text-blue-500 hover:text-blue-600"
        >
          <MessageCircle className="w-4 h-4" />
          {quotes}
        </Button>
      )}

      {/* Share Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onShareClick}
        className="gap-2"
      >
        <Share className="w-4 h-4" />
      </Button>
    </div>
  );
}
