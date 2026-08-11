# Runs the view-only dashboard under waitress (a pure-Python WSGI server --
# gunicorn does not work on Windows) and restarts it if it ever exits.
# Reads DASHBOARD_HOST / DASHBOARD_PORT out of .env, defaulting to
# 127.0.0.1:8080 if unset. Intended to be launched by Windows Task Scheduler
# (see README.md in this folder) rather than run interactively.

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"
$LogDir = Join-Path $PSScriptRoot "logs"
$LogFile = Join-Path $LogDir "dashboard.log"
$EnvFile = Join-Path $RepoRoot ".env"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location $RepoRoot

if (-not (Test-Path $Python)) {
    Write-Error "Python venv not found at $Python. Run setup.ps1 first (see README.md in this folder)."
    exit 1
}

$DashboardHost = "127.0.0.1"
$DashboardPort = "8080"
if (Test-Path $EnvFile) {
    $hostLine = Select-String -Path $EnvFile -Pattern '^DASHBOARD_HOST=(.+)$'
    if ($hostLine) { $DashboardHost = $hostLine.Matches[0].Groups[1].Value.Trim() }
    $portLine = Select-String -Path $EnvFile -Pattern '^DASHBOARD_PORT=(.+)$'
    if ($portLine) { $DashboardPort = $portLine.Matches[0].Groups[1].Value.Trim() }
}

while ($true) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$timestamp] Starting dashboard on ${DashboardHost}:${DashboardPort}"
    & $Python -m waitress --host=$DashboardHost --port=$DashboardPort dashboard.app:app *>> $LogFile
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$timestamp] dashboard exited with code $LASTEXITCODE, restarting in 10s"
    Start-Sleep -Seconds 10
}
