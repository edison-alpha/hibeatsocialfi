// Test Notification System
// Run: npx tsx scripts/testNotifications.ts

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, type Hex, keccak256, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env file
const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;
let TEST_USER_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
  
  const addrMatch = envContent.match(/VITE_TEST_USER_ADDRESS=(.+)/);
  if (addrMatch) {
    TEST_USER_ADDRESS = addrMatch[1].trim();
  }
} catch (error) {
  console.error('Failed to read .env file');
}

if (!PRIVATE_KEY) {
  console.error('❌ VITE_PRIVATE_KEY not found in .env');
  process.exit(1);
}

const NOTIFICATION_SCHEMA = 'uint256 timestamp, string notificationType, string fromUser, string toUser, string postId, string content, string metadata, bool isRead';

async function testNotifications() {
  try {
    console.log('🧪 Testing Notification System\n');

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
    console.log(`📍 Test user: ${TEST_USER_ADDRESS}\n`);

    // Compute schema ID
    const schemaIdBytes32 = await sdk.streams.computeSchemaId(NOTIFICATION_SCHEMA);
    console.log(`🔑 Schema ID: ${schemaIdBytes32}\n`);

    // Create schema encoder
    const schemaEncoder = new SchemaEncoder(NOTIFICATION_SCHEMA);

    // Helper to create bytes32 ID
    const createNotifId = (type: string, timestamp: number): Hex => {
      return keccak256(toHex(`notif_${type}_${timestamp}_${account.address}`));
    };

    // Test 1: Send a like notification
    console.log('📤 Test 1: Sending LIKE notification...');
    const likeTimestamp = Date.now();
    const likeNotifId = createNotifId('like', likeTimestamp);
    
    const likeData = schemaEncoder.encodeData([
      { name: 'timestamp', value: likeTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'like', type: 'string' },
      { name: 'fromUser', value: account.address.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: 'post_123456', type: 'string' },
      { name: 'content', value: '', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ fromUsername: 'TestUser', postContent: 'Amazing track!' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const likeTx = await sdk.streams.set([{
      id: likeNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: likeData,
    }]);

    console.log(`✅ Like notification sent! TX: ${likeTx}\n`);

    // Wait 2 seconds between transactions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Send a comment notification
    console.log('📤 Test 2: Sending COMMENT notification...');
    const commentTimestamp = Date.now();
    const commentNotifId = createNotifId('comment', commentTimestamp);
    
    const commentData = schemaEncoder.encodeData([
      { name: 'timestamp', value: commentTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'comment', type: 'string' },
      { name: 'fromUser', value: account.address.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: 'post_123456', type: 'string' },
      { name: 'content', value: 'Great music! Love the vibe 🎵', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ fromUsername: 'TestUser' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const commentTx = await sdk.streams.set([{
      id: commentNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: commentData,
    }]);

    console.log(`✅ Comment notification sent! TX: ${commentTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Send a follow notification
    console.log('📤 Test 3: Sending FOLLOW notification...');
    const followTimestamp = Date.now();
    const followNotifId = createNotifId('follow', followTimestamp);
    
    const followData = schemaEncoder.encodeData([
      { name: 'timestamp', value: followTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'follow', type: 'string' },
      { name: 'fromUser', value: account.address.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: '', type: 'string' },
      { name: 'content', value: '', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ fromUsername: 'TestUser', fromAvatar: '' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const followTx = await sdk.streams.set([{
      id: followNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: followData,
    }]);

    console.log(`✅ Follow notification sent! TX: ${followTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Send a tip notification
    console.log('📤 Test 4: Sending TIP notification...');
    const tipTimestamp = Date.now();
    const tipNotifId = createNotifId('tip', tipTimestamp);
    
    const tipData = schemaEncoder.encodeData([
      { name: 'timestamp', value: tipTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'tip', type: 'string' },
      { name: 'fromUser', value: account.address.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: 'post_123456', type: 'string' },
      { name: 'content', value: '', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ amount: '25 SOMI', fromUsername: 'TestUser' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const tipTx = await sdk.streams.set([{
      id: tipNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: tipData,
    }]);

    console.log(`✅ Tip notification sent! TX: ${tipTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Send NFT minted notification
    console.log('📤 Test 5: Sending NFT MINTED notification...');
    const nftTimestamp = Date.now();
    const nftNotifId = createNotifId('nft_minted', nftTimestamp);
    
    const nftData = schemaEncoder.encodeData([
      { name: 'timestamp', value: nftTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'nft_minted', type: 'string' },
      { name: 'fromUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: '', type: 'string' },
      { name: 'content', value: '', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ tokenId: '42', title: 'My Awesome Track' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const nftTx = await sdk.streams.set([{
      id: nftNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: nftData,
    }]);

    console.log(`✅ NFT minted notification sent! TX: ${nftTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 6: Send music milestone notification
    console.log('📤 Test 6: Sending MUSIC MILESTONE notification...');
    const milestoneTimestamp = Date.now();
    const milestoneNotifId = createNotifId('milestone', milestoneTimestamp);
    
    const milestoneData = schemaEncoder.encodeData([
      { name: 'timestamp', value: milestoneTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'music_milestone_plays', type: 'string' },
      { name: 'fromUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: '', type: 'string' },
      { name: 'content', value: '1000 plays', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ tokenId: '42', playCount: '1000', milestone: '1K' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const milestoneTx = await sdk.streams.set([{
      id: milestoneNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: milestoneData,
    }]);

    console.log(`✅ Music milestone notification sent! TX: ${milestoneTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 7: Send top chart notification
    console.log('📤 Test 7: Sending TOP CHART notification...');
    const chartTimestamp = Date.now();
    const chartNotifId = createNotifId('chart', chartTimestamp);
    
    const chartData = schemaEncoder.encodeData([
      { name: 'timestamp', value: chartTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'music_top_chart', type: 'string' },
      { name: 'fromUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: '', type: 'string' },
      { name: 'content', value: 'Top 10 - Rank #5', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ tokenId: '42', rank: '5', chartType: 'Top 10' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const chartTx = await sdk.streams.set([{
      id: chartNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: chartData,
    }]);

    console.log(`✅ Top chart notification sent! TX: ${chartTx}\n`);

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 8: Send received SOMI notification
    console.log('📤 Test 8: Sending RECEIVED SOMI notification...');
    const somiTimestamp = Date.now();
    const somiNotifId = createNotifId('somi', somiTimestamp);
    
    const somiData = schemaEncoder.encodeData([
      { name: 'timestamp', value: somiTimestamp.toString(), type: 'uint256' },
      { name: 'notificationType', value: 'received_somi', type: 'string' },
      { name: 'fromUser', value: account.address.toLowerCase(), type: 'string' },
      { name: 'toUser', value: TEST_USER_ADDRESS.toLowerCase(), type: 'string' },
      { name: 'postId', value: '', type: 'string' },
      { name: 'content', value: '', type: 'string' },
      { name: 'metadata', value: JSON.stringify({ amount: '100 SOMI', txHash: '0x123...' }), type: 'string' },
      { name: 'isRead', value: false, type: 'bool' }
    ]);

    const somiTx = await sdk.streams.set([{
      id: somiNotifId as Hex,
      schemaId: schemaIdBytes32,
      data: somiData,
    }]);

    console.log(`✅ Received SOMI notification sent! TX: ${somiTx}\n`);

    // Test 9: Read notifications
    console.log('📖 Test 9: Reading all notifications...');
    
    const allData = await sdk.streams.getAllPublisherDataForSchema(
      schemaIdBytes32,
      account.address as `0x${string}`
    );

    if (allData && Array.isArray(allData)) {
      console.log(`✅ Found ${allData.length} notifications\n`);
      console.log('📦 First item type:', typeof allData[0]);
      console.log('📦 First item keys:', Object.keys(allData[0] || {}));
      
      allData.forEach((item: any, index: number) => {
        try {
          // SDK already returns decoded data as array!
          // No need to decode again
          const decoded = Array.isArray(item) ? item : [item];
          
          const extractValue = (item: any): any => {
            // Handle nested value structure
            if (item && typeof item === 'object') {
              if ('value' in item) {
                // Recursively extract if value is also an object
                return extractValue(item.value);
              }
              // If it's an object without value, try to convert to string
              return String(item);
            }
            return item;
          };
          
          const timestamp = extractValue(decoded[0]);
          const type = extractValue(decoded[1]);
          const from = extractValue(decoded[2]);
          const to = extractValue(decoded[3]);
          const content = extractValue(decoded[5]);
          
          console.log(`\nNotification ${index + 1}:`);
          console.log(`  Type: ${type}`);
          console.log(`  From: ${from}`);
          console.log(`  To: ${to}`);
          console.log(`  Timestamp: ${new Date(Number(timestamp)).toLocaleString()}`);
          console.log(`  Content: ${content || '(none)'}`);
        } catch (error: any) {
          console.error(`❌ Failed to process notification ${index + 1}:`, error.message);
        }
      });
    } else {
      console.log('📭 No notifications found');
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Open your app and check the notification bell');
    console.log('   2. You should see the test notifications');
    console.log('   3. Try interacting with posts to trigger real notifications');

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

testNotifications().catch(console.error);
