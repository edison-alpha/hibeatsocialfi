# 🎵 HiBeats - Web3 Music Social Platform

HiBeats adalah platform sosial musik berbasis Web3 yang dibangun di atas Somnia Network. Platform ini memungkinkan artis untuk membuat, berbagi, dan memonetisasi musik mereka melalui NFT, sambil berinteraksi dengan fans dalam ekosistem sosial yang terdesentralisasi.

## ✨ Fitur Utama

- 🎼 **Music NFT Marketplace** - Mint, jual, dan beli musik sebagai NFT
- 🎨 **Album & Playlist Management** - Kelola koleksi musik Anda
- 💬 **Social Features** - Post, like, comment, dan share konten musik
- 🎵 **AI Music Generation** - Generate musik dengan AI (Suno integration)
- 💰 **Tipping System** - Dukung artis favorit Anda
- 🏆 **BXP Rewards & Quests** - Sistem reward dan quest untuk engagement
- 👛 **Sequence Wallet Integration** - Wallet management yang mudah
- 🔐 **Session Keys** - Transaksi gasless dengan session management
- 📊 **Real-time Analytics** - Dashboard analytics real-time
- 🌊 **Somnia DataStream** - Real-time blockchain data streaming

### 🚀 Advanced Real-Time Features (NEW!)

- ⚡ **WebSocket Subscriptions** - True real-time updates (<100ms latency)
- 🔔 **Instant Notifications** - No polling, instant push notifications
- 👁️ **Live View Counters** - See how many users are viewing posts in real-time
- ⌨️ **Live Typing Indicators** - See who's typing comments in real-time
- 🏆 **Real-Time Leaderboard** - Live rankings with smooth animations
- 📊 **Performance Monitoring** - Real-time performance metrics dashboard
- 🎯 **Event Filtering** - Efficient data streaming with indexed topics
- 📈 **Incremental Loading** - 50x faster data loading with smart caching

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** - Build tool
- **TailwindCSS** + **Shadcn/ui** - Styling
- **Wagmi** + **Viem** - Ethereum interactions
- **0xSequence** - Wallet & session management
- **Apollo Client** - GraphQL client
- **React Router** - Routing
- **Recharts** - Data visualization

### Smart Contracts
- **Hardhat** - Development environment
- **Solidity** - Smart contract language
- **OpenZeppelin** - Contract libraries
- **ERC-721** - NFT standard
- **Account Abstraction (ERC-4337)** - Gasless transactions

### Blockchain & Indexing
- **Somnia Network** - Layer 1 blockchain
- **The Graph** - Subgraph indexing
- **Somnia DataStream** - Real-time data streaming
- **IPFS** - Decentralized storage

## 📋 Prerequisites

Pastikan Anda telah menginstall:

- **Node.js** >= 18.x
- **npm** atau **yarn** atau **bun**
- **Git**
- **MetaMask** atau wallet lainnya (untuk testing)

## 🎯 Somnia Data Streams Hackathon

HiBeats showcases **advanced Somnia Data Streams (SDS)** features:

- ✅ **True Real-Time Updates** - WebSocket subscriptions, not polling
- ✅ **50x Performance Improvement** - Sub-100ms latency vs 3-5 second delays
- ✅ **Advanced Features** - Event filtering, computed queries, incremental loading
- ✅ **Live Social Features** - View counters, typing indicators, real-time leaderboards
- ✅ **Production Ready** - Error handling, auto-reconnect, performance monitoring

**📚 Documentation:**
- [Somnia Data Streams Showcase](./SOMNIA_DATASTREAMS_SHOWCASE.md) - Technical details
- [Real-Time Features Guide](./REALTIME_FEATURES_GUIDE.md) - Quick start guide
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md) - What was built
- [Demo Video Script](./DEMO_VIDEO_SCRIPT.md) - Recording guide

