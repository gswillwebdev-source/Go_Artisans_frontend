import React, { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, ScrollView,
    Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Colors, Radius, Spacing } from '../../theme';

export default function ChooseRoleScreen() {
    const { user, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(null); // 'worker' | 'client' | null

    async function selectRole(role) {
        setLoading(role);
        try {
            const { error } = await supabase.from('users').upsert({
                id: user.id,
                email: user.email,
                first_name: user.user_metadata?.first_name || '',
                last_name: user.user_metadata?.last_name || '',
                phone_number: user.user_metadata?.phone_number || '',
                user_type: role,
                email_verified: !!user.email_confirmed_at,
            });
            if (error) {
                await supabase.from('users').update({ user_type: role }).eq('id', user.id);
            }
            await supabase.auth.updateUser({ data: { user_type: role } });
            await refreshProfile();
        } catch (e) {
            Alert.alert('Error', 'Failed to set role. Please try again.');
        } finally {
            setLoading(null);
        }
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
            <View style={styles.topDecor} />

            <View style={styles.header}>
                <Text style={styles.logo}>GoArtisans</Text>
                <View style={styles.divider} />
            </View>

            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>How will you use GoArtisans?</Text>

            {/* Worker Card */}
            <TouchableOpacity
                style={[styles.card, styles.workerCard, loading === 'worker' && styles.cardLoading]}
                onPress={() => selectRole('worker')}
                disabled={!!loading}
                activeOpacity={0.88}
            >
                {loading === 'worker' ? (
                    <ActivityIndicator color={Colors.primary} size="large" />
                ) : (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryGlow }]}>
                            <Ionicons name="construct" size={36} color={Colors.primary} />
                        </View>
                        <Text style={styles.cardTitle}>I'm a Worker</Text>
                        <Text style={styles.cardDesc}>
                            Find jobs, showcase your skills, and connect with clients looking for your expertise.
                        </Text>
                        <View style={styles.featureList}>
                            {['Browse & apply to jobs', 'Build your portfolio', 'Get hired by clients', 'Set your own rates'].map((f) => (
                                <View key={f} style={styles.feature}>
                                    <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={styles.selectBtn}>
                            <Text style={styles.selectBtnText}>Get Started as Worker</Text>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </View>
                    </>
                )}
            </TouchableOpacity>

            {/* Client Card */}
            <TouchableOpacity
                style={[styles.card, styles.clientCard, loading === 'client' && styles.cardLoading]}
                onPress={() => selectRole('client')}
                disabled={!!loading}
                activeOpacity={0.88}
            >
                {loading === 'client' ? (
                    <ActivityIndicator color={Colors.info} size="large" />
                ) : (
                    <>
                        <View style={[styles.iconCircle, { backgroundColor: Colors.infoGlow }]}>
                            <Ionicons name="business" size={36} color={Colors.info} />
                        </View>
                        <Text style={styles.cardTitle}>I'm a Client / Employer</Text>
                        <Text style={styles.cardDesc}>
                            Post jobs, browse skilled workers, and hire the best talent for your projects.
                        </Text>
                        <View style={styles.featureList}>
                            {['Post job listings', 'Browse skilled workers', 'Manage applications', 'Hire with confidence'].map((f) => (
                                <View key={f} style={styles.feature}>
                                    <Ionicons name="checkmark-circle" size={15} color={Colors.success} />
                                    <Text style={styles.featureText}>{f}</Text>
                                </View>
                            ))}
                        </View>
                        <View style={[styles.selectBtn, { backgroundColor: Colors.info }]}>
                            <Text style={styles.selectBtnText}>Get Started as Client</Text>
                            <Ionicons name="arrow-forward" size={16} color="#fff" />
                        </View>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    inner: { padding: Spacing.lg, paddingTop: 56, paddingBottom: 40 },

    topDecor: {
        position: 'absolute', top: -80, right: -80,
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: Colors.primaryGlow,
    },

    header: { alignItems: 'center', marginBottom: 28 },
    logo: {
        fontSize: 26, fontWeight: '800', color: Colors.textPrimary,
        letterSpacing: -0.5, marginBottom: 12,
    },
    divider: { width: 40, height: 3, borderRadius: 2, backgroundColor: Colors.primary },

    title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 28 },

    card: {
        backgroundColor: Colors.bgCard,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        marginBottom: 16,
        borderWidth: 1.5,
        borderColor: Colors.border,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
        minHeight: 160,
        justifyContent: 'center',
    },
    workerCard: { borderColor: Colors.primary + '60' },
    clientCard: { borderColor: Colors.info + '60' },
    cardLoading: { opacity: 0.7 },

    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
    },
    cardTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    cardDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16, lineHeight: 20 },

    featureList: { width: '100%', gap: 8, marginBottom: 20 },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureText: { color: Colors.textSecondary, fontSize: 14 },

    selectBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: Colors.primary,
        paddingHorizontal: 20, paddingVertical: 11,
        borderRadius: Radius.full,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35, shadowRadius: 6, elevation: 3,
    },
    selectBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
