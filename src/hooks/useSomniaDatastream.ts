import { useState, useEffect, useCallback, useRef } from 'react';
import { somniaDatastreamService, type SocialPostSchema, type SocialInteractionSchema, type MusicEventSchema } from '@/services/somniaDatastreamService';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';

interface UseDatastreamOptions {
  autoConnect?: boolean;
  contractAddress?: string;
  topics?: string[];
  eventTypes?: ('social' | 'music' | 'profile')[];
  maxEvents?: number;
}

interface DatastreamEvent {
  id: string;
  type: string;
  blockNumber: number;
  transactionHash: string;
  address: string;
  topics: string[];
  data: string;
  timestamp: number;
}

// Optimized hook with better performance and real-time capabilities
export const useSomniaDatastream = (options: UseDatastreamOptions = {}) => {
  const { 
    autoConnect = true, 
    contractAddress, 
    topics = [], 
    eventTypes = ['social', 'music', 'profile'],
    maxEvents = 50 
  } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [events, setEvents] = useState<DatastreamEvent[]>([]);
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number>(0);
  
  // Use refs to prevent unnecessary re-renders
  const eventBufferRef = useRef<DatastreamEvent[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized event handler with batching
  const handleEvent = useCallback((event: any) => {
    const datastreamEvent: DatastreamEvent = {
      id: event.id || `${event.transactionHash}_${Date.now()}`,
      type: event.type || 'unknown',
      blockNumber: event.blockNumber || 0,
      transactionHash: event.transactionHash || '',
      address: event.address || '',
      topics: event.topics || [],
      data: JSON.stringify(event),
      timestamp: event.timestamp || Date.now()
    };

    // Add to buffer instead of immediately updating state
    eventBufferRef.current.push(datastreamEvent);
    
    // Keep buffer size manageable
    if (eventBufferRef.current.length > maxEvents) {
      eventBufferRef.current = eventBufferRef.current.slice(-maxEvents);
    }

    // Debounced flush to prevent excessive re-renders
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    flushTimeoutRef.current = setTimeout(() => {
      setEvents([...eventBufferRef.current]);
      setLastEventTime(Date.now());
    }, 100); // 100ms debounce
  }, [maxEvents]);

  // Connect to datastream with better error handling
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      await somniaDatastreamService.connect();
      setIsConnected(true);
      console.log('✅ Connected to Somnia Datastream');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      setError(errorMessage);
      console.error('❌ Failed to connect to Somnia Datastream:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting]);

  // Disconnect from datastream
  const disconnect = useCallback(async () => {
    // Unsubscribe from all active subscriptions
    for (const subId of subscriptionIds) {
      try {
        await somniaDatastreamService.unsubscribe(subId);
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    }
    
    setSubscriptionIds([]);
    somniaDatastreamService.disconnect();
    setIsConnected(false);
    setEvents([]);
    eventBufferRef.current = [];
    
    // Clear any pending flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, [subscriptionIds]);

  // Subscribe to optimized event streams
  const subscribeToEvents = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to datastream');
    }

    try {
      const newSubscriptionIds: string[] = [];

      // Subscribe to social events if requested
      if (eventTypes.includes('social')) {
        const socialSubId = await somniaDatastreamService.subscribeToSocialEvents();
        newSubscriptionIds.push(socialSubId);
        console.log('📱 Subscribed to social events');
      }

      // Subscribe to music events if requested
      if (eventTypes.includes('music')) {
        const musicSubId = await somniaDatastreamService.subscribeMusicEvents();
        newSubscriptionIds.push(musicSubId);
        console.log('🎵 Subscribed to music events');
      }

      // Subscribe to profile events if requested
      if (eventTypes.includes('profile')) {
        const profileSubId = await somniaDatastreamService.subscribeToProfileEvents();
        newSubscriptionIds.push(profileSubId);
        console.log('👤 Subscribed to profile events');
      }

      // Subscribe to specific contract if provided
      if (contractAddress) {
        const contractSubId = await somniaDatastreamService.subscribeToLogs(
          contractAddress,
          topics,
          handleEvent
        );
        newSubscriptionIds.push(contractSubId);
        console.log(`📋 Subscribed to contract ${contractAddress}`);
      }

      setSubscriptionIds(newSubscriptionIds);
      return newSubscriptionIds;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(errorMessage);
      throw err;
    }
  }, [isConnected, eventTypes, contractAddress, topics, handleEvent]);

  // Subscribe to contract events (legacy method for compatibility)
  const subscribeToContract = useCallback(async (
    address: string, 
    eventTopics: string[] = []
  ) => {
    if (!isConnected) {
      throw new Error('Not connected to datastream');
    }

    try {
      const subId = await somniaDatastreamService.subscribeToLogs(
        address,
        eventTopics,
        handleEvent
      );
      
      setSubscriptionIds(prev => [...prev, subId]);
      console.log(`📋 Subscribed to contract ${address} with ID: ${subId}`);
      return subId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(errorMessage);
      throw err;
    }
  }, [isConnected, handleEvent]);

  // Subscribe to new blocks
  const subscribeToBlocks = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to datastream');
    }

    try {
      const subId = await somniaDatastreamService.subscribeToNewHeads((block) => {
        const event: DatastreamEvent = {
          id: block.hash,
          type: 'block',
          blockNumber: parseInt(block.number, 16),
          transactionHash: '',
          address: '',
          topics: [],
          data: JSON.stringify(block),
          timestamp: Date.now()
        };
        
        setEvents(prev => [event, ...prev.slice(0, 99)]);
      });
      
      setSubscriptionIds(prev => [...prev, subId]);
      console.log(`Subscribed to new blocks with ID: ${subId}`);
      return subId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe to blocks';
      setError(errorMessage);
      throw err;
    }
  }, [isConnected]);

  // Auto-connect and subscribe on mount
  useEffect(() => {
    let mounted = true;

    const initializeConnection = async () => {
      if (autoConnect && mounted) {
        try {
          await connect();
          if (mounted && isConnected) {
            await subscribeToEvents();
          }
        } catch (error) {
          console.error('Failed to initialize Somnia DataStream:', error);
        }
      }
    };

    initializeConnection();
    
    return () => {
      mounted = false;
      disconnect();
    };
  }, [autoConnect]); // Removed dependencies to prevent reconnection loops

  // Subscribe when connection is established
  useEffect(() => {
    if (isConnected && subscriptionIds.length === 0) {
      subscribeToEvents().catch(error => {
        console.error('Failed to subscribe to events:', error);
      });
    }
  }, [isConnected, subscriptionIds.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    isConnecting,
    events,
    error,
    lastEventTime,
    connect,
    disconnect,
    subscribeToContract,
    subscribeToBlocks,
    subscribeToEvents,
    clearEvents: () => {
      setEvents([]);
      eventBufferRef.current = [];
    },
    clearError: () => setError(null),
    // Additional metrics for performance monitoring
    eventCount: events.length,
    bufferSize: eventBufferRef.current.length
  };
};

// Optimized specialized hooks for different event types
export const useUserProfileEvents = () => {
  return useSomniaDatastream({
    eventTypes: ['profile'],
    maxEvents: 20,
    autoConnect: true
  });
};

export const useSocialGraphEvents = () => {
  return useSomniaDatastream({
    eventTypes: ['social'],
    maxEvents: 100,
    autoConnect: true
  });
};

export const useSongNFTEvents = () => {
  return useSomniaDatastream({
    eventTypes: ['music'],
    maxEvents: 50,
    autoConnect: true
  });
};

export const usePlaylistEvents = () => {
  return useSomniaDatastream({
    contractAddress: CONTRACT_ADDRESSES.playlistManager,
    topics: [],
    maxEvents: 30,
    autoConnect: true
  });
};

// Combined hook for feed data - most efficient for the Feed page
export const useFeedDatastream = () => {
  return useSomniaDatastream({
    eventTypes: ['social', 'music'],
    maxEvents: 200,
    autoConnect: true
  });
};