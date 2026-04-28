import { registerRootComponent } from 'expo';
import mobileAds from 'react-native-google-mobile-ads';
import App from './App';

// Initialize AdMob before rendering — required in release builds
mobileAds()
    .initialize()
    .then(() => {
        registerRootComponent(App);
    })
    .catch(() => {
        // If ads fail to init, still launch the app
        registerRootComponent(App);
    });
