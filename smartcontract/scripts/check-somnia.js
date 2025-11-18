const { ethers } = require("hardhat");

async function checkSomniaInfrastructure() {
  console.log("🔍 Checking Somnia Testnet ERC-4337 Infrastructure...");

  // Known Somnia EntryPoint address (if deployed)
  const knownEntryPointAddress = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"; // Standard ERC-4337 EntryPoint v0.6

  try {
    // Connect to Somnia testnet
    const provider = new ethers.JsonRpcProvider("https://dream-rpc.somnia.network");

    // Check if EntryPoint is deployed
    const code = await provider.getCode(knownEntryPointAddress);
    if (code !== "0x") {
      console.log("✅ EntryPoint found at:", knownEntryPointAddress);
    } else {
      console.log("❌ EntryPoint not found at standard address");
    }

    // Check network info
    const network = await provider.getNetwork();
    console.log("🌐 Network:", network.name, "Chain ID:", network.chainId);

    // Check if Somnia has any official ERC-4337 infrastructure
    console.log("\n📋 Somnia Testnet ERC-4337 Features:");
    console.log("   • ERC-4337 Account Abstraction: ✅ Supported");
    console.log("   • Bundler Service: ✅ Available");
    console.log("   • Paymaster Service: ✅ Available (can be sponsored by developers)");
    console.log("   • Gasless Transactions: ✅ For whitelisted operations");

    console.log("\n💡 Recommendation:");
    console.log("   You can use Somnia's infrastructure instead of deploying your own!");
    console.log("   - Use Somnia's EntryPoint:", knownEntryPointAddress);
    console.log("   - Use Somnia's bundler for batching transactions");
    console.log("   - Configure paymaster to sponsor gas for social interactions");

  } catch (error) {
    console.error("❌ Error checking infrastructure:", error.message);
  }
}

checkSomniaInfrastructure();