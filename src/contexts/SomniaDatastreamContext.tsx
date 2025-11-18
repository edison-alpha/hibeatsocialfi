import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { getAddress } from 'viem';
import { somniaDatastreamService } from '@/services/somniaDatastreamService';

// Somnia Datastream types
interface DatastreamEvent {
  id: string;
  type: 'profile_created' | 'profile_updated' | 'post_created' | 'post_liked' | 'user_followed' | 'user_unfollowed' | 'message_sent' | 'playlist_created' | 'song_minted' | 'tip_sent';
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  data: any;
}

interface SomniaDatastreamContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Real-time data
  recentEvents: DatastreamEvent[];
  liveUserCount: number;
  activeSongs: any[];
  trendingPlaylists: any[];
  recentTips: any[];

  // Event subscriptions
  subscribeToUserEvents: (userAddress: string) => void;
  unsubscribeFromUserEvents: (userAddress: string) => void;
  subscribeToGlobalEvents: () => void;
  unsubscribeFromGlobalEvents: () => void;

  // Real-time feeds
  getFeedUpdates: () => DatastreamEvent[];
  getNotifications: () => DatastreamEvent[];
  getLiveStats: () => any;

  // Contract data reading using Somnia SDK
  readUserProfile: (userAddress: string) => Promise<any>;
  readAllUserProfiles: () => Promise<any[]>;
  readUserPosts: (userAddress: string) => Promise<any[]>;
  readAllPosts: () => Promise<any[]>;
  readMusicEvents: (artistAddress?: string) => Promise<any[]>;
  readSocialInteractions: (userAddress?: string) => Promise<any[]>;

  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
}

const SomniaDatastreamContext = createContext<SomniaDatastreamContextType | undefined>(undefined);

export const useSomniaDatastream = () => {
  const context = useContext(SomniaDatastreamContext);
  if (context === undefined) {
    throw new Error('useSomniaDatastream must be used within a SomniaDatastreamProvider');
  }
  return context;
};

interface SomniaDatastreamProviderProps {
  children: ReactNode;
}

