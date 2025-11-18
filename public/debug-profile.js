/**
 * Frontend Debug Helper for Profile Creation
 * 
 * Add this to your browser console to get detailed debug info
 * about profile creation attempts and address mismatches
 */

(function() {
  console.log('🔍 HiBeats Profile Debug Helper Loaded');
  console.log('================================================\n');

  // Get config addresses
  const checkConfigAddresses = () => {
    console.log('📝 Checking Configuration Addresses:');
    console.log('================================================');
    
    // Try to access window objects
    if (window.CONTRACT_ADDRESSES) {
      console.log('✅ CONTRACT_ADDRESSES found:', window.CONTRACT_ADDRESSES);
    } else {
      console.log('⚠️  CONTRACT_ADDRESSES not in window scope');
      console.log('   This is normal - it\'s in module scope');
    }
    
    console.log('\n💡 Expected UserProfile address (v3.0.0):');
    console.log('   0x2ddc13A67C024a98b267c9c0740E6579bBbA6298');
    console.log('\n');
  };

  // Monitor localStorage
  const checkLocalStorage = () => {
    console.log('💾 Checking LocalStorage:');
    console.log('================================================');
    
    const autoApprove = localStorage.getItem('hibeats_auto_approve');
    const cachedAddress = localStorage.getItem('hibeats_cached_address');
    
    console.log('Auto Approve:', autoApprove);
    console.log('Cached Address:', cachedAddress);
    
    // Check for profile cache
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('profile') || key.includes('cache')
    );
    
    if (cacheKeys.length > 0) {
      console.log('\n📦 Profile-related cache found:');
      cacheKeys.forEach(key => {
        console.log(`   ${key}:`, localStorage.getItem(key)?.substring(0, 100) + '...');
      });
    }
    console.log('\n');
  };

  // Monitor wallet connection
  const checkWalletConnection = () => {
    console.log('👛 Checking Wallet Connection:');
    console.log('================================================');
    
    // Check if window.ethereum exists
    if (window.ethereum) {
      console.log('✅ window.ethereum found');
      
      // Try to get accounts
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          console.log('📍 Connected Accounts (EOA):', accounts);
          if (accounts.length > 0) {
            console.log('   Primary EOA:', accounts[0]);
          }
        })
        .catch(err => console.log('❌ Error getting accounts:', err.message));
      
      // Get chainId
      window.ethereum.request({ method: 'eth_chainId' })
        .then(chainId => {
          const chainIdNum = parseInt(chainId, 16);
          console.log('⛓️  Chain ID:', chainIdNum);
          if (chainIdNum !== 50312) {
            console.warn('⚠️  WARNING: Not on Somnia Testnet (expected 50312)');
          } else {
            console.log('✅ Connected to Somnia Testnet');
          }
        })
        .catch(err => console.log('❌ Error getting chainId:', err.message));
    } else {
      console.log('❌ window.ethereum not found');
    }
    console.log('\n');
  };

  // Add event listeners for monitoring
  const monitorTransactions = () => {
    console.log('🔍 Setting up Transaction Monitor:');
    console.log('================================================');
    
    // Intercept console.log to catch our debug messages
    const originalLog = console.log;
    console.log = function(...args) {
      // Look for key debug messages
      const message = args.join(' ');
      
      if (message.includes('smartAccountAddress') || 
          message.includes('Checking profile existence') ||
          message.includes('Profile created') ||
          message.includes('profileExists')) {
        originalLog.apply(console, ['🎯 PROFILE DEBUG:', ...args]);
      } else if (message.includes('Transaction sent') || 
                 message.includes('executeGaslessTransaction')) {
        originalLog.apply(console, ['📤 TX DEBUG:', ...args]);
      } else {
        originalLog.apply(console, args);
      }
    };
    
    console.log('✅ Console monitor active');
    console.log('   Watching for: profile creation, address checks, transactions');
    console.log('\n');
  };

  // Helper function to manually check profile
  window.debugCheckProfile = async (address) => {
    if (!address) {
      console.log('❌ Please provide an address');
      console.log('Usage: debugCheckProfile("0x...")');
      return;
    }
    
    console.log('\n🔍 Manual Profile Check for:', address);
    console.log('================================================');
    
    try {
      const response = await fetch('https://dream-rpc.somnia.network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [{
            to: '0x2ddc13A67C024a98b267c9c0740E6579bBbA6298', // UserProfile v3.0.0
            data: '0x05cfa06f' + address.slice(2).padStart(64, '0') // profileExists(address)
          }, 'latest'],
          id: 1
        })
      });
      
      const data = await response.json();
      const exists = data.result !== '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      console.log('Result:', exists ? '✅ Profile EXISTS' : '❌ Profile DOES NOT exist');
      console.log('Raw response:', data.result);
      
      return exists;
    } catch (error) {
      console.error('❌ Error checking profile:', error);
    }
  };

  // Helper to clear profile cache
  window.debugClearProfileCache = () => {
    console.log('\n🗑️  Clearing Profile Cache:');
    console.log('================================================');
    
    const keys = Object.keys(localStorage);
    let cleared = 0;
    
    keys.forEach(key => {
      if (key.includes('profile') || key.includes('cache') || key.includes('hibeats')) {
        console.log('Removing:', key);
        localStorage.removeItem(key);
        cleared++;
      }
    });
    
    console.log(`✅ Cleared ${cleared} cache entries`);
    console.log('💡 Reload the page to fetch fresh data\n');
  };

  // Run checks
  checkConfigAddresses();
  checkLocalStorage();
  checkWalletConnection();
  monitorTransactions();

  console.log('================================================');
  console.log('🎯 DEBUG HELPERS AVAILABLE:');
  console.log('================================================');
  console.log('debugCheckProfile(address) - Check if address has profile');
  console.log('debugClearProfileCache()   - Clear all profile cache');
  console.log('\nExample:');
  console.log('debugCheckProfile("0x1234...")');
  console.log('================================================\n');

  // Return helper object
  return {
    checkProfile: window.debugCheckProfile,
    clearCache: window.debugClearProfileCache,
    version: 'v3.0.0'
  };
})();
