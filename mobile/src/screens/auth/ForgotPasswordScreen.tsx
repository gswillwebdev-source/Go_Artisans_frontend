import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function ForgotPasswordScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function handleReset() {
        if (!email.trim()) { Alert.alert('Error', 'Please enter your email.'); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'https://goartisans.online/reset-password',
            });
            if (error) Alert.alert('Error', error.message);
            else setSent(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.inner}>
                <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>

                <Ionicons name="lock-closed" size={48} color="#2563eb" style={styles.icon} />
                <Text style={styles.title}>Forgot Password</Text>

                {!sent ? (
                    <>
                        <Text style={styles.subtitle}>
                            Enter your email address and we'll send you a link to reset your password.
                        </Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="your@email.com"
                                placeholderTextColor="#6b7280"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.btn, loading && styles.btnDisabled]}
                            onPress={handleReset}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.successBox}>
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text style={styles.successTitle}>Email Sent!</Text>
                        <Text style={styles.successText}>
                            Check your inbox for the password reset link. It may take a few minutes.
                        </Text>
                        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.btnText}>Back to Login</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    inner: { flexGrow: 1, padding: 24, paddingTop: 48 },
    back: { marginBottom: 24 },
    icon: { alignSelf: 'center', marginBottom: 16 },
    title: { fontSize: 26, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 8 },
    subtitle: { color: '#64748b', textAlign: 'center', fontSize: 15, marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
    input: {
        backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1,
        borderRadius: 10, color: '#0f172a', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    },
    btn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    successBox: { alignItems: 'center', gap: 16 },
    successTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
    successText: { color: '#64748b', textAlign: 'center', fontSize: 15 },
});
