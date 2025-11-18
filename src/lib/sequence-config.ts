/**
 * Sequence Connect Configuration with WaaS (Wallet as a Service)
 * Modern embedded wallet solution for HiBeats
 */

import { createConfig } from '@0xsequence/connect';

// Sequence project access key
const projectAccessKey = import.meta.env.VITE_SEQUENCE_PROJECT_ACCESS_KEY || 'AQAAAAAAAKuNscAayiFYWcM3RL1nZx_FjwA';

// WaaS configuration key - Get this from Sequence Builder dashboard
const waasConfigKey = import.meta.env.VITE_SEQUENCE_WAAS_CONFIG_KEY || 'eyJwcm9qZWN0SWQiOjQzOTE3LCJycGNTZXJ2ZXIiOiJodHRwczovL3dhYXMuc2VxdWVuY2UuYXBwIn0=';

// WalletConnect project ID (optional, for WalletConnect support)
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

// Transaction confirmation modal setting
// ❌ DISABLED for auto-approve functionality (no popups!)
const enableConfirmationModal = false;

// Create Sequence Connect config using createConfig for WaaS mode
export const sequenceConfig = createConfig('waas', {
  projectAccessKey,
  
  // UI Configuration
  position: 'center',
  defaultTheme: 'dark',
  
  // Sign-in customization
  signIn: {
    projectName: 'hibeats',
    // ✅ Add allowed origins to prevent authorization errors
    useMock: false,
  },
  
  // Chain configuration
  defaultChainId: 50312, // Somnia Testnet
  chainIds: [50312],
  
  // App configuration
  appName: 'hibeats',
  
  // WaaS Configuration Key
  waasConfigKey,
  
  // Authentication methods
  email: true,           // ✅ Email login
  google: false,         // ❌ Google login (disabled for now)
  apple: false,          // ❌ Apple login (disabled)
  
  // External wallet support
  walletConnect: walletConnectProjectId ? {
    projectId: walletConnectProjectId,
  } : undefined,
  
  coinbase: false,       // Coinbase wallet
  metaMask: true,        // MetaMask support
  
  // Wagmi configuration
  wagmiConfig: {
    multiInjectedProviderDiscovery: true,
  },
  
  // Transaction confirmation modal
  // ❌ Set to FALSE to enable auto-approve without popups
  enableConfirmationModal,
});

// Somnia Testnet configuration for reference
export const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMNIA',
    symbol: 'SOMNIA',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
  testnet: true,
} as const;

// Contract addresses for deployed contracts (Updated v3.0.0 - Latest Deployment)
// ⚠️ IMPORTANT: Import from web3-config.ts for consistency
export { CONTRACT_ADDRESSES } from './web3-config';
