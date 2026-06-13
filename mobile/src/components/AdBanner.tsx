import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// TODO: Replace test IDs with your real AdMob ad unit IDs before production release
// Production Ad Unit IDs (from your AdMob account)
const ANDROID_BANNER_ID = 'ca-app-pub-3940256099942544/6300978111'; // Test ID — replace with real unit
const IOS_BANNER_ID = 'ca-app-pub-3940256099942544/2934735716';     // Test ID — replace with real unit

const adUnitId = __DEV__
    ? TestIds.BANNER
    : Platform.OS === 'ios'
        ? IOS_BANNER_ID
        : ANDROID_BANNER_ID;

interface AdBannerProps {
    size?: keyof typeof BannerAdSize;
}

const AdBanner: React.FC<AdBannerProps> = ({ size = 'BANNER' }) => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

    return (
        <View style={styles.container}>
            <BannerAd
                unitId={adUnitId}
                size={BannerAdSize[size] ?? BannerAdSize.BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: false }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: '100%',
    },
});

export default AdBanner;
