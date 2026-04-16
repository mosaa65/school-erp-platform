# ============================================
# 📤 Git Commit & Push - حفظ ورفع التعديلات
# ============================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    [string]$Branch = "",
    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  📤 Git Commit & Push" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Show status
Write-Host "📋 الملفات المعدلة:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Stage all changes
Write-Host "📦 إضافة كل الملفات..." -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -ne 0) { throw "فشل في إضافة الملفات" }

# Commit
Write-Host "💾 حفظ التعديلات: $Message" -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) { throw "فشل في حفظ التعديلات" }
Write-Host "✅ تم الحفظ" -ForegroundColor Green

# Determine branch
if (-not $Branch) {
    $Branch = git rev-parse --abbrev-ref HEAD 2>&1
}

# Push
Write-Host ""
Write-Host "⬆️  رفع التعديلات إلى $Remote/$Branch..." -ForegroundColor Cyan
git push $Remote $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  فشل في الرفع - جاري المحاولة مع --set-upstream..." -ForegroundColor Yellow
    git push --set-upstream $Remote $Branch
    if ($LASTEXITCODE -ne 0) { throw "فشل في رفع التعديلات" }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ تم رفع التعديلات بنجاح!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
