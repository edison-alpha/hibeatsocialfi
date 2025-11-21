// Test Typing Indicators - Cross-User Real-time
// This script tests typing indicators between multiple users

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem';
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

const RPC_URL = 'https://dream-rpc.somnia.network';
const TEST_POST_ID = 'typing_test_post_456';
const TEST_USER_A = '0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa';
const TEST_USER_B = '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB';
const TEST_USER_C = '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC';

async function testTypingIndicators() {
  console.log('⌨️  Testing Typing Indicators...\n');

  try {
    // Setup
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(RPC_URL),
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(RPC_URL),
    });

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });

    console.log('✅ SDK initialized');
    console.log(`📝 Publisher: ${account.address}\n`);

    // Get schema ID
    const liveSchema = 'uint64 timestamp, string postId, address userAddress, string action';
    const liveSchemaId = await sdk.streams.computeSchemaId(liveSchema);
    console.log(`🔑 Schema ID: ${liveSchemaId}\n`);

    const encoder = new SchemaEncoder(liveSchema);

    // Test 1: User A starts typing
    console.log('📤 Test 1: User A starts typing...');
    const typingId1 = keccak256(toBytes(`live_typing_${TEST_POST_ID}_${TEST_USER_A}_${Date.now()}`));
    const encodedData1 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_A, type: 'address' },
      { name: 'action', value: 'typing_start', type: 'string' }
    ]);

    const tx1 = await sdk.streams.set([{
      id: typingId1,
      schemaId: liveSchemaId,
      data: encodedData1
    }]);

    console.log(`✅ User A typing started! TX: ${tx1}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 2: User B starts typing
    console.log('\n📤 Test 2: User B starts typing...');
    const typingId2 = keccak256(toBytes(`live_typing_${TEST_POST_ID}_${TEST_USER_B}_${Date.now()}`));
    const encodedData2 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_B, type: 'address' },
      { name: 'action', value: 'typing_start', type: 'string' }
    ]);

    const tx2 = await sdk.streams.set([{
      id: typingId2,
      schemaId: liveSchemaId,
      data: encodedData2
    }]);

    console.log(`✅ User B typing started! TX: ${tx2}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 3: User C starts typing
    console.log('\n📤 Test 3: User C starts typing...');
    const typingId3 = keccak256(toBytes(`live_typing_${TEST_POST_ID}_${TEST_USER_C}_${Date.now()}`));
    const encodedData3 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_C, type: 'address' },
      { name: 'action', value: 'typing_start', type: 'string' }
    ]);

    const tx3 = await sdk.streams.set([{
      id: typingId3,
      schemaId: liveSchemaId,
      data: encodedData3
    }]);

    console.log(`✅ User C typing started! TX: ${tx3}`);
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Test 4: User A stops typing
    console.log('\n📤 Test 4: User A stops typing...');
    const stopId1 = keccak256(toBytes(`live_typing_stop_${TEST_POST_ID}_${TEST_USER_A}_${Date.now()}`));
    const stopData1 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_A, type: 'address' },
      { name: 'action', value: 'typing_stop', type: 'string' }
    ]);

    const tx4 = await sdk.streams.set([{
      id: stopId1,
      schemaId: liveSchemaId,
      data: stopData1
    }]);

    console.log(`✅ User A stopped typing! TX: ${tx4}`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 5: Read all typing data
    console.log('\n📥 Test 5: Reading typing indicators...');
    
    const allData = await sdk.streams.getAllPublisherDataForSchema(
      liveSchemaId,
      account.address
    );

    console.log(`📊 Found ${allData?.length || 0} total records`);
    
    if (allData && allData.length > 0) {
      // Helper to extract nested value
      const extractValue = (val: any): any => {
        if (val && typeof val === 'object' && 'value' in val) {
          return extractValue(val.value);
        }
        return val;
      };
      
      const typingEvents: Array<{
        timestamp: number;
        postId: string;
        userAddress: string;
        action: string;
      }> = [];
      
      for (const item of allData) {
        try {
          const itemAny = item as any;
          
          let timestampValue, postIdValue, userAddressValue, actionValue;
          
          if (itemAny.postId && itemAny.userAddress && itemAny.action) {
            timestampValue = itemAny.timestamp;
            postIdValue = itemAny.postId;
            userAddressValue = itemAny.userAddress;
            actionValue = itemAny.action;
          } else if (Array.isArray(itemAny)) {
            timestampValue = extractValue(itemAny.find((i: any) => i.name === 'timestamp')?.value);
            postIdValue = extractValue(itemAny.find((i: any) => i.name === 'postId')?.value);
            userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
            actionValue = extractValue(itemAny.find((i: any) => i.name === 'action')?.value);
          }
          
          if (postIdValue === TEST_POST_ID && 
              (actionValue === 'typing_start' || actionValue === 'typing_stop')) {
            typingEvents.push({
              timestamp: Number(timestampValue),
              postId: String(postIdValue),
              userAddress: String(userAddressValue),
              action: String(actionValue)
            });
          }
        } catch (error) {
          // Skip invalid records
        }
      }
      
      // Sort by timestamp
      typingEvents.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`\n✅ Typing Events for Post: ${TEST_POST_ID}`);
      console.log(`   Total events: ${typingEvents.length}\n`);
      
      typingEvents.forEach((event, index) => {
        const userShort = event.userAddress.slice(0, 10) + '...';
        const action = event.action === 'typing_start' ? '⌨️  START' : '🛑 STOP';
        console.log(`   ${index + 1}. ${action} - ${userShort}`);
      });
      
      // Calculate current typers based on last state
      const userLastAction = new Map<string, { action: string; timestamp: number }>();
      
      for (const event of typingEvents) {
        const userKey = event.userAddress.toLowerCase();
        const existing = userLastAction.get(userKey);
        
        if (!existing || event.timestamp > existing.timestamp) {
          userLastAction.set(userKey, {
            action: event.action,
            timestamp: event.timestamp
          });
        }
      }
      
      // Users are typing if their last action was typing_start
      const currentTypers = new Set<string>();
      for (const [user, state] of userLastAction.entries()) {
        if (state.action === 'typing_start') {
          currentTypers.add(user);
        }
      }
      
      console.log(`\n📊 Current Status:`);
      console.log(`   Active typers: ${currentTypers.size}`);
      if (currentTypers.size > 0) {
        console.log(`   Users: ${Array.from(currentTypers).map(u => u.slice(0, 10) + '...').join(', ')}`);
      }
      
      // Expected: User B and C should still be typing
      const expectedTypers = [TEST_USER_B.toLowerCase(), TEST_USER_C.toLowerCase()];
      const hasExpectedTypers = expectedTypers.every(u => currentTypers.has(u));
      
      if (hasExpectedTypers && currentTypers.size === 2) {
        console.log('\n🎉 SUCCESS! Typing indicators working correctly!');
        console.log('   ✅ User A stopped typing (not in active list)');
        console.log('   ✅ User B still typing');
        console.log('   ✅ User C still typing');
      } else {
        console.log('\n⚠️ WARNING: Unexpected typing state');
        console.log(`   Expected 2 typers (B and C), got ${currentTypers.size}`);
      }
    } else {
      console.log('❌ No data found!');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

testTypingIndicators();
