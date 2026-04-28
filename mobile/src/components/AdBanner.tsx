import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Production Ad Unit IDs
const ANDROID_BANNER_ID = 'ca-app-pub-1284812825598221/9618848649';
const IOS_BANNER_ID = 'ca-app-pub-1284812825598221/9618848649'; // update if you have a separate iOS unit

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
