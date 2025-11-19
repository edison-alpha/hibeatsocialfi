// Send notification to specific user
// Usage: npx tsx scripts/sendNotificationToUser.ts <userAddress>

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

const NOTIFICATION_SCHEMA = 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead';

async function sendNotificationToUser(toAddress: string) {
  try {
    console.log('🚀 Sending notifications to:', toAddress);
    console.log('');

    // Setup wallet
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    const fromAddress = account.address;
    
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
    console.log(`📤 From: ${fromAddress}`);
    console.log(`📥 To: ${toAddress}`);
    console.log('');

    // Compute schema ID
    const schemaIdBytes32 = await sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA);
    console.log(`🔑 Schema ID: ${schemaIdBytes32}`);
    console.log('');

    // Helper to send notification
    const sendNotif = async (type: string, content: string = '', metadata: any = {}) => {
      const timestamp = Date.now();
      const { SchemaEncoder } = await import('@somnia-chain/streams');
      const encoder = new SchemaEncoder(NOTIFICATION_SCHEMA);
      
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: timestamp.toString(), type: 'uint256' },
        { name: 'notificationType', value: type, type: 'string' },
        { name: 'fromUser', value: fromAddress.toLowerCase(), type: 'string' },
        { name: 'toUser', value: toAddress.toLowerCase(), type: 'string' },
        { name: 'postId', value: 'post_123', type: 'string' },
        { name: 'content', value: content, type: 'string' },
        { name: 'metadata', value: JSON.stringify(metadata), type: 'string' },
        { name: 'isRead', value: false, type: 'bool' }
      ]);

      const { keccak256, toHex } = await import('viem');
      const notificationId = keccak256(toHex(`notif_${type}_${timestamp}_${fromAddress}_${toAddress}`));

      const txHash = await sdk.streams.set([{
        id: notificationId,
        schemaId: schemaIdBytes32,
        data: encodedData,
      }]);

      console.log(`✅ ${type} notification sent! TX: ${txHash}`);
    };

    // Send various notifications
    console.log('📤 Sending notifications...');
    console.log('');

    await sendNotif('like', '', {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    await sendNotif('comment', 'Great music! Love the vibe 🎵', {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    await sendNotif('follow', '', {});
    await new Promise(resolve => setTimeout(resolve, 2000));

    await sendNotif('tip', '', { amount: '10 SOMI' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    await sendNotif('music_milestone_plays', '1000 plays', { 
      tokenId: 'token_123', 
      playCount: '1000',
      milestone: '1K plays'
    });

    console.log('');
    console.log('🎉 All notifications sent!');
    console.log('');
    console.log('💡 Next steps:');
    console.log(`   1. Login to app with address: ${toAddress}`);
    console.log('   2. Open notifications page');
    console.log('   3. You should see the notifications!');

  } catch (error) {
    console.error('❌ Failed to send notifications:', error);
    throw error;
  }
}

// Get user address from command line
const userAddress = process.argv[2];

if (!userAddress) {
  console.error('❌ Please provide user address');
  console.error('Usage: npx tsx scripts/sendNotificationToUser.ts <userAddress>');
  process.exit(1);
}

sendNotificationToUser(userAddress).catch(console.error);
