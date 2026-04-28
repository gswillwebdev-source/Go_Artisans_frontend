# AAB Build Setup - Execute This Now

Your system is missing Java Development Kit (JDK) and Android SDK. I've created automated scripts to install them and build the AAB, but you need to execute one of these setup scripts.

## Quick Start (Choose One)

### Option A: PowerShell (RECOMMENDED)
```powershell
# 1. Open PowerShell as Administrator
# 2. Navigate to mobile directory
cd "c:\Projects\job seaking app\mobile"

# 3. Allow script execution (one-time)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 4. Run the build script
.\Build-AAB.ps1
```

### Option B: Command Prompt (Batch)
```cmd
# 1. Open Command Prompt as Administrator
# 2. Navigate to mobile directory
cd "c:\Projects\job seaking app\mobile"

# 3. Run the setup and build
build-and-deploy.bat
```

---

## What These Scripts Do

The scripts will automatically:

1. **Install Java (OpenJDK 17)** - Required to run Android build tools
2. **Install Android SDK** - Required to compile Android code
3. **Set Environment Variables** - Configure paths correctly
4. **Install Node Dependencies** - npm packages
5. **Generate Signing Keystore** - For Google Play security
6. **Build AAB File** - Final Android App Bundle

---

## About Chocolatey Package Manager

Both scripts use Chocolatey which requires Administrator privileges:

**If you don't have Chocolatey installed:**
```powershell
# Run in PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

---

## Manual Installation (If Scripts Fail)

### Step 1: Install Java
1. Download: https://adoptium.net/temurin/releases/?version=17
2. Run installer
3. Verify: `java -version`

### Step 2: Install Android Studio
1. Download: https://developer.android.com/studio
2. Run installer
3. Complete setup wizard
4. Open SDK Manager (Tools > SDK Manager)
5. Install:
   - Android SDK API Level 34
   - Android SDK Build-Tools 34.0.0
6. Close Android Studio

### Step 3: Set Environment Variables
```
ANDROID_HOME = C:\Users\[YourUsername]\AppData\Local\Android\sdk
JAVA_HOME = C:\Program Files\[JavaFolder]
```

### Step 4: Build Manually
```bash
cd mobile
npm install
cd android
gradlew.bat clean bundleRelease
cd ..
```

---

## If Build Script Works - What You'll Get

**Success Output:**
```
✓ AAB file created successfully!

File Details:
  Path: C:\Projects\job seaking app\mobile\android\app\build\outputs\bundle\release\app-release.aab
  Size: [X MB]

The file is ready for Google Play upload!
```

---

## After AAB is Built - Google Play Upload

1. **Log in to Google Play Console**
   - URL: https://play.google.com/console
   - Use your Google account

2. **Create App (if needed)**
   - App name: "Job Seeking App"
   - Default language: English
   - App category: Productivity
   - Type: Paid/Free (your choice)

3. **Upload AAB File**
   - Navigate: Release → Production → Create new release
   - Click: "Browse files"
   - Select: `app-release.aab` from the mobile folder
   - Wait for processing (2-5 minutes)

4. **Complete Store Listing**
   - Fill all required fields:
     - Screenshots (at least 2)
     - App description
     - Category
     - Contact info
     - Content rating questionnaire
     - Privacy policy URL

5. **Submit for Review**
   - Review all information
   - Click: "Start rollout to Production"
   - Google will review (1-3 hours typically)

---

## Important Notes

### Keystore Credentials (Auto-generated)
```
Keystore Password: JobSeekingApp@2026
Key Alias: jobseekingapp
Key Password: JobSeekingApp@2026
```
**Keep these safe! You'll need them for future updates.**

### AAB File Location
```
c:\Projects\job seaking app\mobile\android\app\build\outputs\bundle\release\app-release.aab
```

### File Size Expectations
- AAB size: typically 50-100 MB (varies by code/assets)
- Google Play generates optimized APKs per device (users download ~20-30 MB)

### Version Code
Current version: `1.0.0` (Version Code: 1)

For future updates, increment versionCode in:
- `mobile\app.json`
- `mobile\android\app\build.gradle`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Java not found" | Install from https://adoptium.net |
| "Android SDK not found" | Install Android Studio and SDK API 34 |
| "Gradle build failed" | Ensure Android SDK API 34 is installed |
| "Permission denied" | Run PowerShell/CMD as Administrator |
| "Module not found (npm)" | Run `npm install` in mobile folder |

---

## Next Actions

1. **Right now:** Run one of the setup scripts (PowerShell or Batch)
2. **Follow prompts** for any additional installation steps
3. **Wait for build** (5-15 minutes)
4. **When complete:** AAB file will be ready
5. **On Google account verification:** Upload to Google Play Console

---

## Questions?

If build fails:
1. Read error messages carefully
2. Check that Java and Android SDK are installed
3. Ensure Administrator privileges
4. Try manual installation if scripts fail
5. Run build script from mobile directory

**The entire process:**
- Setup time: 5-30 minutes (includes downloads)
- Build time: 5-15 minutes
- **Total: ~45 minutes until AAB is ready**

---

Once the AAB is built and you verify your Google Play account, you can upload immediately!
