const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying ALL Updated Contracts to Somnia Testnet...");
  console.log("=" .repeat(70));

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "STT\n");

  const deployedContracts = {};

  // 1. Deploy UserProfile (with upgradeToArtist function)
  console.log("1️⃣  Deploying UserProfile...");
  const UserProfile = await hre.ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  deployedContracts.userProfile = await userProfile.getAddress();
  console.log("✅ UserProfile:", deployedContracts.userProfile);

  // 2. Deploy AlbumManager
  console.log("\n2️⃣  Deploying AlbumManager...");
  const AlbumManager = await hre.ethers.getContractFactory("AlbumManager");
  const albumManager = await AlbumManager.deploy();
  await albumManager.waitForDeployment();
  deployedContracts.albumManager = await albumManager.getAddress();
  console.log("✅ AlbumManager:", deployedContracts.albumManager);

  // Wait for all confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await Promise.all([
    userProfile.deploymentTransaction().wait(3),
    albumManager.deploymentTransaction().wait(3)
  ]);
  console.log("✅ All contracts confirmed on blockchain!");

  // Save deployment info
  const deploymentsPath = path.join(__dirname, '../deployments/somniaTestnet.json');
  let existingDeployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    try {
      existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    } catch (e) {
      console.log("⚠️  Could not read existing deployments, creating new file");
    }
  }

  // Merge deployments
  const finalDeployments = {
    ...existingDeployments,
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
  console.log("1. Update CONTRACT_ADDRESSES in src/lib/sequence-config.ts");
  console.log("2. Update CONTRACT_ADDRESSES in src/lib/web3-config.ts");
  console.log("3. Generate ABIs for AlbumManager");
  console.log("4. Test contracts with frontend");
  console.log("=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
