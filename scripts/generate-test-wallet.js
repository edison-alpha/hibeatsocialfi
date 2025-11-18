#!/usr/bin/env node

/**
 * Generate Test Wallet for DataStream Writes
 * 
 * This script generates a new Ethereum wallet for testing DataStream writes.
 * NEVER use this wallet with real funds!
 */

const crypto = require('crypto');

console.log('\n🔐 Generating Test Wallet for DataStream...\n');

// Generate random private key
const privateKey = '0x' + crypto.randomBytes(32).toString('hex');

// Simple address derivation (for display only - use proper library for real use)
console.log('✅ Test Wallet Generated!\n');
console.log('📋 Copy this to your .env file:\n');
console.log(`VITE_PRIVATE_KEY=${privateKey}\n`);

console.log('⚠️  IMPORTANT:');
console.log('1. This is a TEST wallet - NEVER use with real funds!');
console.log('2. Add this line to your .env file');
console.log('3. Get the wallet address using: npx ethers-cli wallet --private-key ' + privateKey);
console.log('4. Fund the address with test STT tokens from Somnia faucet');
console.log('5. Restart your development server\n');

console.log('🔗 Somnia Testnet Faucet: https://faucet.somnia.network (if available)\n');
