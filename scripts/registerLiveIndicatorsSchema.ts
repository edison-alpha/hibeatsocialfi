// Register Live Indicators Schema for Real-Time Features
// This schema stores ephemeral live data like typing indicators and view counts

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file
const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env file');
}

if (!PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

// Live Indicators Schema Definition
const LIVE_INDICATORS_SCHEMA = {
  id: 'hibeats_live_indicators_v1',
  schema: 'uint64 timestamp, string postId, address userAddress, string action'
};

async function registerLiveIndicatorsSchema() {
  console.log('🚀 Registering Live Indicators Schema...\n');

  try {
    // Setup clients
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(somniaTestnet.rpcUrls.default.http[0]),
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(somniaTestnet.rpcUrls.default.http[0]),
    });

    // Initialize SDK
    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    console.log('✅ SDK initialized');
    console.log(`📝 Wallet: ${account.address}\n`);
    console.log(`📋 Registering schema: ${LIVE_INDICATORS_SCHEMA.id}`);
    console.log(`   Schema: ${LIVE_INDICATORS_SCHEMA.schema}\n`);

    // Compute schema ID
    const schemaIdBytes32 = await sdk.streams.computeSchemaId(LIVE_INDICATORS_SCHEMA.schema);
    console.log(`🔑 Schema ID: ${schemaIdBytes32}`);

    // Check if already registered
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaIdBytes32);
    
    if (isRegistered) {
      console.log('✅ Schema already registered!');
      console.log('\n📊 Schema Details:');
      console.log(`   Name: ${LIVE_INDICATORS_SCHEMA.id}`);
      console.log(`   ID: ${schemaIdBytes32}`);
      console.log(`   Definition: ${LIVE_INDICATORS_SCHEMA.schema}`);
      console.log(`   Purpose: Real-time typing indicators and view counts`);
      console.log(`   Features: Cross-user sync, instant updates, ephemeral data\n`);
      
      console.log('🎯 Usage:');
      console.log('   - Typing indicators: action = "typing_start" or "typing_stop"');
      console.log('   - View counts: action = "view"');
      console.log('   - Real-time sync across all users via Somnia Data Streams Events\n');
      return;
    }

    // Register schema
    console.log('📤 Registering schema to blockchain...');
    const txHash = await sdk.streams.registerDataSchemas(
      [{
        id: LIVE_INDICATORS_SCHEMA.id,
        schema: LIVE_INDICATORS_SCHEMA.schema,
        parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      }],
      true // ignoreExistingSchemas
    );

    console.log('✅ Live Indicators schema registered!');
    console.log('   Transaction:', txHash);
    console.log('\n🎉 Registration complete!');
    
    console.log('\n📊 Schema Details:');
    console.log(`   Name: ${LIVE_INDICATORS_SCHEMA.id}`);
    console.log(`   ID: ${schemaIdBytes32}`);
    console.log(`   Definition: ${LIVE_INDICATORS_SCHEMA.schema}`);
    console.log(`   Purpose: Real-time typing indicators and view counts`);
    console.log(`   Features: Cross-user sync, instant updates, ephemeral data\n`);
    
    console.log('🎯 Usage:');
    console.log('   - Typing indicators: action = "typing_start" or "typing_stop"');
    console.log('   - View counts: action = "view"');
    console.log('   - Real-time sync across all users via Somnia Data Streams Events\n');

  } catch (error: any) {
    if (error?.message?.includes('IDAlreadyUsed') || error?.message?.includes('already registered')) {
      console.log('✅ Schema already registered (IDAlreadyUsed)');
    } else {
      console.error('❌ Error:', error.message || error);
      process.exit(1);
    }
  }
}

registerLiveIndicatorsSchema();
