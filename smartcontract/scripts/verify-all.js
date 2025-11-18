const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying all contracts on Somnia Explorer...\n");

  // Read deployment info
  const deploymentPath = "./deployments/somniaTestnet.json";
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ Deployment file not found!");
    console.error("Please run deployment first: npx hardhat run scripts/deploy.js --network somniaTestnet");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const contracts = deploymentInfo.contracts;

  console.log("📋 Contracts to verify:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });
  console.log("\n⏳ Waiting 30 seconds for block confirmations...\n");
  
  // Wait for block confirmations
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Verify each contract
  const results = {
    success: [],
    failed: []
  };

  // 1. UserProfile (no constructor args)
  try {
    console.log("1️⃣  Verifying UserProfile...");
    await hre.run("verify:verify", {
      address: contracts.UserProfile,
      constructorArguments: [],
    });
    console.log("✅ UserProfile verified!\n");
    results.success.push("UserProfile");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ UserProfile already verified!\n");
      results.success.push("UserProfile");
    } else {
      console.log("❌ UserProfile verification failed:", error.message, "\n");
      results.failed.push({ name: "UserProfile", error: error.message });
    }
  }

  // 2. SongNFT (no constructor args)
  try {
    console.log("2️⃣  Verifying SongNFT...");
    await hre.run("verify:verify", {
      address: contracts.SongNFT,
      constructorArguments: [],
    });
    console.log("✅ SongNFT verified!\n");
    results.success.push("SongNFT");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ SongNFT already verified!\n");
      results.success.push("SongNFT");
    } else {
      console.log("❌ SongNFT verification failed:", error.message, "\n");
      results.failed.push({ name: "SongNFT", error: error.message });
    }
  }

  // 3. SocialGraph (no constructor args)
  try {
    console.log("3️⃣  Verifying SocialGraph...");
    await hre.run("verify:verify", {
      address: contracts.SocialGraph,
      constructorArguments: [],
    });
    console.log("✅ SocialGraph verified!\n");
    results.success.push("SocialGraph");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ SocialGraph already verified!\n");
      results.success.push("SocialGraph");
    } else {
      console.log("❌ SocialGraph verification failed:", error.message, "\n");
      results.failed.push({ name: "SocialGraph", error: error.message });
    }
  }

  // 4. AlbumManager (no constructor args)
  try {
    console.log("4️⃣  Verifying AlbumManager...");
    await hre.run("verify:verify", {
      address: contracts.AlbumManager,
      constructorArguments: [],
    });
    console.log("✅ AlbumManager verified!\n");
    results.success.push("AlbumManager");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ AlbumManager already verified!\n");
      results.success.push("AlbumManager");
    } else {
      console.log("❌ AlbumManager verification failed:", error.message, "\n");
      results.failed.push({ name: "AlbumManager", error: error.message });
    }
  }

  // 5. PlaylistManager (no constructor args)
  try {
    console.log("5️⃣  Verifying PlaylistManager...");
    await hre.run("verify:verify", {
      address: contracts.PlaylistManager,
      constructorArguments: [],
    });
    console.log("✅ PlaylistManager verified!\n");
    results.success.push("PlaylistManager");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ PlaylistManager already verified!\n");
      results.success.push("PlaylistManager");
    } else {
      console.log("❌ PlaylistManager verification failed:", error.message, "\n");
      results.failed.push({ name: "PlaylistManager", error: error.message });
    }
  }

  // 6. Marketplace (no constructor args)
  try {
    console.log("6️⃣  Verifying Marketplace...");
    await hre.run("verify:verify", {
      address: contracts.Marketplace,
      constructorArguments: [],
    });
    console.log("✅ Marketplace verified!\n");
    results.success.push("Marketplace");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ Marketplace already verified!\n");
      results.success.push("Marketplace");
    } else {
      console.log("❌ Marketplace verification failed:", error.message, "\n");
      results.failed.push({ name: "Marketplace", error: error.message });
    }
  }

  // 7. TippingSystem (no constructor args)
  try {
    console.log("7️⃣  Verifying TippingSystem...");
    await hre.run("verify:verify", {
      address: contracts.TippingSystem,
      constructorArguments: [],
    });
    console.log("✅ TippingSystem verified!\n");
    results.success.push("TippingSystem");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ TippingSystem already verified!\n");
      results.success.push("TippingSystem");
    } else {
      console.log("❌ TippingSystem verification failed:", error.message, "\n");
      results.failed.push({ name: "TippingSystem", error: error.message });
    }
  }

  // 8. DirectMessages (no constructor args)
  try {
    console.log("8️⃣  Verifying DirectMessages...");
    await hre.run("verify:verify", {
      address: contracts.DirectMessages,
      constructorArguments: [],
    });
    console.log("✅ DirectMessages verified!\n");
    results.success.push("DirectMessages");
  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("✅ DirectMessages already verified!\n");
      results.success.push("DirectMessages");
    } else {
      console.log("❌ DirectMessages verification failed:", error.message, "\n");
      results.failed.push({ name: "DirectMessages", error: error.message });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully verified: ${results.success.length}/8`);
  console.log(`   ${results.success.join(", ")}`);
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed to verify: ${results.failed.length}/8`);
    results.failed.forEach(({ name, error }) => {
      console.log(`   ${name}: ${error}`);
    });
  }
  
  console.log("\n🔗 View verified contracts on Somnia Explorer:");
  Object.entries(contracts).forEach(([name, address]) => {
    console.log(`   ${name}: https://shannon-explorer.somnia.network/address/${address}`);
  });
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
