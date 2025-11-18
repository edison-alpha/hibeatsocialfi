const fs = require('fs');
const path = require('path');

/**
 * Script to update ABI files in src/lib/abis from compiled artifacts
 * Run after: npx hardhat compile
 */

const contracts = [
  'UserProfile',
  'SongNFT',
  'AlbumManager',
  'PlaylistManager',
  'Marketplace',
  'TippingSystem',
];

console.log('🔄 Updating ABI files...\n');

contracts.forEach(contractName => {
  try {
    // Read compiled artifact
    const artifactPath = path.join(
      __dirname,
      `../artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    
    if (!fs.existsSync(artifactPath)) {
      console.log(`⚠️  ${contractName}: Artifact not found, skipping...`);
      return;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    const abi = artifact.abi;

    // Create TypeScript ABI file
    const abiContent = `// Auto-generated ABI for ${contractName}
// Generated: ${new Date().toISOString()}

export const ${contractName}ABI = ${JSON.stringify(abi, null, 2)} as const;

export default ${contractName}ABI;
`;

    // Write to src/lib/abis
    const outputPath = path.join(__dirname, `../../src/lib/abis/${contractName}.ts`);
    fs.writeFileSync(outputPath, abiContent);

    console.log(`✅ ${contractName}: ABI updated`);
  } catch (error) {
    console.error(`❌ ${contractName}: Failed to update ABI`, error.message);
  }
});

console.log('\n✨ ABI update complete!');
