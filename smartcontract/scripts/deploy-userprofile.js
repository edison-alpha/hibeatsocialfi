const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Updated UserProfile contract to Somnia Testnet...");
  console.log("📝 This includes the new upgradeToArtist() function");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "STT");

  // Deploy UserProfile
  console.log("\n👤 Deploying UserProfile...");
  const UserProfile = await hre.ethers.getContractFactory("UserProfile");
  const userProfile = await UserProfile.deploy();
  await userProfile.waitForDeployment();
  
  const userProfileAddress = await userProfile.getAddress();
  console.log("✅ UserProfile deployed to:", userProfileAddress);

  // Wait for confirmations
  console.log("⏳ Waiting for block confirmations...");
  await userProfile.deploymentTransaction().wait(5);
  console.log("✅ Contract confirmed on blockchain!");

  // Save deployment info
  const deploymentsPath = path.join(__dirname, '../deployments/somniaTestnet.json');
  let existingDeployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    existingDeployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  }

  // Update with new UserProfile address
  existingDeployments.userProfile = userProfileAddress;
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
  console.log("UserProfile (NEW):", userProfileAddress);
  console.log("Network: Somnia Testnet");
  console.log("Explorer:", `https://shannon-explorer.somnia.network/address/${userProfileAddress}`);
  console.log("\n⚠️  IMPORTANT: Update CONTRACT_ADDRESSES in:");
  console.log("   - src/lib/sequence-config.ts");
  console.log("   - src/lib/web3-config.ts");
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
