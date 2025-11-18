/**
 * Verify Generated Music Schema Registration
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not load .env file');
  }
}

loadEnv();

const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  testnet: true,
});

const SCHEMA_STRING = 'uint256 id, uint256 timestamp, address owner, string taskId, string title, string audioUrl, string imageUrl, string prompt, string style, string lyrics, uint8 status';

async function verifySchema() {
  console.log('🔍 Verifying Generated Music Schema...\n');

  const privateKey = process.env.VITE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VITE_PRIVATE_KEY not found');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('👤 Publisher:', account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket('wss://dream-rpc.somnia.network/ws'),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http('https://dream-rpc.somnia.network'),
  });

  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Compute schema ID
  const schemaId = await sdk.streams.computeSchemaId(SCHEMA_STRING);
  console.log('🔑 Schema ID:', schemaId);

  // Check if registered
  const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
  console.log('📋 Is Registered:', isRegistered ? '✅ YES' : '❌ NO');

  if (!isRegistered) {
    console.log('\n⚠️  Schema is NOT registered!');
    console.log('💡 Run: npm run register:generated-music');
    process.exit(1);
  }

  // Try to get data
  console.log('\n📦 Fetching data...');
  try {
    const data = await sdk.streams.getAllPublisherDataForSchema(schemaId, account.address);
    console.log('📊 Total records:', data.length);
    
    if (data.length > 0) {
      console.log('\n🎵 Sample record:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\n💡 No data found yet. Generate some music to see it here!');
    }
  } catch (error) {
    console.error('❌ Failed to fetch data:', error);
  }

  console.log('\n✅ Schema verification complete!');
}

verifySchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
