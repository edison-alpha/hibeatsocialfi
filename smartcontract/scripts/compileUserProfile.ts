import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function compileAndExtractABI() {
  try {
    console.log('🔨 Compiling UserProfile.sol...');
    
    // Compile contract
    await execAsync('npx hardhat compile');
    
    console.log('✅ Compilation successful!');
    
    // Read compiled artifact
    const artifactPath = path.join(__dirname, '../artifacts/contracts/UserProfile.sol/UserProfile.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // Extract ABI
    const abi = artifact.abi;
    
    // Write ABI to frontend
    const abiOutputPath = path.join(__dirname, '../../src/lib/abis/UserProfile.ts');
    const abiContent = `export const USER_PROFILE_ABI = ${JSON.stringify(abi)} as const;\n`;
    
    fs.writeFileSync(abiOutputPath, abiContent);
    
    console.log('✅ ABI extracted and saved to:', abiOutputPath);
    console.log('\n📋 New functions added:');
    console.log('  - upgradeToArtist (payable) - Requires 10 SOMI');
    console.log('  - setTreasury - Set treasury address');
    console.log('  - getArtistUpgradeFee - Get upgrade fee');
    console.log('  - withdraw - Emergency withdraw');
    console.log('\n🎉 Ready to deploy!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

compileAndExtractABI();
