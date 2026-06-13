import React, { useEffect, useRef } from 'react';
import { View, Text, Image, Animated, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../theme';

const { width, height } = Dimensions.get('window');

interface Props {
    onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
    const logoScale = useRef(new Animated.Value(0.6)).current;
    const logoOpacity = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;
    const ringScale = useRef(new Animated.Value(0.5)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            // Step 1: Ring + logo appear
            Animated.parallel([
                Animated.spring(logoScale, {
                    toValue: 1,
                    tension: 60,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(ringScale, {
                    toValue: 1.2,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(ringOpacity, {
                    toValue: 0.15,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
            // Step 2: Text slides in
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.timing(taglineOpacity, {
                    toValue: 1,
                    duration: 400,
                    delay: 150,
                    useNativeDriver: true,
                }),
            ]),
            // Hold for a moment
            Animated.delay(1000),
            // Step 3: Fade out
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => onFinish());
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            {/* Decorative rings */}
            <Animated.View
                style={[
                    styles.ring,
                    { transform: [{ scale: ringScale }], opacity: ringOpacity },
                ]}
            />
            <Animated.View
                style={[
                    styles.ring,
                    styles.ring2,
                    { transform: [{ scale: ringScale }], opacity: ringOpacity },
                ]}
            />

            {/* Logo */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    { transform: [{ scale: logoScale }], opacity: logoOpacity },
                ]}
            >
                <View style={styles.logoBorder}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={styles.logo}
                        resizeMode="cover"
                    />
                </View>
            </Animated.View>

            {/* App name */}
            <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
                GoArtisans
            </Animated.Text>

            {/* Tagline */}
            <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                Find skilled artisans near you
            </Animated.Text>

            {/* Dots */}
            <View style={styles.dotsRow}>
                {[0, 1, 2].map((i) => (
                    <View key={i} style={[styles.dot, i === 1 && styles.dotActive]} />
                ))}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999,
    },
    ring: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        borderWidth: 40,
        borderColor: Colors.primary,
        opacity: 0.08,
    },
    ring2: {
        width: 380,
        height: 380,
        borderRadius: 190,
        borderWidth: 30,
    },
    logoContainer: {
        marginBottom: 28,
    },
    logoBorder: {
        width: 100,
        height: 100,
        borderRadius: 26,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 18,
        elevation: 12,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    appName: {
        fontSize: 36,
        fontWeight: '800',
        color: Colors.textPrimary,
        letterSpacing: -1,
        marginBottom: 8,
    },
    tagline: {
        fontSize: 16,
        color: Colors.textSecondary,
        letterSpacing: 0.3,
        marginBottom: 48,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 6,
        position: 'absolute',
        bottom: 60,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.border,
    },
    dotActive: {
        width: 20,
        backgroundColor: Colors.primary,
    },
});
