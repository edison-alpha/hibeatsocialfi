const { ethers } = require("hardhat");

/**
 * Debug script to check profile existence and diagnose "Profile already exists" issue
 */
async function main() {
  console.log("🔍 Debugging Profile Existence Issue...\n");

  // Get signer
  const [signer] = await ethers.getSigners();
  const signerAddress = signer.address;
  
  console.log("📍 Signer Address:", signerAddress);
  console.log("📍 Signer Balance:", ethers.formatEther(await ethers.provider.getBalance(signerAddress)), "STT\n");

  // UserProfile contract address (v3.0.0)
  const USER_PROFILE_ADDRESS = "0x2ddc13A67C024a98b267c9c0740E6579bBbA6298";
  
  console.log("📄 UserProfile Contract:", USER_PROFILE_ADDRESS, "\n");

  // Connect to UserProfile contract
  const UserProfile = await ethers.getContractFactory("UserProfile");
  const userProfile = UserProfile.attach(USER_PROFILE_ADDRESS);

  // Test addresses (you can add more addresses to check)
  const addressesToCheck = [
    signerAddress, // The deployer/signer
    // Add more addresses here if needed
  ];

  console.log("=" .repeat(80));
  console.log("CHECKING PROFILE EXISTENCE FOR ADDRESSES");
  console.log("=" .repeat(80) + "\n");

  for (const address of addressesToCheck) {
    console.log(`\n🔍 Checking address: ${address}`);
    console.log("-".repeat(80));

    try {
      // 1. Check if profile exists
      const exists = await userProfile.profileExists(address);
      console.log(`   ✅ profileExists() result: ${exists}`);

      if (exists) {
        console.log(`   ⚠️  PROFILE ALREADY EXISTS FOR THIS ADDRESS!`);
        
        try {
          // 2. Get profile data
          const profile = await userProfile.getProfile(address);
          console.log(`\n   📊 Profile Data:`);
          console.log(`      Username:     ${profile.username}`);
          console.log(`      Display Name: ${profile.displayName}`);
          console.log(`      Bio:          ${profile.bio}`);
          console.log(`      Avatar Hash:  ${profile.avatarHash}`);
          console.log(`      Location:     ${profile.location}`);
          console.log(`      Is Artist:    ${profile.isArtist}`);
          console.log(`      Is Verified:  ${profile.isVerified}`);
          console.log(`      Created At:   ${new Date(Number(profile.createdAt) * 1000).toLocaleString()}`);
          console.log(`      Updated At:   ${new Date(Number(profile.updatedAt) * 1000).toLocaleString()}`);

          // 3. Get username mapping
          const username = await userProfile.getUsernameByAddress(address);
          console.log(`\n   🏷️  Username Mapping: ${username}`);

          // 4. Reverse check - get address by username
          if (username) {
            const addressByUsername = await userProfile.getAddressByUsername(username);
            console.log(`   🔄 Reverse Check (username -> address): ${addressByUsername}`);
            console.log(`   ✅ Mapping Consistent: ${addressByUsername.toLowerCase() === address.toLowerCase()}`);
          }

        } catch (error) {
          console.log(`   ❌ Error fetching profile data:`, error.message);
        }
      } else {
        console.log(`   ✅ NO PROFILE EXISTS - Safe to create new profile`);
      }

    } catch (error) {
      console.log(`   ❌ Error checking profile:`, error.message);
    }
  }

  console.log("\n" + "=" .repeat(80));
  console.log("DIAGNOSIS & RECOMMENDATIONS");
  console.log("=" .repeat(80) + "\n");

  // Check if signer already has profile
  const signerHasProfile = await userProfile.profileExists(signerAddress);
  
  if (signerHasProfile) {
    console.log("⚠️  ISSUE FOUND:");
    console.log("   Your signer address already has a profile on this contract.");
    console.log("\n💡 SOLUTIONS:");
    console.log("   1. Use a different address (create new wallet account)");
    console.log("   2. Try to create profile with a DIFFERENT wallet/address");
    console.log("   3. If using Sequence smart account, the smart account address");
    console.log("      might already have a profile from previous attempts.");
    console.log("\n🔧 TO TEST:");
    console.log("   - Connect with a completely new wallet");
    console.log("   - Or deploy new UserProfile contract");
    console.log("   - Or use different Sequence account");
  } else {
    console.log("✅ NO ISSUE:");
    console.log("   Your signer address does NOT have a profile yet.");
    console.log("   You should be able to create a profile successfully.");
    console.log("\n🔍 IF STILL GETTING ERROR:");
    console.log("   1. Check if you're using smart account (Sequence)");
    console.log("   2. The smart account address might be different from EOA");
    console.log("   3. Check browser console for the actual address being used");
    console.log("   4. Verify CONTRACT_ADDRESSES in web3-config.ts is correct:");
    console.log(`      Expected: ${USER_PROFILE_ADDRESS}`);
  }

  console.log("\n" + "=" .repeat(80));
  console.log("SMART ACCOUNT DETECTION");
  console.log("=" .repeat(80) + "\n");

  console.log("📍 If you're using Sequence (smart account):");
  console.log("   - Your EOA address:", signerAddress);
  console.log("   - Your smart account address: (detected by app at runtime)");
  console.log("   - The profile check happens on smart account address");
  console.log("   - The transaction sender (msg.sender) in contract is smart account");
  console.log("\n💡 TO DEBUG IN APP:");
  console.log("   1. Open browser console");
  console.log("   2. Look for: 'smartAccountAddress' or 'Checking profile existence for'");
  console.log("   3. Copy that address");
  console.log("   4. Run this script again with that address added to addressesToCheck");

  console.log("\n✅ Script completed!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
