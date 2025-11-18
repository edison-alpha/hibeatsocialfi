const { ethers } = require("hardhat");
require("dotenv/config");

async function main() {
  const network = hre.network.name;
  console.log(`🚀 Starting deployment to ${network}...`);

  // Check if we're on a supported network
  const supportedNetworks = ['localhost', 'hardhat', 'somniaTestnet', 'sepolia'];
  if (!supportedNetworks.includes(network)) {
    throw new Error(`Network ${network} not supported. Supported networks: ${supportedNetworks.join(', ')}`);
  }

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Deploying contracts with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Deploy SongNFT contract
  console.log("🔨 Deploying SongNFT contract...");
  const SongNFT = await ethers.getContractFactory("SongNFT");
  const songNFT = await SongNFT.deploy();

  console.log("⏳ Waiting for deployment...");
  await songNFT.waitForDeployment();

  const contractAddress = await songNFT.getAddress();
  console.log(`✅ SongNFT deployed successfully!`);
  console.log(`📍 Contract address: ${contractAddress}`);

  // Get deployment transaction details
  const deployTx = songNFT.deploymentTransaction();
  if (deployTx) {
    console.log(`🔗 Transaction hash: ${deployTx.hash}`);
    console.log(`⛽ Gas used: ${deployTx.gasLimit.toString()}`);
  }

  // Wait for confirmations on testnets
  if (network !== 'hardhat' && network !== 'localhost') {
    console.log("⏳ Waiting for block confirmations...");
    await songNFT.deploymentTransaction().wait(5);
    console.log("✅ Transaction confirmed!");
  }

  // Verify contract on supported networks
  if (network === 'sepolia' || network === 'somniaTestnet') {
    console.log("🔍 Verifying contract on blockchain explorer...");

    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️  Contract verification failed:");
      console.log(error.message);
      console.log("You can manually verify later with:");
      console.log(`npx hardhat verify --network ${network} ${contractAddress}`);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    network,
    contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: deployTx?.hash,
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Test basic functionality
  console.log("\n🧪 Testing basic functionality...");
  try {
    const name = await songNFT.name();
    const symbol = await songNFT.symbol();
    console.log(`✅ Contract name: ${name}`);
    console.log(`✅ Contract symbol: ${symbol}`);
  } catch (error) {
    console.log("⚠️  Basic functionality test failed:");
    console.log(error.message);
  }

  console.log("\n🎉 Deployment completed successfully!");
  console.log(`📍 SongNFT Contract: ${contractAddress}`);

  return {
    contractAddress,
    network,
    deployer: deployer.address
  };
}

main()
  .then((result) => {
    console.log("\n✅ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });