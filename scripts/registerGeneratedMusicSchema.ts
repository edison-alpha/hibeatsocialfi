/**
 * Register Generated Music Schema V1
 * 
 * Schema untuk backup lagu yang sudah digenerate
 * Berguna untuk recovery jika mint gagal
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env file manually
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Could not load .env file');
  }
}

loadEnv();

// Define Somnia testnet inline
const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-devnet.socialscan.io' },
  },
  testnet: true,
});

// Config inline
const SOMNIA_CONFIG = {
  rpcUrl: 'https://dream-rpc.somnia.network',
  wsUrl: 'wss://dream-rpc.somnia.network/ws',
  schemaString: 'uint256 id, uint256 timestamp, address owner, string taskId, string title, string audioUrl, string imageUrl, string prompt, string style, string lyrics, uint8 status',
};

async function registerGeneratedMusicSchema() {
  console.log('🚀 Starting Generated Music Schema Registration...\n');

  // Initialize clients
  const privateKey = process.env.VITE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('VITE_PRIVATE_KEY not found in environment');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('👤 Publisher:', account.address);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: webSocket(SOMNIA_CONFIG.wsUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: somniaTestnet,
    transport: http(SOMNIA_CONFIG.rpcUrl),
  });

  // Initialize SDK
  const sdk = new SDK({
    public: publicClient,
    wallet: walletClient,
  });

  console.log('✅ SDK initialized\n');

  // Schema definition
  const schemaString = SOMNIA_CONFIG.schemaString;
  console.log('📋 Schema String:', schemaString);
  console.log('');

  // Compute schema ID
  const computedSchemaId = await sdk.streams.computeSchemaId(schemaString);
  console.log('🔑 Computed Schema ID:', computedSchemaId);
  console.log('');

  // Check if already registered
  const isRegistered = await sdk.streams.isDataSchemaRegistered(computedSchemaId);
  if (isRegistered) {
    console.log('⚠️  Schema already registered!');
    console.log('✅ You can start using it immediately!');
    console.log('');
    console.log('📊 Schema Details:');
    console.log('   - Name: hibeats_generated_music_v1');
    console.log('   - Schema ID:', computedSchemaId);
    console.log('');
    return;
  }

  // Register schema
  console.log('📝 Registering schema...');
  try {
    const { zeroBytes32 } = await import('@somnia-chain/streams');
    
    const txHash = await sdk.streams.registerDataSchemas([{
      id: 'hibeats_generated_music_v1',
      schema: schemaString,
      parentSchemaId: zeroBytes32 // root schema
    }], true); // ignore if already registered
    
    console.log('✅ Schema registered successfully!');
    console.log('📦 Transaction Hash:', txHash);
    console.log('');

    // Wait a bit for blockchain confirmation
    console.log('⏳ Waiting for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for confirmation
    console.log('⏳ Waiting for blockchain confirmation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('✅ Schema registered and ready to use!');
    console.log('');

    console.log('🎉 Generated Music Schema V1 is ready to use!');
    console.log('');
    console.log('📊 Schema Details:');
    console.log('   - Name: hibeats_generated_music_v1');
    console.log('   - Schema ID:', computedSchemaId);
    console.log('   - Fields: 11 (id, timestamp, owner, taskId, title, audioUrl, imageUrl, prompt, style, lyrics, status)');
    console.log('   - Purpose: Backup generated music for failed mint recovery');
    console.log('');
    console.log('💡 Usage:');
    console.log('   - Save music after generation: somniaDatastreamServiceV3.saveGeneratedMusic(musicData)');
    console.log('   - Get unminted music: somniaDatastreamServiceV3.getUnmintedMusic()');
    console.log('   - Update status after mint: somniaDatastreamServiceV3.updateMusicStatus(musicId, status, musicData)');

  } catch (error: any) {
    if (error.message?.includes('AlreadyRegistered') || error.message?.includes('SchemaAlreadyRegistered')) {
      console.log('⚠️  Schema already registered!');
      console.log('✅ You can start using it immediately!');
      console.log('');
    } else {
      console.error('❌ Failed to register schema:', error.message);
      throw error;
    }
  }
}

// Run registration
registerGeneratedMusicSchema()
  .then(() => {
    console.log('\n✅ Registration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Registration failed:', error);
    process.exit(1);
  });
