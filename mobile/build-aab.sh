#!/bin/bash

# Android AAB Build Script
# This script builds the Android App Bundle for Google Play deployment

set -e

echo "==================================="
echo "Job Seeking App - Android AAB Build"
echo "==================================="

# Check if we're in the mobile directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Run this script from the mobile directory."
    exit 1
fi

# Check environment variables
if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
    echo "Error: Required environment variables not set"
    echo "Please set: KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD"
    exit 1
fi

# Check if keystore exists
if [ ! -f "android/app/release.keystore" ]; then
    echo "Error: release.keystore not found in android/app/"
    echo "Please generate the keystore first."
    exit 1
fi

echo "Building Android App Bundle (AAB)..."
cd android
./gradlew clean bundleRelease
cd ..

echo ""
echo "==================================="
echo "Build Complete!"
echo "==================================="
echo "AAB file location:"
echo "android/app/build/outputs/bundle/release/app-release.aab"
echo ""
echo "Next steps:"
echo "1. Upload to Google Play Console"
echo "2. Complete store listing and content rating"
echo "3. Submit for review"
