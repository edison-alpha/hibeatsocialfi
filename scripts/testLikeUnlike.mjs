/**
 * Test Like/Unlike Counting
 * 
 * Simple script to test like/unlike interactions
 */

import { readFileSync } from 'fs';
import { createWalletClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// Load .env
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const privateKey = env.VITE_PRIVATE_KEY;
const rpcUrl = env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';

if (!privateKey) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

// Somnia chain config
const somnia = defineChain({
  id: 50312,
  name: 'Somnia',
  network: 'somnia',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
});

console.log('🧪 Testing Like/Unlike Interactions\n');
console.log('📋 Configuration:');
console.log('   RPC URL:', rpcUrl);

const account = privateKeyToAccount(privateKey);
console.log('   Account:', account.address);
console.log('');

// Create wallet client
const client = createWalletClient({
  account,
  chain: somnia,
  transport: http(rpcUrl),
}).extend(publicActions);

console.log('✅ Wallet client created');
console.log('');

// Test connection
try {
  console.log('🔌 Testing connection...');
  const blockNumber = await client.getBlockNumber();
  console.log('✅ Connected! Current block:', blockNumber.toString());
  console.log('');
  
  const balance = await client.getBalance({ address: account.address });
  console.log('💰 Balance:', (Number(balance) / 1e18).toFixed(4), 'STT');
  console.log('');
  
  console.log('✅ Connection test successful!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Open browser and go to http://localhost:5173');
  console.log('   2. Navigate to DataStream Social Test V3 page');
  console.log('   3. Test like/unlike buttons on posts');
  console.log('   4. Check browser console for detailed logs');
  console.log('');
  console.log('🔍 What to look for:');
  console.log('   - Like count should increase when you click like');
  console.log('   - Like count should decrease when you click unlike');
  console.log('   - Heart icon should fill/unfill based on like status');
  console.log('   - Toast notifications should show success messages');
  console.log('   - Console should show interaction transactions');
  
} catch (error) {
  console.error('❌ Connection failed:', error.message);
  process.exit(1);
}