export const SomniaDatastreamProvider = ({ children }: SomniaDatastreamProviderProps) => {
  const { address, isConnected: walletConnected } = useAccount();

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);

  // Real-time data
  const [recentEvents, setRecentEvents] = useState<DatastreamEvent[]>([]);
  const [liveUserCount, setLiveUserCount] = useState(0);
  const [activeSongs, setActiveSongs] = useState<any[]>([]);
  const [trendingPlaylists, setTrendingPlaylists] = useState<any[]>([]);
  const [recentTips, setRecentTips] = useState<any[]>([]);

  // Subscriptions
  const [subscribedUsers, setSubscribedUsers] = useState<Set<string>>(new Set());
  const [globalSubscription, setGlobalSubscription] = useState(false);

  // Connection management
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [mockInterval, setMockInterval] = useState<NodeJS.Timeout | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Somnia Datastream WebSocket URL - Using correct endpoint
  const DATASTREAM_URL = import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';
  const ENABLE_WEBSOCKET = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
  const ENABLE_POLLING = import.meta.env.VITE_ENABLE_REALTIME_POLLING === 'true';

  // Connect to Somnia Datastream with proper real-time support
  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setConnectionError(null);

    try {
      // Strategy 1: Try WebSocket connection if enabled
      if (ENABLE_WEBSOCKET && DATASTREAM_URL) {
        console.log('🔌 [DATASTREAM] Connecting to Somnia DataStream WebSocket:', DATASTREAM_URL);

        const ws = new WebSocket(DATASTREAM_URL);
        
        // Set up connection promise
        const connectionPromise = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('⚠️ [DATASTREAM] WebSocket connection timeout - trying HTTP polling');
            ws.close();
            resolve(false);
          }, 8000); // 8 second timeout for WebSocket

          ws.onopen = () => {
            clearTimeout(timeout);
            console.log('✅ [DATASTREAM] Connected to Somnia DataStream via WebSocket');
            setWebsocket(ws);
            setIsConnected(true);
            setIsConnecting(false);
            setConnectionError(null);
            
            // Subscribe to SocialGraph contract events immediately after connection
            setTimeout(() => {
              const socialGraphAddress = '0x6d964993b50182B17206f534dcfcc460fC0CCC69'; // SocialGraph v3.0.0
              const subscribeMessage = {
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_subscribe',
                params: [
                  'logs',
                  {
                    address: socialGraphAddress,
                    topics: [] // Subscribe to all events from this contract
                  }
                ]
              };
              
              ws.send(JSON.stringify(subscribeMessage));
              console.log('📡 [DATASTREAM] Subscribed to SocialGraph contract events at:', socialGraphAddress);
            }, 500); // Wait 500ms after connection before subscribing
            
            // Set up message handlers
            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                handleDatastreamMessage(data);
              } catch (error) {
                console.error('[DATASTREAM] Failed to parse WebSocket message:', error);
              }
            };
            
            ws.onclose = () => {
              console.log('🔌 [DATASTREAM] WebSocket connection closed');
              setIsConnected(false);
              setWebsocket(null);
            };
            
            ws.onerror = (error) => {
              console.error('[DATASTREAM] WebSocket error:', error);
            };
            
            resolve(true);
          };
          
          ws.onerror = () => {
            clearTimeout(timeout);
            console.warn('⚠️ [DATASTREAM] WebSocket connection failed - trying HTTP polling');
            resolve(false);
          };
        });

        const wsConnected = await connectionPromise;
        if (wsConnected) {
          // Real-time data connected via WebSocket
          return; // Successfully connected via WebSocket
        }
      }

      // Strategy 2: Use HTTP polling as fallback
      if (ENABLE_POLLING) {
        console.log('🔄 [DATASTREAM] Starting HTTP polling mode for real-time updates');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
        startHttpPolling();
        return;
      }

      // Strategy 3: Offline mode - no data
      console.log('📱 [DATASTREAM] Running in offline mode');
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError('Offline mode - no real-time data available');

    } catch (error) {
      console.error('❌ [DATASTREAM] Connection failed:', error);
      setConnectionError('Connection failed');
      setIsConnecting(false);
    }
  }, [isConnected, isConnecting, ENABLE_WEBSOCKET, ENABLE_POLLING, DATASTREAM_URL]);

  // Disconnect from Somnia Datastream with proper cleanup
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from Somnia DataStream...');
    console.log('🔧 Setting connection state: isConnected=false');
    
    // Close WebSocket
    if (websocket) {
      websocket.close();
      setWebsocket(null);
    }
    
    // Clear polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('⏹️ HTTP polling stopped');
    }
    
    // Clear mock interval
    if (mockInterval) {
      clearInterval(mockInterval);
      setMockInterval(null);
    }
    
    setIsConnected(false);
    setConnectionError(null);
    setSubscribedUsers(new Set());
    setGlobalSubscription(false);
  }, [websocket, pollingInterval, mockInterval]);

  // Reconnect to Somnia Datastream
  const reconnect = useCallback(async () => {
    console.log('🔄 Manual reconnection requested');
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await connect();
  }, [disconnect, connect]);

  // Handle incoming datastream messages
  const handleDatastreamMessage = useCallback((data: any) => {
    if (data.method === 'eth_subscription' && data.params) {
      const { result } = data.params;
      
      console.log('📨 [DATASTREAM] Raw blockchain event received:', result);
      
      // Parse event type
      const eventType = parseEventType(result);
      
      // Decode event data from topics and data
      const eventData: any = {
        raw: result
      };
      
      // PostCreated(uint256 indexed postId, address indexed author, string content)
      if (eventType === 'post_created' && result.topics && result.topics.length >= 3) {
        eventData.postId = parseInt(result.topics[1], 16).toString();
        eventData.author = '0x' + result.topics[2].slice(26); // Extract address from topic
        // Content is in data field, would need ABI decoder for full decode
        eventData.content = 'New post created'; // Placeholder
        eventData.contentType = 'text';
        
        console.log('✅ [DATASTREAM] Parsed PostCreated event:', {
          postId: eventData.postId,
          author: eventData.author,
          blockNumber: result.blockNumber
        });
      }
      
      // Convert blockchain event to our DatastreamEvent format
      const event: DatastreamEvent = {
        id: `${result.transactionHash}_${result.logIndex || Date.now()}`,
        type: eventType,
        timestamp: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
        blockNumber: parseInt(result.blockNumber || '0', 16),
        transactionHash: result.transactionHash || '',
        data: eventData
      };
      
      console.log('📡 [DATASTREAM] Event added to recentEvents:', event.type, 'Total events:', recentEvents.length + 1);
      setRecentEvents(prev => [event, ...prev.slice(0, 49)]);
    } else if (data.result) {
      // Subscription confirmation
      console.log('✅ [DATASTREAM] Subscription confirmed:', data.result);
    } else {
      console.log('📨 [DATASTREAM] Other message:', data);
    }
  }, [recentEvents.length]);

  // Parse event type from blockchain log
  const parseEventType = (log: any): DatastreamEvent['type'] => {
    if (!log.topics || log.topics.length === 0) return 'message_sent';
    
    const eventSignature = log.topics[0];
    
    // Event signature hashes (keccak256 of event signature)
    // PostCreated(uint256,address,string) = 0x7c103c...
    // You can get these from contract ABI or ethers.utils.id("EventName(types)")
    
    // For now, use includes (will work if signature contains text)
    // In production, use exact signature matching
    const sig = eventSignature.toLowerCase();
    
    // PostCreated event
    if (sig.includes('7c103c') || sig.includes('PostCreated')) return 'post_created';
    // PostLiked event  
    if (sig.includes('PostLiked')) return 'post_liked';
    // UserFollowed event
    if (sig.includes('UserFollowed')) return 'user_followed';
    // ProfileCreated event
    if (sig.includes('ProfileCreated')) return 'profile_created';
    // ProfileUpdated event
    if (sig.includes('ProfileUpdated')) return 'profile_updated';
    // PlaylistCreated event
    if (sig.includes('PlaylistCreated')) return 'playlist_created';
    // SongMinted event
    if (sig.includes('SongMinted')) return 'song_minted';
    // TipSent event
    if (sig.includes('TipSent')) return 'tip_sent';
    // MessageSent event
    if (sig.includes('MessageSent')) return 'message_sent';
    
    console.log('Unknown event signature:', eventSignature);
    return 'message_sent';
  };

  // HTTP polling for real-time updates when WebSocket is not available
  const startHttpPolling = useCallback(() => {
    // Clear existing polling first
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    let lastCheckedTimestamp = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    
    const pollForUpdates = async () => {
      try {
        console.log('📊 [DATASTREAM-POLLING] Checking for new posts from subgraph...');
        
        // Fetch latest posts from subgraph (real data, not mock)
        const { apolloClient } = await import('@/lib/apollo-client');
        const { GET_POSTS } = await import('@/graphql/queries');

        const result = await apolloClient.query({
          query: GET_POSTS,
          variables: {
            first: 10,
            skip: 0,
            orderBy: 'timestamp',
            orderDirection: 'desc',
            where: { isDeleted: false }
          },
          fetchPolicy: 'network-only'
        });

        if ((result.data as any)?.posts && (result.data as any).posts.length > 0) {
          const posts = (result.data as any).posts;
          
          // Filter posts created after last check
          const newPosts = posts.filter((post: any) => {
            const postTimestamp = parseInt(post.timestamp);
            return postTimestamp > lastCheckedTimestamp;
          });

          if (newPosts.length > 0) {
            console.log(`✅ [DATASTREAM-POLLING] Found ${newPosts.length} new posts from subgraph`);
            
            // Convert to DatastreamEvent format
            newPosts.forEach((post: any) => {
              const event: DatastreamEvent = {
                id: `post_${post.id}_${post.timestamp}`,
                type: 'post_created',
                timestamp: parseInt(post.timestamp) * 1000, // Convert to milliseconds
                blockNumber: parseInt(post.blockNumber || '0'),
                transactionHash: post.transactionHash || '',
                data: {
                  postId: post.id,
                  author: post.author.id,
                  content: post.content,
                  metadata: post.ipfsHash || '',
                  contentType: post.contentType || 'text'
                }
              };
              
              console.log('📡 [DATASTREAM-POLLING] New post event:', {
                postId: event.data.postId,
                author: event.data.author.slice(0, 8),
                content: event.data.content.substring(0, 50)
              });
              
              // Add to recentEvents
              setRecentEvents(prev => {
                // Check if event already exists
                const exists = prev.some(e => e.id === event.id);
                if (exists) return prev;
                
                return [event, ...prev.slice(0, 49)]; // Keep last 50 events
              });
            });
            
            // Update last checked timestamp to latest post
            const latestPost = newPosts[0];
            lastCheckedTimestamp = parseInt(latestPost.timestamp);
          } else {
            console.log('ℹ️ [DATASTREAM-POLLING] No new posts since last check');
          }
        }
        
        // Update live stats
        setLiveUserCount(prev => Math.max(50, prev + Math.floor(Math.random() * 5) - 2));
        
      } catch (error) {
        console.error('❌ [DATASTREAM-POLLING] Polling failed:', error);
      }
    };

    // Start polling every 2 seconds (fast for real-time feel)
    const newPollingInterval = setInterval(pollForUpdates, 2000);
    setPollingInterval(newPollingInterval);
    
    // Initial poll
    pollForUpdates();
    
    console.log('🔄 [DATASTREAM-POLLING] Started (2s interval) - fetching REAL data from subgraph');
  }, [pollingInterval]);

  // Generate realistic blockchain events
  const generateRealisticEvent = useCallback((): DatastreamEvent => {
    const eventTypes = ['post_created', 'post_liked', 'user_followed', 'playlist_created', 'song_minted', 'tip_sent'];
    const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)] as any;
    
    const blockNumber = Math.floor(Math.random() * 1000) + 5000000;
    const timestamp = Date.now();
    
    let eventData: any = {
      user: `0x${Math.random().toString(16).substring(2, 42)}`,
      content: getEventContent(randomType),
      metadata: JSON.stringify({ 
        source: 'http_polling',
        blockNumber,
        timestamp 
      })
    };
    
    // Add specific data for post_created events
    if (randomType === 'post_created') {
      const postId = Math.floor(Math.random() * 10000) + 1000; // Random post ID
      eventData = {
        ...eventData,
        postId: postId.toString(),
        author: `0x${Math.random().toString(16).substring(2, 42)}`,
        content: `New post: ${getEventContent(randomType)} #${postId}`,
        ipfsHash: `Qm${Math.random().toString(36).substring(2, 15)}`
      };
    }
    
    return {
      id: `event_${timestamp}_${Math.random().toString(36).substring(2, 11)}`,
      type: randomType,
      timestamp,
      blockNumber,
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      data: eventData
    };
  }, []);

  // Get realistic content based on event type
  const getEventContent = (eventType: string): string => {
    const contentMap = {
      'post_created': 'New post shared on HiBeats',
      'post_liked': 'Post received a like',
      'user_followed': 'New user followed',
      'playlist_created': 'New playlist created',
      'song_minted': 'New song NFT minted',
      'tip_sent': 'Tip sent to artist'
    };
    return contentMap[eventType] || 'New blockchain activity';
  };

  // Optimized mock data generation with better performance
  const startMockDataGeneration = useCallback(() => {
    let eventInterval: NodeJS.Timeout;
    let statsInterval: NodeJS.Timeout;
    
    const generateMockEvent = (): DatastreamEvent => {
      return generateRealisticEvent();
    };

    // Reduced frequency: Generate events every 30-60 seconds instead of 5-15
    eventInterval = setInterval(() => {
      if (isConnected) {
        const newEvent = generateMockEvent();
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 19)]); // Keep only last 20 events
      }
    }, 45000); // Fixed 45 second interval

    // Update live stats every 2 minutes instead of 30 seconds
    statsInterval = setInterval(() => {
      if (isConnected) {
        // Use React.startTransition for non-urgent updates
        setLiveUserCount(Math.floor(Math.random() * 1000) + 100);
        
        // Simplified mock data - less objects created
        setActiveSongs([
          {
            id: 1,
            title: 'Blockchain Beats',
            artist: 'CryptoMusician',
            listeners: Math.floor(Math.random() * 500) + 50
          }
        ]);

        setTrendingPlaylists([
          {
            id: 1,
            name: 'DeFi Hits',
            creator: 'MusicDAO',
            followers: Math.floor(Math.random() * 1000) + 100
          }
        ]);

        setRecentTips([
          {
            id: 1,
            from: `0x${Math.random().toString(16).substring(2, 42)}`,
            to: `0x${Math.random().toString(16).substring(2, 42)}`,
            amount: (Math.random() * 10).toFixed(4),
            message: 'Great music!',
            timestamp: Date.now()
          }
        ]);
      }
    }, 120000); // 2 minutes

    // Return cleanup function
    return () => {
      clearInterval(eventInterval);
      clearInterval(statsInterval);
    };
  }, [isConnected]);

  // Subscribe to user-specific events using Somnia SDK
  const subscribeToUserEvents = useCallback(async (userAddress: string) => {
    if (!websocket || !isConnected) return;

    setSubscribedUsers(prev => new Set([...prev, userAddress]));
    
    try {
      // Subscribe to logs from UserProfile contract for specific user
      const subscriptionMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'eth_subscribe',
        params: [
          'logs',
          {
            address: '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile contract (v3.0.0)
            topics: ['0x' + '0'.repeat(24) + userAddress.slice(2)]
          }
        ]
      };
      
      websocket.send(JSON.stringify(subscriptionMessage));
      
      // Mock subscription for development
      console.log(`Subscribed to events for user: ${userAddress}`);
      
      // In production, use:
      // await somniaDatastreamService.subscribeToLogs(
      //   CONTRACT_ADDRESSES.userProfile,
      //   topics,
      //   (log) => handleUserEvent(log)
      // );
    } catch (error) {
      console.error('Failed to subscribe to user events:', error);
    }
  }, [websocket, isConnected]);

  // Unsubscribe from user-specific events
  const unsubscribeFromUserEvents = useCallback((userAddress: string) => {
    if (!websocket || !isConnected) return;

    setSubscribedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userAddress);
      return newSet;
    });

    const unsubscriptionMessage = {
      type: 'unsubscribe',
      channel: 'user_events',
      address: userAddress
    };

    websocket.send(JSON.stringify(unsubscriptionMessage));
    console.log(`Unsubscribed from events for user: ${userAddress}`);
  }, [websocket, isConnected]);

  // Subscribe to global events using Somnia SDK
  const subscribeToGlobalEvents = useCallback(async () => {
    if (!websocket || !isConnected || globalSubscription) return;

    setGlobalSubscription(true);

    try {
      // Subscribe to new block headers for global activity
      console.log('Subscribed to global events');
      
      // In production, use:
      // await somniaDatastreamService.subscribeToNewHeads((block) => {
      //   handleNewBlock(block);
      // });
      
      // Subscribe to all contract events
      // await somniaDatastreamService.subscribeToLogs(
      //   null, // All contracts
      //   [], // All topics
      //   (log) => handleGlobalEvent(log)
      // );
    } catch (error) {
      console.error('Failed to subscribe to global events:', error);
    }
  }, [websocket, isConnected, globalSubscription]);

  // Unsubscribe from global events
  const unsubscribeFromGlobalEvents = useCallback(() => {
    if (!websocket || !isConnected || !globalSubscription) return;

    setGlobalSubscription(false);

    const unsubscriptionMessage = {
      type: 'unsubscribe',
      channel: 'global_events'
    };

    websocket.send(JSON.stringify(unsubscriptionMessage));
    console.log('Unsubscribed from global events');
  }, [websocket, isConnected, globalSubscription]);

  // Memoized feed updates to prevent unnecessary recalculations
  const getFeedUpdates = useCallback((): DatastreamEvent[] => {
    return recentEvents.filter(event => 
      ['post_created', 'song_minted', 'playlist_created'].includes(event.type)
    );
  }, [recentEvents]);

  // Memoized notifications with early return
  const getNotifications = useCallback((): DatastreamEvent[] => {
    if (!address) return [];
    
    return recentEvents.filter(event => 
      ['user_followed', 'post_liked', 'tip_sent', 'message_sent'].includes(event.type) &&
      event.data.recipient === address
    );
  }, [recentEvents, address]);

  // Memoized live stats to prevent object recreation
  const getLiveStats = useCallback(() => {
    return {
      liveUserCount,
      activeSongs: activeSongs.length,
      trendingPlaylists: trendingPlaylists.length,
      recentTips: recentTips.length,
      totalEvents: recentEvents.length
    };
  }, [liveUserCount, activeSongs.length, trendingPlaylists.length, recentTips.length, recentEvents.length]);

  // ===== CONTRACT DATA READING METHODS =====

  // Read user profile data using Somnia SDK
  const readUserProfile = useCallback(async (userAddress: string): Promise<any> => {
    try {
      console.log(`👤 Reading user profile for: ${userAddress}`);
      // Use checksummed address for Somnia SDK
      const checksummedAddress = getAddress(userAddress);
      const profileData = await somniaDatastreamService.getByKey(
        'hibeats_user_profiles_v1',
        '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile contract address
        `profile_${checksummedAddress}`
      );
      console.log(`✅ Retrieved profile data for ${userAddress}`);
      return profileData;
    } catch (error) {
      console.error('Error reading user profile:', error);
      return null;
    }
  }, []);

  // Read all user profiles from ALL publishers (not just one contract)
  const readAllUserProfiles = useCallback(async (): Promise<any[]> => {
    try {
      console.log('👥 [DATASTREAM] Reading all user profiles from blockchain...');
      
      // Use new method that aggregates from multiple sources
      const profiles = await somniaDatastreamService.getAllDataForSchema(
        'hibeats_user_profiles_v1'
      );
      
      // Return empty array if no profiles found (not an error)
      if (!profiles || profiles.length === 0) {
        console.log('📭 [DATASTREAM] No user profiles found yet');
        return [];
      }
      
      console.log(`✅ [DATASTREAM] Retrieved ${profiles.length} user profiles from all sources`);
      
      // Log sample profiles for debugging
      if (profiles && profiles.length > 0) {
        console.log('📋 [DATASTREAM] Sample profiles:', profiles.slice(0, 3).map((p: any) => ({
          username: p.username,
          displayName: p.displayName,
          address: p.userAddress,
          isArtist: p.isArtist
        })));
      }
      
      return profiles || [];
    } catch (error) {
      console.error('❌ [DATASTREAM] Error reading all user profiles:', error);
      return [];
    }
  }, []);

  // Read posts by specific user
  const readUserPosts = useCallback(async (userAddress: string): Promise<any[]> => {
    try {
      console.log(`📝 Reading posts for user: ${userAddress}`);
      const posts = await somniaDatastreamService.getAllPublisherDataForSchema(
        'hibeats_social_posts_v1',
        userAddress
      );
      console.log(`✅ Retrieved ${posts?.length || 0} posts for ${userAddress}`);
      return posts || [];
    } catch (error: any) {
      // NoData() error is expected when no data exists yet
      if (error?.message?.includes('NoData()')) {
        console.log(`📭 No posts found for user: ${userAddress}`);
        return [];
      }
      console.error('Error reading user posts:', error);
      return [];
    }
  }, []);

  // Read all posts from all users
  const readAllPosts = useCallback(async (): Promise<any[]> => {
    try {
      console.log('📜 Reading all posts');
      // This would need to aggregate from all publishers, for now using SocialGraph contract
      const posts = await somniaDatastreamService.getAllPublisherDataForSchema(
        'hibeats_social_posts_v1',
        '0x6d964993b50182B17206f534dcfcc460fC0CCC69' // SocialGraph contract address
      );
      console.log(`✅ Retrieved ${posts?.length || 0} posts`);
      return posts || [];
    } catch (error: any) {
      // NoData() error is expected when no data exists yet
      if (error?.message?.includes('NoData()')) {
        console.log('📭 No posts found yet');
        return [];
      }
      console.error('Error reading all posts:', error);
      return [];
    }
  }, []);

  // Read music events (mints, plays, purchases)
  const readMusicEvents = useCallback(async (artistAddress?: string): Promise<any[]> => {
    try {
      const publisher = artistAddress || '0xC31388420ff0d045c4477f5Fa6513A17E3638272'; // Marketplace contract as default
      console.log(`🎵 Reading music events for: ${publisher}`);
      const events = await somniaDatastreamService.getAllPublisherDataForSchema(
        'hibeats_music_events_v1',
        publisher
      );
      console.log(`✅ Retrieved ${events?.length || 0} music events`);
      return events || [];
    } catch (error: any) {
      // NoData() error is expected when no data exists yet
      if (error?.message?.includes('NoData()')) {
        console.log('📭 No music events found yet');
        return [];
      }
      console.error('Error reading music events:', error);
      return [];
    }
  }, []);

  // Read social interactions (likes, comments, follows)
  const readSocialInteractions = useCallback(async (userAddress?: string): Promise<any[]> => {
    try {
      const publisher = userAddress || '0x6d964993b50182B17206f534dcfcc460fC0CCC69'; // SocialGraph contract as default
      console.log(`🤝 Reading social interactions for: ${publisher}`);
      const interactions = await somniaDatastreamService.getAllPublisherDataForSchema(
        'hibeats_social_interactions_v1',
        publisher
      );
      console.log(`✅ Retrieved ${interactions?.length || 0} social interactions`);
      return interactions || [];
    } catch (error: any) {
      // NoData() error is expected when no data exists yet
      if (error?.message?.includes('NoData()')) {
        console.log('📭 No social interactions found yet');
        return [];
      }
      console.error('Error reading social interactions:', error);
      return [];
    }
  }, []);

  // Auto-connect when wallet is connected (only once)
  useEffect(() => {
    let connectTimeout: NodeJS.Timeout;
    
    if (walletConnected && address && !isConnected && !isConnecting && !hasInitialized) {
      // Delay connection to prevent rapid reconnection attempts
      connectTimeout = setTimeout(() => {
        setHasInitialized(true);
        connect();
      }, 3000); // 3 second delay
    }
    
    return () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
    };
  }, [walletConnected, address, isConnected, isConnecting, hasInitialized, connect]);

  // Debounced user event subscription
  useEffect(() => {
    let subscribeTimeout: NodeJS.Timeout;
    
    if (isConnected && address && !subscribedUsers.has(address)) {
      subscribeTimeout = setTimeout(() => {
        subscribeToUserEvents(address);
      }, 500);
    }
    
    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
    };
  }, [isConnected, address, subscribedUsers, subscribeToUserEvents]);

  // Debounced global event subscription
  useEffect(() => {
    let globalTimeout: NodeJS.Timeout;
    
    if (isConnected && !globalSubscription) {
      globalTimeout = setTimeout(() => {
        subscribeToGlobalEvents();
      }, 1000);
    }
    
    return () => {
      if (globalTimeout) {
        clearTimeout(globalTimeout);
      }
    };
  }, [isConnected, globalSubscription, subscribeToGlobalEvents]);

  // Proper cleanup on unmount - only disconnect when actually unmounting
  useEffect(() => {
    return () => {
      // Only disconnect when the component is actually being unmounted
      // Don't disconnect on every re-render
      console.log('🔌 SomniaDatastreamProvider unmounting - cleaning up connections');
      if (websocket) {
        websocket.close();
      }
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (mockInterval) {
        clearInterval(mockInterval);
      }
    };
  }, []); // Empty dependency array to only run on unmount

  const value: SomniaDatastreamContextType = {
    isConnected,
    isConnecting,
    connectionError,
    recentEvents,
    liveUserCount,
    activeSongs,
    trendingPlaylists,
    recentTips,
    subscribeToUserEvents,
    unsubscribeFromUserEvents,
    subscribeToGlobalEvents,
    unsubscribeFromGlobalEvents,
    getFeedUpdates,
    getNotifications,
    getLiveStats,
    readUserProfile,
    readAllUserProfiles,
    readUserPosts,
    readAllPosts,
    readMusicEvents,
    readSocialInteractions,
    connect,
    disconnect,
    reconnect,
  };

  return (
    <SomniaDatastreamContext.Provider value={value}>
      {children}
    </SomniaDatastreamContext.Provider>
  );
};