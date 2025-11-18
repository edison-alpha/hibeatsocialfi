/**
 * Share Post Modal
 * 
 * Modal untuk share postingan dengan berbagai opsi:
 * - Copy link
 * - Share ke Twitter/X
 * - Share ke Facebook
 * - Share ke WhatsApp
 * - Share ke Telegram
 * - Embed code
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Copy,
  Check,
  Twitter,
  Facebook,
  MessageCircle,
  Send,
  Code,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface SharePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  postContent?: string;
  postAuthor?: string;
}

export function SharePostModal({
  isOpen,
  onClose,
  postId,
  postContent = '',
  postAuthor = '',
}: SharePostModalProps) {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  // Generate URLs
  const postUrl = `${window.location.origin}/post/${postId}`;
  const encodedUrl = encodeURIComponent(postUrl);
  const encodedText = encodeURIComponent(
    postContent.slice(0, 100) + (postContent.length > 100 ? '...' : '')
  );

  // Social media share URLs
  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
  };

  // Embed code
  const embedCode = `<iframe src="${postUrl}/embed" width="550" height="400" frameborder="0" scrolling="no"></iframe>`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      toast.success('Embed code copied!');
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy embed code');
    }
  };

  const handleShareTo = (platform: keyof typeof shareUrls) => {
    window.open(shareUrls[platform], '_blank', 'width=600,height=400');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
          <DialogDescription>
            Share this post with your friends and followers
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Share Link</TabsTrigger>
            <TabsTrigger value="embed">Embed</TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4">
            {/* Copy Link */}
            <div className="space-y-2">
              <Label htmlFor="post-url">Post URL</Label>
              <div className="flex gap-2">
                <Input
                  id="post-url"
                  value={postUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Social Media Buttons */}
            <div className="space-y-2">
              <Label>Share to social media</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleShareTo('twitter')}
                >
                  <Twitter className="w-4 h-4" />
                  Twitter / X
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleShareTo('facebook')}
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleShareTo('whatsapp')}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleShareTo('telegram')}
                >
                  <Send className="w-4 h-4" />
                  Telegram
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="embed" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="embed-code">Embed Code</Label>
              <div className="space-y-2">
                <div className="relative">
                  <textarea
                    id="embed-code"
                    value={embedCode}
                    readOnly
                    rows={4}
                    className="w-full px-3 py-2 text-sm font-mono bg-muted rounded-md border border-input resize-none"
                  />
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleCopyEmbed}
                >
                  {embedCopied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4" />
                      Copy Embed Code
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this code into your website to embed this post
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
