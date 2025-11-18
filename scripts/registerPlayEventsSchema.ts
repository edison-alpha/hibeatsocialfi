/**
 * Register Play Events Schema to Somnia DataStream
 * 
 * Schema: hibeats_play_events_v1
 * Fields: id, timestamp, tokenId, listener, duration, source
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

async function registerPlayEventsSchema() {
  console.log('🎵 Registering Play Events Schema...\n');

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

    // Check if already registered
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaId);
    if (isRegistered) {
      console.log('⚠️  Schema already registered!');
      console.log('\n✅ No need to register again.');
      return;
    }

    // Import zeroBytes32 for parent schema
    const { zeroBytes32 } = await import('@somnia-chain/streams');

    // Register schema
    console.log('📤 Registering schema to blockchain...');
    const txHash = await sdk.streams.registerDataSchemas([{
      id: SCHEMA_NAME,
      schema: SCHEMA_STRING,
      parentSchemaId: zeroBytes32 // root schema
    }], true); // ignore if already registered
    
    console.log('✅ Schema registered!');
    console.log('   Transaction Hash:', txHash);
    console.log('   Schema ID:', schemaId);

    console.log('\n🎉 Play Events Schema registration completed!');
    console.log('\n📝 Summary:');
    console.log('   Schema Name:', SCHEMA_NAME);
    console.log('   Schema ID:', schemaId);
    console.log('   Publisher:', account.address);
    console.log('   Transaction:', txHash);
    console.log('\n💡 You can now use this schema to record play events!');

  } catch (error) {
    console.error('\n❌ Registration failed:', error);
    throw error;
  }
}

// Run registration
registerPlayEventsSchema()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
