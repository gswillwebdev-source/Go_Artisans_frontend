import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function VerifyEmailScreen({ navigation, route }) {
    const email = route?.params?.email || '';
    const [loading, setLoading] = useState(false);

    async function resend() {
        setLoading(true);
        try {
            const { error } = await supabase.auth.resend({ type: 'signup', email });
            if (error) Alert.alert('Error', error.message);
            else Alert.alert('Sent', 'Verification email resent. Check your inbox.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <Ionicons name="mail" size={64} color="#2563eb" style={styles.icon} />
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.body}>
                We sent a verification link to{'\n'}
                <Text style={styles.email}>{email}</Text>
                {'\n\n'}Please check your inbox and click the link to verify your account.
            </Text>

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={resend} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Resend Email</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', padding: 24 },
    icon: { marginBottom: 24 },
    title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 16, textAlign: 'center' },
    body: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    email: { color: '#2563eb', fontWeight: '700' },
    btn: { backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, alignItems: 'center' },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    backLink: { marginTop: 20 },
    backText: { color: '#64748b', fontSize: 15 },
});
