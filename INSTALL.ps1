# DDT Custom Client - Automated Installer
# Run this script in PowerShell as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   DDT CUSTOM CLIENT - INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "⚠️  Please run this script as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell → Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Step 1: Check Node.js
Write-Host "[1/6] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 2: Check pnpm
Write-Host "[2/6] Checking pnpm..." -ForegroundColor Yellow
try {
    $pnpmVersion = pnpm --version 2>$null
    if ($pnpmVersion) {
        Write-Host "✅ pnpm installed: v$pnpmVersion" -ForegroundColor Green
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "⚠️  pnpm not found. Installing..." -ForegroundColor Yellow
    npm install -g pnpm
    Write-Host "✅ pnpm installed" -ForegroundColor Green
}

# Step 3: Check Git
Write-Host "[3/6] Checking Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>$null
    if ($gitVersion) {
        Write-Host "✅ Git installed: $gitVersion" -ForegroundColor Green
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "❌ Git not found!" -ForegroundColor Red
    Write-Host "   Download from: https://git-scm.com/" -ForegroundColor Yellow
    pause
    exit 1
}

# Step 4: Install dependencies
Write-Host "[4/6] Installing dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    pause
    exit 1
}

# Step 5: Build
Write-Host "[5/6] Building DDT Custom Client..." -ForegroundColor Yellow
pnpm build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful" -ForegroundColor Green
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
    pause
    exit 1
}

# Step 6: Close Discord
Write-Host "[6/6] Preparing Discord..." -ForegroundColor Yellow
$discordRunning = Get-Process Discord -ErrorAction SilentlyContinue
if ($discordRunning) {
    Write-Host "   Closing Discord..." -ForegroundColor Yellow
    Stop-Process -Name Discord -Force
    Start-Sleep -Seconds 3
    Write-Host "✅ Discord closed" -ForegroundColor Green
} else {
    Write-Host "✅ Discord not running" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: pnpm inject" -ForegroundColor White
Write-Host "2. Select your Discord installation" -ForegroundColor White
Write-Host "3. Start Discord and enable plugins!" -ForegroundColor White
Write-Host ""
Write-Host "For help, read: README.md" -ForegroundColor Cyan
Write-Host ""
pause
