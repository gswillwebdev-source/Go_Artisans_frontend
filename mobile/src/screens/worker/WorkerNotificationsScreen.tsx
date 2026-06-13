import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const TABS = [
    { key: 'job_alerts', label: 'Job Alerts', icon: 'briefcase-outline' },
    { key: 'followers', label: 'Followers', icon: 'people-outline' },
    { key: 'referrals', label: 'Referrals', icon: 'share-social-outline' },
    { key: 'support', label: 'Support', icon: 'help-circle-outline' },
];

export default function WorkerNotificationsScreen({ navigation }) {
    const { user, profile } = useAuth();
    const [activeTab, setActiveTab] = useState('job_alerts');
    const [jobNotifications, setJobNotifications] = useState([]);
    const [followNotifications, setFollowNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const [jobNotifRes, followNotifRes] = await Promise.all([
                supabase
                    .from('job_notifications')
                    .select('id, status, viewed_at, created_at, jobs(title, description, location, budget), job_alerts(name)')
                    .eq('worker_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50),
                supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(50),
            ]);
            setJobNotifications(jobNotifRes.data || []);
            setFollowNotifications(followNotifRes.data || []);
        } catch (e) {
            console.error('fetchData error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    async function markViewed(id) {
        await supabase.from('job_notifications').update({ status: 'viewed', viewed_at: new Date().toISOString() }).eq('id', id);
        setJobNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'viewed' } : n));
    }

    const renderJobNotif = ({ item }) => (
        <TouchableOpacity
            style={[styles.notifCard, item.status === 'new' && styles.notifCardUnread]}
            onPress={() => {
                markViewed(item.id);
                if (item.jobs?.id) navigation.navigate('JobDetail', { jobId: item.jobs.id });
            }}
        >
            <View style={styles.notifHeader}>
                <View style={styles.notifIconBg}>
                    <Ionicons name="briefcase" size={16} color="#f97316" />
                </View>
                <View style={styles.notifContent}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{item.jobs?.title || 'Job Match'}</Text>
                    {item.job_alerts?.name && <Text style={styles.notifAlert}>Alert: {item.job_alerts.name}</Text>}
                    {item.jobs?.location && (
                        <View style={styles.notifMeta}>
                            <Ionicons name="location-outline" size={12} color="#6b7280" />
                            <Text style={styles.notifMetaText}>{item.jobs.location}</Text>
                        </View>
                    )}
                    {item.jobs?.budget && (
                        <Text style={styles.notifBudget}>${item.jobs.budget}</Text>
                    )}
                </View>
                {item.status === 'new' && <View style={styles.unreadDot} />}
            </View>
            <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </TouchableOpacity>
    );

    const renderFollowNotif = ({ item }) => (
        <View style={styles.notifCard}>
            <View style={styles.notifHeader}>
                <View style={[styles.notifIconBg, { backgroundColor: '#3b82f620' }]}>
                    <Ionicons name="person-add" size={16} color="#3b82f6" />
                </View>
                <View style={styles.notifContent}>
                    <Text style={styles.notifTitle}>{item.message || 'Someone followed you'}</Text>
                </View>
            </View>
            <Text style={styles.notifTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
    );

    const renderReferrals = () => (
        <View style={styles.referralBox}>
            <Ionicons name="gift" size={40} color="#f97316" />
            <Text style={styles.referralTitle}>Earn with Referrals</Text>
            <Text style={styles.referralDesc}>
                Share your referral code and earn rewards when friends join GoArtisans.
            </Text>
            <View style={styles.referralCode}>
                <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                <Text style={styles.referralCodeValue}>{profile?.referral_code || user?.id?.substring(0, 8).toUpperCase()}</Text>
            </View>
        </View>
    );

    const renderSupport = () => (
        <View style={styles.supportBox}>
            <Ionicons name="headset" size={40} color="#f97316" />
            <Text style={styles.supportTitle}>Contact Support</Text>
            <Text style={styles.supportDesc}>Need help? Reach us at:</Text>
            <Text style={styles.supportEmail}>GoArtisans7@gmail.com</Text>
        </View>
    );

    function renderContent() {
        if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;
        if (activeTab === 'job_alerts') {
            return (
                <FlatList
                    data={jobNotifications}
                    keyExtractor={(n) => n.id}
                    renderItem={renderJobNotif}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#f97316" />}
                    ListEmptyComponent={<View style={styles.center}><Ionicons name="notifications-outline" size={48} color="#374151" /><Text style={styles.emptyText}>No job notifications yet</Text></View>}
                />
            );
        }
        if (activeTab === 'followers') {
            return (
                <FlatList
                    data={followNotifications}
                    keyExtractor={(n) => String(n.id)}
                    renderItem={renderFollowNotif}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<View style={styles.center}><Ionicons name="people-outline" size={48} color="#374151" /><Text style={styles.emptyText}>No follower notifications</Text></View>}
                />
            );
        }
        if (activeTab === 'referrals') return <View style={{ flex: 1 }}>{renderReferrals()}</View>;
        if (activeTab === 'support') return <View style={{ flex: 1 }}>{renderSupport()}</View>;
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.screenTitle}>Notifications</Text>
            </View>

            <View style={styles.tabsBar}>
                {TABS.map((t) => (
                    <TouchableOpacity
                        key={t.key}
                        style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                        onPress={() => setActiveTab(t.key)}
                    >
                        <Ionicons name={t.icon} size={18} color={activeTab === t.key ? '#f97316' : '#6b7280'} />
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.tabLabel}>{TABS.find((t) => t.key === activeTab)?.label}</Text>

            {renderContent()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
    screenTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    tabsBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
    tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
    tabBtnActive: { backgroundColor: '#f9731620', borderColor: '#f97316' },
    tabLabel: { paddingHorizontal: 16, fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    list: { padding: 16, gap: 10 },
    notifCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#374151' },
    notifCardUnread: { borderColor: '#f97316' },
    notifHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    notifIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f9731620', alignItems: 'center', justifyContent: 'center' },
    notifContent: { flex: 1 },
    notifTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 2 },
    notifAlert: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
    notifMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    notifMetaText: { color: '#6b7280', fontSize: 12 },
    notifBudget: { color: '#22c55e', fontSize: 12, marginTop: 2 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f97316' },
    notifTime: { color: '#4b5563', fontSize: 11, marginTop: 6, textAlign: 'right' },
    emptyText: { color: '#6b7280', marginTop: 12 },
    referralBox: { padding: 32, alignItems: 'center', gap: 12 },
    referralTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    referralDesc: { color: '#9ca3af', textAlign: 'center' },
    referralCode: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f97316', alignItems: 'center', marginTop: 8 },
    referralCodeLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 4 },
    referralCodeValue: { fontSize: 24, fontWeight: 'bold', color: '#f97316', letterSpacing: 4 },
    supportBox: { padding: 32, alignItems: 'center', gap: 12 },
    supportTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    supportDesc: { color: '#9ca3af' },
    supportEmail: { color: '#f97316', fontSize: 16, fontWeight: '600' },
});
