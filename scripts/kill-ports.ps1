# ============================================
# 🔴 Kill Ports - إيقاف العمليات على المنافذ
# ============================================

param(
    [switch]$All,
    [int[]]$Ports = @()
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  🔴 Kill Ports" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

if ($All) {
    $Ports = @(3000, 3001, 3306, 5555)
}

if ($Ports.Count -eq 0) {
    $Ports = @(3000, 3001)
}

foreach ($port in $Ports) {
    Write-Host "🔍 البحث عن عمليات على المنفذ $port..." -ForegroundColor Yellow
    
    $connections = netstat -ano | Select-String ":$port\s" | ForEach-Object {
        if ($_ -match '\s+(\d+)\s*$') {
            [int]$matches[1]
        }
    } | Sort-Object -Unique | Where-Object { $_ -ne 0 }
    
    if ($connections) {
        foreach ($pid in $connections) {
            try {
                $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "  ⚡ إيقاف العملية: PID=$pid ($($process.ProcessName))" -ForegroundColor Red
                    Stop-Process -Id $pid -Force
                    Write-Host "  ✅ تم إيقافها" -ForegroundColor Green
                }
            } catch {
                Write-Host "  ⚠️  لم يمكن إيقاف PID=$pid" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "  ✅ المنفذ $port حر" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  ✅ تم!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
