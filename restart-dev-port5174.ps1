# restart-dev-port5174.ps1
# Stops any process listening on port 5174, then starts the dev server.
# Run from Explorer: right-click -> "Run with PowerShell" or use the accompanying .cmd launcher.

try {
    $e = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($e) {
        $pid = $e.OwningProcess
        Write-Host "Found listener on port 5174, stopping PID: $pid"
        try {
            Stop-Process -Id $pid -Force -ErrorAction Stop
            Write-Host "Stopped PID: $pid"
        } catch {
            Write-Host "Failed to stop PID: $pid —" $_.Exception.Message
        }
    } else {
        Write-Host "No listener on port 5174"
    }

    Push-Location "c:/Users/USER/voids-arcana"
    Write-Host "Starting dev server on port 5174..."
    # Start a new PowerShell process so the dev server stays interactive in its own window
    $args = '-NoProfile -ExecutionPolicy Bypass -NoExit -Command "npm run dev -- --port 5174"'
    Start-Process -FilePath pwsh -ArgumentList $args -WindowStyle Normal -ErrorAction SilentlyContinue
    # Fallback to Windows PowerShell if pwsh isn't available
    if ($LASTEXITCODE -ne 0) {
        Start-Process -FilePath powershell -ArgumentList $args -WindowStyle Normal
    }
    Pop-Location
} catch {
    Write-Host "Error while attempting restart:" $_.Exception.Message
}

Write-Host "Launcher finished (dev server will run in its own window)."
