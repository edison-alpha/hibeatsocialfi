// Blockchain Debug Utilities
// Untuk debugging masalah posting dan koneksi blockchain

import { createPublicClient, http } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/web3-config';

// Somnia testnet configuration
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOMNIA',
    symbol: 'SOMNIA',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
  testnet: true,
} as const;

// Create public client for debugging
const debugClient = createPublicClient({
  chain: somniaTestnet,
  transport: http()
});

// SocialGraph ABI untuk debugging
const SOCIAL_GRAPH_ABI = [
  {
    name: 'createPost',
    type: 'function',
    inputs: [
      { name: 'content', type: 'string' },
      { name: 'ipfsHash', type: 'string' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'posts',
    type: 'function',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'author', type: 'address' },
      { name: 'content', type: 'string' },
      { name: 'ipfsHash', type: 'string' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'likeCount', type: 'uint256' },
      { name: 'commentCount', type: 'uint256' },
      { name: 'shareCount', type: 'uint256' },
      { name: 'isDeleted', type: 'bool' }
    ]
  },
  {
    name: 'getUserPosts',
    type: 'function',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }]
  },
  {
    name: '_postIdCounter',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

export class BlockchainDebugger {
  
  // Test koneksi ke Somnia network
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing Somnia network connection...');
      
      const blockNumber = await debugClient.getBlockNumber();
      console.log('✅ Connected to Somnia! Current block:', blockNumber);
      
      const chainId = await debugClient.getChainId();
      console.log('✅ Chain ID:', chainId);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Somnia:', error);
      return false;
    }
  }

  // Test apakah contract address valid
  static async testContractAddress(): Promise<boolean> {
    try {
      console.log('🔍 Testing SocialGraph contract address...');
      console.log('Contract address:', CONTRACT_ADDRESSES.socialGraph);
      
      const code = await debugClient.getBytecode({
        address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`
      });
      
      if (code && code !== '0x') {
        console.log('✅ Contract exists! Bytecode length:', code.length);
        return true;
      } else {
        console.error('❌ Contract not found or not deployed');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to check contract:', error);
      return false;
    }
  }

  // Get total posts count
  static async getTotalPosts(): Promise<number> {
    try {
      console.log('🔍 Getting total posts count...');
      
      // Note: _postIdCounter mungkin private, jadi kita coba cara lain
      let postCount = 0;
      
      // Coba baca post dari ID 1 sampai menemukan yang tidak ada
      for (let i = 1; i <= 100; i++) {
        try {
          const post = await debugClient.readContract({
            address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`,
            abi: SOCIAL_GRAPH_ABI,
            functionName: 'posts',
            args: [BigInt(i)]
          });
          
          if (post && post[0] > 0n) { // post.id > 0
            postCount = i;
            console.log(`📝 Found post ${i}:`, {
              id: post[0].toString(),
              author: post[1],
              content: post[2],
              timestamp: new Date(Number(post[4]) * 1000).toLocaleString()
            });
          }
        } catch (error) {
          // Post tidak ada, stop
          break;
        }
      }
      
      console.log('✅ Total posts found:', postCount);
      return postCount;
    } catch (error) {
      console.error('❌ Failed to get posts count:', error);
      return 0;
    }
  }

  // Get posts by user
  static async getUserPosts(userAddress: string): Promise<any[]> {
    try {
      console.log('🔍 Getting posts for user:', userAddress);
      
      const postIds = await debugClient.readContract({
        address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`,
        abi: SOCIAL_GRAPH_ABI,
        functionName: 'getUserPosts',
        args: [userAddress as `0x${string}`]
      });
      
      console.log('📝 User post IDs:', postIds);
      
      const posts = [];
      for (const postId of postIds) {
        try {
          const post = await debugClient.readContract({
            address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`,
            abi: SOCIAL_GRAPH_ABI,
            functionName: 'posts',
            args: [postId]
          });
          
          posts.push({
            id: post[0].toString(),
            author: post[1],
            content: post[2],
            ipfsHash: post[3],
            timestamp: new Date(Number(post[4]) * 1000).toLocaleString(),
            likes: post[5].toString(),
            comments: post[6].toString(),
            shares: post[7].toString(),
            isDeleted: post[8]
          });
        } catch (error) {
          console.error(`Failed to get post ${postId}:`, error);
        }
      }
      
      console.log('✅ User posts:', posts);
      return posts;
    } catch (error) {
      console.error('❌ Failed to get user posts:', error);
      return [];
    }
  }

  // Get recent posts (last 10)
  static async getRecentPosts(): Promise<any[]> {
    try {
      console.log('🔍 Getting recent posts...');
      
      const totalPosts = await this.getTotalPosts();
      const posts = [];
      
      // Get last 10 posts
      const startId = Math.max(1, totalPosts - 9);
      for (let i = totalPosts; i >= startId; i--) {
        try {
          const post = await debugClient.readContract({
            address: CONTRACT_ADDRESSES.socialGraph as `0x${string}`,
            abi: SOCIAL_GRAPH_ABI,
            functionName: 'posts',
            args: [BigInt(i)]
          });
          
          if (post && post[0] > 0n) {
            posts.push({
              id: post[0].toString(),
              author: post[1],
              content: post[2],
              ipfsHash: post[3],
              timestamp: new Date(Number(post[4]) * 1000).toLocaleString(),
              likes: post[5].toString(),
              comments: post[6].toString(),
              shares: post[7].toString(),
              isDeleted: post[8]
            });
          }
        } catch (error) {
          console.error(`Failed to get post ${i}:`, error);
        }
      }
      
      console.log('✅ Recent posts:', posts);
      return posts;
    } catch (error) {
      console.error('❌ Failed to get recent posts:', error);
      return [];
    }
  }

  // Comprehensive debug check
  static async runFullDiagnostic(userAddress?: string): Promise<void> {
    console.log('🚀 Running full blockchain diagnostic...');
    console.log('=====================================');
    
    // 1. Test connection
    const connected = await this.testConnection();
    if (!connected) {
      console.log('❌ DIAGNOSTIC FAILED: Cannot connect to Somnia network');
      return;
    }
    
    // 2. Test contract
    const contractExists = await this.testContractAddress();
    if (!contractExists) {
      console.log('❌ DIAGNOSTIC FAILED: SocialGraph contract not found');
      return;
    }
    
    // 3. Get total posts
    const totalPosts = await this.getTotalPosts();
    
    // 4. Get recent posts
    const recentPosts = await this.getRecentPosts();
    
    // 5. Get user posts if address provided
    if (userAddress) {
      const userPosts = await this.getUserPosts(userAddress);
      console.log(`📊 User ${userAddress} has ${userPosts.length} posts`);
    }
    
    console.log('=====================================');
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log(`📊 Total posts on contract: ${totalPosts}`);
    console.log(`📊 Recent posts retrieved: ${recentPosts.length}`);
    
    if (totalPosts === 0) {
      console.log('⚠️  WARNING: No posts found on contract. This could mean:');
      console.log('   1. Contract is newly deployed');
      console.log('   2. Posts are not being created successfully');
      console.log('   3. Wrong contract address');
    }
  }
}

// Export untuk digunakan di browser console
if (typeof window !== 'undefined') {
  (window as any).BlockchainDebugger = BlockchainDebugger;
  console.log('🔧 BlockchainDebugger available in console');
  console.log('Usage: BlockchainDebugger.runFullDiagnostic("0xYourAddress")');
}

export default BlockchainDebugger;