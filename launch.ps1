$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Step($msg)  { Write-Host "  >>  $msg" -ForegroundColor Cyan }
function OK($msg)    { Write-Host "  OK  $msg" -ForegroundColor Green }
function Warn($msg)  { Write-Host "  !!  $msg" -ForegroundColor Yellow }
function Fatal($msg) { Write-Host "  XX  $msg" -ForegroundColor Red; Read-Host "Press Enter to exit"; exit 1 }

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host "   AMSV  --  Local Development Launcher" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor DarkCyan
Write-Host ""

# ── 1. Docker ────────────────────────────────────────────────────────────────
Step "Checking Docker Desktop..."
try {
    docker info 2>&1 | Out-Null
    OK "Docker is running"
} catch {
    Fatal "Docker Desktop is not running. Start it from the system tray and try again."
}

# ── 2. Start containers ──────────────────────────────────────────────────────
Step "Starting database and backend..."
Set-Location $Root
docker compose up -d --build
if ($LASTEXITCODE -ne 0) { Fatal "docker compose up failed. Run 'docker compose logs' for details." }

# ── 3. Wait for backend health ───────────────────────────────────────────────
Step "Waiting for backend to be ready..."
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) { break }
    } catch {}
    Start-Sleep 2
}
try {
    Invoke-WebRequest "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2 | Out-Null
    OK "Backend ready at http://localhost:8000"
} catch {
    Fatal "Backend did not start in time. Run 'docker compose logs backend' to diagnose."
}

# ── 4. Import Bible text (once) ──────────────────────────────────────────────
Step "Checking Bible text..."
$imported = $false
try {
    Invoke-WebRequest "http://localhost:8000/chapter?book=John&chapter=1" -UseBasicParsing | Out-Null
    $imported = $true
} catch {}

if ($imported) {
    OK "Bible text already loaded"
} else {
    Step "Importing Bible text (one-time setup, ~30 seconds)..."
    docker compose exec backend python scripts/import_bible_text.py data/asv_og.txt
    if ($LASTEXITCODE -ne 0) { Fatal "Bible text import failed." }
    OK "Bible text imported"
}

# ── 5. Start frontend ────────────────────────────────────────────────────────
Step "Starting frontend dev server..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$Root\frontend\scripture-flow'; Write-Host 'Installing dependencies...' -ForegroundColor Cyan; bun install; Write-Host 'Starting dev server...' -ForegroundColor Cyan; bun run dev"
)

Step "Waiting for frontend..."
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline) {
    try {
        Invoke-WebRequest "http://localhost:5173" -UseBasicParsing -TimeoutSec 2 | Out-Null
        break
    } catch {}
    Start-Sleep 2
}

# ── 6. Open browser ──────────────────────────────────────────────────────────
Step "Opening browser..."
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor DarkGreen
Write-Host "   App    ->  http://localhost:5173" -ForegroundColor Green
Write-Host "   API    ->  http://localhost:8000/docs" -ForegroundColor Green
Write-Host "   Health ->  http://localhost:8000/health" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Press Enter to STOP all services and exit." -ForegroundColor Gray
Read-Host | Out-Null

# ── 7. Shutdown ──────────────────────────────────────────────────────────────
Step "Stopping services..."
docker compose down
OK "All services stopped."
Start-Sleep 1
