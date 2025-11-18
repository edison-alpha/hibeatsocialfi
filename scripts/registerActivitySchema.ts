/**
 * Register Activity History Schema to Somnia DataStream
 * 
 * Schema: hibeats_activity_history_v1
 * Fields: 10 (id, timestamp, user, activityType, title, description, targetId, targetAddress, txHash, metadata)
 */

import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from '../src/lib/web3-config';
import { SOMNIA_CONFIG_V3 } from '../src/config/somniaDataStreams.v3';

async function registerActivitySchema() {
  console.log('🚀 Registering Activity History Schema...\n');

  // Initialize clients
  const privateKey = process.env.VITE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VITE_PRIVATE_KEY not found in environment');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('📍 Publisher:', account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(SOMNIA_CONFIG_V3.rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(SOMNIA_CONFIG_V3.rpcUrl),
  });

  // Initialize SDK
  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Schema details
  const schemaName = SOMNIA_CONFIG_V3.schemas.activityHistory;
  const schemaString = SOMNIA_CONFIG_V3.schemaStrings.activityHistory;

  console.log('📋 Schema Details:');
  console.log('   Name:', schemaName);
  console.log('   Fields:', schemaString);
  console.log('');

  try {
    // Compute schema ID
    const computedSchemaId = await sdk.streams.computeSchemaId(schemaString);
    console.log('🔑 Computed Schema ID:', computedSchemaId);

    // Check if schema already exists
    try {
      const existingSchema = await sdk.streams.getSchema(computedSchemaId);
      console.log('⚠️  Schema already exists!');
      console.log('   Schema ID:', computedSchemaId);
      console.log('   Schema:', existingSchema);
      console.log('\n✅ No registration needed - schema is already active');
      return;
    } catch (error: any) {
      if (error.message?.includes('NoData()')) {
        console.log('✅ Schema does not exist yet, proceeding with registration...\n');
      } else {
        throw error;
      }
    }

    // Register schema
    console.log('📤 Registering schema to blockchain...');
    const txHash = await sdk.streams.registerSchema(schemaName, schemaString);
    console.log('✅ Schema registered!');
    console.log('   Transaction:', txHash);
    console.log('   Schema ID:', computedSchemaId);

    // Wait for confirmation
    console.log('\n⏳ Waiting for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify registration
    console.log('🔍 Verifying registration...');
    const registeredSchema = await sdk.streams.getSchema(computedSchemaId);
    console.log('✅ Schema verified!');
    console.log('   Schema:', registeredSchema);

    console.log('\n🎉 Activity History Schema registration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Use somniaDatastreamServiceV3.recordActivity() to record activities');
    console.log('   2. Use somniaDatastreamServiceV3.getUserActivities() to fetch activities');
    console.log('   3. Use somniaDatastreamServiceV3.getRecentActivities() for global feed');

  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
}

// Run registration
registerActivitySchema()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
