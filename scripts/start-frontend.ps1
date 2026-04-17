# ============================================
# 🔵 Start Frontend - تشغيل سيرفر الفرونتيند
# ============================================

param(
    [switch]$Prod,
    [switch]$Install
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$FrontendDir = Join-Path $ProjectRoot "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Blue
Write-Host "  🔵 Starting Frontend Server" -ForegroundColor Blue
Write-Host "========================================" -ForegroundColor Blue
Write-Host ""

Set-Location $FrontendDir

# Install dependencies if requested
if ($Install) {
    Write-Host "📦 تثبيت الحزم..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "فشل في تثبيت الحزم" }
    Write-Host "✅ تم تثبيت الحزم" -ForegroundColor Green
    Write-Host ""
}

if ($Prod) {
    Write-Host "🚀 بناء وتشغيل وضع الإنتاج..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "فشل في بناء المشروع" }
    Write-Host "🔵 Frontend running on http://localhost:3001" -ForegroundColor Green
    npm run start
} else {
    Write-Host "🔧 تشغيل وضع التطوير..." -ForegroundColor Cyan
    Write-Host "🔵 Frontend running on http://localhost:3001" -ForegroundColor Green
    npm run dev
}
