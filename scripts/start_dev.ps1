# Start backend + frontend in two terminals (Windows PowerShell)
# Usage: scripts\start_dev.ps1

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "ESNAF AI - Dev Start" -ForegroundColor Cyan
Write-Host "Root: $Root"

# Backend in a new window
$backendCmd = "Set-Location '$Root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd
Write-Host "Backend baslatildi -> http://localhost:8000" -ForegroundColor Green

Start-Sleep -Seconds 2

# Frontend in a new window
$frontendCmd = "Set-Location '$Root\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd
Write-Host "Frontend baslatildi -> http://localhost:3000" -ForegroundColor Green

Write-Host "`nIki pencere de acildi. Kapatmak icin pencereleri kapatin." -ForegroundColor Yellow
