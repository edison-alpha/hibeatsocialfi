const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing profile creation...\n");

  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);

  // Contract addresses
  const USER_PROFILE_ADDRESS = "0x2E71C1ceDb2574efE77737F88f3dC182F6C07Ab0";
  const PAYMASTER_ADDRESS = "0x95A75d7f227eAe02B1F677b0D72772fFFa7Ab82c";

  // Connect to UserProfile
  const UserProfile = await ethers.getContractFactory("UserProfile");
  const userProfile = UserProfile.attach(USER_PROFILE_ADDRESS);

  // Connect to Paymaster
  const Paymaster = await ethers.getContractFactory("HiBeatsPaymaster");
  const paymaster = Paymaster.attach(PAYMASTER_ADDRESS);

  console.log("\n📋 Checking current state:");
  
  // Check if profile exists
  try {
    const existingProfile = await userProfile.getProfile(signer.address);
    console.log("✅ Profile exists for", signer.address);
    console.log("   Username:", existingProfile.username);
    console.log("   Display Name:", existingProfile.displayName);
  } catch (error) {
    console.log("❌ No profile exists for", signer.address);
  }

  // Check if UserProfile is whitelisted in Paymaster
  const isWhitelisted = await paymaster.whitelistedContracts(USER_PROFILE_ADDRESS);
  console.log("\n🔐 Paymaster whitelist status for UserProfile:", isWhitelisted);

  if (!isWhitelisted) {
    console.log("\n⚠️  UserProfile is NOT whitelisted in Paymaster!");
    console.log("Adding to whitelist...");
    
    const tx = await paymaster.addWhitelistedContract(USER_PROFILE_ADDRESS);
    await tx.wait();
    
    console.log("✅ UserProfile added to Paymaster whitelist!");
  }

  // Try to create profile
  console.log("\n🔨 Creating test profile...");
  
  try {
    const tx = await userProfile.createProfile(
      "testuser123",
      "Test User",
      "Test bio",
      "bafkreiexample", // avatar IPFS
      "bafkreiexample"  // banner IPFS
    );
    
    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Profile created successfully!");
    console.log("Gas used:", receipt.gasUsed.toString());
    
  } catch (error) {
    console.log("\n❌ Error creating profile:");
    console.log(error.message);
    
    // Check for specific error
    if (error.message.includes("Profile already exists")) {
      console.log("\n💡 Profile already exists for this address");
    } else if (error.message.includes("execution reverted")) {
      console.log("\n💡 Transaction reverted. Possible causes:");
      console.log("   1. Profile already exists");
      console.log("   2. Invalid parameters");
      console.log("   3. Contract not initialized");
    }
  }

  // Verify final state
  console.log("\n📋 Final profile state:");
  try {
    const profile = await userProfile.getProfile(signer.address);
    console.log("✅ Profile data:");
    console.log("   Username:", profile.username);
    console.log("   Display Name:", profile.displayName);
    console.log("   Bio:", profile.bio);
    console.log("   Followers:", profile.followerCount.toString());
    console.log("   Following:", profile.followingCount.toString());
  } catch (error) {
    console.log("❌ Could not fetch profile");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
