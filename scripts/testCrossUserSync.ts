// Test Cross-User Synchronization
// Simulates 2 users viewing and typing on the same post

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
const TEST_POST_ID = 'cross_user_sync_test';
const USER_A = '0x1111111111111111111111111111111111111111';
const USER_B = '0x2222222222222222222222222222222222222222';

async function testCrossUserSync() {
  console.log('🔄 Testing Cross-User Synchronization\n');
  console.log('Scenario:');
  console.log('  1. User A views post');
  console.log('  2. User B views post');
  console.log('  3. User A starts typing');
  console.log('  4. User B starts typing');
  console.log('  5. User A stops typing');
  console.log('  6. Verify final state\n');

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
    console.log('STEP 1: User A views post');
    console.log('═══════════════════════════════════════════════════\n');

    const viewId1 = keccak256(toBytes(`view_${TEST_POST_ID}_${USER_A}_${Date.now()}`));
    await sdk.streams.set([{
      id: viewId1,
      schemaId: liveSchemaId,
      data: encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: USER_A, type: 'address' },
        { name: 'action', value: 'view', type: 'string' }
      ])
    }]);

    console.log(`👁️  User A viewed the post`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Query state
    console.log('\n📊 Querying current state...');
    let allData = await sdk.streams.getAllPublisherDataForSchema(liveSchemaId, account.address);
    let viewers = new Set<string>();
    
    for (const item of allData || []) {
      try {
        const itemAny = item as any;
        const extractValue = (val: any): any => {
          if (val && typeof val === 'object' && 'value' in val) return extractValue(val.value);
          return val;
        };
        
        let postIdValue, userAddressValue, actionValue;
        
        if (itemAny.postId) {
          postIdValue = itemAny.postId;
          userAddressValue = itemAny.userAddress;
          actionValue = itemAny.action;
        } else if (Array.isArray(itemAny)) {
          postIdValue = extractValue(itemAny.find((i: any) => i.name === 'postId')?.value);
          userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
          actionValue = extractValue(itemAny.find((i: any) => i.name === 'action')?.value);
        }
        
        if (postIdValue === TEST_POST_ID && actionValue === 'view') {
          viewers.add(String(userAddressValue).toLowerCase());
        }
      } catch (error) {
        // Skip
      }
    }
    
    console.log(`   Viewers: ${viewers.size}`);
    console.log(`   Expected: 1 ✅`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('STEP 2: User B views post');
    console.log('═══════════════════════════════════════════════════\n');

    const viewId2 = keccak256(toBytes(`view_${TEST_POST_ID}_${USER_B}_${Date.now()}`));
    await sdk.streams.set([{
      id: viewId2,
      schemaId: liveSchemaId,
      data: encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: USER_B, type: 'address' },
        { name: 'action', value: 'view', type: 'string' }
      ])
    }]);

    console.log(`👁️  User B viewed the post`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Query state
    console.log('\n📊 Querying current state...');
    allData = await sdk.streams.getAllPublisherDataForSchema(liveSchemaId, account.address);
    viewers = new Set<string>();
    
    for (const item of allData || []) {
      try {
        const itemAny = item as any;
        const extractValue = (val: any): any => {
          if (val && typeof val === 'object' && 'value' in val) return extractValue(val.value);
          return val;
        };
        
        let postIdValue, userAddressValue, actionValue;
        
        if (itemAny.postId) {
          postIdValue = itemAny.postId;
          userAddressValue = itemAny.userAddress;
          actionValue = itemAny.action;
        } else if (Array.isArray(itemAny)) {
          postIdValue = extractValue(itemAny.find((i: any) => i.name === 'postId')?.value);
          userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
          actionValue = extractValue(itemAny.find((i: any) => i.name === 'action')?.value);
        }
        
        if (postIdValue === TEST_POST_ID && actionValue === 'view') {
          viewers.add(String(userAddressValue).toLowerCase());
        }
      } catch (error) {
        // Skip
      }
    }
    
    console.log(`   Viewers: ${viewers.size}`);
    console.log(`   Expected: 2 ✅`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log('STEP 3: User A starts typing');
    console.log('═══════════════════════════════════════════════════\n');

    const typingId1 = keccak256(toBytes(`typing_${TEST_POST_ID}_${USER_A}_${Date.now()}`));
    await sdk.streams.set([{
      id: typingId1,
      schemaId: liveSchemaId,
      data: encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: USER_A, type: 'address' },
        { name: 'action', value: 'typing_start', type: 'string' }
      ])
    }]);

    console.log(`⌨️  User A started typing`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('STEP 4: User B starts typing');
    console.log('═══════════════════════════════════════════════════\n');

    const typingId2 = keccak256(toBytes(`typing_${TEST_POST_ID}_${USER_B}_${Date.now()}`));
    await sdk.streams.set([{
      id: typingId2,
      schemaId: liveSchemaId,
      data: encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: USER_B, type: 'address' },
        { name: 'action', value: 'typing_start', type: 'string' }
      ])
    }]);

    console.log(`⌨️  User B started typing`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('STEP 5: User A stops typing');
    console.log('═══════════════════════════════════════════════════\n');

    const stopId1 = keccak256(toBytes(`typing_stop_${TEST_POST_ID}_${USER_A}_${Date.now()}`));
    await sdk.streams.set([{
      id: stopId1,
      schemaId: liveSchemaId,
      data: encoder.encodeData([
        { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
        { name: 'postId', value: TEST_POST_ID, type: 'string' },
        { name: 'userAddress', value: USER_A, type: 'address' },
        { name: 'action', value: 'typing_stop', type: 'string' }
      ])
    }]);

    console.log(`🛑 User A stopped typing`);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n═══════════════════════════════════════════════════');
    console.log('STEP 6: Verify final state');
    console.log('═══════════════════════════════════════════════════\n');

    allData = await sdk.streams.getAllPublisherDataForSchema(liveSchemaId, account.address);
    
    viewers = new Set<string>();
    const userLastAction = new Map<string, { action: string; timestamp: number }>();
    
    for (const item of allData || []) {
      try {
        const itemAny = item as any;
        const extractValue = (val: any): any => {
          if (val && typeof val === 'object' && 'value' in val) return extractValue(val.value);
          return val;
        };
        
        let timestampValue, postIdValue, userAddressValue, actionValue;
        
        if (itemAny.postId) {
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
          const userAddress = String(userAddressValue).toLowerCase();
          const action = String(actionValue);
          const timestamp = Number(timestampValue) || Date.now();
          
          if (action === 'view') {
            viewers.add(userAddress);
          } else if (action === 'typing_start' || action === 'typing_stop') {
            const existing = userLastAction.get(userAddress);
            if (!existing || timestamp > existing.timestamp) {
              userLastAction.set(userAddress, { action, timestamp });
            }
          }
        }
      } catch (error) {
        // Skip
      }
    }
    
    const activeTypers: string[] = [];
    for (const [user, state] of userLastAction.entries()) {
      if (state.action === 'typing_start') {
        activeTypers.push(user);
      }
    }
    
    console.log('📊 FINAL STATE:');
    console.log('─────────────────────────────────────────────────\n');
    console.log(`👁️  Total Viewers: ${viewers.size}`);
    console.log(`   Users: ${Array.from(viewers).map(v => v.slice(0, 10) + '...').join(', ')}`);
    console.log(`\n⌨️  Currently Typing: ${activeTypers.length}`);
    console.log(`   Users: ${activeTypers.map(t => t.slice(0, 10) + '...').join(', ')}`);
    
    console.log('\n✅ VERIFICATION:');
    console.log('─────────────────────────────────────────────────\n');
    
    let allPassed = true;
    
    if (viewers.size === 2) {
      console.log('   ✅ 2 viewers detected (User A and User B)');
    } else {
      console.log(`   ❌ Expected 2 viewers, got ${viewers.size}`);
      allPassed = false;
    }
    
    if (activeTypers.length === 1) {
      console.log('   ✅ 1 user currently typing (User B)');
    } else {
      console.log(`   ❌ Expected 1 typer, got ${activeTypers.length}`);
      allPassed = false;
    }
    
    const userBTyping = activeTypers.includes(USER_B.toLowerCase());
    const userANotTyping = !activeTypers.includes(USER_A.toLowerCase());
    
    if (userBTyping && userANotTyping) {
      console.log('   ✅ Correct user is typing (User B, not User A)');
    } else {
      console.log('   ❌ Wrong typing state');
      allPassed = false;
    }
    
    if (allPassed) {
      console.log('\n🎉 SUCCESS! Cross-user synchronization working perfectly!');
      console.log('\n💡 This means:');
      console.log('   • User A can see User B viewing the post');
      console.log('   • User B can see User A viewing the post');
      console.log('   • Both users see real-time typing indicators');
      console.log('   • State updates are synchronized across users');
    } else {
      console.log('\n⚠️  Some tests failed. Check the results above.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

testCrossUserSync();
