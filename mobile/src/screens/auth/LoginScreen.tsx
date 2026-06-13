import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { Colors, Radius, Spacing } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'online.goartisans.app://auth/callback';
const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    async function handleLogin() {
        if (!email.trim() || !password) {
            Alert.alert('Missing Fields', 'Please enter your email and password.');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });
            if (error) {
                if ((error.message || '').toLowerCase().includes('email not confirmed')) {
                    navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
                } else {
                    Alert.alert('Login Failed', error.message);
                }
            }
        } catch (e) {
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setGoogleLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: REDIRECT_URL,
                    skipBrowserRedirect: true,
                },
            });
            if (error) {
                Alert.alert('Google Login Failed', error.message);
                return;
            }
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
                if (result.type === 'success' && result.url) {
                    const urlStr = result.url;
                    const hashPart = urlStr.includes('#') ? urlStr.split('#')[1] : (urlStr.split('?')[1] || '');
                    const params = new URLSearchParams(hashPart);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');
                    if (access_token && refresh_token) {
                        const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (sessionError) Alert.alert('Session Error', sessionError.message);
                    }
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to initiate Google login.');
        } finally {
            setGoogleLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoBorder}>
                        <Image source={require('../../../assets/icon.png')} style={styles.logoImg} resizeMode="cover" />
                    </View>
                    <Text style={styles.appName}>GoArtisans</Text>
                    <Text style={styles.tagline}>Connect. Hire. Get hired.</Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Welcome back</Text>
                    <Text style={styles.cardSub}>Sign in to continue</Text>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={password}
                                onChangeText={setPassword}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Forgot */}
                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
                        <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>

                    {/* Sign In */}
                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnText}>Sign In</Text>
                        }
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google */}
                    <TouchableOpacity
                        style={[styles.googleBtn, googleLoading && styles.btnDisabled]}
                        onPress={handleGoogleLogin}
                        disabled={googleLoading}
                        activeOpacity={0.85}
                    >
                        {googleLoading ? (
                            <ActivityIndicator color={Colors.textSecondary} />
                        ) : (
                            <>
                                <Text style={styles.googleG}>G</Text>
                                <Text style={styles.googleText}>Continue with Google</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Sign Up */}
                    <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.signupText}>
                            Don't have an account?{' '}
                            <Text style={styles.signupBold}>Create one</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flexGrow: 1, padding: Spacing.lg, paddingTop: 60 },

    header: { alignItems: 'center', marginBottom: 32 },
    logoBorder: {
        width: 80, height: 80, borderRadius: 22,
        overflow: 'hidden', borderWidth: 2.5, borderColor: Colors.primary,
        marginBottom: 14,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    logoImg: { width: '100%', height: '100%' },
    appName: {
        fontSize: 30, fontWeight: '800', color: Colors.textPrimary,
        letterSpacing: -0.5, marginBottom: 4,
    },
    tagline: { fontSize: 14, color: Colors.textMuted },

    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xxl,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    cardTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
    cardSub: { fontSize: 14, color: Colors.textMuted, marginBottom: 24 },

    inputGroup: { marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bg,
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 12,
    },
    inputIcon: { marginRight: 8 },
    input: {
        flex: 1,
        color: Colors.textPrimary,
        paddingVertical: 13,
        fontSize: 15,
    },
    eyeBtn: { padding: 4, marginLeft: 4 },

    forgotRow: { alignItems: 'flex-end', marginBottom: 20, marginTop: -4 },
    forgotText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },

    btn: {
        backgroundColor: Colors.primary,
        paddingVertical: 15,
        borderRadius: Radius.md,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    btnDisabled: { opacity: 0.55 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { color: Colors.textMuted, fontSize: 12 },

    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.bgElevated,
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingVertical: 13, gap: 10, marginBottom: 24,
    },
    googleG: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
    googleText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },

    signupLink: { alignItems: 'center' },
    signupText: { color: Colors.textMuted, fontSize: 14 },
    signupBold: { color: Colors.primary, fontWeight: '700' },
});
