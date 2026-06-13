import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Applications', 'Followers', 'Referrals', 'Support'];

export default function ClientNotificationsScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('Applications');
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => { loadTab(activeTab); }, [activeTab]);

    async function loadTab(tab) {
        setLoading(true);
        setNotifications([]);
        try {
            if (tab === 'Applications') {
                // Application status changes for this client's jobs
                const { data: jobs } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('client_id', user.id);

                const jobIds = (jobs || []).map((j) => j.id);
                if (jobIds.length === 0) { setLoading(false); return; }

                const { data } = await supabase
                    .from('applications')
                    .select('id, status, created_at, job:job_id(title), worker:worker_id(first_name, last_name)')
                    .in('job_id', jobIds)
                    .order('created_at', { ascending: false });

                setNotifications(data || []);
            } else if (tab === 'Followers') {
                const { data } = await supabase
                    .from('notifications')
                    .select('id, type, message, created_at, is_read')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                setNotifications(data || []);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    function onRefresh() { setRefreshing(true); loadTab(activeTab); }

    function renderApplicationItem({ item }) {
        const statusColor = { pending: '#f59e0b', accepted: '#22c55e', declined: '#ef4444' }[item.status] || '#6b7280';
        return (
            <View style={styles.notifCard}>
                <View style={styles.notifRow}>
                    <View style={styles.notifIcon}>
                        <Ionicons name="person-outline" size={20} color="#f97316" />
                    </View>
                    <View style={styles.notifContent}>
                        <Text style={styles.notifTitle}>
                            {item.worker?.first_name} {item.worker?.last_name} applied to "{item.job?.title}"
                        </Text>
                        <Text style={styles.notifMeta}>
                            Status: <Text style={{ color: statusColor, fontWeight: '600' }}>{item.status}</Text>
                        </Text>
                        <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                </View>
            </View>
        );
    }

    function renderFollowerNotif({ item }) {
        return (
            <View style={[styles.notifCard, !item.is_read && { borderLeftWidth: 3, borderLeftColor: '#f97316' }]}>
                <View style={styles.notifRow}>
                    <View style={styles.notifIcon}>
                        <Ionicons name="notifications-outline" size={20} color="#f97316" />
                    </View>
                    <View style={styles.notifContent}>
                        <Text style={styles.notifTitle}>{item.message || 'New notification'}</Text>
                        <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
                    </View>
                    {!item.is_read && <View style={styles.unreadDot} />}
                </View>
            </View>
        );
    }

    function renderReferrals() {
        const code = profile?.referral_code || user?.id?.slice(0, 8).toUpperCase();
        return (
            <View style={styles.referralBox}>
                <Ionicons name="gift-outline" size={48} color="#f97316" />
                <Text style={styles.referralTitle}>Your Referral Code</Text>
                <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{code}</Text>
                </View>
                <Text style={styles.referralDesc}>Share your referral code with friends and earn rewards when they sign up!</Text>
            </View>
        );
    }

    function renderSupport() {
        return (
            <View style={styles.supportBox}>
                <Ionicons name="help-circle-outline" size={48} color="#3b82f6" />
                <Text style={styles.supportTitle}>Need Help?</Text>
                <Text style={styles.supportText}>Contact our support team</Text>
                <Text style={styles.supportEmail}>GoArtisans7@gmail.com</Text>
                <Text style={styles.supportDesc}>We typically respond within 24 hours during business days.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.screenTitle}>Notifications</Text>
            </View>

            <View style={styles.tabBar}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {activeTab === 'Referrals' ? renderReferrals() :
                activeTab === 'Support' ? renderSupport() :
                    loading ? (
                        <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>
                    ) : (
                        <FlatList
                            data={notifications}
                            keyExtractor={(n) => n.id}
                            renderItem={activeTab === 'Applications' ? renderApplicationItem : renderFollowerNotif}
                            contentContainerStyle={styles.list}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
                            ListEmptyComponent={
                                <View style={styles.center}>
                                    <Ionicons name="notifications-off-outline" size={48} color="#374151" />
                                    <Text style={styles.emptyText}>No notifications yet</Text>
                                </View>
                            }
                        />
                    )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#374151', paddingHorizontal: 4 },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#f97316' },
    tabText: { color: '#6b7280', fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#f97316' },
    list: { padding: 16, gap: 8 },
    notifCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#374151' },
    notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f9731620', alignItems: 'center', justifyContent: 'center' },
    notifContent: { flex: 1 },
    notifTitle: { color: '#e5e7eb', fontSize: 14, fontWeight: '500', marginBottom: 4 },
    notifMeta: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
    notifTime: { color: '#6b7280', fontSize: 11 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316', marginTop: 4 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: '#6b7280', fontSize: 15, marginTop: 12 },
    referralBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    referralTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    codeBox: { backgroundColor: '#1f2937', borderWidth: 2, borderColor: '#f97316', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14, borderStyle: 'dashed' },
    codeText: { fontSize: 24, fontWeight: 'bold', color: '#f97316', letterSpacing: 4 },
    referralDesc: { color: '#9ca3af', textAlign: 'center', fontSize: 14, lineHeight: 20 },
    supportBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
    supportTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    supportText: { color: '#9ca3af', fontSize: 14 },
    supportEmail: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
    supportDesc: { color: '#6b7280', textAlign: 'center', fontSize: 13, lineHeight: 18 },
});
