// Somnia Explorer API Service
// Using official Somnia API for transaction history

const SOMNIA_API_URL = 'https://api.subgraph.somnia.network/public_api/data_api/somnia/v1';

export interface SomniaTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: string;
  method?: string;
  blockNumber: number;
}

/**
 * Get transaction summary for an address from Somnia API
 * Official API: https://api.subgraph.somnia.network/public_api/data_api/somnia/v1/address/{walletAddress}/transactions/summary
 */
export async function getTransactionHistory(
  address: string
): Promise<SomniaTransaction[]> {
  try {
    console.log('🔍 [Somnia API] Fetching transaction history for:', address);
    
    const response = await fetch(
      `${SOMNIA_API_URL}/address/${address}/transactions/summary`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Somnia API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('📊 [Somnia API] Response:', data);
    
    // Parse response based on actual API structure
    // Adjust this based on the actual response format
    if (data && Array.isArray(data.transactions)) {
      console.log('✅ [Somnia API] Found transactions:', data.transactions.length);
      return data.transactions;
    } else if (Array.isArray(data)) {
      console.log('✅ [Somnia API] Found transactions:', data.length);
      return data;
    }
    
    console.warn('⚠️ [Somnia API] No transactions found');
    return [];
    
  } catch (error) {
    console.error('❌ [Somnia API] Failed to fetch transaction history:', error);
    // Return empty array instead of throwing to gracefully handle API unavailability
    return [];
  }
}

export interface SomniaNFT {
  contract_address: string;
  token_id: string;
  name?: string;
  symbol?: string;
  token_uri?: string;
}

/**
 * Get ERC721 NFTs owned by an address from Somnia API
 * Official API: https://api.subgraph.somnia.network/public_api/data_api/somnia/v1/address/{walletAddress}/balance/erc721
 */
export async function getNFTBalance(
  address: string
): Promise<SomniaNFT[]> {
  try {
    console.log('🎨 [Somnia API] Fetching NFT balance for:', address);
    
    const response = await fetch(
      `${SOMNIA_API_URL}/address/${address}/balance/erc721`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Somnia API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('🎨 [Somnia API] NFT Response:', data);
    
    // Parse response based on actual API structure
    if (data && Array.isArray(data.tokens)) {
      console.log('✅ [Somnia API] Found NFTs:', data.tokens.length);
      return data.tokens;
    } else if (Array.isArray(data)) {
      console.log('✅ [Somnia API] Found NFTs:', data.length);
      return data;
    }
    
    console.warn('⚠️ [Somnia API] No NFTs found');
    return [];
    
  } catch (error) {
    console.error('❌ [Somnia API] Failed to fetch NFT balance:', error);
    return [];
  }
}

export const somniaExplorerService = {
  getTransactionHistory,
  getNFTBalance,
};
