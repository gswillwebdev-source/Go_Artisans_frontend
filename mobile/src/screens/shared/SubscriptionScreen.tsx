import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';

export default function SubscriptionScreen({ navigation }) {
    const { user } = useAuth();
    const { subscription, planTier, isFree, refreshSubscription } = useSubscription();
    const [profileViews, setProfileViews] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (!isFree) fetchProfileViews();
    }, [isFree]);

    async function fetchProfileViews() {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data } = await supabase
            .from('profile_views')
            .select('viewed_at, view_date, viewer:viewer_id(id, first_name, last_name, job_title, profile_picture, user_type)')
            .eq('viewed_id', user.id)
            .gte('view_date', since.toISOString().split('T')[0])
            .order('viewed_at', { ascending: false })
            .limit(50);
        setProfileViews(data || []);
    }

    async function cancelSubscription() {
        Alert.alert('Cancel Subscription', 'Are you sure you want to cancel? You\'ll keep Pro access until the end of your billing period.', [
            { text: 'Keep Plan', style: 'cancel' },
            {
                text: 'Cancel', style: 'destructive', onPress: async () => {
                    setCancelling(true);
                    try {
                        await supabase.from('user_subscriptions').update({
                            cancel_at_period_end: true,
                            cancelled_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }).eq('user_id', user.id);
                        await refreshSubscription();
                        Alert.alert('Cancelled', 'Your subscription will end at the next billing date.');
                    } catch {
                        Alert.alert('Error', 'Failed to cancel subscription.');
                    } finally {
                        setCancelling(false);
                    }
                }
            },
        ]);
    }

    const planColors = { free: '#6b7280', pro: '#f59e0b', premium: '#a855f7' };
    const planColor = planColors[planTier] || '#6b7280';

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#f97316" />
                </TouchableOpacity>
                <Text style={styles.title}>Subscription</Text>
            </View>

            <View style={styles.tabs}>
                {[['overview', 'Overview'], ['views', 'Who Viewed Me'], ['billing', 'Billing']].map(([key, label]) => (
                    <TouchableOpacity
                        key={key}
                        style={[styles.tab, activeTab === key && styles.tabActive]}
                        onPress={() => setActiveTab(key)}
                    >
                        <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.inner}>
                {activeTab === 'overview' && (
                    <>
                        <View style={[styles.planCard, { borderColor: planColor }]}>
                            <View style={styles.planHeader}>
                                <Text style={[styles.planName, { color: planColor }]}>{planTier.toUpperCase()} PLAN</Text>
                                {planTier === 'premium' && <Ionicons name="diamond" size={24} color={planColor} />}
                                {planTier === 'pro' && <Ionicons name="star" size={24} color={planColor} />}
                                {planTier === 'free' && <Ionicons name="person" size={24} color={planColor} />}
                            </View>
                            {subscription && (
                                <>
                                    {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                                        <View style={styles.trialBadge}>
                                            <Text style={styles.trialText}>Trial ends {new Date(subscription.trial_end).toLocaleDateString()}</Text>
                                        </View>
                                    )}
                                    {subscription.period_end && (
                                        <Text style={styles.periodText}>
                                            Next billing: {new Date(subscription.period_end).toLocaleDateString()}
                                        </Text>
                                    )}
                                    {subscription.cancel_at_period_end && (
                                        <View style={styles.cancelledBanner}>
                                            <Ionicons name="warning" size={16} color="#f59e0b" />
                                            <Text style={styles.cancelledText}>Cancelled — active until billing end</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>

                        {isFree ? (
                            <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Pricing')}>
                                <Ionicons name="rocket" size={20} color="#fff" />
                                <Text style={styles.upgradeBtnText}>Upgrade Your Plan</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Pricing')}>
                                    <Text style={styles.upgradeBtnText}>Change Plan</Text>
                                </TouchableOpacity>
                                {!subscription?.cancel_at_period_end && (
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={cancelSubscription}
                                        disabled={cancelling}
                                    >
                                        {cancelling ? <ActivityIndicator color="#ef4444" /> : <Text style={styles.cancelBtnText}>Cancel Subscription</Text>}
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </>
                )}

                {activeTab === 'views' && (
                    <>
                        {isFree ? (
                            <View style={styles.lockedBox}>
                                <Ionicons name="eye-off" size={40} color="#6b7280" />
                                <Text style={styles.lockedTitle}>Pro Feature</Text>
                                <Text style={styles.lockedDesc}>Upgrade to see who viewed your profile in the last 30 days.</Text>
                                <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Pricing')}>
                                    <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                                </TouchableOpacity>
                            </View>
                        ) : profileViews.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="eye-outline" size={40} color="#374151" />
                                <Text style={styles.emptyText}>No profile views in the last 30 days</Text>
                            </View>
                        ) : (
                            profileViews.map((v, i) => (
                                <View key={i} style={styles.viewerCard}>
                                    <View style={styles.viewerAvatar}>
                                        <Ionicons name="person" size={20} color="#6b7280" />
                                    </View>
                                    <View style={styles.viewerInfo}>
                                        <Text style={styles.viewerName}>{v.viewer?.first_name} {v.viewer?.last_name}</Text>
                                        {v.viewer?.job_title && <Text style={styles.viewerMeta}>{v.viewer.job_title}</Text>}
                                        <Text style={styles.viewerDate}>{new Date(v.viewed_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}

                {activeTab === 'billing' && (
                    <View style={styles.billingInfo}>
                        <Ionicons name="card-outline" size={40} color="#6b7280" />
                        <Text style={styles.billingTitle}>Billing Information</Text>
                        <Text style={styles.billingDesc}>
                            {isFree
                                ? 'You are on the free plan. No payment required.'
                                : `Current plan: ${planTier.toUpperCase()}\nManage your billing by upgrading or cancelling your plan.`}
                        </Text>
                        <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Pricing')}>
                            <Text style={styles.upgradeBtnText}>{isFree ? 'Upgrade' : 'Change Plan'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1f2937', alignItems: 'center' },
    tabActive: { backgroundColor: '#f97316' },
    tabText: { color: '#9ca3af', fontSize: 12 },
    tabTextActive: { color: '#fff', fontWeight: 'bold' },
    inner: { padding: 16, gap: 12 },
    planCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, borderWidth: 2 },
    planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    planName: { fontSize: 22, fontWeight: 'bold' },
    trialBadge: { backgroundColor: '#f59e0b20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 8 },
    trialText: { color: '#f59e0b', fontSize: 12 },
    periodText: { color: '#9ca3af', fontSize: 13 },
    cancelledBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    cancelledText: { color: '#f59e0b', fontSize: 13 },
    upgradeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 10 },
    upgradeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    cancelBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
    cancelBtnText: { color: '#ef4444', fontWeight: 'bold' },
    lockedBox: { alignItems: 'center', padding: 32, gap: 12 },
    lockedTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    lockedDesc: { color: '#9ca3af', textAlign: 'center' },
    emptyBox: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: '#6b7280', textAlign: 'center' },
    viewerCard: { flexDirection: 'row', gap: 12, backgroundColor: '#1f2937', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#374151' },
    viewerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
    viewerInfo: { flex: 1 },
    viewerName: { color: '#fff', fontWeight: '600', fontSize: 14 },
    viewerMeta: { color: '#9ca3af', fontSize: 12 },
    viewerDate: { color: '#6b7280', fontSize: 11, marginTop: 2 },
    billingInfo: { alignItems: 'center', padding: 32, gap: 12 },
    billingTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    billingDesc: { color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
