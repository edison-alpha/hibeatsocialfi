// Register BeatsXP Schemas to Somnia DataStream
// Run: npm run register:bxp

import { ethers } from 'ethers';
import { BXP_SCHEMAS } from '../src/config/somniaDataStreams.bxp';

const SOMNIA_RPC = process.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
const PRIVATE_KEY = process.env.VITE_PRIVATE_KEY;
const REGISTRY_ADDRESS = '0x...'; // TODO: Add Somnia Schema Registry address

async function registerSchemas() {
  if (!PRIVATE_KEY) {
    console.error('❌ VITE_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  console.log('🚀 Starting BeatsXP Schema Registration...\n');

  const provider = new ethers.JsonRpcProvider(SOMNIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`📝 Using wallet: ${wallet.address}`);
  console.log(`🌐 Network: ${SOMNIA_RPC}\n`);

  // Registry ABI (simplified)
  const registryABI = [
    'function registerSchema(string memory name, string memory schemaDefinition) external returns (bytes32)',
    'function getSchema(bytes32 schemaId) external view returns (string memory)',
  ];

  const registry = new ethers.Contract(REGISTRY_ADDRESS, registryABI, wallet);

  const results: Record<string, { schemaId: string; txHash: string }> = {};

  // Register each schema
  for (const [key, schemaConfig] of Object.entries(BXP_SCHEMAS)) {
    try {
      console.log(`📋 Registering ${schemaConfig.name}...`);
      console.log(`   Description: ${schemaConfig.description}`);

      // Convert schema to string format
      const schemaDefinition = JSON.stringify(schemaConfig.schema);

      // Register schema
      const tx = await registry.registerSchema(schemaConfig.name, schemaDefinition);
      console.log(`   ⏳ Transaction sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`   ✅ Transaction confirmed!`);

      // Get schema ID from event logs
      const schemaId = receipt.logs[0]?.topics[1] || 'unknown';

      results[key] = {
        schemaId,
        txHash: tx.hash,
      };

      console.log(`   🆔 Schema ID: ${schemaId}\n`);
    } catch (error: any) {
      console.error(`   ❌ Error registering ${schemaConfig.name}:`, error.message);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 REGISTRATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  for (const [key, result] of Object.entries(results)) {
    console.log(`${key}:`);
    console.log(`  Schema ID: ${result.schemaId}`);
    console.log(`  TX Hash: ${result.txHash}\n`);
  }

  console.log('✅ All schemas registered successfully!');
  console.log('\n📝 Update src/config/somniaDataStreams.bxp.ts with these Schema IDs:');
  console.log('\nexport const BXP_SCHEMA_IDS: Record<string, string> = {');
  for (const [key, result] of Object.entries(results)) {
    console.log(`  ${key}: '${result.schemaId}',`);
  }
  console.log('};\n');
}

registerSchemas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
