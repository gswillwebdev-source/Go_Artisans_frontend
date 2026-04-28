# Direct Java Installation Script - PowerShell Version
# This script downloads and installs OpenJDK 17 directly

param(
    [switch]$Silent
)

$ErrorActionPreference = "Continue"

function Write-Section {
    param([string]$Text)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

Write-Section "Installing Java Development Kit (JDK 17)"

# Create temp directory for downloads
$downloadDir = "$env:TEMP\JavaInstaller"
if (-not (Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force | Out-Null
}

Write-Host "Attempting to download Java from multiple sources..." -ForegroundColor Yellow
Write-Host ""

# First, try direct URL without TLS issues
$downloadUrl = "https://adoptium.net/download/attachments/5505052/OpenJDK17U-jdk_x64_windows_hotspot_17.0.2_8.msi"
$installerPath = Join-Path $downloadDir "OpenJDK17.msi"

Write-Host "Downloading..." -ForegroundColor Yellow

[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing -TimeoutSec 60
    Write-Host "Download successful!" -ForegroundColor Green
} catch {
    Write-Host "Primary download failed, trying alternative..." -ForegroundColor Yellow
    
    try {
        $downloadUrl = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk17.0.11%2B9/OpenJDK17U-jdk_x64_windows_hotspot_17.0.11_9.msi"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing -TimeoutSec 60
        Write-Host "Download successful!" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "DOWNLOAD FAILED - Please download manually:" -ForegroundColor Red
        Write-Host ""
        Write-Host "1. Visit: https://adoptium.net/temurin/releases/?version=17" -ForegroundColor Cyan
        Write-Host "2. Download: Windows x64 MSI"
        Write-Host "3. Run the installer"
        Write-Host "4. Restart PowerShell"
        Write-Host "5. Run the build: .\Build-AAB.ps1"
        Write-Host ""
        exit 1
    }
}

if (-not (Test-Path $installerPath)) {
    Write-Host "ERROR: Installer file not created" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing Java..." -ForegroundColor Yellow

$process = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$installerPath`" /quiet /norestart" -NoNewWindow -PassThru -Wait

if ($process.ExitCode -eq 0 -or $process.ExitCode -eq 3010) {
    Write-Host "Java installation completed!" -ForegroundColor Green
    
    # Refresh environment
    $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    
    Start-Sleep -Seconds 2
    
    Write-Host ""
    Write-Host "IMPORTANT: Restart PowerShell and run the build again" -ForegroundColor Yellow
    Write-Host "1. Close this PowerShell window completely"
    Write-Host "2. Open a NEW PowerShell window"
    Write-Host "3. Change to: c:\Projects\job seaking app\mobile"
    Write-Host "4. Run: .\Build-AAB.ps1"
    Write-Host ""
} else {
    Write-Host "Installation failed with code: $($process.ExitCode)" -ForegroundColor Red
    exit 1
}

Read-Host "Press Enter to exit"
