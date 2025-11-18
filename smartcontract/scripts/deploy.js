const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying HiBeats Contracts to Somnia Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ===== 1. Core Contracts =====
  console.log("📦 STEP 1: Deploying Core Contracts...\n");

  // Deploy UserProfile
  console.log("1️⃣  Deploying UserProfile...");
  const UserProfile = await ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  const userProfileAddress = await userProfile.getAddress();
  console.log("✅ UserProfile deployed to:", userProfileAddress);

  // Deploy SongNFT
  console.log("\n2️⃣  Deploying SongNFT...");
  const SongNFT = await ethers.getContractFactory("SongNFT");
  const songNFT = await SongNFT.deploy();
  await songNFT.waitForDeployment();
  const songNFTAddress = await songNFT.getAddress();
  console.log("✅ SongNFT deployed to:", songNFTAddress);

  // Deploy SocialGraph
  console.log("\n3️⃣  Deploying SocialGraph...");
  const SocialGraph = await ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraph.deploy();
  await socialGraph.waitForDeployment();
  const socialGraphAddress = await socialGraph.getAddress();
  console.log("✅ SocialGraph deployed to:", socialGraphAddress);

  // ===== 2. Feature Contracts =====
  console.log("\n\n📦 STEP 2: Deploying Feature Contracts...\n");

  // Deploy AlbumManager
  console.log("4️⃣  Deploying AlbumManager...");
  const AlbumManager = await ethers.getContractFactory("AlbumManager");
  const albumManager = await AlbumManager.deploy();
  await albumManager.waitForDeployment();
  const albumManagerAddress = await albumManager.getAddress();
  console.log("✅ AlbumManager deployed to:", albumManagerAddress);

  // Deploy PlaylistManager
  console.log("\n5️⃣  Deploying PlaylistManager...");
  const PlaylistManager = await ethers.getContractFactory("PlaylistManager");
  const playlistManager = await PlaylistManager.deploy();
  await playlistManager.waitForDeployment();
  const playlistManagerAddress = await playlistManager.getAddress();
  console.log("✅ PlaylistManager deployed to:", playlistManagerAddress);

  // Deploy Marketplace
  console.log("\n6️⃣  Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ Marketplace deployed to:", marketplaceAddress);

  // Deploy TippingSystem
  console.log("\n7️⃣  Deploying TippingSystem...");
  const TippingSystem = await ethers.getContractFactory("TippingSystem");
  const tippingSystem = await TippingSystem.deploy();
  await tippingSystem.waitForDeployment();
  const tippingSystemAddress = await tippingSystem.getAddress();
  console.log("✅ TippingSystem deployed to:", tippingSystemAddress);

  // Deploy DirectMessages
  console.log("\n8️⃣  Deploying DirectMessages...");
  const DirectMessages = await ethers.getContractFactory("DirectMessages");
  const directMessages = await DirectMessages.deploy();
  await directMessages.waitForDeployment();
  const directMessagesAddress = await directMessages.getAddress();
  console.log("✅ DirectMessages deployed to:", directMessagesAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      UserProfile: userProfileAddress,
      SongNFT: songNFTAddress,
      SocialGraph: socialGraphAddress,
      AlbumManager: albumManagerAddress,
      PlaylistManager: playlistManagerAddress,
      Marketplace: marketplaceAddress,
      TippingSystem: tippingSystemAddress,
      DirectMessages: directMessagesAddress,
    },
    deployedAt: new Date().toISOString(),
  };

  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses:\n");
  console.log("UserProfile:      ", userProfileAddress);
  console.log("SongNFT:          ", songNFTAddress);
  console.log("SocialGraph:      ", socialGraphAddress);
  console.log("AlbumManager:     ", albumManagerAddress);
  console.log("PlaylistManager:  ", playlistManagerAddress);
  console.log("Marketplace:      ", marketplaceAddress);
  console.log("TippingSystem:    ", tippingSystemAddress);
  console.log("DirectMessages:   ", directMessagesAddress);
  console.log("\n🔗 Explorer URLs:");
  console.log("https://shannon-explorer.somnia.network/address/" + userProfileAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + songNFTAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + socialGraphAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + albumManagerAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + playlistManagerAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + marketplaceAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + tippingSystemAddress);
  console.log("https://shannon-explorer.somnia.network/address/" + directMessagesAddress);
  console.log("=".repeat(60) + "\n");

  // Save to file
  const fs = require("fs");
  const deploymentPath = `./deployments/${network.name}.json`;
  fs.mkdirSync("./deployments", { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentPath}\n`);

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });