# Job Seeking App - React Native Mobile

This is the React Native mobile application for the Job Seeking App, designed for deployment to Google Play Store.

## Project Structure

```
mobile/
├── src/
│   ├── screens/              # Screen components
│   ├── navigation/           # Navigation configuration
│   ├── services/             # API and auth services
│   └── types/               # TypeScript types
├── android/                  # Android-specific configuration
│   ├── app/
│   │   ├── src/
│   │   ├── build.gradle      # Android build configuration
│   │   └── proguard-rules.pro # Code obfuscation rules
│   └── gradle/              # Gradle wrapper
├── App.tsx                   # Root application component
├── index.ts                  # Entry point
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript configuration
└── ANDROID_DEPLOYMENT.md     # Deployment guide
```

## Prerequisites

- Node.js 18+ and npm 9+
- Android SDK (API 24+)
- Java Development Kit (JDK) 11+
- Android Studio (optional but recommended)

## Setup Instructions

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
API_BASE_URL=your_api_endpoint
```

### 3. Generate Signing Key

For production builds, generate a signing key:

```bash
keytool -genkey -v -keystore release.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias jobseekingapp
```

Then set environment variables:
```powershell
# Windows PowerShell
$env:KEYSTORE_PASSWORD = "your_password"
$env:KEY_ALIAS = "jobseekingapp"
$env:KEY_PASSWORD = "your_key_password"

# Linux/Mac
export KEYSTORE_PASSWORD="your_password"
export KEY_ALIAS="jobseekingapp"
export KEY_PASSWORD="your_key_password"
```

## Development

### Run on Android Device/Emulator

```bash
npm run android
```

### Start Metro Bundler

```bash
npm start
```

## Building Production AAB

### Windows:
```bash
build-aab.bat
```

### Linux/Mac:
```bash
bash build-aab.sh
```

The AAB file will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

## Google Play Deployment

See [ANDROID_DEPLOYMENT.md](./ANDROID_DEPLOYMENT.md) for detailed deployment instructions.

### Key Information

- **Developer ID**: 7733631908016012139
- **Package Name**: com.jobseekingapp
- **Version Code**: 1
- **Version Name**: 1.0.0

## Features

- Job browsing and search
- Application tracking
- User profile management
- Real-time notifications
- Supabase authentication
- Offline support

## Architecture

- **Navigation**: React Navigation (bottom tabs + stack)
- **State Management**: React hooks + Context API
- **Backend**: Supabase (PostgreSQL + Auth)
- **API Client**: Axios
- **Authentication**: Supabase Auth

## Testing

```bash
npm test
```

## Linting

```bash
npm run lint
```

## Troubleshooting

### Build fails with Java errors
- Ensure JDK 11 is installed
- Set JAVA_HOME environment variable

### Android SDK issues
- Update Android SDK via Android Studio SDK Manager
- Ensure API 34 is installed

### Gradle sync failures
- Clear Gradle cache: `rm -rf ~/.gradle`
- Run `npm install` again from mobile directory

## Performance Optimization

- App uses ProGuard minification
- Code splitting for faster loading
- Optimized assets and images
- Lazy loading of screens

## Security

- All sensitive data stored in secure Supabase Auth
- API calls over HTTPS
- Keystore file never committed to version control
- Sensitive environment variables stored locally

## Support

For issues or questions, refer to:
- [React Native Documentation](https://reactnative.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
