const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying HiBeats ERC-4337 Infrastructure on Somnia...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Use Somnia's deployed EntryPoint instead of deploying our own
  const entryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
  console.log("� Using Somnia's EntryPoint at:", entryPointAddress);

  // Verify EntryPoint exists
  const code = await ethers.provider.getCode(entryPointAddress);
  if (code === "0x") {
    throw new Error("EntryPoint not found at expected address");
  }
  console.log("✅ EntryPoint verified");

  // Get EntryPoint contract instance
  const EntryPoint = await ethers.getContractFactory("EntryPoint");
  const entryPoint = EntryPoint.attach(entryPointAddress);

  // Deploy Paymaster
  console.log("💰 Deploying HiBeatsPaymaster...");
  const HiBeatsPaymaster = await ethers.getContractFactory("HiBeatsPaymaster");
  const paymaster = await HiBeatsPaymaster.deploy(await entryPoint.getAddress());
  await paymaster.waitForDeployment();
  console.log("✅ HiBeatsPaymaster deployed to:", await paymaster.getAddress());

  // Deploy Account Factory
  console.log("🏭 Deploying HiBeatsAccountFactory...");
  const HiBeatsAccountFactory = await ethers.getContractFactory("HiBeatsAccountFactory");
  const factory = await HiBeatsAccountFactory.deploy(await entryPoint.getAddress());
  await factory.waitForDeployment();
  console.log("✅ HiBeatsAccountFactory deployed to:", await factory.getAddress());

  // Fund the paymaster with some ETH for gas sponsorship
  console.log("💸 Funding Paymaster with 1 ETH...");
  const fundTx = await deployer.sendTransaction({
    to: await paymaster.getAddress(),
    value: ethers.parseEther("1.0")
  });
  await fundTx.wait();
  console.log("✅ Paymaster funded");

  // Deposit to EntryPoint
  console.log("📥 Depositing to EntryPoint...");
  const depositTx = await paymaster.deposit({ value: ethers.parseEther("0.5") });
  await depositTx.wait();
  console.log("✅ Deposited to EntryPoint");

  console.log("\n🎉 ERC-4337 Infrastructure deployed successfully!");
  console.log("📋 Deployment Summary:");
  console.log("   EntryPoint:", await entryPoint.getAddress());
  console.log("   Paymaster:", await paymaster.getAddress());
  console.log("   Factory:", await factory.getAddress());
  console.log("   Paymaster Balance:", ethers.formatEther(await paymaster.getBalance()), "ETH");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    entryPoint: await entryPoint.getAddress(),
    paymaster: await paymaster.getAddress(),
    factory: await factory.getAddress(),
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