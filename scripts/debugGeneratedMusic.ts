/**
 * Debug Generated Music
 * 
 * Script untuk debug dan verify generated music di blockchain
 */

import { SDK } from '@somnia-chain/streams';
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

enum GeneratedMusicStatus {
  PENDING = 0,
  COMPLETED = 1,
  MINTED = 2,
  FAILED = 3,
}

async function debugGeneratedMusic() {
  console.log('🔍 Debugging Generated Music...\n');

  try {
    // Get private key
    const privateKey = process.env.VITE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('VITE_PRIVATE_KEY not found');
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const publisherAddress = account.address;
    
    console.log('👤 Publisher Address (Private Key):', publisherAddress);
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

    // Load all music from blockchain
    console.log('📚 Loading all music from blockchain...');
    const rawData = await sdk.streams.getAllPublisherDataForSchema(schemaId, publisherAddress);
    console.log(`✅ Found ${rawData.length} songs in blockchain\n`);

    if (rawData.length === 0) {
      console.log('📭 No music found in blockchain');
      return;
    }

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

    // Decode all music
    const allMusic = rawData.map((item: any) => {
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

    // Sort by timestamp (newest first)
    allMusic.sort((a, b) => b.timestamp - a.timestamp);

    // Group by owner
    const byOwner = new Map<string, any[]>();
    allMusic.forEach(music => {
      const owner = music.owner.toLowerCase();
      if (!byOwner.has(owner)) {
        byOwner.set(owner, []);
      }
      byOwner.get(owner)!.push(music);
    });

    console.log('📊 Summary by Owner:\n');
    for (const [owner, songs] of byOwner.entries()) {
      console.log(`👤 Owner: ${owner}`);
      console.log(`   Songs: ${songs.length}`);
      console.log('   Titles:');
      songs.forEach((song, idx) => {
        console.log(`      ${idx + 1}. "${song.title}" (${GeneratedMusicStatus[song.status]})`);
      });
      console.log('');
    }

    console.log('📋 All Songs (newest first):\n');
    allMusic.forEach((music, idx) => {
      console.log(`${idx + 1}. "${music.title}"`);
      console.log(`   ID: ${music.id}`);
      console.log(`   Owner: ${music.owner}`);
      console.log(`   Task ID: ${music.taskId}`);
      console.log(`   Status: ${GeneratedMusicStatus[music.status]}`);
      console.log(`   Timestamp: ${new Date(music.timestamp).toLocaleString()}`);
      console.log(`   Audio: ${music.audioUrl.substring(0, 60)}...`);
      console.log('');
    });

    console.log('🎯 Key Information:\n');
    console.log(`Total Songs: ${allMusic.length}`);
    console.log(`Unique Owners: ${byOwner.size}`);
    console.log(`Owners: ${Array.from(byOwner.keys()).join(', ')}`);
    console.log('');

    // Check for specific owner (from logs)
    const targetOwner = '0x82010A989EDda6ccB1758B79dEfc3FE3429A201A'.toLowerCase();
    const targetSongs = allMusic.filter(m => m.owner.toLowerCase() === targetOwner);
    
    if (targetSongs.length > 0) {
      console.log(`🎵 Songs for ${targetOwner}:`);
      targetSongs.forEach((song, idx) => {
        console.log(`   ${idx + 1}. "${song.title}" (${GeneratedMusicStatus[song.status]})`);
      });
    } else {
      console.log(`⚠️  No songs found for ${targetOwner}`);
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ Debug failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Run debug
debugGeneratedMusic()
  .then(() => {
    console.log('✅ Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