**🧪 Testing:**
```bash
# Test all real-time features
npm run test:realtime:all

# Test specific features
npm run test:realtime 3  # Incremental loading
npm run test:realtime 4  # Live indicators
npm run test:realtime 7  # Performance metrics
```

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/ngdkLabs/Hibeats-Web3-Socialfi.git
cd Hibeats-Web3-Socialfi
```

### 2. Install Dependencies

#### Frontend
```bash
npm install
# atau
yarn install
# atau
bun install
```

#### Smart Contracts
```bash
cd smartcontract
npm install
cd ..
```

#### Subgraph
```bash
cd smartcontract/subgraph
npm install
cd ../..
```

### 3. Environment Setup

#### Frontend Environment
Copy `.env.example` ke `.env` dan isi dengan konfigurasi Anda:

```bash
cp .env.example .env
```

Edit `.env`:
```env
# Sequence Wallet Configuration
VITE_SEQUENCE_PROJECT_ACCESS_KEY=your_sequence_project_key
VITE_SEQUENCE_WAAS_CONFIG_KEY=your_waas_config_key

# Somnia Network
VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
VITE_SOMNIA_CHAIN_ID=50311

# Subgraph Endpoint
VITE_SUBGRAPH_URL=your_subgraph_endpoint

# IPFS Configuration
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key

# Suno AI (Optional)
VITE_SUNO_API_KEY=your_suno_api_key
```

#### Smart Contract Environment
```bash
cd smartcontract
cp .env.example .env
```

Edit `smartcontract/.env`:
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
INFURA_KEY=your_infura_project_id
ETHERSCAN_API_KEY=your_etherscan_api_key
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_EXPLORER_URL=https://shannon-explorer.somnia.network
```

#### Subgraph Environment
```bash
cd smartcontract/subgraph
cp .env.example .env
```

Edit `smartcontract/subgraph/.env`:
```env
ORMI_DEPLOY_KEY=your_ormi_deploy_key
```

### 4. Compile Smart Contracts

```bash
cd smartcontract
npm run compile
```

### 5. Deploy Smart Contracts (Optional)

#### Deploy ke Somnia Testnet
```bash
npm run deploy:somnia
```

#### Deploy ke Local Network
```bash
# Terminal 1 - Start local node
npm run node

# Terminal 2 - Deploy contracts
npm run deploy:local
```

### 6. Setup Subgraph (Optional)

```bash
cd smartcontract/subgraph

# Generate types
npm run codegen

# Build subgraph
npm run build

# Deploy to Somnia
npm run deploy
```

### 7. Run Development Server

```bash
# Kembali ke root directory
cd ../..

# Start development server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:8080`

## 📁 Project Structure

```
hibeats/
├── public/                      # Static assets
├── scripts/                     # Utility scripts
├── smartcontract/              # Smart contracts
│   ├── contracts/              # Solidity contracts
│   │   ├── SongNFT.sol
│   │   ├── UserProfile.sol
│   │   ├── AlbumManager.sol
│   │   ├── PlaylistManager.sol
│   │   ├── Marketplace.sol
│   │   └── TippingSystem.sol
│   ├── scripts/                # Deployment scripts
│   ├── test/                   # Contract tests
│   ├── subgraph/              # The Graph subgraph
│   │   ├── schema.graphql     # GraphQL schema
│   │   ├── subgraph.yaml      # Subgraph manifest
│   │   └── src/               # Mapping handlers
│   └── hardhat.config.js      # Hardhat configuration
├── src/
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── feed/             # Feed components
│   │   └── generate/         # Music generation
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Libraries & utilities
│   │   ├── abis/            # Contract ABIs
│   │   └── web3-config.ts   # Web3 configuration
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── types/               # TypeScript types
│   └── utils/               # Utility functions
├── .env.example             # Environment template
├── package.json
├── vite.config.ts
└── README.md
```

## 🔧 Available Scripts

### Frontend

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Schema Management
npm run register:generated-music  # Register generated music schema
npm run verify:generated-music    # Verify generated music schema
npm run register:play-events      # Register play events schema
npm run verify:play-events        # Verify play events schema
npm run verify:schemas            # Verify all schemas
npm run register:bxp              # Register BXP schemas
npm run test:bxp                  # Test BXP system
```

### Smart Contracts

```bash
cd smartcontract

