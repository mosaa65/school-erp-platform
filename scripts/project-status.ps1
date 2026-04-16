# ============================================
# 📊 Project Status - حالة المشروع
# ============================================

$ErrorActionPreference = "SilentlyContinue"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  📊 School ERP - Project Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Git Status
Write-Host "🌿 Git:" -ForegroundColor Green
$branch = git rev-parse --abbrev-ref HEAD 2>&1
$lastCommit = git log --oneline -1 2>&1
$changes = (git status --porcelain 2>&1 | Measure-Object).Count
Write-Host "   الفرع: $branch" -ForegroundColor White
Write-Host "   آخر commit: $lastCommit" -ForegroundColor Gray
Write-Host "   ملفات معدلة: $changes" -ForegroundColor $(if ($changes -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

# Port Status
Write-Host "🔌 المنافذ:" -ForegroundColor Green
$ports = @(
    @{Port=3000; Name="Backend"},
    @{Port=3001; Name="Frontend"},
    @{Port=3306; Name="MySQL"}
)
foreach ($p in $ports) {
    $conn = netstat -ano 2>$null | Select-String ":$($p.Port)\s.*LISTENING"
    $status = if ($conn) { "🟢 يعمل" } else { "🔴 متوقف" }
    Write-Host "   $($p.Name) (:$($p.Port)): $status"
}
Write-Host ""

# Node Modules
Write-Host "📦 الحزم:" -ForegroundColor Green
$backendModules = Test-Path (Join-Path $ProjectRoot "backend\node_modules")
$frontendModules = Test-Path (Join-Path $ProjectRoot "frontend\node_modules")
Write-Host "   Backend node_modules: $(if ($backendModules) { '✅ موجود' } else { '❌ غير موجود' })"
Write-Host "   Frontend node_modules: $(if ($frontendModules) { '✅ موجود' } else { '❌ غير موجود' })"
Write-Host ""

# Docker
Write-Host "🐳 Docker:" -ForegroundColor Green
$dockerRunning = docker ps --filter "name=school-erp-mysql" --format "{{.Status}}" 2>&1
if ($LASTEXITCODE -eq 0 -and $dockerRunning) {
    Write-Host "   MySQL Container: 🟢 $dockerRunning"
} else {
    Write-Host "   MySQL Container: 🔴 غير مشغّل (أو Docker غير مثبت)"
}
Write-Host ""

# Environment files
Write-Host "⚙️  ملفات البيئة:" -ForegroundColor Green
$backendEnv = Test-Path (Join-Path $ProjectRoot "backend\.env")
$frontendEnv = Test-Path (Join-Path $ProjectRoot "frontend\.env.local")
Write-Host "   backend/.env: $(if ($backendEnv) { '✅ موجود' } else { '❌ غير موجود - انسخ .env.example' })"
Write-Host "   frontend/.env.local: $(if ($frontendEnv) { '✅ موجود' } else { '❌ غير موجود - انسخ .env.example' })"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
