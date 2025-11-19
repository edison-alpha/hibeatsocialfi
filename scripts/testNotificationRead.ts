// Test Reading Notifications for Current User
// Run: npx tsx scripts/testNotificationRead.ts

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
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

const NOTIFICATION_SCHEMA = 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead';

async function testReadNotifications() {
  try {
    console.log('🧪 Testing Notification Read\n');

    // Setup
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

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    console.log('✅ SDK initialized');
    console.log(`📍 Publisher address: ${account.address}\n`);

    // Compute schema ID
    const schemaIdBytes32 = await sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA);
    console.log(`🔑 Schema ID: ${schemaIdBytes32}\n`);

    // Read all notifications from this publisher
    console.log('📖 Reading all notifications from publisher...');
    
    const allData = await sdk.streams.getAllPublisherDataForSchema(
      schemaIdBytes32,
      account.address as `0x${string}`
    );

    if (!allData || allData.length === 0) {
      console.log('📭 No notifications found');
      return;
    }

    console.log(`✅ Found ${allData.length} notifications\n`);
    console.log('📦 Data structure:', {
      firstItemType: typeof allData[0],
      isArray: Array.isArray(allData[0]),
      firstItemKeys: allData[0] && typeof allData[0] === 'object' && !Array.isArray(allData[0]) ? Object.keys(allData[0]) : [],
      sample: allData[0]
    });
    console.log('\n');

    // Helper to extract value from nested structure
    const extractValue = (item: any): any => {
      if (item && typeof item === 'object' && 'value' in item) {
        return extractValue(item.value);
      }
      return item;
    };

    // Process and display notifications
    const notifications = allData.map((item: any, index: number) => {
      try {
        // Handle array format (most common from SDK)
        if (Array.isArray(item)) {
          const timestamp = extractValue(item[0]);
          const type = extractValue(item[1]);
          const from = extractValue(item[2]);
          const to = extractValue(item[3]);
          const postId = extractValue(item[4]);
          const content = extractValue(item[5]);
          const metadata = extractValue(item[6]);
          const isRead = extractValue(item[7]);
          
          return {
            index: index + 1,
            timestamp: Number(timestamp),
            type: String(type),
            from: String(from),
            to: String(to),
            postId: String(postId),
            content: String(content),
            metadata: String(metadata),
            isRead: Boolean(isRead)
          };
        }
        
        // Handle object format
        if (item.toUser && item.fromUser) {
          return {
            index: index + 1,
            timestamp: Number(item.timestamp),
            type: String(item.notificationType),
            from: String(item.fromUser),
            to: String(item.toUser),
            postId: String(item.postId || ''),
            content: String(item.content || ''),
            metadata: String(item.metadata || ''),
            isRead: Boolean(item.isRead)
          };
        }
        
        return null;
      } catch (error: any) {
        console.error(`❌ Failed to process notification ${index + 1}:`, error.message);
        return null;
      }
    }).filter(n => n !== null);

    // Group by recipient
    const byRecipient = new Map<string, any[]>();
    notifications.forEach(notif => {
      if (!notif) return;
      const recipient = notif.to.toLowerCase();
      if (!byRecipient.has(recipient)) {
        byRecipient.set(recipient, []);
      }
      byRecipient.get(recipient)!.push(notif);
    });

    console.log('📊 Notifications by Recipient:\n');
    byRecipient.forEach((notifs, recipient) => {
      console.log(`\n👤 Recipient: ${recipient}`);
      console.log(`   Total: ${notifs.length} notifications`);
      
      // Group by type
      const byType = new Map<string, number>();
      notifs.forEach(n => {
        byType.set(n.type, (byType.get(n.type) || 0) + 1);
      });
      
      console.log('   By Type:');
      byType.forEach((count, type) => {
        console.log(`     - ${type}: ${count}`);
      });
      
      // Show latest 3
      console.log('   Latest 3:');
      notifs.slice(0, 3).forEach(n => {
        console.log(`     ${n.index}. [${n.type}] from ${n.from.slice(0, 10)}... at ${new Date(n.timestamp).toLocaleString()}`);
        if (n.content) console.log(`        Content: ${n.content}`);
      });
    });

    console.log('\n\n🎉 Test completed!');
    console.log('\n💡 To test in your app:');
    console.log('   1. Open browser console');
    console.log('   2. Run: const { notificationService } = await import("./src/services/notificationService")');
    console.log('   3. Run: await notificationService.connect()');
    console.log('   4. Run: const notifs = await notificationService.getUserNotifications("YOUR_ADDRESS")');
    console.log('   5. Check: console.log(notifs)');

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

testReadNotifications().catch(console.error);
