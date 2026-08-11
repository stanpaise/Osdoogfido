# Running on a Windows VPS (RDP)

This covers hosts like fxsvps.com and other "Forex VPS" providers, which
default to Windows Server accessed via Remote Desktop rather than SSH.

## 1. Connect

Open Remote Desktop Connection (Windows: `mstsc`; Mac: Microsoft Remote
Desktop app; Linux: Remmina or similar) and connect using the IP:port and
credentials from your provider's control panel, e.g. `176.9.28.194:39552`.

## 2. Install Python and Git

Inside the RDP session, open a browser and download:

- Python 3.11+ from https://www.python.org/downloads/windows/ — **during
  install, check "Add python.exe to PATH"**, this is off by default and
  everything below assumes it's on.
- Git for Windows from https://git-scm.com/download/win — default options
  are fine.

Verify both installed correctly by opening **PowerShell** (Start menu ->
search "PowerShell") and running:

```powershell
python --version
git --version
```

## 3. Get the code

```powershell
cd C:\
git clone -b claude/cross-platform-trading-bot-6ezh2k https://github.com/stanpaise/Osdoogfido.git
cd C:\Osdoogfido
```

(Once the PR is merged, drop `-b claude/...` to clone `main` instead.)

## 4. Run setup

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\setup.ps1
```

This creates the venv, installs dependencies (including `waitress`, the
Windows-compatible WSGI server the dashboard runs under here — `gunicorn`,
used in the Linux instructions, does not work on Windows), and copies
`.env.example` to `.env` if you don't already have one.

Edit `.env`:

```powershell
notepad .env
```

At minimum set `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD`. Leave
`DRY_RUN=true` until you've confirmed everything works.

## 5. Test it manually first

Open two PowerShell windows (both `cd C:\Osdoogfido`):

```powershell
# window 1
.\.venv\Scripts\python.exe -m bot.main
```

```powershell
# window 2
.\.venv\Scripts\python.exe -m waitress --host=127.0.0.1 --port=8080 dashboard.app:app
```

Then, **inside the RDP session**, open a browser to `http://127.0.0.1:8080`
and log in with the credentials you set. You should see live quotes
updating every few seconds. `Ctrl+C` both windows once you've confirmed
this works.

## 6. Make it persistent with Task Scheduler

The RDP session doesn't need to stay open for the bot to keep running once
it's registered as a scheduled task — Windows Task Scheduler runs these
independently of any logged-in session.

Open PowerShell **as Administrator** (right-click PowerShell -> "Run as
administrator") and run:

```powershell
$repo = "C:\Osdoogfido"

$botAction = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$repo\deploy\windows\run-bot.ps1`""
$dashAction = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$repo\deploy\windows\run-dashboard.ps1`""

$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -DontStopOnIdleEnd -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName "OsdoogfidoBot" -Action $botAction -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest
Register-ScheduledTask -TaskName "OsdoogfidoDashboard" -Action $dashAction -Trigger $trigger -Settings $settings -User "SYSTEM" -RunLevel Highest

# Start them now instead of waiting for the next reboot
Start-ScheduledTask -TaskName "OsdoogfidoBot"
Start-ScheduledTask -TaskName "OsdoogfidoDashboard"
```

`run-bot.ps1` and `run-dashboard.ps1` each loop forever and restart the
process if it ever exits (mirroring `Restart=on-failure` from the Linux
systemd units), so you don't need Task Scheduler's own retry logic — just
"start at boot" via `-AtStartup`.

Check they're running:

```powershell
Get-ScheduledTask -TaskName "OsdoogfidoBot", "OsdoogfidoDashboard" | Get-ScheduledTaskInfo
```

`LastTaskResult` of `0x00000000` (or `267009` while still running) is good.
Logs are written to `deploy\windows\logs\bot.log` and
`deploy\windows\logs\dashboard.log`:

```powershell
Get-Content deploy\windows\logs\bot.log -Wait -Tail 30
```

(`Ctrl+C` to stop watching — this doesn't stop the task.)

Open `http://127.0.0.1:8080` in a browser inside the RDP session at any
time to check the dashboard — no need to keep a PowerShell window open for
it anymore.

## 7. Stopping / restarting

```powershell
Stop-ScheduledTask -TaskName "OsdoogfidoBot"
Stop-ScheduledTask -TaskName "OsdoogfidoDashboard"
# then, after editing .env or pulling new code:
Start-ScheduledTask -TaskName "OsdoogfidoBot"
Start-ScheduledTask -TaskName "OsdoogfidoDashboard"
```

Note `Stop-ScheduledTask` kills the current process but the restart loop
inside each script means a plain process kill (e.g. via Task Manager)
would just bring it back in 10 seconds — use `Stop-ScheduledTask`, which
also disables the task's current run, or `Disable-ScheduledTask` if you
want it to stay off across a reboot too.

## 8. Viewing the dashboard from your own computer (optional)

By default the dashboard only listens on `127.0.0.1` *inside* the VPS, so
you have to RDP in to view it — which is the simplest and most secure
option, since it never touches the public internet. If you'd rather check
it from your own browser without opening RDP each time:

1. In `.env`, change `DASHBOARD_HOST=127.0.0.1` to `DASHBOARD_HOST=0.0.0.0`.
2. Open the port in Windows Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "Osdoogfido Dashboard" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
   ```
3. Open the same port in fxsvps.com's control panel if it has a separate
   network-level firewall (check their dashboard for a firewall/security
   groups section).
4. Restart the dashboard task: `Restart-ScheduledTask -TaskName "OsdoogfidoDashboard"` (or Stop then Start).
5. Browse to `http://176.9.28.194:8080` from your own machine.

**This sends your Basic Auth password in cleartext** (plain HTTP, no TLS)
— acceptable for a quick check, not for routine use. If you want this open
long-term, put a TLS-terminating reverse proxy in front of it instead (e.g.
[Caddy for Windows](https://caddyserver.com/docs/install#windows), which
can provision a free HTTPS certificate automatically) rather than exposing
port 8080 directly.
