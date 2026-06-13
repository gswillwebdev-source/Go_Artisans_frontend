import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Colors, Radius, Spacing } from '../../theme';

export default function JobDetailScreen({ navigation, route }) {
    const jobId = route?.params?.jobId;
    const { user, profile } = useAuth();
    const subscription = useSubscription();
    const { canApplyToJobs, usage, FREE_APPLY_LIMIT, PRO_APPLY_LIMIT, isFree, isPro } = subscription || {};

    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [hasApplied, setHasApplied] = useState(false);
    const [applying, setApplying] = useState(false);
    const [saved, setSaved] = useState(false);
    const [savingJob, setSavingJob] = useState(false);

    useEffect(() => {
        if (!jobId) { setLoading(false); return; }
        fetchJob();
        if (user) {
            checkApplied();
            checkSaved();
        }
    }, [jobId]);

    async function fetchJob() {
        const { data } = await supabase
            .from('jobs')
            .select('id, title, description, budget, location, category, status, created_at, client:client_id(id, first_name, last_name, email, phone_number, location, rating, completed_jobs)')
            .eq('id', jobId)
            .single();
        setJob(data);
        setLoading(false);
    }

    async function checkApplied() {
        const { data } = await supabase
            .from('applications')
            .select('id')
            .eq('job_id', jobId)
            .eq('worker_id', user.id)
            .maybeSingle();
        setHasApplied(!!data);
    }

    async function checkSaved() {
        const { data } = await supabase
            .from('saved_jobs')
            .select('job_id')
            .eq('job_id', jobId)
            .eq('user_id', user.id)
            .maybeSingle();
        setSaved(!!data);
    }

    async function applyToJob() {
        if (!canApplyToJobs()) {
            const limit = isFree ? FREE_APPLY_LIMIT : PRO_APPLY_LIMIT;
            Alert.alert(
                'Application Limit Reached',
                `You've used all ${limit} applications this month. Upgrade to apply to more jobs.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Upgrade', onPress: () => navigation.navigate('Pricing') },
                ]
            );
            return;
        }
        setApplying(true);
        try {
            const { error } = await supabase.from('applications').insert({
                job_id: jobId,
                worker_id: user.id,
                status: 'pending',
                created_at: new Date().toISOString(),
            });
            if (error) throw error;
            setHasApplied(true);
            Alert.alert('Success', 'Application submitted successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to apply. Please try again.');
        } finally {
            setApplying(false);
        }
    }

    async function toggleSave() {
        setSavingJob(true);
        try {
            if (saved) {
                await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('user_id', user.id);
                setSaved(false);
            } else {
                await supabase.from('saved_jobs').insert({ job_id: jobId, user_id: user.id });
                setSaved(true);
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to save job.');
        } finally {
            setSavingJob(false);
        }
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;
    }

    if (!jobId || !job) {
        return (
            <View style={styles.center}>
                <Text style={styles.errorText}>{!jobId ? 'Invalid job link' : 'Job not found'}</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backLink}>Go Back</Text></TouchableOpacity>
            </View>
        );
    }

    const isWorker = profile?.user_type === 'worker';
    const isClient = profile?.user_type === 'client';
    const isMyJob = isClient && job.client?.id === user?.id;
    // Show apply section for any logged-in user who isn't the job's client owner
    const canSeeApplySection = user && !isMyJob && (isWorker || (!isClient && !!user));

    return (
        <ScrollView style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#f97316" />
                </TouchableOpacity>
                {isWorker && (
                    <TouchableOpacity onPress={toggleSave} disabled={savingJob}>
                        <Ionicons
                            name={saved ? 'bookmark' : 'bookmark-outline'}
                            size={24}
                            color={saved ? '#f97316' : '#9ca3af'}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Category badge */}
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{job.category || 'General'}</Text>
            </View>

            <Text style={styles.title}>{job.title}</Text>

            {/* Meta grid (like website) */}
            <View style={styles.metaGrid}>
                {job.location && (
                    <View style={styles.metaGridItem}>
                        <Text style={styles.metaGridLabel}>Location</Text>
                        <Text style={styles.metaGridValue}>{job.location}</Text>
                    </View>
                )}
                {job.category && (
                    <View style={styles.metaGridItem}>
                        <Text style={styles.metaGridLabel}>Category</Text>
                        <Text style={styles.metaGridValue}>{job.category}</Text>
                    </View>
                )}
                {job.budget && (
                    <View style={styles.metaGridItem}>
                        <Text style={styles.metaGridLabel}>Budget</Text>
                        <Text style={[styles.metaGridValue, { color: Colors.success }]}>CFA {job.budget}</Text>
                    </View>
                )}
                <View style={styles.metaGridItem}>
                    <Text style={styles.metaGridLabel}>Posted</Text>
                    <Text style={styles.metaGridValue}>{new Date(job.created_at).toLocaleDateString()}</Text>
                </View>
            </View>

            {/* Status chip */}
            <View style={styles.statusRow}>
                <View style={[styles.statusChip, { backgroundColor: job.status === 'active' ? Colors.successGlow : Colors.bgElevated }]}>
                    <Text style={{ color: job.status === 'active' ? Colors.success : Colors.textMuted, fontSize: 12, fontWeight: '700' }}>{job.status?.toUpperCase()}</Text>
                </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Job Description</Text>
                <Text style={styles.description}>{job.description}</Text>
            </View>

            {/* Client info */}
            {job.client && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About the Client</Text>
                    <View style={styles.clientCard}>
                        <View style={styles.clientAvatar}>
                            <Ionicons name="person" size={22} color={Colors.textMuted} />
                        </View>
                        <View style={styles.clientInfo}>
                            <Text style={styles.clientName}>{job.client.first_name} {job.client.last_name}</Text>
                            {job.client.email && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="mail-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.clientMeta}>{job.client.email}</Text>
                                </View>
                            )}
                            {job.client.phone_number && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="call-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.clientMeta}>{job.client.phone_number}</Text>
                                </View>
                            )}
                            {job.client.location && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                    <Text style={styles.clientMeta}>{job.client.location}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Apply button - show for any worker / logged-in non-client */}
            {canSeeApplySection && job.status === 'active' && (
                <View style={styles.applySection}>
                    {hasApplied ? (
                        <View style={styles.appliedBadge}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                            <Text style={styles.appliedText}>✓ Already Applied</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.applyUsage}>
                                {usage?.job_applications ?? 0}/{isFree ? FREE_APPLY_LIMIT : isPro ? PRO_APPLY_LIMIT : '∞'} applications used this month
                            </Text>
                            <TouchableOpacity
                                style={[styles.applyBtn, applying && styles.applyBtnDisabled]}
                                onPress={applyToJob}
                                disabled={applying}
                            >
                                {applying ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Ionicons name="send" size={18} color="#fff" />
                                        <Text style={styles.applyBtnText}>Apply Now</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
    topBar: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: 12,
    },
    categoryBadge: {
        marginHorizontal: Spacing.lg, alignSelf: 'flex-start',
        backgroundColor: Colors.primaryGlow, paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: Radius.full, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5,
    },
    categoryText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
    title: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, paddingHorizontal: Spacing.lg, marginBottom: 14, lineHeight: 32, letterSpacing: -0.3 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.lg, gap: 10, marginBottom: 8 },
    metaItem: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
    },
    metaText: { color: Colors.textSecondary, fontSize: 13 },
    metaGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10,
        marginHorizontal: Spacing.lg, marginBottom: Spacing.lg,
        backgroundColor: Colors.bgElevated, borderRadius: Radius.md, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    metaGridItem: { width: '46%', minWidth: 130 },
    metaGridLabel: { fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    metaGridValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
    statusRow: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
    statusChip: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
    postedDate: { paddingHorizontal: Spacing.lg, color: Colors.textMuted, fontSize: 12, marginBottom: 20 },
    section: { paddingHorizontal: Spacing.lg, marginBottom: 22 },
    sectionTitle: { fontWeight: '700', color: Colors.textPrimary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 12 },
    description: { color: Colors.textSecondary, fontSize: 15, lineHeight: 24 },
    clientCard: {
        flexDirection: 'row', gap: 14, backgroundColor: Colors.bgCard,
        padding: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    },
    clientAvatar: {
        width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.bgElevated,
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border,
    },
    clientInfo: { flex: 1, gap: 4 },
    clientName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    clientMeta: { color: Colors.textMuted, fontSize: 12 },
    applySection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
    applyUsage: { color: Colors.textMuted, fontSize: 12, marginBottom: 10, textAlign: 'center' },
    applyBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: Colors.primary, paddingVertical: 15, borderRadius: Radius.md,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
    },
    applyBtnDisabled: { opacity: 0.55 },
    applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    appliedBadge: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: Colors.successGlow, paddingVertical: 15, borderRadius: Radius.md,
        borderWidth: 1, borderColor: Colors.success + '50',
    },
    appliedText: { color: Colors.success, fontWeight: '700', fontSize: 15 },
    errorText: { color: Colors.error, fontSize: 16, marginBottom: 12 },
    backLink: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
