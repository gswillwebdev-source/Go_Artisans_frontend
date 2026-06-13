import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';

export default function SavedJobsScreen({ navigation }) {
    const { user } = useAuth();
    const { isFree } = useSubscription();
    const [savedJobs, setSavedJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchSaved() {
        try {
            const { data } = await supabase
                .from('saved_jobs')
                .select('created_at, job:job_id(id, title, description, budget, location, status, created_at, category)')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            setSavedJobs(data || []);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => { fetchSaved(); }, []);

    async function unsave(jobId) {
        await supabase.from('saved_jobs').delete().eq('job_id', jobId).eq('user_id', user.id);
        setSavedJobs((prev) => prev.filter((s) => s.job?.id !== jobId));
    }

    if (isFree) {
        return (
            <View style={styles.container}>
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#f97316" /></TouchableOpacity>
                    <Text style={styles.title}>Saved Jobs</Text>
                </View>
                <View style={styles.center}>
                    <Ionicons name="lock-closed" size={48} color="#6b7280" />
                    <Text style={styles.lockedTitle}>Pro Feature</Text>
                    <Text style={styles.lockedDesc}>Upgrade to Pro or Premium to save jobs for later.</Text>
                    <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Pricing')}>
                        <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#f97316" /></TouchableOpacity>
                <Text style={styles.title}>Saved Jobs</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>
            ) : (
                <FlatList
                    data={savedJobs}
                    keyExtractor={(s) => String(s.job?.id)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSaved(); }} tintColor="#f97316" />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="bookmark-outline" size={48} color="#374151" />
                            <Text style={styles.emptyText}>No saved jobs yet</Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const job = item.job;
                        if (!job) return null;
                        return (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => navigation.navigate('JobDetail', { jobId: job.id })}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.jobTitle} numberOfLines={2}>{job.title}</Text>
                                    <TouchableOpacity onPress={() => unsave(job.id)} style={styles.unsaveBtn}>
                                        <Ionicons name="bookmark" size={20} color="#f97316" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                                <View style={styles.cardFooter}>
                                    {job.location && (
                                        <View style={styles.footerItem}>
                                            <Ionicons name="location-outline" size={13} color="#9ca3af" />
                                            <Text style={styles.footerText}>{job.location}</Text>
                                        </View>
                                    )}
                                    {job.budget && (
                                        <View style={styles.footerItem}>
                                            <Ionicons name="cash-outline" size={13} color="#9ca3af" />
                                            <Text style={styles.footerText}>${job.budget}</Text>
                                        </View>
                                    )}
                                    <View style={[styles.statusBadge, { backgroundColor: job.status === 'active' ? '#22c55e20' : '#6b728020' }]}>
                                        <Text style={{ color: job.status === 'active' ? '#22c55e' : '#6b7280', fontSize: 11 }}>{job.status}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    list: { padding: 16, gap: 12 },
    card: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#374151' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    jobTitle: { flex: 1, fontSize: 15, fontWeight: 'bold', color: '#fff', marginRight: 8 },
    unsaveBtn: { padding: 4 },
    jobDesc: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginBottom: 10 },
    cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    footerText: { color: '#9ca3af', fontSize: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    emptyText: { color: '#6b7280', fontSize: 15, marginTop: 12 },
    lockedTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginTop: 12 },
    lockedDesc: { color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 20 },
    upgradeBtn: { backgroundColor: '#f97316', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
    upgradeBtnText: { color: '#fff', fontWeight: 'bold' },
});
