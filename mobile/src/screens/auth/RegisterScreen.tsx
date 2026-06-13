import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { Colors, Radius, Spacing } from '../../theme';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'online.goartisans.app://auth/callback';

const PASSWORD_RULES = [
    { key: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { key: 'upper', label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { key: 'lower', label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
    { key: 'number', label: 'One number', test: (p) => /[0-9]/.test(p) },
    { key: 'special', label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterScreen({ navigation }) {
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

    const passwordStrength = PASSWORD_RULES.filter((r) => r.test(form.password));
    const passwordValid = passwordStrength.length === PASSWORD_RULES.length;

    async function handleRegister() {
        if (!form.firstName || !form.lastName || !form.email || !form.password) {
            Alert.alert('Error', 'Please fill in all required fields.');
            return;
        }
        if (!passwordValid) {
            Alert.alert('Weak Password', 'Your password does not meet all requirements.');
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: {
                    data: {
                        first_name: form.firstName.trim(),
                        last_name: form.lastName.trim(),
                        phone_number: form.phone.trim(),
                    },
                },
            });
            if (error) {
                Alert.alert('Registration Failed', error.message);
            } else if (data.session) {
                // Already confirmed
            } else {
                navigation.navigate('VerifyEmail', { email: form.email.trim() });
            }
        } catch (e) {
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignup() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
            });
            if (error) { Alert.alert('Google Sign Up Failed', error.message); return; }
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);
                if (result.type === 'success' && result.url) {
                    const hashPart = result.url.includes('#') ? result.url.split('#')[1] : (result.url.split('?')[1] || '');
                    const params = new URLSearchParams(hashPart);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');
                    if (access_token && refresh_token) {
                        await supabase.auth.setSession({ access_token, refresh_token });
                    }
                }
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to initiate Google sign up.');
        }
    }

    const strengthPct = (passwordStrength.length / PASSWORD_RULES.length) * 100;
    const strengthColor = strengthPct < 40 ? Colors.error : strengthPct < 80 ? Colors.warning : Colors.success;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {/* Top nav */}
                <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                    <View style={styles.backCircle}>
                        <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
                    </View>
                </TouchableOpacity>

                <View style={styles.headRow}>
                    <View style={styles.logoBorder}>
                        <Image source={require('../../../assets/icon.png')} style={styles.logoImg} resizeMode="cover" />
                    </View>
                    <View>
                        <Text style={styles.logoText}>GoArtisans</Text>
                        <Text style={styles.subtitle}>Create your account</Text>
                    </View>
                </View>

                <View style={styles.card}>
                    {/* Name Row */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                            <Text style={styles.label}>First Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.firstName}
                                onChangeText={(v) => update('firstName', v)}
                                placeholder="John"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Last Name *</Text>
                            <TextInput
                                style={styles.input}
                                value={form.lastName}
                                onChangeText={(v) => update('lastName', v)}
                                placeholder="Doe"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email *</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="mail-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }]}
                                value={form.email}
                                onChangeText={(v) => update('email', v)}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="call-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }]}
                                value={form.phone}
                                onChangeText={(v) => update('phone', v)}
                                placeholder="+1 234 567 8900"
                                placeholderTextColor={Colors.textMuted}
                                keyboardType="phone-pad"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password *</Text>
                        <View style={styles.inputRow}>
                            <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                            <TextInput
                                style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 0 }]}
                                value={form.password}
                                onChangeText={(v) => update('password', v)}
                                placeholder="••••••••"
                                placeholderTextColor={Colors.textMuted}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                            </TouchableOpacity>
                        </View>
                        {form.password.length > 0 && (
                            <>
                                <View style={styles.strengthBar}>
                                    <View style={[styles.strengthFill, { width: `${strengthPct}%` as any, backgroundColor: strengthColor }]} />
                                </View>
                                <View style={styles.passwordRules}>
                                    {PASSWORD_RULES.map((rule) => {
                                        const ok = rule.test(form.password);
                                        return (
                                            <View key={rule.key} style={styles.ruleRow}>
                                                <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={13} color={ok ? Colors.success : Colors.textMuted} />
                                                <Text style={[styles.ruleText, { color: ok ? Colors.success : Colors.textMuted }]}>{rule.label}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.btn, (loading || !passwordValid) && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading || !passwordValid}
                        activeOpacity={0.85}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.btnText}>Create Account</Text>
                        }
                    </TouchableOpacity>

                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or sign up with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignup} activeOpacity={0.85}>
                        <Text style={styles.googleG}>G</Text>
                        <Text style={styles.googleText}>Continue with Google</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginText}>
                            Already have an account?{' '}
                            <Text style={styles.loginTextBold}>Sign In</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { flexGrow: 1, padding: Spacing.lg, paddingTop: 52, paddingBottom: 32 },

    back: { marginBottom: 20 },
    backCircle: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.bgCard,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },

    headRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
    logoBorder: {
        width: 56, height: 56, borderRadius: 14,
        overflow: 'hidden', borderWidth: 2, borderColor: Colors.primary,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
    },
    logoImg: { width: '100%', height: '100%' },
    logoText: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
    subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        borderWidth: 1,
        borderColor: Colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 6,
    },

    row: { flexDirection: 'row' },
    inputGroup: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bg,
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: 12, paddingVertical: 2,
    },
    input: {
        backgroundColor: Colors.bg,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: Radius.md,
        color: Colors.textPrimary,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 15,
    },

    strengthBar: {
        height: 3, backgroundColor: Colors.border, borderRadius: 2, marginTop: 8, marginBottom: 8, overflow: 'hidden',
    },
    strengthFill: { height: '100%', borderRadius: 2 },
    passwordRules: { gap: 5 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    ruleText: { fontSize: 12 },

    btn: {
        backgroundColor: Colors.primary,
        paddingVertical: 15, borderRadius: Radius.md,
        alignItems: 'center', marginTop: 4, marginBottom: 18,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    },
    btnDisabled: { opacity: 0.45 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
    dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    dividerText: { color: Colors.textMuted, fontSize: 12 },

    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: Colors.bgElevated,
        borderWidth: 1, borderColor: Colors.border,
        borderRadius: Radius.md, paddingVertical: 12, gap: 10, marginBottom: 20,
    },
    googleG: { fontSize: 17, fontWeight: '800', color: '#4285F4' },
    googleText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },

    loginLink: { alignItems: 'center' },
    loginText: { color: Colors.textMuted, fontSize: 14 },
    loginTextBold: { color: Colors.primary, fontWeight: '700' },
});
