import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreen from './src/screens/SplashScreen';

export default function App() {
    const [showSplash, setShowSplash] = useState(true);

    return (
        <GestureHandlerRootView style={styles.container}>
            <SafeAreaProvider>
                <RootNavigator />
                {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
});
