# Test Subgraph Endpoint
# Run this to verify deployment

Write-Host "🧪 Testing HiBeats Subgraph Endpoint..." -ForegroundColor Cyan
Write-Host ""

$endpoint = "https://api.subgraph.somnia.network/api/public/801a9dbd-5ca8-40a3-bf29-5309f9d3177c/subgraphs/hibeats-social-subgraph/v.0.01/gn"

$query = @"
{
  "query": "{ globalStats(id: \"global\") { totalUsers totalPosts totalLikes totalComments lastUpdated } }"
}
"@

try {
    Write-Host "📡 Endpoint: $endpoint" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📤 Sending query..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Body $query -ContentType "application/json"
    
    Write-Host "✅ SUCCESS! Subgraph is responding!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Global Stats:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10)
    
} catch {
    Write-Host "❌ Error testing endpoint:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "💡 This might be normal if:" -ForegroundColor Yellow
    Write-Host "  - Subgraph is still syncing (wait 1-2 minutes)"
    Write-Host "  - No posts have been created yet"
    Write-Host "  - Indexing hasn't started yet"
}

Write-Host ""
Write-Host "Visit ORMI Dashboard:" -ForegroundColor Cyan
Write-Host "https://subgraph.somnia.network/"
