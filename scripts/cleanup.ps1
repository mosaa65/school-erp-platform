# ============================================
# 🧹 Cleanup - تنظيف المشروع وإعادة التثبيت
# ============================================

param(
    [switch]$All,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$CacheOnly
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  🧹 Project Cleanup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

$doBackend = $All -or $BackendOnly -or (-not $FrontendOnly -and -not $CacheOnly)
$doFrontend = $All -or $FrontendOnly -or (-not $BackendOnly -and -not $CacheOnly)

# Clean cache only
if ($CacheOnly) {
    Write-Host "🧹 تنظيف الكاش فقط..." -ForegroundColor Yellow
    
    $nextDir = Join-Path $ProjectRoot "frontend\.next"
    if (Test-Path $nextDir) {
        Remove-Item -Recurse -Force $nextDir
        Write-Host "  ✅ حذف frontend\.next" -ForegroundColor Green
    }
    
    $distDir = Join-Path $ProjectRoot "backend\dist"
    if (Test-Path $distDir) {
        Remove-Item -Recurse -Force $distDir
        Write-Host "  ✅ حذف backend\dist" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "✅ تم تنظيف الكاش" -ForegroundColor Green
    return
}

# Cleanup Backend
if ($doBackend) {
    Write-Host "🟢 تنظيف Backend..." -ForegroundColor Green
    $backendNodeModules = Join-Path $ProjectRoot "backend\node_modules"
    $backendDist = Join-Path $ProjectRoot "backend\dist"
    
    if (Test-Path $backendDist) {
        Remove-Item -Recurse -Force $backendDist
        Write-Host "  ✅ حذف backend\dist" -ForegroundColor Gray
    }
    if (Test-Path $backendNodeModules) {
        Remove-Item -Recurse -Force $backendNodeModules
        Write-Host "  ✅ حذف backend\node_modules" -ForegroundColor Gray
    }
    
    Write-Host "  📦 إعادة تثبيت الحزم..." -ForegroundColor Yellow
    Set-Location (Join-Path $ProjectRoot "backend")
    npm install
    if ($LASTEXITCODE -ne 0) { throw "فشل في تثبيت حزم Backend" }
    Write-Host "  ✅ Backend جاهز" -ForegroundColor Green
    Write-Host ""
}

# Cleanup Frontend
if ($doFrontend) {
    Write-Host "🔵 تنظيف Frontend..." -ForegroundColor Blue
    $frontendNodeModules = Join-Path $ProjectRoot "frontend\node_modules"
    $frontendNext = Join-Path $ProjectRoot "frontend\.next"
    
    if (Test-Path $frontendNext) {
        Remove-Item -Recurse -Force $frontendNext
        Write-Host "  ✅ حذف frontend\.next" -ForegroundColor Gray
    }
    if (Test-Path $frontendNodeModules) {
        Remove-Item -Recurse -Force $frontendNodeModules
        Write-Host "  ✅ حذف frontend\node_modules" -ForegroundColor Gray
    }
    
    Write-Host "  📦 إعادة تثبيت الحزم..." -ForegroundColor Yellow
    Set-Location (Join-Path $ProjectRoot "frontend")
    npm install
    if ($LASTEXITCODE -ne 0) { throw "فشل في تثبيت حزم Frontend" }
    Write-Host "  ✅ Frontend جاهز" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "  ✅ التنظيف اكتمل!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""
