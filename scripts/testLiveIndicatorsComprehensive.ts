// Comprehensive Live Indicators Test
// Tests both view counts and typing indicators in a realistic scenario

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
const TEST_POST_ID = 'comprehensive_test_789';

// Simulate 5 different users
const USERS = [
  { address: '0x1111111111111111111111111111111111111111', name: 'Alice' },
  { address: '0x2222222222222222222222222222222222222222', name: 'Bob' },
  { address: '0x3333333333333333333333333333333333333333', name: 'Charlie' },
  { address: '0x4444444444444444444444444444444444444444', name: 'Diana' },
  { address: '0x5555555555555555555555555555555555555555', name: 'Eve' }
];

async function comprehensiveTest() {
  console.log('🧪 Comprehensive Live Indicators Test\n');
  console.log('📝 Scenario: 5 users interact with a post');
  console.log('   - All users view the post');
  console.log('   - 3 users start typing');
  console.log('   - 1 user stops typing');
  console.log('   - Verify final state\n');

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

    const liveSchema = 'uint64 timestamp, string postId, address userAddress, string action';
    const liveSchemaId = await sdk.streams.computeSchemaId(liveSchema);
    const encoder = new SchemaEncoder(liveSchema);

    console.log('═══════════════════════════════════════════════════');
    console.log('PHASE 1: All users view the post');
    console.log('═══════════════════════════════════════════════════\n');

    for (const user of USERS) {
      const viewId = keccak256(toBytes(`view_${TEST_POST_ID}_${user.address}_${Date.now()}`));
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: user.address, type: 'address' },
        { name: 'action', value: 'view', type: 'string' }
      ]);

      await sdk.streams.set([{
        id: viewId,
        schemaId: liveSchemaId,
        data: encodedData
      }]);

      console.log(`👁️  ${user.name} viewed the post`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 2: Alice, Bob, and Charlie start typing');
    console.log('═══════════════════════════════════════════════════\n');

    for (let i = 0; i < 3; i++) {
      const user = USERS[i];
      const typingId = keccak256(toBytes(`typing_${TEST_POST_ID}_${user.address}_${Date.now()}`));
      const encodedData = encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: user.address, type: 'address' },
        { name: 'action', value: 'typing_start', type: 'string' }
      ]);

      await sdk.streams.set([{
        id: typingId,
        schemaId: liveSchemaId,
        data: encodedData
      }]);

      console.log(`⌨️  ${user.name} started typing...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 3: Alice stops typing');
    console.log('═══════════════════════════════════════════════════\n');

    const stopId = keccak256(toBytes(`typing_stop_${TEST_POST_ID}_${USERS[0].address}_${Date.now()}`));
    const stopData = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: USERS[0].address, type: 'address' },
      { name: 'action', value: 'typing_stop', type: 'string' }
    ]);

    await sdk.streams.set([{
      id: stopId,
      schemaId: liveSchemaId,
      data: stopData
    }]);

    console.log(`🛑 ${USERS[0].name} stopped typing`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('PHASE 4: Reading and verifying data');
    console.log('═══════════════════════════════════════════════════\n');

    const allData = await sdk.streams.getAllPublisherDataForSchema(
      liveSchemaId,
      account.address
    );

    console.log(`📊 Total records in blockchain: ${allData?.length || 0}\n`);

    if (!allData || allData.length === 0) {
      console.log('❌ No data found!');
      return;
    }

    // Helper to extract nested value
    const extractValue = (val: any): any => {
      if (val && typeof val === 'object' && 'value' in val) {
        return extractValue(val.value);
      }
      return val;
    };

    // Parse all events for this post
    const viewEvents: string[] = [];
    const typingEvents: Array<{ user: string; action: string; timestamp: number }> = [];

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
        
        if (postIdValue === TEST_POST_ID) {
          if (actionValue === 'view') {
            viewEvents.push(String(userAddressValue).toLowerCase());
          } else if (actionValue === 'typing_start' || actionValue === 'typing_stop') {
            typingEvents.push({
              user: String(userAddressValue).toLowerCase(),
              action: String(actionValue),
              timestamp: Number(timestampValue)
            });
          }
        }
      } catch (error) {
        // Skip invalid records
      }
    }

    // Calculate unique viewers
    const uniqueViewers = new Set(viewEvents);

    // Calculate current typers
    const userLastAction = new Map<string, { action: string; timestamp: number }>();
    
    for (const event of typingEvents) {
      const existing = userLastAction.get(event.user);
      
      if (!existing || event.timestamp > existing.timestamp) {
        userLastAction.set(event.user, {
          action: event.action,
          timestamp: event.timestamp
        });
      }
    }
    
    const currentTypers = new Set<string>();
    for (const [user, state] of userLastAction.entries()) {
      if (state.action === 'typing_start') {
        currentTypers.add(user);
      }
    }

    // Display results
    console.log('📊 RESULTS:');
    console.log('─────────────────────────────────────────────────\n');
    
    console.log('👁️  VIEW COUNTS:');
    console.log(`   Total views: ${viewEvents.length}`);
    console.log(`   Unique viewers: ${uniqueViewers.size}`);
    
    const viewerNames = USERS
      .filter(u => uniqueViewers.has(u.address.toLowerCase()))
      .map(u => u.name);
    console.log(`   Viewers: ${viewerNames.join(', ')}\n`);

    console.log('⌨️  TYPING INDICATORS:');
    console.log(`   Currently typing: ${currentTypers.size}`);
    
    const typerNames = USERS
      .filter(u => currentTypers.has(u.address.toLowerCase()))
      .map(u => u.name);
    console.log(`   Users: ${typerNames.join(', ')}\n`);

    // Verify expectations
    console.log('✅ VERIFICATION:');
    console.log('─────────────────────────────────────────────────\n');

    let allPassed = true;

    if (uniqueViewers.size === 5) {
      console.log('   ✅ All 5 users viewed the post');
    } else {
      console.log(`   ❌ Expected 5 viewers, got ${uniqueViewers.size}`);
      allPassed = false;
    }

    if (currentTypers.size === 2) {
      console.log('   ✅ 2 users currently typing (Bob and Charlie)');
    } else {
      console.log(`   ❌ Expected 2 typers, got ${currentTypers.size}`);
      allPassed = false;
    }

    const bobTyping = currentTypers.has(USERS[1].address.toLowerCase());
    const charlieTyping = currentTypers.has(USERS[2].address.toLowerCase());
    const aliceNotTyping = !currentTypers.has(USERS[0].address.toLowerCase());

    if (bobTyping && charlieTyping && aliceNotTyping) {
      console.log('   ✅ Correct users are typing');
    } else {
      console.log('   ❌ Wrong users in typing state');
      allPassed = false;
    }

    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED! Live indicators working perfectly!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the results above.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

comprehensiveTest();
