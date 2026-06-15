$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$expoDirectory = Join-Path $root "EvolutionIdle.Expo"
$prototypeDirectory = Join-Path $root "Prototype"
$gamePort = 4180
$serverProcess = $null

function Require-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "'$Name' was not found. $InstallHint"
    }

    return $command
}

try {
    $python = Require-Command "python" "Install Python and make sure it is available on PATH."
    $npm = Require-Command "npm.cmd" "Install Node.js from https://nodejs.org/."
    $npx = Require-Command "npx.cmd" "Install Node.js from https://nodejs.org/."

    if (-not (Test-Path $prototypeDirectory)) {
        throw "Prototype directory not found: $prototypeDirectory"
    }

    if (-not (Test-Path (Join-Path $expoDirectory "package.json"))) {
        throw "Expo app not found: $expoDirectory"
    }

    if (-not (Test-Path (Join-Path $expoDirectory "node_modules"))) {
        Write-Host "Installing Expo dependencies..." -ForegroundColor Cyan
        & $npm.Source install --prefix $expoDirectory
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE."
        }
    }

    $existingListener = Get-NetTCPConnection -LocalPort $gamePort -State Listen -ErrorAction SilentlyContinue
    if ($existingListener) {
        Write-Host "Port $gamePort is already in use; using the existing game server." -ForegroundColor Yellow
    }
    else {
        Write-Host "Starting the game server on http://0.0.0.0:$gamePort ..." -ForegroundColor Cyan
        $serverProcess = Start-Process `
            -FilePath $python.Source `
            -ArgumentList @("-m", "http.server", $gamePort, "--bind", "0.0.0.0", "--directory", "Prototype") `
            -WorkingDirectory $root `
            -WindowStyle Hidden `
            -PassThru

        Start-Sleep -Milliseconds 750
        if ($serverProcess.HasExited) {
            throw "The game server exited before it could start."
        }
    }

    Write-Host ""
    Write-Host "Starting Expo Go in LAN mode..." -ForegroundColor Green
    Write-Host "Scan the QR code with Expo Go. Your phone and computer should be on the same Wi-Fi." -ForegroundColor Green
    Write-Host "Press Ctrl+C when you are finished." -ForegroundColor DarkGray
    Write-Host ""

    Push-Location $expoDirectory
    try {
        & $npx.Source expo start --lan
        if ($LASTEXITCODE -ne 0) {
            throw "Expo exited with code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
catch {
    Write-Host ""
    Write-Host "Unable to start phone testing: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Host "Stopping the game server..." -ForegroundColor DarkGray
        Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
