const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying AlbumManager contract to Somnia Testnet...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "STT");

  // Deploy AlbumManager
  console.log("\n📀 Deploying AlbumManager...");
  const AlbumManager = await hre.ethers.getContractFactory("AlbumManager");
  const albumManager = await AlbumManager.deploy();
  await albumManager.waitForDeployment();
  
  const albumManagerAddress = await albumManager.getAddress();
  console.log("✅ AlbumManager deployed to:", albumManagerAddress);

  // Wait for confirmations
  console.log("⏳ Waiting for block confirmations...");
  await albumManager.deploymentTransaction().wait(5);
  console.log("✅ Contract confirmed on blockchain!");

  // Save deployment info
  const deploymentInfo = {
    network: "somniaTestnet",
    albumManager: albumManagerAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber()
  };

  // Read existing deployments
  const deploymentsPath = path.join(__dirname, '../deployments/somniaTestnet.json');
  let existingDeployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  }

  // Merge with existing
  existingDeployments.albumManager = albumManagerAddress;
  existingDeployments.lastUpdated = new Date().toISOString();

  // Save updated deployments
  fs.writeFileSync(
    deploymentsPath,
    JSON.stringify(existingDeployments, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", deploymentsPath);

  // Display summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("AlbumManager:", albumManagerAddress);
  console.log("Network: Somnia Testnet");
  console.log("Explorer:", `https://shannon-explorer.somnia.network/address/${albumManagerAddress}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
