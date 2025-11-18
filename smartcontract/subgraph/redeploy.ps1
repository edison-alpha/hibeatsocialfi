# Redeploy subgraph script
Write-Host "🔄 Redeploying subgraph..." -ForegroundColor Cyan

# Step 1: Generate types
Write-Host "`n📝 Step 1: Generating types..." -ForegroundColor Yellow
npm run codegen
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Codegen failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Build
Write-Host "`n🔨 Step 2: Building subgraph..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy
Write-Host "`n🚀 Step 3: Deploying to Somnia..." -ForegroundColor Yellow
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deploy failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Subgraph redeployed successfully!" -ForegroundColor Green
Write-Host "⏳ Wait a few minutes for the subgraph to sync..." -ForegroundColor Cyan
