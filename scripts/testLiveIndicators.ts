// Test Live Indicators - Write and Read
// This script tests if live indicators are being written and read correctly

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
const TEST_POST_ID = 'test_post_123';
const TEST_USER_A = '0x1111111111111111111111111111111111111111';
const TEST_USER_B = '0x2222222222222222222222222222222222222222';

async function testLiveIndicators() {
  console.log('🧪 Testing Live Indicators...\n');

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

    // Test 1: Write view from User A
    console.log('📤 Test 1: Writing view from User A...');
    const encoder = new SchemaEncoder(liveSchema);
    
    const viewId1 = keccak256(toBytes(`live_view_${TEST_POST_ID}_${TEST_USER_A}_${Date.now()}`));
    const encodedData1 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_A, type: 'address' },
      { name: 'action', value: 'view', type: 'string' }
    ]);

    const tx1 = await sdk.streams.set([{
      id: viewId1,
      schemaId: liveSchemaId,
      data: encodedData1
    }]);

    console.log(`✅ View written! TX: ${tx1}`);

    // Wait a bit for blockchain
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Write view from User B
    console.log('\n📤 Test 2: Writing view from User B...');
    
    const viewId2 = keccak256(toBytes(`live_view_${TEST_POST_ID}_${TEST_USER_B}_${Date.now()}`));
    const encodedData2 = encoder.encodeData([
      { name: 'timestamp', value: Date.now().toString(), type: 'uint64' },
      { name: 'postId', value: TEST_POST_ID, type: 'string' },
      { name: 'userAddress', value: TEST_USER_B, type: 'address' },
      { name: 'action', value: 'view', type: 'string' }
    ]);

    const tx2 = await sdk.streams.set([{
      id: viewId2,
      schemaId: liveSchemaId,
      data: encodedData2
    }]);

    console.log(`✅ View written! TX: ${tx2}`);

    // Wait for blockchain
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Read all data
    console.log('\n📥 Test 3: Reading all data from publisher...');
    
    const allData = await sdk.streams.getAllPublisherDataForSchema(
      liveSchemaId,
      account.address
    );

    console.log(`📊 Found ${allData?.length || 0} total records`);
    
    if (allData && allData.length > 0) {
      // Skip sample data logging
      
      // Filter for test post
      let viewCount = 0;
      const uniqueViewers = new Set<string>();
      
      for (const item of allData) {
        try {
          const itemAny = item as any;
          
          // Helper to extract nested value
          const extractValue = (val: any): any => {
            if (val && typeof val === 'object' && 'value' in val) {
              return extractValue(val.value);
            }
            return val;
          };
          
          let postIdValue, userAddressValue, actionValue;
          
          if (itemAny.postId && itemAny.userAddress && itemAny.action) {
            postIdValue = itemAny.postId;
            userAddressValue = itemAny.userAddress;
            actionValue = itemAny.action;
          } else if (Array.isArray(itemAny)) {
            postIdValue = extractValue(itemAny.find((i: any) => i.name === 'postId')?.value);
            userAddressValue = extractValue(itemAny.find((i: any) => i.name === 'userAddress')?.value);
            actionValue = extractValue(itemAny.find((i: any) => i.name === 'action')?.value);
          }
          
          if (postIdValue === TEST_POST_ID && actionValue === 'view') {
            uniqueViewers.add(String(userAddressValue).toLowerCase());
            viewCount++;
          }
        } catch (error) {
          console.warn('⚠️ Failed to parse record:', error);
        }
      }
      
      console.log(`\n✅ Test Results:`);
      console.log(`   Post ID: ${TEST_POST_ID}`);
      console.log(`   Total view records: ${viewCount}`);
      console.log(`   Unique viewers: ${uniqueViewers.size}`);
      console.log(`   Viewers: ${Array.from(uniqueViewers).map(v => v.slice(0, 10) + '...').join(', ')}`);
      
      if (uniqueViewers.size === 2) {
        console.log('\n🎉 SUCCESS! Live indicators working correctly!');
      } else {
        console.log('\n⚠️ WARNING: Expected 2 unique viewers, got', uniqueViewers.size);
      }
    } else {
      console.log('❌ No data found! Check if writes succeeded.');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error);
    process.exit(1);
  }
}

testLiveIndicators();
