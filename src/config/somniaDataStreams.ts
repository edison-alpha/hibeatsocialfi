// Somnia Data Streams Configuration
// Centralized configuration for all Data Streams features

export const SOMNIA_CONFIG = {
  // Network Configuration
  rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network',
  wsUrl: import.meta.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws',
  chainId: 50312, // Somnia Devnet
  
  // Feature Flags
  features: {
    enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false', // Default true
    enablePolling: import.meta.env.VITE_ENABLE_REALTIME_POLLING === 'true',
    enableOptimisticUI: true,
    enableOfflineCache: true,
  },
  
  // Performance Settings
  performance: {
    reconnectDelay: 3000, // 3 seconds
    pollingInterval: 2000, // 2 seconds
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    subscriptionTimeout: 8000, // 8 seconds
  },
  
  // Schema Definitions
  schemas: {
    userProfiles: 'hibeats_user_profiles_v1',
    socialPosts: 'hibeats_social_posts_v1',
    socialInteractions: 'hibeats_social_interactions_v1',
    socialInteractionsV2: 'hibeats_social_interactions_v2', // V2 with improved structure
    musicEvents: 'hibeats_music_events_v1',
  },
  
  // Event IDs for subscriptions
  events: {
    profileCreated: 'ProfileCreated',
    profileUpdated: 'ProfileUpdated',
    postCreated: 'PostCreated',
    postLiked: 'PostLiked',
    postCommented: 'PostCommented',
    userFollowed: 'UserFollowed',
    userUnfollowed: 'UserUnfollowed',
    songMinted: 'SongMinted',
    tipSent: 'TipSent',
  },
  
  // Contract Addresses
  contracts: {
    userProfile: '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298',
    socialGraph: '0x6d964993b50182B17206f534dcfcc460fC0CCC69',
    songNFT: '0xC31388420ff0d045c4477f5Fa6513A17E3638272',
    albumManager: '0x2ae67AC387A4DE0F2109Bdd18E82a18a1B582dee',
    marketplace: '0xC34f9FE5C732ce01a2C5a4658f14AA25217e2b70',
    playlistManager: '0x3B4123D5c0C8eD1c381D38d66a89817e07D32Df6',
    tippingSystem: '0xC5D2C577A027124905e251E5c0925dC8bfD8368B',
    directMessages: '0x4deE5202e34f7AA84504Dd70446d9A25a7921a6E',
  },
} as const;

// Helper: Check if Data Streams is available
export const isDataStreamsAvailable = (): boolean => {
  return !!(SOMNIA_CONFIG.rpcUrl && SOMNIA_CONFIG.wsUrl);
};

// Helper: Get schema ID by name
export const getSchemaId = (schemaName: keyof typeof SOMNIA_CONFIG.schemas): string => {
  return SOMNIA_CONFIG.schemas[schemaName];
};

// Helper: Get contract address by name
export const getContractAddress = (contractName: keyof typeof SOMNIA_CONFIG.contracts): string => {
  return SOMNIA_CONFIG.contracts[contractName];
};

// Helper: Check if feature is enabled
export const isFeatureEnabled = (featureName: keyof typeof SOMNIA_CONFIG.features): boolean => {
  return SOMNIA_CONFIG.features[featureName];
};

// Export types
export type SchemaName = keyof typeof SOMNIA_CONFIG.schemas;
export type ContractName = keyof typeof SOMNIA_CONFIG.contracts;
export type EventName = keyof typeof SOMNIA_CONFIG.events;
