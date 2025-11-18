# Deploy subgraph v4.4.0 with beatsId fix
Write-Host "🚀 Deploying HiBeats Social Subgraph v4.4.0..." -ForegroundColor Cyan
Write-Host "📝 This version fixes the beatsId missing field error" -ForegroundColor Yellow
Write-Host ""

# Deploy command
graph deploy hibeats-social-subgraph `
  --node https://api.subgraph.somnia.network/deploy `
  --ipfs https://api.subgraph.somnia.network/ipfs `
  --access-token B92G441EE2XAR6SO4G8WFFS5Q `
  --version-label v4.4.0

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Subgraph endpoint:" -ForegroundColor Cyan
    Write-Host "https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v4.4.0/gn" -ForegroundColor White
    Write-Host ""
    Write-Host "⏳ The subgraph will now start indexing from the beginning..." -ForegroundColor Yellow
    Write-Host "   This may take 10-30 minutes depending on the number of blocks to process." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔍 Monitor indexing progress at:" -ForegroundColor Cyan
    Write-Host "https://subgraph.somnia.network/" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Wait for indexing to complete (check dashboard)" -ForegroundColor White
    Write-Host "2. Update apollo-client.ts to use v4.4.0 endpoint" -ForegroundColor White
    Write-Host "3. Test NFT collections in MyCollection page" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Yellow
}
