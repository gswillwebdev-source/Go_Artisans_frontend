@echo off
setlocal enabledelayedexpansion

REM Auto-elevate to Administrator if not already running as admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb runAs"
    exit /b
)

title Job Seeking App - AAB Build (Administrator)

echo.
echo ================================================
echo Job Seeking App - AAB Build Setup
echo ================================================
echo.

REM ========================================
REM Step 1: Check/Install Java
REM ========================================
echo [Step 1/5] Checking Java Installation...

java -version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Java is already installed
    java -version
) else (
    echo [INSTALLING] Java not found. Installing OpenJDK 17...
    choco install openjdk17 -y
    if %errorlevel% neq 0 (
        echo [ERROR] Java installation failed
        echo Please install manually: https://adoptium.net/temurin/releases/?version=17
        pause
        exit /b 1
    )
    echo [OK] Java installed successfully
    refreshenv
)

REM ========================================
REM Step 2: Check/Install Android SDK
REM ========================================
echo.
echo [Step 2/5] Checking Android SDK Installation...

set "ANDROID_SDK_ROOT=%USERPROFILE%\AppData\Local\Android\sdk"

if exist "!ANDROID_SDK_ROOT!" (
    echo [OK] Android SDK already installed at: !ANDROID_SDK_ROOT!
) else (
    echo [INSTALLING] Android SDK not found. Installing...
    choco install android-sdk -y
    if %errorlevel% neq 0 (
        echo [ERROR] Android SDK installation failed
        echo Please install manually: https://developer.android.com/studio
        pause
        exit /b 1
    )
    setx ANDROID_HOME "!ANDROID_SDK_ROOT!" >nul
    refreshenv
)

REM ========================================
REM Step 3: Install Dependencies
REM ========================================
echo.
echo [Step 3/5] Installing Node Dependencies...

cd /d "C:\Projects\job seaking app\mobile"

if exist "node_modules" (
    echo [OK] Dependencies already installed
) else (
    echo [INSTALLING] Running npm install...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed
        pause
        exit /b 1
    )
)
echo [OK] Dependencies ready

REM ========================================
REM Step 4: Generate Keystore
REM ========================================
echo.
echo [Step 4/5] Checking Signing Keystore...

if exist "android\app\release.keystore" (
    echo [OK] Keystore already exists
) else (
    echo [GENERATING] Creating new signing keystore...
    
    set "KEYSTORE_PASSWORD=JobSeekingApp@2026"
    set "KEY_ALIAS=jobseekingapp"
    set "KEY_PASSWORD=JobSeekingApp@2026"
    
    keytool -genkey -v -keystore android\app\release.keystore ^
        -keyalg RSA -keysize 2048 -validity 10000 ^
        -alias !KEY_ALIAS! ^
        -dname "CN=Job Seeking App,OU=Development,O=Job Seeking,L=Tech City,S=Tech,C=US" ^
        -storepass !KEYSTORE_PASSWORD! ^
        -keypass !KEY_PASSWORD!
    
    if %errorlevel% neq 0 (
        echo [ERROR] Keystore generation failed
        pause
        exit /b 1
    )
    echo [OK] Keystore generated
)

REM ========================================
REM Step 5: Build AAB
REM ========================================
echo.
echo [Step 5/5] Building Android App Bundle...
echo.

set "KEYSTORE_PASSWORD=JobSeekingApp@2026"
set "KEY_ALIAS=jobseekingapp"
set "KEY_PASSWORD=JobSeekingApp@2026"

cd /d "C:\Projects\job seaking app\mobile\android"

if not exist "gradlew.bat" (
    echo [ERROR] Gradle wrapper not found
    pause
    exit /b 1
)

echo [BUILDING] This may take 5-15 minutes...
echo.

call gradlew.bat clean bundleRelease ^
    -Dorg.gradle.jvmargs="-Xmx4096m" ^
    -Dorg.gradle.workers.max=8

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

REM ========================================
REM Verify Build
REM ========================================
cd /d "C:\Projects\job seaking app\mobile"

if exist "android\app\build\outputs\bundle\release\app-release.aab" (
    echo.
    echo ================================================
    echo [OK] AAB FILE READY FOR GOOGLE PLAY!
    echo ================================================
    echo.
    echo File location:
    echo   %cd%\android\app\build\outputs\bundle\release\app-release.aab
    echo.
    echo File size:
    for %%A in (android\app\build\outputs\bundle\release\app-release.aab) do (
        set /A size=%%~zA / 1048576
        echo   Approximately !size! MB
    )
    echo.
    echo Next: Upload to Google Play Console
    echo   1. Go to https://play.google.com/console
    echo   2. Select your app
    echo   3. Release > Production > Create new release
    echo   4. Upload the AAB file
    echo.
    pause
) else (
    echo [ERROR] AAB file not found at expected location
    echo Expected: android\app\build\outputs\bundle\release\app-release.aab
    pause
    exit /b 1
)

cd /d "C:\Projects\job seaking app\mobile"
endlocal

