# ============================================
# 🗄️ Database Setup - إعداد قاعدة البيانات
# ============================================

param(
    [switch]$Docker,
    [switch]$Migrate,
    [switch]$Seed,
    [switch]$SeedDemo,
    [switch]$Studio,
    [switch]$Full
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  🗄️ Database Setup" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

Set-Location $BackendDir

# If -Full is specified, run everything
if ($Full) {
    $Docker = $true
    $Migrate = $true
    $Seed = $true
}

# Start Docker MySQL if requested
if ($Docker) {
    Write-Host "🐳 تشغيل قاعدة البيانات عبر Docker..." -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "فشل في تشغيل Docker" }
    
    Write-Host "⏳ انتظار جاهزية قاعدة البيانات..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    Write-Host "✅ Docker MySQL جاهز" -ForegroundColor Green
    Write-Host ""
}

# Generate Prisma Client
Write-Host "⚙️  توليد Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) { throw "فشل في توليد Prisma Client" }
Write-Host "✅ Prisma Client جاهز" -ForegroundColor Green
Write-Host ""

# Run migrations
if ($Migrate -or $Full) {
    Write-Host "📊 تطبيق الترحيلات (Migrations)..." -ForegroundColor Yellow
    npm run prisma:migrate:deploy
    if ($LASTEXITCODE -ne 0) { throw "فشل في تطبيق الترحيلات" }
    Write-Host "✅ الترحيلات مطبقة" -ForegroundColor Green
    Write-Host ""
}

# Seed core data
if ($Seed -or $Full) {
    Write-Host "🌱 إدخال البيانات الأساسية..." -ForegroundColor Yellow
    npm run prisma:seed:core
    if ($LASTEXITCODE -ne 0) { throw "فشل في إدخال البيانات الأساسية" }
    Write-Host "✅ البيانات الأساسية جاهزة" -ForegroundColor Green
    Write-Host ""
}

# Seed demo data
if ($SeedDemo) {
    Write-Host "🌱 إدخال البيانات التجريبية..." -ForegroundColor Yellow
    npm run prisma:seed:demo
    if ($LASTEXITCODE -ne 0) { throw "فشل في إدخال البيانات التجريبية" }
    Write-Host "✅ البيانات التجريبية جاهزة" -ForegroundColor Green
    Write-Host ""
}

# Open Prisma Studio
if ($Studio) {
    Write-Host "🔍 فتح Prisma Studio..." -ForegroundColor Yellow
    npm run prisma:studio
}

Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  ✅ إعداد قاعدة البيانات اكتمل!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
