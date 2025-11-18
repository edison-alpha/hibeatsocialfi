const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HiBeats ERC-4337 Integration", function () {
  let entryPoint, paymaster, factory, account;
  let owner, user1, user2;
  let songNFT, socialGraph;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy EntryPoint
    const EntryPoint = await ethers.getContractFactory("EntryPoint");
    entryPoint = await EntryPoint.deploy();
    await entryPoint.waitForDeployment();

    // Deploy Paymaster
    const HiBeatsPaymaster = await ethers.getContractFactory("HiBeatsPaymaster");
    paymaster = await HiBeatsPaymaster.deploy(await entryPoint.getAddress());
    await paymaster.waitForDeployment();

    // Deploy Factory
    const HiBeatsAccountFactory = await ethers.getContractFactory("HiBeatsAccountFactory");
    factory = await HiBeatsAccountFactory.deploy(await entryPoint.getAddress());
    await factory.waitForDeployment();

    // Deploy core contracts for testing
    const SongNFT = await ethers.getContractFactory("SongNFT");
    songNFT = await SongNFT.deploy();
    await songNFT.waitForDeployment();

    const SocialGraph = await ethers.getContractFactory("SocialGraph");
    socialGraph = await SocialGraph.deploy();
    await socialGraph.waitForDeployment();

    // Fund paymaster
    await owner.sendTransaction({
      to: await paymaster.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deposit to EntryPoint
    await paymaster.deposit({ value: ethers.parseEther("0.5") });

    // Create account for user1
    const salt = 0;
    await factory.createAccount(user1.address, salt);
    const accountAddress = await factory.getAccountAddress(user1.address, salt);
    account = await ethers.getContractAt("HiBeatsAccount", accountAddress);
  });

  describe("Account Creation", function () {
    it("Should create accounts with correct addresses", async function () {
      const salt = 1;
      const predictedAddress = await factory.getAccountAddress(user2.address, salt);

      await factory.createAccount(user2.address, salt);
      const actualAddress = await factory.getAccountAddress(user2.address, salt);

      expect(predictedAddress).to.equal(actualAddress);
    });

    it("Should not allow duplicate account creation", async function () {
      const salt = 2;
      await factory.createAccount(user2.address, salt);

      await expect(
        factory.createAccount(user2.address, salt)
      ).to.be.revertedWith("Account already exists");
    });
  });

  describe("Gas Sponsorship", function () {
    it("Should sponsor gas for whitelisted functions", async function () {
      // Whitelist SongNFT.likeSong function
      const songNFTInterface = new ethers.Interface(["function likeSong(uint256)"]);
      const likeSongSelector = songNFTInterface.getFunction("likeSong").selector;

      await paymaster.addSponsoredFunction(await songNFT.getAddress(), likeSongSelector);

      // Create a user operation for liking a song
      const userOp = {
        sender: await account.getAddress(),
        nonce: 0,
        initCode: "0x",
        callData: account.interface.encodeFunctionData("execute", [
          await songNFT.getAddress(),
          0,
          songNFTInterface.encodeFunctionData("likeSong", [1])
        ]),
        callGasLimit: 100000,
        verificationGasLimit: 100000,
        preVerificationGas: 21000,
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        paymasterAndData: ethers.concat([
          await paymaster.getAddress(),
          ethers.toBeHex(0, 32) // paymaster data
        ]),
        signature: "0x"
      };

      // Sign the user operation
      const userOpHash = await entryPoint.getUserOpHash(userOp);
      const signature = await user1.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      // Simulate the user operation
      const simulationResult = await entryPoint.simulateValidation.staticCall(userOp);

      // Should not revert (gas sponsorship should work)
      expect(simulationResult).to.not.be.reverted;
    });

    it("Should reject non-whitelisted functions", async function () {
      // Create a user operation for a non-whitelisted function
      const userOp = {
        sender: await account.getAddress(),
        nonce: 0,
        initCode: "0x",
        callData: account.interface.encodeFunctionData("execute", [
          await songNFT.getAddress(),
          0,
          songNFT.interface.encodeFunctionData("mintSong", [
            "Test Song",
            "Test Artist",
            "ipfs://test",
            ethers.parseEther("0.1")
          ])
        ]),
        callGasLimit: 200000,
        verificationGasLimit: 100000,
        preVerificationGas: 21000,
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        paymasterAndData: ethers.concat([
          await paymaster.getAddress(),
          ethers.toBeHex(0, 32)
        ]),
        signature: "0x"
      };

      // Sign the user operation
      const userOpHash = await entryPoint.getUserOpHash(userOp);
      const signature = await user1.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      // Should revert because mintSong is not whitelisted
      await expect(
        entryPoint.simulateValidation.staticCall(userOp)
      ).to.be.revertedWith("Function not sponsored");
    });

    it("Should enforce transaction limits", async function () {
      // Set a low transaction limit
      await paymaster.setTransactionLimit(ethers.parseEther("0.001"));

      // Whitelist a function
      const socialGraphInterface = new ethers.Interface(["function followUser(address)"]);
      const followSelector = socialGraphInterface.getFunction("followUser").selector;

      await paymaster.addSponsoredFunction(await socialGraph.getAddress(), followSelector);

      // Create a user operation that exceeds the limit
      const userOp = {
        sender: await account.getAddress(),
        nonce: 0,
        initCode: "0x",
        callData: account.interface.encodeFunctionData("execute", [
          await socialGraph.getAddress(),
          ethers.parseEther("0.01"), // High value
          socialGraphInterface.encodeFunctionData("followUser", [user2.address])
        ]),
        callGasLimit: 100000,
        verificationGasLimit: 100000,
        preVerificationGas: 21000,
        maxFeePerGas: ethers.parseUnits("10", "gwei"),
        maxPriorityFeePerGas: ethers.parseUnits("1", "gwei"),
        paymasterAndData: ethers.concat([
          await paymaster.getAddress(),
          ethers.toBeHex(0, 32)
        ]),
        signature: "0x"
      };

      // Sign the user operation
      const userOpHash = await entryPoint.getUserOpHash(userOp);
      const signature = await user1.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      // Should revert due to transaction limit
      await expect(
        entryPoint.simulateValidation.staticCall(userOp)
      ).to.be.revertedWith("Transaction value exceeds limit");
    });
  });

  describe("Account Functionality", function () {
    it("Should execute transactions correctly", async function () {
      // Send some ETH to the account
      await owner.sendTransaction({
        to: await account.getAddress(),
        value: ethers.parseEther("1.0")
      });

      // Execute a simple transfer
      const initialBalance = await ethers.provider.getBalance(user2.address);
      await account.connect(user1).execute(
        user2.address,
        ethers.parseEther("0.1"),
        "0x"
      );

      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance - initialBalance).to.equal(ethers.parseEther("0.1"));
    });

    it("Should validate signatures correctly", async function () {
      const message = "Hello HiBeats!";
      const messageHash = ethers.hashMessage(message);
      const signature = await user1.signMessage(message);

      // Test EIP-1271 signature validation
      const isValid = await account.isValidSignature(messageHash, signature);
      expect(isValid).to.equal("0x1626ba7e"); // EIP-1271 magic value
    });
  });
});