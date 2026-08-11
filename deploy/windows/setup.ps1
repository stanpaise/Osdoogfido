# One-time setup: creates the venv and installs dependencies.
# Run this from PowerShell inside the repo root, or just double-click it
# after right-click > "Run with PowerShell".

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $RepoRoot

Write-Host "Creating virtual environment in $RepoRoot\.venv ..."
python -m venv .venv

Write-Host "Installing dependencies ..."
& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\pip.exe install -r requirements.txt

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host ""
    Write-Host "Created .env from .env.example -- edit it now:"
    Write-Host "  notepad .env"
    Write-Host "Set at least DASHBOARD_USERNAME and DASHBOARD_PASSWORD before running the dashboard."
} else {
    Write-Host ".env already exists, leaving it as-is."
}

Write-Host ""
Write-Host "Setup complete. Next: see README.md in this folder to run manually or install as scheduled tasks."
