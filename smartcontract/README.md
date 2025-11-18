# HiBeats Blockchain

Smart contracts for the HiBeats Web3 Music Social Platform - a fully on-chain music and social platform inspired by Farcaster and Lens Protocol.

## Features

- **ERC-721 Song NFTs**: Songs as NFTs with metadata, royalties, and ownership
- **Social Graph**: Follows, posts, comments, and likes stored on-chain
- **Marketplace**: On-chain music marketplace
- **ERC-4337 Account Abstraction**: Gasless transactions with Privy integration

## Architecture

### Contracts

1. **SongNFT.sol**: ERC-721 contract for music NFTs
   - Song metadata (title, artist, genre, duration)
   - Royalty system for artists
   - IPFS integration for audio/artwork storage
   - Artist attribution and ownership

2. **SocialGraph.sol** (planned): Social interactions contract
   - Follow/unfollow functionality
   - Posts, comments, and likes
   - Social reputation system

3. **Marketplace.sol** (planned): Music marketplace
   - Buy/sell songs and beats
   - Royalty distribution
   - Auction functionality

## Setup

1. Install dependencies:
```bash
cd blockchain
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure your environment variables in `.env`:
```env
# Private key for deployment (use test key for development)
PRIVATE_KEY=your_private_key_here

# RPC URLs and API keys
INFURA_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Development

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm run test
```

### Start Local Node
```bash
npm run node
```

## Deployment

### Local Deployment
```bash
npm run deploy:local
```

### Somnia Testnet Deployment
```bash
npm run deploy:somnia
```

### Sepolia Testnet Deployment
```bash
npm run deploy:sepolia
```

### Verify Contracts
```bash
npm run verify:somnia
npm run verify:sepolia
```

## Networks

- **Somnia Testnet**: Chain ID 51336
  - RPC: https://dream-rpc.somnia.network
  - Explorer: https://shannon-explorer.somnia.network

- **Sepolia Testnet**: Chain ID 11155111
  - For testing with standard Ethereum tooling

## Testing

The test suite includes:
- Contract deployment tests
- NFT minting functionality
- Metadata management
- Royalty system
- Transfer mechanics

Run tests with:
```bash
npm run test
```

## Integration with Frontend

The contracts are designed to work with the React frontend using:
- **Privy**: For wallet management and authentication
- **Wagmi**: For blockchain interactions
- **ERC-4337**: For account abstraction and gasless transactions

## Security

- All contracts use OpenZeppelin battle-tested implementations
- Reentrancy guards on critical functions
- Access control for sensitive operations
- Comprehensive test coverage

## Contributing

1. Write tests for new functionality
2. Ensure all tests pass
3. Follow Solidity best practices
4. Add documentation for complex functions

## License

MIT