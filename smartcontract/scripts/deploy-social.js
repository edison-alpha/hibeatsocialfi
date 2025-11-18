const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying HiBeats Social Contracts on Somnia...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // ERC-4337 Infrastructure addresses
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  const paymasterAddress = "0x5998519faf46CCCAe3E7069F788C93376320E6D8";
  const factoryAddress = "0x0C070fA0C95A392328D8c863175742384A783F45";

  console.log("📋 Using ERC-4337 Infrastructure:");
  console.log("   EntryPoint:", entryPointAddress);
  console.log("   Paymaster:", paymasterAddress);
  console.log("   Factory:", factoryAddress);

  // Deploy UserProfile contract
  console.log("👤 Deploying UserProfile...");
  const UserProfile = await ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  console.log("✅ UserProfile deployed to:", await userProfile.getAddress());

  // Deploy SocialGraph contract
  console.log("🤝 Deploying SocialGraph...");
  const SocialGraph = await ethers.getContractFactory("SocialGraph");
  const socialGraph = await SocialGraph.deploy();
  await socialGraph.waitForDeployment();
  console.log("✅ SocialGraph deployed to:", await socialGraph.getAddress());

  // Deploy SongNFT contract
  console.log("🎵 Deploying SongNFT...");
  const SongNFT = await ethers.getContractFactory("SongNFT");
  const songNFT = await SongNFT.deploy();
  await songNFT.waitForDeployment();
  console.log("✅ SongNFT deployed to:", await songNFT.getAddress());

  // Deploy Marketplace contract
  console.log("🛒 Deploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("✅ Marketplace deployed to:", await marketplace.getAddress());

  // Deploy PlaylistManager contract
  console.log("📋 Deploying PlaylistManager...");
  const PlaylistManager = await ethers.getContractFactory("PlaylistManager");
  const playlistManager = await PlaylistManager.deploy();
  await playlistManager.waitForDeployment();
  console.log("✅ PlaylistManager deployed to:", await playlistManager.getAddress());

  // Deploy TippingSystem contract
  console.log("💰 Deploying TippingSystem...");
  const TippingSystem = await ethers.getContractFactory("TippingSystem");
  const tippingSystem = await TippingSystem.deploy();
  await tippingSystem.waitForDeployment();
  console.log("✅ TippingSystem deployed to:", await tippingSystem.getAddress());

  // Deploy DirectMessages contract
  console.log("💬 Deploying DirectMessages...");
  const DirectMessages = await ethers.getContractFactory("DirectMessages");
  const directMessages = await DirectMessages.deploy();
  await directMessages.waitForDeployment();
  console.log("✅ DirectMessages deployed to:", await directMessages.getAddress());

  console.log("\n🎉 Social Contracts deployed successfully!");
  console.log("📋 Deployment Summary:");
  console.log("   UserProfile:", await userProfile.getAddress());
  console.log("   SocialGraph:", await socialGraph.getAddress());
  console.log("   SongNFT:", await songNFT.getAddress());
  console.log("   Marketplace:", await marketplace.getAddress());
  console.log("   PlaylistManager:", await playlistManager.getAddress());
  console.log("   TippingSystem:", await tippingSystem.getAddress());
  console.log("   DirectMessages:", await directMessages.getAddress());

  // Save deployment info
  const deploymentInfo = {
    network: "somniaTestnet",
    erc4337: {
      entryPoint: entryPointAddress,
      paymaster: paymasterAddress,
      factory: factoryAddress
    },
    socialContracts: {
      userProfile: await userProfile.getAddress(),
      socialGraph: await socialGraph.getAddress(),
      songNFT: await songNFT.getAddress(),
      marketplace: await marketplace.getAddress(),
      playlistManager: await playlistManager.getAddress(),
      tippingSystem: await tippingSystem.getAddress(),
      directMessages: await directMessages.getAddress()
    },
    deployedAt: new Date().toISOString()
  };

  console.log("\n💾 Deployment Info:", JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });