import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';

const WORKER_PLANS = [
    {
        id: 'worker_free', name: 'Free', price: { monthly: 0, yearly: 0 },
        color: '#6b7280', icon: 'person',
        features: ['10 job applications/month', '5 portfolio items', 'Basic profile', 'Job alerts (5)'],
    },
    {
        id: 'worker_pro', name: 'Pro', price: { monthly: 4.99, yearly: 49.99 },
        color: '#f59e0b', icon: 'star',
        features: ['35 job applications/month', '15 portfolio items', '⭐ Gold badge', 'Job alerts (15)', 'Who viewed me'],
    },
    {
        id: 'worker_premium', name: 'Premium', price: { monthly: 9.99, yearly: 95.90 },
        color: '#a855f7', icon: 'diamond',
        features: ['Unlimited applications', 'Unlimited portfolio', '💎 Diamond badge', 'Unlimited alerts', 'AI job matching', 'Priority support'],
        popular: true,
    },
];

const CLIENT_PLANS = [
    {
        id: 'client_free', name: 'Free', price: { monthly: 0, yearly: 0 },
        color: '#6b7280', icon: 'person',
        features: ['15 job posts/month', 'Basic search', 'View 5 portfolios/month'],
    },
    {
        id: 'client_pro', name: 'Pro', price: { monthly: 14.99, yearly: 149.99 },
        color: '#f59e0b', icon: 'star',
        features: ['60 job posts/month', 'Advanced search', '60 portfolio views/month', '⭐ Gold badge', 'Worker analytics'],
    },
    {
        id: 'client_premium', name: 'Premium', price: { monthly: 29.99, yearly: 299.99 },
        color: '#a855f7', icon: 'diamond',
        features: ['Unlimited job posts', 'Unlimited search', 'Unlimited portfolio views', '💎 Diamond badge', 'Priority support'],
        popular: true,
    },
];

export default function PricingScreen({ navigation }) {
    const { user, profile } = useAuth();
    const { planTier, refreshSubscription } = useSubscription();
    const [roleTab, setRoleTab] = useState(profile?.user_type || 'worker');
    const [billing, setBilling] = useState('monthly');
    const [subscribing, setSubscribing] = useState(null);

    const plans = roleTab === 'worker' ? WORKER_PLANS : CLIENT_PLANS;

    async function selectPlan(plan) {
        if (plan.price.monthly === 0) {
            Alert.alert('Free Plan', 'You are already on the free plan.');
            return;
        }
        setSubscribing(plan.id);
        try {
            const now = new Date();
            const trialEnd = new Date(now.getTime() + 7 * 86400000);
            const periodEnd = billing === 'monthly'
                ? new Date(now.getTime() + 30 * 86400000)
                : new Date(now.getTime() + 365 * 86400000);

            const badgeColor = plan.color === '#f59e0b' ? 'gold' : plan.color === '#a855f7' ? 'diamond' : null;

            await supabase.from('user_subscriptions').upsert({
                user_id: user.id,
                plan_id: plan.id,
                status: 'trialing',
                trial_start: now.toISOString(),
                trial_end: trialEnd.toISOString(),
                period_start: now.toISOString(),
                period_end: periodEnd.toISOString(),
                is_trialing: true,
                badge_color: badgeColor,
                limits: getLimits(plan.id),
                updated_at: now.toISOString(),
            }, { onConflict: 'user_id' });

            await refreshSubscription();
            Alert.alert('Success', `You're now on the ${plan.name} plan with a 7-day free trial!`);
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', 'Failed to activate plan. Please try again.');
        } finally {
            setSubscribing(null);
        }
    }

    function getLimits(planId) {
        const map = {
            worker_free: { applications: 10, portfolio: 5, alerts: 5 },
            worker_pro: { applications: 35, portfolio: 15, alerts: 15 },
            worker_premium: { applications: -1, portfolio: -1, alerts: -1 },
            client_free: { job_posts: 15, portfolio_views: 5 },
            client_pro: { job_posts: 60, portfolio_views: 60 },
            client_premium: { job_posts: -1, portfolio_views: -1 },
        };
        return map[planId] || {};
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#f97316" />
                </TouchableOpacity>
                <Text style={styles.title}>Pricing Plans</Text>
            </View>

            {/* Role tabs */}
            <View style={styles.roleTabs}>
                {['worker', 'client'].map((r) => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.roleTab, roleTab === r && styles.roleTabActive]}
                        onPress={() => setRoleTab(r)}
                    >
                        <Text style={[styles.roleTabText, roleTab === r && styles.roleTabTextActive]}>
                            {r === 'worker' ? 'Worker Plans' : 'Client Plans'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Billing toggle */}
            <View style={styles.billingToggle}>
                {['monthly', 'yearly'].map((b) => (
                    <TouchableOpacity
                        key={b}
                        style={[styles.billingBtn, billing === b && styles.billingBtnActive]}
                        onPress={() => setBilling(b)}
                    >
                        <Text style={[styles.billingBtnText, billing === b && styles.billingBtnTextActive]}>
                            {b === 'yearly' ? '🎉 Yearly (Save ~17%)' : 'Monthly'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.plansContainer}>
                {plans.map((plan) => {
                    const isCurrent = planTier === plan.name.toLowerCase();
                    const price = billing === 'monthly' ? plan.price.monthly : plan.price.yearly;
                    return (
                        <View key={plan.id} style={[styles.planCard, { borderColor: plan.popular ? plan.color : '#374151' }]}>
                            {plan.popular && (
                                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                                    <Text style={styles.popularText}>MOST POPULAR</Text>
                                </View>
                            )}
                            <View style={styles.planHeader}>
                                <Ionicons name={plan.icon} size={28} color={plan.color} />
                                <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                            </View>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceAmount}>${price}</Text>
                                <Text style={styles.pricePeriod}>/{billing === 'monthly' ? 'mo' : 'yr'}</Text>
                            </View>

                            <View style={styles.features}>
                                {plan.features.map((f, i) => (
                                    <View key={i} style={styles.feature}>
                                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                        <Text style={styles.featureText}>{f}</Text>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.selectBtn,
                                    isCurrent && styles.selectBtnCurrent,
                                    plan.price.monthly === 0 && !isCurrent && styles.selectBtnFree,
                                    { borderColor: plan.color },
                                ]}
                                onPress={() => selectPlan(plan)}
                                disabled={isCurrent || !!subscribing}
                            >
                                {subscribing === plan.id ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={[styles.selectBtnText, isCurrent && { color: '#6b7280' }]}>
                                        {isCurrent ? 'Current Plan' : plan.price.monthly === 0 ? 'Downgrade to Free' : 'Start Free Trial'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    );
                })}
                <Text style={styles.disclaimer}>
                    All paid plans start with a 7-day free trial. Cancel anytime.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    roleTabs: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#1f2937', borderRadius: 10, padding: 4, marginBottom: 12 },
    roleTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
    roleTabActive: { backgroundColor: '#f97316' },
    roleTabText: { color: '#6b7280', fontWeight: '600' },
    roleTabTextActive: { color: '#fff' },
    billingToggle: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 16 },
    billingBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151' },
    billingBtnActive: { backgroundColor: '#f9731620', borderColor: '#f97316' },
    billingBtnText: { color: '#6b7280', fontSize: 13 },
    billingBtnTextActive: { color: '#f97316', fontWeight: 'bold' },
    plansContainer: { padding: 16, gap: 16, paddingBottom: 40 },
    planCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, borderWidth: 2, position: 'relative' },
    popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    popularText: { color: '#fff', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    planHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 8 },
    planName: { fontSize: 22, fontWeight: 'bold' },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
    priceAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff' },
    pricePeriod: { color: '#6b7280', fontSize: 16, marginLeft: 4 },
    features: { gap: 8, marginBottom: 20 },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    featureText: { color: '#d1d5db', fontSize: 14 },
    selectBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#f97316', borderWidth: 0 },
    selectBtnCurrent: { backgroundColor: '#374151', borderWidth: 1 },
    selectBtnFree: { backgroundColor: 'transparent', borderWidth: 1 },
    selectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    disclaimer: { color: '#6b7280', textAlign: 'center', fontSize: 12, marginTop: 8 },
});
