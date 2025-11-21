// Debug Playlist CoverHash from Blockchain
import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from './config.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
let PRIVATE_KEY: string | undefined;
let PLAYLIST_SCHEMA_ID: string | undefined;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const pkMatch = envContent.match(/VITE_PRIVATE_KEY=(.+)/);
  PRIVATE_KEY = pkMatch ? pkMatch[1].trim() : undefined;
  
  const playlistMatch = envContent.match(/VITE_PLAYLIST_SCHEMA_ID=(.+)/);
  PLAYLIST_SCHEMA_ID = playlistMatch ? playlistMatch[1].trim() : undefined;
} catch (error) {
  console.error('Failed to read .env');
  process.exit(1);
}

if (!PRIVATE_KEY || !PLAYLIST_SCHEMA_ID) {
  console.error('❌ Missing env variables');
  process.exit(1);
}

const RPC_URL = 'https://dream-rpc.somnia.network';

async function debugCoverHash() {
  console.log('🔍 Debugging Playlist CoverHash from Blockchain\n');
  console.log('='.repeat(70));

  try {
    const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
    console.log('✅ Account:', account.address);
    console.log('✅ Schema ID:', PLAYLIST_SCHEMA_ID);
    console.log('='.repeat(70));

    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http(RPC_URL)
    });

    const walletClient = createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(RPC_URL)
    });

    const sdk = new SDK({
      public: publicClient,
      wallet: walletClient
    });

    console.log('\n📥 Loading playlists from blockchain...');
    const rawData = await sdk.streams.getAllPublisherDataForSchema(
      PLAYLIST_SCHEMA_ID as `0x${string}`,
      account.address as `0x${string}`
    );

    console.log(`✅ Got ${rawData?.length || 0} playlists\n`);

    if (!rawData || rawData.length === 0) {
      console.log('❌ No playlists found');
      return;
    }

    // Prepare decoder
    const playlistSchema = 'uint64 timestamp, uint256 playlistId, address owner, string title, string description, string coverHash, string trackIds, bool isPublic, bool isDeleted';
    const decoder = new SchemaEncoder(playlistSchema);

    // Analyze each playlist
    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];
      
      // Decode if hex string
      let decodedItem = item;
      if (typeof item === 'string' && item.startsWith('0x')) {
        console.log('🔄 Decoding hex string...');
        decodedItem = decoder.decodeData(item as `0x${string}`);
      }
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`PLAYLIST #${i + 1}`);
      console.log('='.repeat(70));
      
      console.log('\n📦 Raw item type:', typeof item);
      console.log('📦 Raw item length:', item?.length);
      console.log('📦 Decoded item type:', typeof decodedItem);
      console.log('📦 Decoded is array:', Array.isArray(decodedItem));
      console.log('📦 Decoded length:', decodedItem?.length);
      
      if (Array.isArray(decodedItem)) {
        console.log('\n📋 Decoded array contents:');
        decodedItem.forEach((field: any, idx: number) => {
          console.log(`\n  [${idx}]:`, {
            type: typeof field,
            value: field,
            hasValue: field?.value !== undefined,
            valueType: typeof field?.value,
            valueValue: field?.value
          });
        });
        
        // Focus on coverHash (index 5)
        console.log('\n🖼️  COVERHASH ANALYSIS (index 5):');
        const coverHashField = decodedItem[5];
        console.log('  Raw:', coverHashField);
        console.log('  Type:', typeof coverHashField);
        
        if (coverHashField && typeof coverHashField === 'object') {
          console.log('  Has .value:', 'value' in coverHashField);
          if ('value' in coverHashField) {
            console.log('  .value:', coverHashField.value);
            console.log('  .value type:', typeof coverHashField.value);
            
            if (coverHashField.value && typeof coverHashField.value === 'object') {
              console.log('  .value.value:', coverHashField.value.value);
              console.log('  .value.value type:', typeof coverHashField.value.value);
            }
          }
          
          // Try to extract
          let extracted = coverHashField;
          let depth = 0;
          console.log('\n  🔄 Extraction process:');
          while (extracted && typeof extracted === 'object' && 'value' in extracted && depth < 10) {
            console.log(`    Depth ${depth}: ${typeof extracted.value}`);
            extracted = extracted.value;
            depth++;
          }
          console.log(`  ✅ Final extracted (depth ${depth}):`, extracted);
          console.log(`  ✅ Final type:`, typeof extracted);
        }
        
        // Try to get title for reference
        const titleField = decodedItem[3];
        let title = 'Unknown';
        if (titleField) {
          let t = titleField;
          while (t && typeof t === 'object' && 'value' in t) {
            t = t.value;
          }
          title = String(t);
        }
        console.log('\n  📝 Playlist title:', title);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Debug complete!');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

debugCoverHash();
