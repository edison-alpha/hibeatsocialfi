const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying ALL Contracts to Somnia Testnet...");
  console.log("=" .repeat(70));

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "STT\n");

  const deployedContracts = {};
  const deploymentTransactions = [];

  // 1. Deploy UserProfile
  console.log("1️⃣  Deploying UserProfile...");
  const UserProfile = await hre.ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  deployedContracts.userProfile = await userProfile.getAddress();
  deploymentTransactions.push(userProfile.deploymentTransaction());
  console.log("✅ UserProfile:", deployedContracts.userProfile);

  // 2. Deploy AlbumManager
  console.log("\n2️⃣  Deploying AlbumManager...");
  const AlbumManager = await hre.ethers.getContractFactory("AlbumManager");
  const albumManager = await AlbumManager.deploy();
  await albumManager.waitForDeployment();
  deployedContracts.albumManager = await albumManager.getAddress();
  deploymentTransactions.push(albumManager.deploymentTransaction());
  console.log("✅ AlbumManager:", deployedContracts.albumManager);

  // 3. Deploy SongNFT
  console.log("\n3️⃣  Deploying SongNFT...");
  const SongNFT = await hre.ethers.getContractFactory("SongNFT");
  const songNFT = await SongNFT.deploy();
  await songNFT.waitForDeployment();
  deployedContracts.songNFT = await songNFT.getAddress();
  deploymentTransactions.push(songNFT.deploymentTransaction());
  console.log("✅ SongNFT:", deployedContracts.songNFT);

  // 4. Deploy PlaylistManager
  console.log("\n4️⃣  Deploying PlaylistManager...");
  const PlaylistManager = await hre.ethers.getContractFactory("PlaylistManager");
  const playlistManager = await PlaylistManager.deploy();
  await playlistManager.waitForDeployment();
  deployedContracts.playlistManager = await playlistManager.getAddress();
  deploymentTransactions.push(playlistManager.deploymentTransaction());
  console.log("✅ PlaylistManager:", deployedContracts.playlistManager);

  // 5. Deploy Marketplace
  console.log("\n5️⃣  Deploying Marketplace...");
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  deployedContracts.marketplace = await marketplace.getAddress();
  deploymentTransactions.push(marketplace.deploymentTransaction());
  console.log("✅ Marketplace:", deployedContracts.marketplace);

  // 6. Deploy TippingSystem
  console.log("\n6️⃣  Deploying TippingSystem...");
  const TippingSystem = await hre.ethers.getContractFactory("TippingSystem");
  const tippingSystem = await TippingSystem.deploy();
  await tippingSystem.waitForDeployment();
  deployedContracts.tippingSystem = await tippingSystem.getAddress();
  deploymentTransactions.push(tippingSystem.deploymentTransaction());
  console.log("✅ TippingSystem:", deployedContracts.tippingSystem);

  // Wait for all confirmations
  console.log("\n⏳ Waiting for block confirmations (3 blocks)...");
  await Promise.all(deploymentTransactions.map(tx => tx.wait(3)));
  console.log("✅ All contracts confirmed on blockchain!");

  // Save deployment info
  const deploymentsPath = path.join(__dirname, '../deployments/somniaTestnet.json');
  
  const finalDeployments = {
    ...deployedContracts,
    deployer: deployer.address,
    network: "somniaTestnet",
    chainId: 50312,
    lastUpdated: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  // Ensure deployments directory exists
  const deploymentsDir = path.dirname(deploymentsPath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployments
  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify(finalDeployments, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", deploymentsPath);

  // Display summary
  console.log("\n" + "=".repeat(70));
  console.log("🎉 ALL CONTRACTS DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(70));
  console.log("\n📋 Contract Addresses:");
  console.log("─".repeat(70));
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`${name.padEnd(20)}: ${address}`);
  });
  console.log("─".repeat(70));
  
  console.log("\n🔍 View on Explorer:");
  Object.entries(deployedContracts).forEach(([name, address]) => {
    console.log(`${name}: https://shannon-explorer.somnia.network/address/${address}`);
  });
  
  console.log("\n⚠️  NEXT STEPS:");
  console.log("1. Update contract addresses in frontend config files");
  console.log("2. Update subgraph configuration with new addresses");
  console.log("3. Redeploy subgraph to index new contracts");
  console.log("4. Test all contract interactions");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
