# HiBeats Subgraph Setup Script for ORMI (Windows PowerShell)
# This script automates the subgraph initialization process

Write-Host "🚀 HiBeats ORMI Subgraph Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$CONTRACT_ADDRESS = "0x09F0e57eA34D2c999CB31674C5Ae119A8c16ba59"
$CONTRACT_NAME = "SocialGraph"
$NETWORK = "somnia-testnet"
$SUBGRAPH_NAME = "hibeats-social-subgraph"

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Contract: $CONTRACT_NAME"
Write-Host "  Address: $CONTRACT_ADDRESS"
Write-Host "  Network: $NETWORK"
Write-Host ""

# Check if graph-cli is installed
Write-Host "🔍 Checking Graph CLI..." -ForegroundColor Yellow
$graphInstalled = Get-Command graph -ErrorAction SilentlyContinue
if (-not $graphInstalled) {
    Write-Host "❌ Graph CLI not found. Installing..." -ForegroundColor Red
    npm install -g @graphprotocol/graph-cli
} else {
    Write-Host "✅ Graph CLI installed" -ForegroundColor Green
}
Write-Host ""

# Initialize subgraph
Write-Host "📦 Initializing subgraph..." -ForegroundColor Yellow
graph init `
  --contract-name $CONTRACT_NAME `
  --from-contract $CONTRACT_ADDRESS `
  --network $NETWORK `
  --protocol ethereum `
  --index-events `
  $SUBGRAPH_NAME

Write-Host ""
Write-Host "✅ Subgraph initialized!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. cd $SUBGRAPH_NAME"
Write-Host "  2. Edit schema.graphql (see ORMI_SUBGRAPH_SETUP_GUIDE.md)"
Write-Host "  3. Edit src/social-graph.ts (see guide)"
Write-Host "  4. Run: graph codegen; graph build"
Write-Host "  5. Deploy to ORMI (see guide for deploy command)"
Write-Host ""
Write-Host "🔗 Resources:" -ForegroundColor Cyan
Write-Host "  - Guide: ..\ORMI_SUBGRAPH_SETUP_GUIDE.md"
Write-Host "  - ORMI Dashboard: https://subgraph.somnia.network/"
Write-Host ""
