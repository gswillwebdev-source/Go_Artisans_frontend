@echo off
setlocal enabledelayedexpansion

title Job Seeking App - Direct Java Installation

echo.
echo ========================================
echo Installing Java Development Kit (JDK)
echo ========================================
echo.

REM Download directory
set "DOWNLOAD_DIR=%TEMP%\JavaInstaller"
if not exist "!DOWNLOAD_DIR!" mkdir "!DOWNLOAD_DIR!"

REM Java installation details
set "JAVA_VERSION=17.0.2"
set "JAVA_BUILD=8"
set "DOWNLOAD_URL=https://github.com/adoptium/temurin17-binaries/releases/download/jdk17.0.2%2B8/OpenJDK17U-jdk_x64_windows_hotspot_17.0.2_8.msi"
set "INSTALLER=!DOWNLOAD_DIR!\OpenJDK17-installer.msi"
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.2+8"

echo.
echo Downloading OpenJDK 17...
echo URL: !DOWNLOAD_URL!
echo.

REM Download using PowerShell
powershell -Command "(New-Object System.Net.ServicePointManager).SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; (New-Object System.Net.WebClient).DownloadFile('!DOWNLOAD_URL!', '!INSTALLER!')"

if %errorlevel% neq 0 (
    echo ERROR: Failed to download Java
    echo.
    echo Try downloading manually:
    echo 1. Visit: https://adoptium.net/temurin/releases/?version=17
    echo 2. Download: Windows x64 MSI Installer
    echo 3. Run the installer
    echo 4. After installation, set JAVA_HOME environment variable
    echo.
    pause
    exit /b 1
)

echo Download successful!
echo.
echo Installing Java...
echo.

REM Install Java silently
msiexec /i "!INSTALLER!" /quiet /norestart

if %errorlevel% neq 0 (
    echo ERROR: MSI installation failed with code %errorlevel%
    echo.
    echo Trying alternate installation method...
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Java Installation Complete!
echo ========================================
echo.

REM Verify installation
echo Verifying Java installation...
call java -version

if %errorlevel% neq 0 (
    echo.
    echo NOTE: Java installed but not in PATH yet.
    echo Setting environment variables...
    
    REM Set JAVA_HOME
    setx JAVA_HOME "!JAVA_HOME!"
    
    echo.
    echo IMPORTANT: Please restart your terminal/PowerShell for changes to take effect!
    echo After restart, verify with: java -version
    echo.
)

echo.
echo Next: Run the AAB build script again
echo Command: .\Build-AAB.ps1 (in PowerShell) or build-and-deploy.bat (in Command Prompt)
echo.
pause

endlocal
