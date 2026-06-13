import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import mobileAds from 'react-native-google-mobile-ads';
import App from './App';

// Component MUST be registered synchronously before RN tries to run the app
registerRootComponent(App);

// Initialize AdMob in the background — ads won't show until initialized,
// but the app launches immediately without waiting for ad SDK
mobileAds()
    .initialize()
    .catch(() => {/* ignore ad init failures */ });
