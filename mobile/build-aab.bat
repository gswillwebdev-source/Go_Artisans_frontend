@echo off
REM Android AAB Build Script for Windows
REM This script builds the Android App Bundle for Google Play deployment

echo ===================================
echo Job Seeking App - Android AAB Build
echo ===================================

REM Check if we're in the mobile directory
if not exist package.json (
    echo Error: package.json not found. Run this script from the mobile directory.
    exit /b 1
)

REM Check environment variables
if "%KEYSTORE_PASSWORD%"=="" (
    echo Error: KEYSTORE_PASSWORD environment variable not set
    exit /b 1
)

if "%KEY_ALIAS%"=="" (
    echo Error: KEY_ALIAS environment variable not set
    exit /b 1
)

if "%KEY_PASSWORD%"=="" (
    echo Error: KEY_PASSWORD environment variable not set
    exit /b 1
)

REM Check if keystore exists
if not exist "android\app\release.keystore" (
    echo Error: release.keystore not found in android\app\
    echo Please generate the keystore first.
    exit /b 1
)

echo Building Android App Bundle (AAB)...
cd android
call gradlew.bat clean bundleRelease
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b 1
)
cd ..

echo.
echo ===================================
echo Build Complete!
echo ===================================
echo AAB file location:
echo android\app\build\outputs\bundle\release\app-release.aab
echo.
echo Next steps:
echo 1. Upload to Google Play Console
echo 2. Complete store listing and content rating
echo 3. Submit for review