# Development
npm run compile         # Compile contracts
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run clean          # Clean artifacts

# Deployment
npm run node           # Start local Hardhat node
npm run deploy:local   # Deploy to local network
npm run deploy:somnia  # Deploy to Somnia testnet
npm run deploy:sepolia # Deploy to Sepolia testnet

# Verification
npm run verify:somnia  # Verify on Somnia explorer
npm run verify:sepolia # Verify on Etherscan
```

### Subgraph

```bash
cd smartcontract/subgraph

npm run codegen        # Generate types from schema
npm run build          # Build subgraph
npm run deploy         # Deploy to Somnia subgraph
npm run create-local   # Create local subgraph
npm run deploy-local   # Deploy to local Graph node
```

## 🔑 Key Contracts

### Deployed on Somnia Testnet

Lihat file `smartcontract/deployments/somniaTestnet.json` untuk alamat contract yang sudah di-deploy.

**Main Contracts:**
- **SongNFT** - ERC-721 NFT untuk musik
- **UserProfile** - Manajemen profil user
- **AlbumManager** - Manajemen album
- **PlaylistManager** - Manajemen playlist
- **Marketplace** - NFT marketplace
- **TippingSystem** - Sistem tipping

## 🌐 Network Configuration

### Somnia Testnet

```javascript
{
  chainId: 50311,
  name: "Somnia Testnet",
  rpcUrl: "https://dream-rpc.somnia.network",
  explorerUrl: "https://shannon-explorer.somnia.network",
  nativeCurrency: {
    name: "STT",
    symbol: "STT",
    decimals: 18
  }
}
```

## 🧪 Testing

### Smart Contract Tests

```bash
cd smartcontract
npm test
```

### Integration Tests

```bash
# Test BXP system
npm run test:bxp

# Test play events
npm run test:play-events
```

## 📚 Documentation

### Smart Contracts
- Lihat `smartcontract/README.md` untuk dokumentasi contract
- Lihat `smartcontract/DEPLOYMENT_SUMMARY.md` untuk deployment info

### Subgraph
- Lihat `smartcontract/subgraph/DEPLOYMENT_SUCCESS_v4.4.0.md`
- Lihat `smartcontract/subgraph/SUBGRAPH_CHECKLIST.md`

## 🔐 Security

- **JANGAN** commit file `.env` ke repository
- **JANGAN** share private keys atau API keys
- Gunakan `.env.example` sebagai template
- Untuk production, gunakan environment variables yang aman

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**1. Node polyfill errors**
```bash
# Install polyfills
npm install buffer process
```

**2. Contract compilation errors**
```bash
cd smartcontract
npm run clean
npm run compile
```

**3. Subgraph deployment fails**
```bash
cd smartcontract/subgraph
npm run codegen
npm run build
```

**4. Wallet connection issues**
- Pastikan MetaMask terhubung ke Somnia Testnet
- Clear browser cache dan reconnect wallet
- Check RPC endpoint di network settings

**5. Transaction fails**
- Pastikan memiliki STT token untuk gas
- Check contract addresses di deployment file
- Verify network configuration

## 📞 Support

- **GitHub Issues**: [Create an issue](https://github.com/ngdkLabs/Hibeats-Web3-Socialfi/issues)
- **Documentation**: Check `/smartcontract` and `/smartcontract/subgraph` folders

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] NFT royalty distribution
- [ ] Cross-chain bridge
- [ ] DAO governance
- [ ] Live streaming features
- [ ] Enhanced AI music generation
- [ ] Social token integration

## 🌟 Acknowledgments

- **Somnia Network** - Blockchain infrastructure
- **0xSequence** - Wallet & session management
- **The Graph** - Indexing protocol
- **OpenZeppelin** - Smart contract libraries
- **Shadcn/ui** - UI components

---

Built with ❤️ by ngdkLabs
