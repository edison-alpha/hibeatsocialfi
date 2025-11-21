// React Hook for Live Indicators (View Counts, Typing Indicators)
// Showcases real-time capabilities of Somnia Data Streams

import { useState, useEffect, useCallback } from 'react';
import { advancedDatastreamService } from '@/services/somniaDatastreamService.advanced';
import { useSequence } from '@/contexts/SequenceContext';

interface LiveIndicator {
  postId: string;
  viewerCount: number;
  activeTypers: string[];
  lastUpdate: number;
}

export function useLiveIndicators(postId: string) {
  const { smartAccountAddress, isAccountReady } = useSequence();
  const [indicator, setIndicator] = useState<LiveIndicator | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize SDK with private key (auto-initialize)
  useEffect(() => {
    const initSDK = async () => {
      if (isInitialized) return;
      
      try {
        console.log(`🔧 [LIVE-HOOK] Auto-initializing SDK with private key...`);
        
        // Check if already connected
        if (advancedDatastreamService.isConnected()) {
          console.log(`✅ [LIVE-HOOK] SDK already connected`);
          setIsInitialized(true);
          return;
        }
        
        // Connect with private key
        await advancedDatastreamService.connect();
        setIsInitialized(true);
        console.log(`✅ [LIVE-HOOK] SDK initialized`);
      } catch (error) {
        console.error('❌ [LIVE-HOOK] Failed to initialize SDK:', error);
      }
    };
    
    initSDK();
  }, [isInitialized]);

  // Subscribe to live indicators
  useEffect(() => {
    if (!postId || !smartAccountAddress || !isInitialized || !isAccountReady) {
      console.log(`⏳ [LIVE-HOOK] Waiting for initialization...`, {
        hasPostId: !!postId,
        hasAddress: !!smartAccountAddress,
        isInitialized,
        isAccountReady
      });
      return;
    }

    console.log(`👁️ [LIVE-HOOK] Subscribing to indicators for post ${postId.substring(0, 10)}...`);
    console.log(`👁️ [LIVE-HOOK] User address:`, smartAccountAddress.slice(0, 10));
    console.log(`👁️ [LIVE-HOOK] SDK connected:`, advancedDatastreamService.isConnected());

    let subscriptionId: string | null = null;

    const subscribe = async () => {
      try {
        // Register view on mount FIRST
        console.log(`👁️ [LIVE-HOOK] Registering view for user:`, smartAccountAddress.slice(0, 10));
        await advancedDatastreamService.updateLiveViewCount(postId, smartAccountAddress);
        console.log(`✅ [LIVE-HOOK] View registered`);

        // Then subscribe to updates
        subscriptionId = await advancedDatastreamService.subscribeToLiveIndicators(
          postId,
          (newIndicator) => {
            console.log(`🔔 [LIVE-HOOK] Indicator update received:`, newIndicator);
            setIndicator(newIndicator);
          }
        );
        console.log(`✅ [LIVE-HOOK] Subscribed with ID:`, subscriptionId);
      } catch (error) {
        console.error('❌ [LIVE-HOOK] Failed to subscribe:', error);
      }
    };

    subscribe();

    return () => {
      if (subscriptionId) {
        console.log(`🔌 [LIVE-HOOK] Unsubscribing:`, subscriptionId);
        advancedDatastreamService.unsubscribe(subscriptionId);
      }
    };
  }, [postId, smartAccountAddress, isInitialized, isAccountReady]);

  // Update typing indicator
  const updateTyping = useCallback(async (typing: boolean) => {
    if (!smartAccountAddress || !postId || !isInitialized || !isAccountReady) {
      console.log(`⏳ [LIVE-HOOK] Cannot update typing - not ready`, {
        hasAddress: !!smartAccountAddress,
        hasPostId: !!postId,
        isInitialized,
        isAccountReady
      });
      return;
    }

    setIsTyping(typing);
    try {
      await advancedDatastreamService.updateTypingIndicator(postId, smartAccountAddress, typing);
    } catch (error) {
      console.error('❌ [LIVE-HOOK] Failed to update typing:', error);
    }
  }, [smartAccountAddress, postId, isInitialized, isAccountReady]);

  // ⚡ Fast debounced typing indicator (stop typing after 2 seconds of inactivity)
  useEffect(() => {
    if (!isTyping) return;

    const timeout = setTimeout(() => {
      updateTyping(false);
    }, 2000); // ⚡ Reduced from 3s to 2s for faster UX

    return () => clearTimeout(timeout);
  }, [isTyping, updateTyping]);

  return {
    viewerCount: indicator?.viewerCount || 0,
    activeTypers: indicator?.activeTypers || [],
    isTyping,
    updateTyping,
  };
}
