// Register Notification Schema for Real-Time Notifications
// Similar to Twitter notification system

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
  const match = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = match ? match[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env file');
}

if (!PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

// Notification Schema Definition
const NOTIFICATION_SCHEMA = {
  id: 'hibeats_notifications_v1',
  schema: 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead',
  description: 'Real-time notifications for HiBeats social interactions'
};

async function registerNotificationSchema() {
  try {
    console.log('🚀 Starting Notification Schema Registration...\n');
    console.log('📋 Notification Types:');
    console.log('   - like: Someone liked your post');
    console.log('   - comment: Someone commented on your post');
    console.log('   - repost: Someone reposted your content');
    console.log('   - follow: Someone followed you');
    console.log('   - mention: Someone mentioned you');
    console.log('   - tip: Someone tipped you');
    console.log('   - reply: Someone replied to your comment\n');

    // Setup wallet
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
    console.log(`📝 Registering schema: ${NOTIFICATION_SCHEMA.id}\n`);

    // Compute schema ID
    const schemaIdBytes32 = await sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA.schema);
    console.log(`🔑 Schema ID: ${schemaIdBytes32}`);

    // Check if already registered
    const isRegistered = await sdk.streams.isDataSchemaRegistered(schemaIdBytes32);
    
    if (isRegistered) {
      console.log('✅ Schema already registered!');
      return;
    }

    // Register schema
    console.log('📤 Registering schema to blockchain...');
    const txHash = await sdk.streams.registerDataSchemas(
      [{
        id: NOTIFICATION_SCHEMA.id,
        schema: NOTIFICATION_SCHEMA.schema,
        parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`
      }],
      true // ignoreExistingSchemas
    );

    console.log('✅ Notification schema registered!');
    console.log('   Transaction:', txHash);
    console.log('\n🎉 Registration complete!');

  } catch (error: any) {
    if (error?.message?.includes('IDAlreadyUsed') || error?.message?.includes('already registered')) {
      console.log('✅ Schema already registered (IDAlreadyUsed)');
    } else {
      console.error('❌ Registration failed:', error);
      throw error;
    }
  }
}

registerNotificationSchema().catch(console.error);
