# Android App Bundle (AAB) Deployment Guide

## Step 1: Generate Signing Key (If You Don't Have One)

Run this command to generate your keystore:

```bash
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias jobseekingapp
```

Follow the prompts to enter:
- Keystore password: [choose a strong password]
- Key password: [same or different]
- Common Name: Your Name
- Organization Unit: Your Company
- Organization: Your Company
- City/Locality: Your City
- State/Province: Your State
- Country Code: Your Country (2 letters, e.g., US)

**Save this file in the `mobile/android/app/` directory as `release.keystore`**

## Step 2: Environment Variables Setup

Create a `.env` file or export these environment variables:

```bash
KEYSTORE_PASSWORD=your_keystore_password
KEY_ALIAS=jobseekingapp
KEY_PASSWORD=your_key_password
```

Or for Windows PowerShell:
```powershell
$env:KEYSTORE_PASSWORD = "your_keystore_password"
$env:KEY_ALIAS = "jobseekingapp"
$env:KEY_PASSWORD = "your_key_password"
```

## Step 3: Install Dependencies

```bash
cd mobile
npm install
```

## Step 4: Build Android App Bundle (AAB)

Run the build command:

```bash
npm run android:build-aab
```

The AAB file will be located at:
```
mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## Step 5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Navigate to **Release** → **Production**
4. Click **Create new release**
5. Upload the `app-release.aab` file
6. Review, add release notes, and submit for review

## Step 6: Google Play Console Settings

Before uploading, ensure you have:
- App name: "Job Seeking App"
- Developer ID: 7733631908016012139
- Package name: com.jobseekingapp
- Content rating: Completed
- Target audience: Adults
- Privacy policy: Added

## Tips

- AAB files are more efficient than APKs (usually 20% smaller)
- Google Play automatically generates optimized APKs for each device configuration
- Always test the APK on real devices before submitting
- Keep the release.keystore file safe and never commit it to version control

## Troubleshooting

### Build fails with signing error
- Ensure environment variables are set correctly
- Check that release.keystore exists in `mobile/android/app/`

### APK not installing on device
- Check that minSdkVersion (24) matches your device
- Verify device is set to Android 7.0 or higher

### Upload rejected due to version code
- Increment versionCode in `mobile/android/app/build.gradle` for each release
