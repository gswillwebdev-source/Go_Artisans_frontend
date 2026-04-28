# Quick Start Guide - Build and Deploy AAB to Google Play

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Android SDK installed (API 24+)
- [ ] Java 11 JDK installed
- [ ] Android Studio (recommended) or command-line tools
- [ ] Google Play Developer Account created
- [ ] Developer ID: 7733631908016012139

## Step-by-Step Deploy Guide

### Phase 1: Initial Setup (One-time)

#### 1. Install Node Dependencies
```bash
cd mobile
npm install
```

#### 2. Generate or Obtain Signing Key

**If you don't have a keystore yet:**
```bash
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias jobseekingapp
```

Save the keystore password securely!

**Place the keystore file at:**
```
mobile/android/app/release.keystore
```

#### 3. Configure Environment Variables

**Windows PowerShell:**
```powershell
$env:KEYSTORE_PASSWORD = "your_keystore_password"
$env:KEY_ALIAS = "jobseekingapp"
$env:KEY_PASSWORD = "your_key_password"
```

**Linux/Mac:**
```bash
export KEYSTORE_PASSWORD="your_keystore_password"
export KEY_ALIAS="jobseekingapp"
export KEY_PASSWORD="your_key_password"
```

#### 4. Configure App Settings

Edit `mobile/app.json`:
```json
{
  "name": "JobSeekingApp",
  "displayName": "Job Seeking App",
  "android": {
    "package": "com.jobseekingapp",
    "versionCode": 1
  }
}
```

### Phase 2: Build the AAB

#### Build Command

**Windows:**
```bash
cd mobile
build-aab.bat
```

**Linux/Mac:**
```bash
cd mobile
bash build-aab.sh
```

**Manual Build:**
```bash
cd mobile/android
gradlew bundleRelease  # or ./gradlew on Linux/Mac
cd ../..
```

#### Verify Build Succeeded

Check for AAB file at:
```
mobile/android/app/build/outputs/bundle/release/app-release.aab
```

### Phase 3: Upload to Google Play

#### 1. Go to Google Play Console
- Navigate to: https://play.google.com/console
- Select your app or create a new app

#### 2. Navigate to Release Section
- Left sidebar: **Release** → **Production**
- Click **Create new release**

#### 3. Upload AAB File
- Click **Browse files**
- Select: `mobile/android/app/build/outputs/bundle/release/app-release.aab`
- Wait for upload to complete

#### 4. Complete Store Listing

**Required Information:**
- [ ] App name: "Job Seeking App"
- [ ] Short description: "Find your next job opportunity"
- [ ] Full description: Complete feature list
- [ ] Screenshots: 2-8 for phone, 1-8 for tablet
- [ ] Feature graphic: 1024×500 recommended
- [ ] Icon: 512×512 PNG

**Category & Content:**
- [ ] Category: Productivity (or appropriate category)
- [ ] Content rating: Completed questionnaire
- [ ] Target audience: Adults, Teens (as appropriate)
- [ ] Privacy policy: Link to your privacy policy

#### 5. Setup & Policies

**Before First Release:**
- [ ] Store listing complete (100% in setup wizard)
- [ ] Content rating set
- [ ] Privacy policy added
- [ ] Target Android version: 34
- [ ] Min SDK: 24

#### 6. Submit for Review

- [ ] Review all information
- [ ] Click **Review release**
- [ ] Click **Start rollout to Production** (or staged rollout)
- [ ] Confirm submission

### Phase 4: Monitor Release

#### Tracking Your Release
1. After submission, check status at: **Release** → **Production**
2. Initial review typically takes: 1-3 hours
3. You'll receive email notification when approved/rejected

#### Common Rejection Reasons
- Missing privacy policy link
- App crashes on launch
- Permissions not justified
- Misleading store listing

#### Version Updates

**For future versions:**

1. Increment version code in `mobile/app.json`:
```json
{
  "expo": {
    "android": {
      "versionCode": 2  // Increment this
    }
  }
}
```

2. Rebuild and re-upload AAB file
3. Submit new release

## Troubleshooting

### Build Fails: "KEYSTORE_PASSWORD not set"
```powershell
# Windows - set variables and verify
$env:KEYSTORE_PASSWORD = "your_password"
$env:KEY_ALIAS = "jobseekingapp"
$env:KEY_PASSWORD = "your_password"
Get-ChildItem env:KEY* # Verify they're set
```

### Build Fails: "release.keystore not found"
- Verify file exists at: `mobile/android/app/release.keystore`
- Run keytool command to generate it

### AAB Upload Fails: "Invalid signature"
- Delete release.keystore
- Generate new keystore with keytool
- Rebuild APK/AAB
- Note: All future uploads must use same keystore

### App Crashes on Launch
1. Check logcat: `adb logcat | grep JobSeekingApp`
2. Verify Supabase credentials in .env
3. Check network connectivity
4. Review backend API status

### Long Wait in Review
- Check for policy violations
- Verify content rating completed
- Ensure privacy policy is accessible
- Try submitting to Beta track first (faster)

## Advanced: Beta Testing Before Production

### Setup Beta Track
1. Go to **Release** → **Testing** → **Open testing**
2. Create beta release with AAB
3. Share beta link: `https://play.google.com/apps/testing/com.jobseekingapp`
4. Gather feedback before production release

### Monitor Production Release
```bash
# After release is live, monitor crashes
# Go to: Release → Insights → Crashes & ANRs
```

## Performance Optimization Tips

- AAB files are 20% smaller than universal APK
- Google Play automatically creates optimized APKs per device
- First install typically takes 100-200MB + split APKs
- Updates use binary delta compression (smaller patches)

## Security Reminders

✅ **DO:**
- Keep release.keystore safe (backup offline)
- Use strong keystore password
- Never commit keystore to git
- Rotate credentials periodically

❌ **DON'T:**
- Share keystore file
- Commit .env or credentials files
- Publish signing passwords
- Use same keystore for multiple apps (unless intentional)

## Useful Commands

```bash
# List installed devices/emulators
adb devices

# View app logs
adb logcat | grep JobSeekingApp

# Clear app data
adb shell pm clear com.jobseekingapp

# Install APK for testing
adb install -r app-release.apk

# Generate APK (for local testing)
cd mobile/android
./gradlew assembleRelease
```

## Next Steps After Launch

1. **Monitor Analytics**: Check Google Play Console > Insights
2. **Update Regularly**: Monthly feature releases recommended
3. **Gather Reviews**: Respond to user reviews professionally
4. **Track Crashes**: Monitor ANR and crash statistics
5. **Version Strategy**: Plan minor/major versions

## Support Resources

- Google Play Console Help: https://support.google.com/googleplay/android-developer
- React Native: https://reactnative.dev
- Expo Documentation: https://docs.expo.dev
- Supabase: https://supabase.com/docs

---

**Estimated Time to Deploy:**
- Initial setup: 30-60 minutes
- Build process: 5-10 minutes
- Upload & review: 1-3 hours
- **Total first launch: ~2 hours**
