# ============================================
# 🧪 Run Tests - تشغيل الاختبارات
# ============================================

param(
    [ValidateSet("all", "backend", "frontend", "e2e", "finance", "qa")]
    [string]$Target = "all",
    [switch]$Watch,
    [switch]$Coverage
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  🧪 Running Tests - $Target" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

switch ($Target) {
    "backend" {
        Set-Location (Join-Path $ProjectRoot "backend")
        if ($Watch) {
            Write-Host "👀 تشغيل اختبارات Backend مع المراقبة..." -ForegroundColor Cyan
            npm run test:watch
        } elseif ($Coverage) {
            Write-Host "📊 تشغيل اختبارات Backend مع التغطية..." -ForegroundColor Cyan
            npm run test:cov
        } else {
            Write-Host "🧪 تشغيل اختبارات Backend..." -ForegroundColor Cyan
            npm test
        }
    }
    "frontend" {
        Set-Location (Join-Path $ProjectRoot "frontend")
        Write-Host "🧪 تشغيل اختبارات Frontend E2E..." -ForegroundColor Cyan
        npm run e2e
    }
    "e2e" {
        Set-Location (Join-Path $ProjectRoot "backend")
        Write-Host "🧪 تشغيل اختبارات Backend E2E..." -ForegroundColor Cyan
        npm run test:e2e
    }
    "finance" {
        Write-Host "🧪 تشغيل اختبارات النظام المالي..." -ForegroundColor Cyan
        
        Set-Location (Join-Path $ProjectRoot "backend")
        Write-Host "  📌 Backend Finance E2E..." -ForegroundColor Gray
        npm run test:e2e:finance
        
        Set-Location (Join-Path $ProjectRoot "frontend")
        Write-Host "  📌 Frontend Finance E2E..." -ForegroundColor Gray
        npm run e2e:finance
    }
    "qa" {
        Write-Host "🔍 فحص الجودة الشامل..." -ForegroundColor Cyan
        
        Set-Location (Join-Path $ProjectRoot "backend")
        Write-Host "  📌 Backend QA..." -ForegroundColor Gray
        npm run qa:release
        
        Set-Location (Join-Path $ProjectRoot "frontend")
        Write-Host "  📌 Frontend QA..." -ForegroundColor Gray
        npm run qa:release
    }
    "all" {
        Set-Location (Join-Path $ProjectRoot "backend")
        Write-Host "🧪 Backend Unit Tests..." -ForegroundColor Cyan
        npm test
        
        Write-Host ""
        Write-Host "🧪 Backend E2E Tests..." -ForegroundColor Cyan
        npm run test:e2e
        
        Set-Location (Join-Path $ProjectRoot "frontend")
        Write-Host ""
        Write-Host "🧪 Frontend E2E Tests..." -ForegroundColor Cyan
        npm run e2e
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  ✅ الاختبارات اكتملت!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
