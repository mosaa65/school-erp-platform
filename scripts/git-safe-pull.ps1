# ============================================
# 🔄 Git Safe Pull - سحب التحديثات بأمان
# يحفظ تعديلاتك المحلية تلقائياً قبل السحب
# ============================================

param(
    [string]$Branch = "main",
    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🔄 Git Safe Pull" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Check for local changes
$status = git status --porcelain 2>&1
$hasChanges = $status -and $status.Length -gt 0

if ($hasChanges) {
    Write-Host "📦 حفظ التعديلات المحلية مؤقتاً (stash)..." -ForegroundColor Yellow
    git stash push -m "auto-stash before pull $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    if ($LASTEXITCODE -ne 0) { throw "فشل في حفظ التعديلات" }
    Write-Host "✅ تم حفظ التعديلات" -ForegroundColor Green
} else {
    Write-Host "✅ لا توجد تعديلات محلية" -ForegroundColor Green
}

Write-Host ""
Write-Host "⬇️  سحب التحديثات من $Remote/$Branch..." -ForegroundColor Cyan
git pull $Remote $Branch
if ($LASTEXITCODE -ne 0) { throw "فشل في سحب التحديثات" }
Write-Host "✅ تم سحب التحديثات بنجاح" -ForegroundColor Green

if ($hasChanges) {
    Write-Host ""
    Write-Host "📦 استرجاع التعديلات المحلية..." -ForegroundColor Yellow
    git stash pop
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  يوجد تعارضات! قم بحلها يدوياً" -ForegroundColor Red
        Write-Host "   التعديلات المحلية محفوظة في stash - استخدم: git stash list" -ForegroundColor Yellow
    } else {
        Write-Host "✅ تم استرجاع التعديلات بنجاح" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ العملية اكتملت!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
