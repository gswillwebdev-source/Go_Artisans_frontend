# Job Seeking App - Complete AAB Build Setup
# This script handles all prerequisites and builds the AAB file

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ========================================
# Helper Functions
# ========================================

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Write-Header {
    param([string]$Text)
    $width = 50
    $padding = [math]::Floor(($width - $Text.Length) / 2)
    Write-Host ""
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host (" " * $padding) + $Text -ForegroundColor Cyan
    Write-Host ("=" * $width) -ForegroundColor Cyan
    Write-Host ""
}

function Write-Success {
    param([string]$Text)
    Write-Host "[OK] $Text" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Text)
    Write-Host "[ERROR] $Text" -ForegroundColor Red
}

function Write-Info {
    param([string]$Text)
    Write-Host "[INFO] $Text" -ForegroundColor Yellow
}

# ========================================
# Main Script
# ========================================

Write-Header "Job Seeking App - AAB Build Environment Setup"

# Change to mobile directory
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Info "Working directory: $(Get-Location)"

$buildSuccessful = $false

try {
    # ========================================
    # Step 1: Check Java
    # ========================================
    Write-Header "Step 1: Java Development Kit"
    
    if (Test-Command java) {
        Write-Success "Java is installed"
        java -version 2>&1 | Select-Object -First 3
    } else {
        Write-Error-Custom "Java not found - INSTALLING..."
        
        # Try to install via Chocolatey
        if (Test-Command choco) {
            Write-Info "Installing OpenJDK 17 via Chocolatey..."
            choco install openjdk17 -y
            Write-Success "Java installed"
        } else {
            Write-Error-Custom "Please install Java manually from: https://adoptium.net/temurin/releases/?version=17"
            throw "Java is required"
        }
    }
    
    # ========================================
    # Step 2: Check Android SDK
    # ========================================
    Write-Header "Step 2: Android SDK"
    
    $androidSdkRoot = "$env:USERPROFILE\AppData\Local\Android\sdk"
    
    if (Test-Path $androidSdkRoot) {
        Write-Success "Android SDK found at: $androidSdkRoot"
    } else {
        Write-Error-Custom "Android SDK not found - Need to install"
        
        if (Test-Command choco) {
            Write-Info "Installing Android SDK..."
            choco install android-sdk -y
            Write-Success "Android SDK installed"
        } else {
            Write-Error-Custom "Please install Android Studio manually from: https://developer.android.com/studio"
            throw "Android SDK is required"
        }
    }
    
    # ========================================
    # Step 3: Environment Variables
    # ========================================
    Write-Header "Step 3: Environment Configuration"
    
    $env:ANDROID_HOME = $androidSdkRoot
    [Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidSdkRoot, "User")
    Write-Success "ANDROID_HOME set to: $androidSdkRoot"
    
    # ========================================
    # Step 4: Node Dependencies
    # ========================================
    Write-Header "Step 4: Node Dependencies"
    
    if (Test-Command npm) {
        Write-Success "npm is available"
        Write-Info "Installing Node packages (this may take a few minutes)..."
        npm install --legacy-peer-deps 2>&1 | Select-Object -Last 5
        Write-Success "Dependencies installed"
    } else {
        throw "npm is required but not found"
    }
    
    # ========================================
    # Step 5: Signing Keystore
    # ========================================
    Write-Header "Step 5: Signing Keystore Generation"
    
    $keystorePath = "android\app\release.keystore"
    
    if (Test-Path $keystorePath) {
        Write-Success "Keystore already exists at: $keystorePath"
    } else {
        Write-Info "Generating new signing keystore..."
        
        $keystorePassword = "JobSeekingApp@2026"
        $keyAlias = "jobseekingapp"
        $keyPassword = "JobSeekingApp@2026"
        
        & keytool -genkey -v -keystore $keystorePath `
            -keyalg RSA -keysize 2048 -validity 10000 `
            -alias $keyAlias `
            -dname "CN=Job Seeking App, OU=Development, O=Job Seeking, L=Tech City, S=Tech, C=US" `
            -storepass $keystorePassword `
            -keypass $keyPassword
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Keystore generated successfully"
            Write-Host ""
            Write-Host "Credentials (save somewhere safe):" -ForegroundColor Yellow
            Write-Host "  Keystore Password: $keystorePassword"
            Write-Host "  Key Alias: $keyAlias"
            Write-Host "  Key Password: $keyPassword"
            Write-Host ""
        } else {
            throw "Failed to generate keystore"
        }
    }
    
    # ========================================
    # Step 6: Build AAB
    # ========================================
    Write-Header "Building Android App Bundle (AAB)"
    
    $env:KEYSTORE_PASSWORD = "JobSeekingApp@2026"
    $env:KEY_ALIAS = "jobseekingapp"
    $env:KEY_PASSWORD = "JobSeekingApp@2026"
    
    Push-Location -Path "android"
    
    if (-not (Test-Path "gradlew.bat")) {
        Pop-Location
        throw "Gradle wrapper not found at android/gradlew.bat"
    }
    
    Write-Info "Starting Gradle build (this may take 5-15 minutes)..."
    & ".\gradlew.bat" clean bundleRelease `
        -Dorg.gradle.jvmargs="-Xmx4096m" `
        -Dorg.gradle.workers.max=8 2>&1 | Tee-Object -Variable buildOutput | Select-Object -Last 20
    
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-Error-Custom "Gradle build failed"
        throw "Build failed. Check output above."
    }
    
    Pop-Location
    
    # ========================================
    # Verify & Report
    # ========================================
    Write-Header "Build Status"
    
    $aabFile = "android\app\build\outputs\bundle\release\app-release.aab"
    
    if (Test-Path $aabFile) {
        $aabSize = (Get-Item $aabFile).Length
        $aabSizeMB = [math]::Round($aabSize / 1MB, 2)
        
        Write-Success "AAB file created successfully!"
        Write-Host ""
        Write-Host "File Details:" -ForegroundColor Cyan
        Write-Host "  Full Path: $(Resolve-Path $aabFile)"
        Write-Host "  Size: $aabSize bytes ($aabSizeMB MB)"
        Write-Host ""
        
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "  1. Visit: https://play.google.com/console"
        Write-Host "  2. Create or select your app"
        Write-Host "  3. Go to: Release > Production > Create new release"
        Write-Host "  4. Upload: $aabFile"
        Write-Host "  5. Complete store listing and submit for review"
        Write-Host ""
        
        $buildSuccessful = $true
    } else {
        Write-Error-Custom "AAB file not created at expected location"
        Write-Host "Expected: $aabFile"
        throw "Build verification failed"
    }
    
} catch {
    Write-Host ""
    Write-Error-Custom "Build process failed: $_"
    Write-Host ""
    exit 1
}

Write-Success "Build process completed successfully!"
Write-Host ""
exit 0
