# Runs the trading bot and restarts it if it ever exits, logging to deploy\windows\logs\bot.log.
# Intended to be launched by Windows Task Scheduler (see README.md in this folder) rather than
# run interactively, so it does not exit on its own -- stop it via Task Scheduler or Ctrl+C.

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$LogDir = Join-Path $PSScriptRoot "logs"
$LogFile = Join-Path $LogDir "bot.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $RepoRoot

if (-not (Test-Path $Python)) {
    Write-Error "Python venv not found at $Python. Run setup.ps1 first (see README.md in this folder)."
    exit 1
}

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$timestamp] Starting bot.main"
    & $Python -m bot.main *>> $LogFile
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$timestamp] bot.main exited with code $LASTEXITCODE, restarting in 10s"
    Start-Sleep -Seconds 10
}
