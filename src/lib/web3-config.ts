import { createConfig, http, fallback } from 'wagmi';
import { sequenceWallet } from '@0xsequence/wagmi-connector';
import { getAllRpcUrls, getWebSocketUrl } from './rpc-fallback';

// Define Somnia testnet with optimized configuration and multiple RPC endpoints
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMNIA',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { 
      http: getAllRpcUrls(), // 🔥 Multiple RPC endpoints with automatic fallback
      webSocket: getWebSocketUrl() ? [getWebSocketUrl()!] : undefined,
    },
    public: { 
      http: getAllRpcUrls(),
      webSocket: getWebSocketUrl() ? [getWebSocketUrl()!] : undefined,
    },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
  testnet: true,
} as const;

// Sequence Wallet Configuration
const sequenceConnector = sequenceWallet({
  connectOptions: {
    app: 'HiBeats',
    projectAccessKey: import.meta.env.VITE_SEQUENCE_PROJECT_ACCESS_KEY || 'AQAAAAAAAKuNscAayiFYWcM3RL1nZx_FjwA',
    // Enable gasless transactions
    settings: {
      theme: 'dark',
      bannerUrl: 'https://your-app.com/banner.png', // Optional banner
      includedPaymentProviders: ['moonpay', 'ramp'],
      defaultFundingCurrency: 'eth',
      lockFundingCurrencyToDefault: false,
    },

  },
  defaultNetwork: somniaTestnet.id,
});

// 🔥 Create fallback transport with multiple RPC endpoints
const createFallbackTransport = () => {
  const rpcUrls = getAllRpcUrls();
  const transports = rpcUrls.map(url => 
    http(url, {
      batch: {
        wait: 16,
        batchSize: 1000,
      },
      retryCount: 2,
      retryDelay: 100,
      timeout: 5_000,
      fetchOptions: {
        keepalive: true,
      },
    })
  );

  // Use fallback transport for automatic switching
  return fallback(transports, {
    rank: false, // Don't rank by latency, use priority order
    retryCount: 2,
    retryDelay: 100,
  });
};

const wagmiConfig = createConfig({
  chains: [somniaTestnet],
  transports: {
    [somniaTestnet.id]: createFallbackTransport(),
  },
  connectors: [sequenceConnector],
  // 🔥 Aggressive polling for Somnia's sub-second finality
  pollingInterval: 100, // Poll every 100ms (10 checks/second) for <1s confirmation
});

// Contract addresses for deployed contracts (Updated - Latest Deployment)
export const CONTRACT_ADDRESSES = {
  // Social contracts
  userProfile: '0x6aD6eBc95116A81CB89FCB2676E829b5dabF7536',
  songNFT: '0xc9Ab73b5f988826943e4f63E89ed0841757CBD6c',
  albumManager: '0x94892b8E7CC63E0C5E5eE7ce27D4E7588CbAf864',
  playlistManager: '0x912D6898AD5F9351d3AC86F960279a34a5fD582B',
  marketplace: '0xe62Dc8113C77bDA6b13Eebb86f3453C4df5399e2',
  tippingSystem: '0xD6CAA4722083afFdBE54949E39C46C164ad1a370',
};

export { wagmiConfig, somniaTestnet };