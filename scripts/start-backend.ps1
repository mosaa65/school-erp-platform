# ============================================
# 🟢 Start Backend - تشغيل سيرفر الباكيند
# ============================================

param(
    [switch]$Prod,
    [switch]$Debug,
    [switch]$Install
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  🟢 Starting Backend Server" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Set-Location $BackendDir

# Install dependencies if requested
if ($Install) {
    Write-Host "📦 تثبيت الحزم..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "فشل في تثبيت الحزم" }
    Write-Host "✅ تم تثبيت الحزم" -ForegroundColor Green
    Write-Host ""
}

# Generate Prisma client
Write-Host "⚙️  توليد Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { throw "فشل في توليد Prisma Client" }
Write-Host "✅ Prisma Client جاهز" -ForegroundColor Green
Write-Host ""

# Start server
if ($Prod) {
    Write-Host "🚀 تشغيل وضع الإنتاج..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "فشل في بناء المشروع" }
    Write-Host "🟢 Backend running on http://localhost:3000" -ForegroundColor Green
    npm run start:prod
} elseif ($Debug) {
    Write-Host "🔍 تشغيل وضع Debug..." -ForegroundColor Cyan
    Write-Host "🟢 Backend running on http://localhost:3000" -ForegroundColor Green
    npm run start:debug
} else {
    Write-Host "🔧 تشغيل وضع التطوير..." -ForegroundColor Cyan
    Write-Host "🟢 Backend running on http://localhost:3000" -ForegroundColor Green
    Write-Host "📖 Swagger docs: http://localhost:3000/api/docs" -ForegroundColor Gray
    npm run start:dev
}
