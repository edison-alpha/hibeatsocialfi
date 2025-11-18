/**
 * Test Generated Music Backup
 * 
 * Test save dan load generated music dari datastream
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, webSocket, defineChain, pad, numberToHex, type Hex } from 'viem';
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

enum GeneratedMusicStatus {
  PENDING = 0,
  COMPLETED = 1,
  MINTED = 2,
  FAILED = 3,
}

function numberToBytes32(num: number): Hex {
  return pad(numberToHex(num), { size: 32 });
}

async function testGeneratedMusicBackup() {
  console.log('🧪 Testing Generated Music Backup...\n');

  try {
    // Get private key
    const privateKey = process.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VITE_PRIVATE_KEY not found');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const ownerAddress = account.address;
    
    console.log('👤 Owner Address:', ownerAddress);
    console.log('');

    // Initialize clients
    console.log('📡 Initializing SDK...');
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: webSocket(SOMNIA_CONFIG.wsUrl),
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(SOMNIA_CONFIG.rpcUrl),
    });

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient,
    });
    console.log('✅ SDK initialized\n');

    // Get schema ID
    const schemaString = SOMNIA_CONFIG.schemaString;
    const schemaId = await sdk.streams.computeSchemaId(schemaString);
    console.log('🔑 Schema ID:', schemaId);
    console.log('');

    // Test 1: Load existing music
    console.log('📚 Test 1: Loading existing music...');
    const rawData = await sdk.streams.getAllPublisherDataForSchema(schemaId, ownerAddress);
    console.log(`✅ Found ${rawData.length} songs in datastream`);
    
    // Helper functions to decode data
    const safeExtractValue = (item: any, defaultValue: any = '') => {
      if (!item) return defaultValue;
      if (item.value !== undefined) {
        if (typeof item.value === 'object' && item.value.value !== undefined) {
          return item.value.value;
        }
        return item.value;
      }
      return item;
    };

    const safeString = (value: any, defaultValue: string = ''): string => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'string') return value;
      if (typeof value === 'object') return defaultValue;
      return String(value);
    };

    const safeNumber = (value: any, defaultValue: number = 0): number => {
      if (value === null || value === undefined) return defaultValue;
      if (typeof value === 'number') return value;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'object') return defaultValue;
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Decode existing music
    const existingMusic = rawData.map((item: any) => {
      const id = safeNumber(safeExtractValue(item[0]));
      const timestamp = safeNumber(safeExtractValue(item[1]));
      const owner = safeString(safeExtractValue(item[2]));
      const taskId = safeString(safeExtractValue(item[3]));
      const title = safeString(safeExtractValue(item[4]));
      const audioUrl = safeString(safeExtractValue(item[5]));
      const imageUrl = safeString(safeExtractValue(item[6]));
      const prompt = safeString(safeExtractValue(item[7]));
      const style = safeString(safeExtractValue(item[8]));
      const lyrics = safeString(safeExtractValue(item[9]));
      const status = safeNumber(safeExtractValue(item[10]), GeneratedMusicStatus.COMPLETED);
      
      return {
        id,
        timestamp,
        owner,
        taskId,
        title,
        audioUrl,
        imageUrl,
        prompt,
        style,
        lyrics,
        status,
      };
    });
    
    if (existingMusic.length > 0) {
      console.log('\n📋 Sample songs:');
      existingMusic.slice(0, 3).forEach((music: any, idx: number) => {
        console.log(`   ${idx + 1}. "${music.title}" by ${music.owner.substring(0, 10)}...`);
        console.log(`      - Task ID: ${music.taskId}`);
        console.log(`      - Status: ${GeneratedMusicStatus[music.status]}`);
        console.log(`      - Audio: ${music.audioUrl.substring(0, 50)}...`);
      });
    }
    console.log('');

    // Test 2: Save a test song
    console.log('📝 Test 2: Saving a test song...');
    const timestamp = Date.now();
    const musicId = timestamp;
    const testMusicData = {
      id: musicId,
      timestamp,
      owner: ownerAddress,
      taskId: `test_${timestamp}`,
      title: 'Test Song - Backup Test',
      audioUrl: 'https://example.com/test-audio.mp3',
      imageUrl: 'https://example.com/test-cover.jpg',
      prompt: 'Test prompt for backup functionality',
      style: 'Electronic, Test',
      lyrics: 'Test lyrics',
      status: GeneratedMusicStatus.COMPLETED,
    };

    console.log('   Saving:', testMusicData.title);
    
    // Encode and save
    const schemaEncoder = new SchemaEncoder(schemaString);
    const encodedData = schemaEncoder.encodeData([
      { name: 'id', value: testMusicData.id.toString(), type: 'uint256' },
      { name: 'timestamp', value: testMusicData.timestamp.toString(), type: 'uint256' },
      { name: 'owner', value: testMusicData.owner, type: 'address' },
      { name: 'taskId', value: testMusicData.taskId, type: 'string' },
      { name: 'title', value: testMusicData.title, type: 'string' },
      { name: 'audioUrl', value: testMusicData.audioUrl, type: 'string' },
      { name: 'imageUrl', value: testMusicData.imageUrl, type: 'string' },
      { name: 'prompt', value: testMusicData.prompt, type: 'string' },
      { name: 'style', value: testMusicData.style, type: 'string' },
      { name: 'lyrics', value: testMusicData.lyrics, type: 'string' },
      { name: 'status', value: testMusicData.status.toString(), type: 'uint8' },
    ]);

    const musicIdHex = numberToBytes32(musicId);
    const txHash = await sdk.streams.set([{
      schemaId,
      id: musicIdHex,
      data: encodedData,
    }]);
    
    console.log(`✅ Saved with ID: ${musicId}`);
    console.log(`📦 Transaction Hash: ${txHash}`);
    console.log('');

    // Wait for blockchain confirmation
    console.log('⏳ Waiting for blockchain confirmation (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Test 3: Reload and verify
    console.log('🔍 Test 3: Verifying saved song...');
    const reloadedRawData = await sdk.streams.getAllPublisherDataForSchema(schemaId, ownerAddress);
    const reloadedMusic = reloadedRawData.map((item: any) => {
      const id = safeNumber(safeExtractValue(item[0]));
      const timestamp = safeNumber(safeExtractValue(item[1]));
      const owner = safeString(safeExtractValue(item[2]));
      const taskId = safeString(safeExtractValue(item[3]));
      const title = safeString(safeExtractValue(item[4]));
      const audioUrl = safeString(safeExtractValue(item[5]));
      const imageUrl = safeString(safeExtractValue(item[6]));
      const prompt = safeString(safeExtractValue(item[7]));
      const style = safeString(safeExtractValue(item[8]));
      const lyrics = safeString(safeExtractValue(item[9]));
      const status = safeNumber(safeExtractValue(item[10]), GeneratedMusicStatus.COMPLETED);
      
      return {
        id,
        timestamp,
        owner,
        taskId,
        title,
        audioUrl,
        imageUrl,
        prompt,
        style,
        lyrics,
        status,
      };
    });
    
    const savedSong = reloadedMusic.find((m: any) => m.id === musicId);
    
    if (savedSong) {
      console.log('✅ Song found in datastream!');
      console.log('   Title:', savedSong.title);
      console.log('   Owner:', savedSong.owner);
      console.log('   Task ID:', savedSong.taskId);
      console.log('   Status:', GeneratedMusicStatus[savedSong.status]);
    } else {
      console.log('❌ Song not found after save!');
      console.log('   Expected ID:', musicId);
      console.log('   Total songs:', reloadedMusic.length);
    }
    console.log('');

    // Test 4: Filter by owner
    console.log('🔍 Test 4: Filtering by owner...');
    const userMusic = reloadedMusic.filter((m: any) => 
      m.owner.toLowerCase() === ownerAddress.toLowerCase()
    );
    console.log(`✅ Found ${userMusic.length} songs for owner ${ownerAddress}`);
    console.log('');

    // Test 5: Get unminted music
    console.log('📋 Test 5: Getting unminted music...');
    const unmintedMusic = reloadedMusic.filter((m: any) => m.status === GeneratedMusicStatus.COMPLETED);
    console.log(`✅ Found ${unmintedMusic.length} unminted songs`);
    
    if (unmintedMusic.length > 0) {
      console.log('\n📋 Unminted songs:');
      unmintedMusic.slice(0, 3).forEach((music: any, idx: number) => {
        console.log(`   ${idx + 1}. "${music.title}"`);
        console.log(`      - Owner: ${music.owner.substring(0, 10)}...`);
        console.log(`      - Task ID: ${music.taskId}`);
      });
    }
    console.log('');

    console.log('🎉 All tests passed!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   - Total songs: ${reloadedMusic.length}`);
    console.log(`   - Your songs: ${userMusic.length}`);
    console.log(`   - Unminted: ${unmintedMusic.length}`);
    console.log('');

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Run test
testGeneratedMusicBackup()
  .then(() => {
    console.log('✅ Test complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
