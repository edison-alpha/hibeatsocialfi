/**
 * Verify Play Events Schema Registration
 * 
 * Checks if schema is properly registered and can be used
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      process.env[key.trim()] = value;
    }
  });
}

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';

// Define Somnia testnet
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-devnet.socialscan.io' },
  },
  testnet: true,
});

const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const WS_URL = process.env.VITE_SOMNIA_WS_URL || 'wss://dream-rpc.somnia.network/ws';

// Play Events Schema
const SCHEMA_NAME = 'hibeats_play_events_v1';
const SCHEMA_STRING = 'uint256 id, uint256 timestamp, uint32 tokenId, address listener, uint32 duration, string source';

async function verifyPlayEventsSchema() {
  console.log('🔍 Verifying Play Events Schema...\n');

  try {
    // Initialize clients
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(WS_URL),
    });

    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(RPC_URL),
    });

    console.log('✅ Clients initialized');
    console.log('📝 Publisher:', account.address);

    // Initialize SDK
    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    console.log('✅ SDK initialized\n');

    console.log('📋 Schema Details:');
    console.log('   Name:', SCHEMA_NAME);
    console.log('   Fields:', SCHEMA_STRING);
    console.log();

    // Compute schema ID
    const schemaId = await sdk.streams.computeSchemaId(SCHEMA_STRING);
    console.log('🔑 Schema ID:', schemaId);

    // Check if registered
    console.log('\n🔍 Checking schema registration...');
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
    
    if (isRegistered) {
      console.log('✅ Schema is registered!');
      
      // Try to get data
      console.log('\n📊 Checking for existing data...');
      try {
        const data = await sdk.streams.getAllPublisherDataForSchema(schemaId, account.address);
        console.log(`✅ Found ${data.length} play events`);
        
        if (data.length > 0) {
          console.log('\n📄 Sample data (first 3):');
          data.slice(0, 3).forEach((item: any, index: number) => {
            console.log(`   ${index + 1}.`, item);
          });
        }
      } catch (dataError: any) {
        if (dataError?.message?.includes('NoData()')) {
          console.log('📭 No play events recorded yet (this is normal for new schema)');
        } else {
          console.log('⚠️  Error fetching data:', dataError.message);
        }
      }
      
      console.log('\n✅ Schema verification successful!');
      console.log('\n💡 Schema is ready to use for recording play events.');
    } else {
      console.log('❌ Schema not registered!');
      console.log('\n💡 Register the schema first:');
      console.log('   npm run register:play-events');
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    throw error;
  }
}

// Run verification
verifyPlayEventsSchema()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
