import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Switch,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// ─── Plan definitions (mirrors Supabase seed data) ────────────────────────────
const PLANS = {
    worker: [
        {
            id: 'worker_free',
            name: 'Free',
            price: { monthly: 0, yearly: 0 },
            badge: null,
            trial: false,
            cta: 'Get Started',
            color: '#6B7280',
            highlight: false,
            features: [
                'Apply to 5 jobs per month',
                'Basic profile',
                '3 client profile views/day',
                'Standard search ranking',
            ],
        },
        {
            id: 'worker_pro',
            name: 'Pro',
            price: { monthly: 9.99, yearly: 99.99 },
            badge: '⭐',
            trial: true,
            trialDays: 14,
            cta: 'Start 14-Day Trial',
            color: '#F59E0B',
            highlight: true,
            features: [
                'Unlimited job applications',
                'See who viewed your profile (30 days)',
                'Priority search ranking',
                'Pro gold badge on profile',
                '10 portfolio images',
                'Job alerts & notifications',
                'Featured applicant tag',
                '5 direct messages/month',
            ],
        },
        {
            id: 'worker_premium',
            name: 'Premium',
            price: { monthly: 19.99, yearly: 199.99 },
            badge: '💎',
            trial: false,
            cta: 'Go Premium',
            color: '#6366F1',
            highlight: false,
            features: [
                'Everything in Pro',
                'Top placement in search results',
                'See who viewed profile (90 days)',
                'Premium diamond badge',
                'Unlimited portfolio images',
                'AI-powered job matching',
                '10 direct messages/month',
                'Profile boosting',
                'Dedicated support',
            ],
        },
    ],
    client: [
        {
            id: 'client_free',
            name: 'Free',
            price: { monthly: 0, yearly: 0 },
            badge: null,
            trial: false,
            cta: 'Get Started',
            color: '#6B7280',
            highlight: false,
            features: [
                'Post 2 jobs per month',
                'Browse worker profiles (limited)',
                'Receive applications',
                'Standard employer ranking',
            ],
        },
        {
            id: 'client_pro',
            name: 'Pro',
            price: { monthly: 14.99, yearly: 149.99 },
            badge: '⭐',
            trial: true,
            trialDays: 14,
            cta: 'Start 14-Day Trial',
            color: '#F59E0B',
            highlight: true,
            features: [
                'Post up to 10 jobs/month',
                'Full worker profile access',
                '5 direct messages/month',
                'Pro employer badge',
                'Job posting analytics',
                'Featured employer tag',
                'Applicant filtering & sorting',
            ],
        },
        {
            id: 'client_premium',
            name: 'Premium',
            price: { monthly: 29.99, yearly: 299.99 },
            badge: '💎',
            trial: false,
            cta: 'Go Premium',
            color: '#6366F1',
            highlight: false,
            features: [
                'Unlimited job posts',
                'Full worker profile access',
                '20 direct messages/month',
                'Premium diamond employer badge',
                'Featured employer spotlight',
                'Advanced applicant analytics',
                'Unlimited saved worker lists',
                'Dedicated account manager',
            ],
        },
    ],
};

// ─── Badge chip ───────────────────────────────────────────────────────────────
function PlanChip({ tier, isVerified }: { tier: string; isVerified: boolean }) {
    return (
        <View style={styles.chipRow}>
            {tier === 'pro' && (
                <View style={[styles.chip, { backgroundColor: '#F59E0B' }]}>
                    <Text style={styles.chipText}>⭐ Pro</Text>
                </View>
            )}
            {tier === 'premium' && (
                <View style={[styles.chip, { backgroundColor: '#6366F1' }]}>
                    <Text style={styles.chipText}>💎 Premium</Text>
                </View>
            )}
            {isVerified && (
                <View style={[styles.chip, { backgroundColor: '#3B82F6' }]}>
                    <Text style={styles.chipText}>✓ Verified</Text>
                </View>
            )}
        </View>
    );
}

// ─── Individual plan card ─────────────────────────────────────────────────────
function PlanCard({
    plan,
    isYearly,
    isCurrent,
    onSelect,
    loading,
}: {
    plan: (typeof PLANS.worker)[0];
    isYearly: boolean;
    isCurrent: boolean;
    onSelect: (plan: (typeof PLANS.worker)[0]) => void;
    loading: boolean;
}) {
    const price = isYearly ? plan.price.yearly : plan.price.monthly;
    const saving =
        isYearly && plan.price.monthly > 0
            ? Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)
            : 0;

    return (
        <View
            style={[
                styles.planCard,
                plan.highlight && styles.planCardHighlight,
                isCurrent && styles.planCardCurrent,
            ]}
        >
            {plan.highlight && (
                <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
            )}
            {plan.trial && (
                <View style={[styles.trialBadge, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.trialText}>{plan.trialDays}-DAY FREE TRIAL</Text>
                </View>
            )}

            {/* Header */}
            <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: plan.color }]}>
                    {plan.badge ? `${plan.badge} ` : ''}{plan.name}
                </Text>
                <View style={styles.priceRow}>
                    {price === 0 ? (
                        <Text style={styles.priceText}>Free</Text>
                    ) : (
                        <>
                            <Text style={styles.priceText}>${price}</Text>
                            <Text style={styles.pricePer}>/{isYearly ? 'yr' : 'mo'}</Text>
                        </>
                    )}
                </View>
                {saving > 0 && (
                    <Text style={styles.savingText}>Save {saving}% vs monthly</Text>
                )}
                {plan.trial && price > 0 && (
                    <Text style={styles.afterTrialText}>
                        Then ${plan.price.monthly}/mo after trial
                    </Text>
                )}
            </View>

            {/* CTA button */}
            <TouchableOpacity
                style={[
                    styles.ctaButton,
                    { backgroundColor: isCurrent ? '#E5E7EB' : plan.highlight ? '#3F51B5' : '#1E293B' },
                ]}
                onPress={() => onSelect(plan)}
                disabled={isCurrent || loading}
                activeOpacity={0.8}
            >
                {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <Text style={[styles.ctaText, isCurrent && { color: '#9CA3AF' }]}>
                        {isCurrent ? '✓ Current Plan' : plan.cta}
                    </Text>
                )}
            </TouchableOpacity>

            {/* Feature list */}
            {plan.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.featureText}>{f}</Text>
                </View>
            ))}
        </View>
    );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function SubscriptionScreen({ navigation }: any) {
    const [userRole, setUserRole] = useState<'worker' | 'client'>('worker');
    const [activeTab, setActiveTab] = useState<'worker' | 'client'>('worker');
    const [isYearly, setIsYearly] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [planTier, setPlanTier] = useState<'free' | 'pro' | 'premium'>('free');
    const [isVerified, setIsVerified] = useState(false);
    const [isTrialing, setIsTrialing] = useState(false);
    const [trialEnd, setTrialEnd] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [view, setView] = useState<'plans' | 'manage' | 'verify'>('plans');

    const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

    const getToken = useCallback(async () => {
        // TODO: Replace with your actual token retrieval (AsyncStorage / Supabase session)
        const { AsyncStorage } = require('@react-native-async-storage/async-storage');
        return await AsyncStorage.getItem('token');
    }, []);

    const fetchSubscription = useCallback(async () => {
        try {
            setLoading(true);
            const token = await getToken();
            if (!token) return;

            const res = await fetch(`${API_BASE}/subscriptions/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.subscription) {
                setCurrentPlanId(data.subscription.plan_id);
                const tier = data.subscription.plan_id?.split('_')[1] as 'free' | 'pro' | 'premium';
                setPlanTier(tier || 'free');
                setIsTrialing(data.subscription.is_trialing || false);
                setTrialEnd(data.subscription.trial_end || null);
                const role = data.subscription.plan_id?.startsWith('client') ? 'client' : 'worker';
                setUserRole(role);
                setActiveTab(role);
            }
            if (data.badge) {
                setIsVerified(data.badge.status === 'approved');
            }
        } catch (err) {
            console.error('fetchSubscription error:', err);
        } finally {
            setLoading(false);
        }
    }, [API_BASE, getToken]);

    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);

    const handleSelectPlan = async (plan: (typeof PLANS.worker)[0]) => {
        if (!plan || currentPlanId === plan.id) return;

        setActionLoadingId(plan.id);
        try {
            const token = await getToken();
            if (!token) {
                Alert.alert('Sign In Required', 'Please sign in to manage your subscription.');
                return;
            }

            if (plan.trial) {
                const res = await fetch(`${API_BASE}/subscriptions/trial`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ plan_id: plan.id }),
                });
                const data = await res.json();

                if (!res.ok) {
                    Alert.alert('Trial Unavailable', data.error || 'Could not start trial.');
                } else {
                    Alert.alert(
                        '🎉 Trial Started!',
                        `Your ${plan.trialDays}-day free trial of ${plan.name} is now active. Enjoy all features!`,
                        [{ text: 'Great!', onPress: fetchSubscription }]
                    );
                }
            } else if (plan.price.monthly === 0) {
                Alert.alert('Free Plan', 'You are already on the Free plan or can downgrade via Manage Subscription.');
            } else {
                // Paid plan — show payment prompt (Stripe integration point)
                Alert.alert(
                    `Subscribe to ${plan.name}`,
                    `$${isYearly ? plan.price.yearly : plan.price.monthly}/${isYearly ? 'year' : 'month'}\n\nPayment processing via Stripe will be available soon.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Proceed to Payment',
                            onPress: () => {
                                // TODO: Launch Stripe payment sheet
                                Alert.alert('Coming Soon', 'Stripe in-app payment coming soon!');
                            },
                        },
                    ]
                );
            }
        } catch (err) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleCancelSubscription = async () => {
        Alert.alert(
            'Cancel Subscription?',
            'You will keep access until the end of your billing period.',
            [
                { text: 'Keep Plan', style: 'cancel' },
                {
                    text: 'Cancel Subscription',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await getToken();
                            await fetch(`${API_BASE}/subscriptions/cancel`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                            });
                            Alert.alert('Cancelled', 'Your subscription has been cancelled.', [
                                { text: 'OK', onPress: fetchSubscription },
                            ]);
                        } catch {
                            Alert.alert('Error', 'Could not cancel. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleRequestVerification = async () => {
        setVerifyLoading(true);
        try {
            const token = await getToken();
            const res = await fetch(`${API_BASE}/subscriptions/verify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ badge_type: 'identity', verified_fields: ['email'] }),
            });
            const data = await res.json();
            if (res.ok) {
                Alert.alert('Submitted!', data.message || 'Verification request sent. Review takes 1–3 business days.');
                await fetchSubscription();
            } else {
                Alert.alert('Cannot Submit', data.error || 'Request failed.');
            }
        } catch {
            Alert.alert('Error', 'Could not submit verification. Try again later.');
        } finally {
            setVerifyLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#3F51B5" />
                <Text style={styles.loadingText}>Loading subscription…</Text>
            </View>
        );
    }

    const plans = PLANS[activeTab];

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>GoArtisans Plans</Text>
                <Text style={styles.headerSubtitle}>
                    Unlock more features and grow faster
                </Text>
            </View>

            {/* Current plan chip */}
            {currentPlanId && (
                <View style={styles.currentPlanBanner}>
                    <Text style={styles.currentPlanLabel}>Your current plan:</Text>
                    <PlanChip tier={planTier} isVerified={isVerified} />
                    {isTrialing && trialEnd && (
                        <Text style={styles.trialEndText}>
                            Trial ends {new Date(trialEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                    )}
                </View>
            )}

            {/* View switcher */}
            <View style={styles.viewSwitcher}>
                {(['plans', 'manage', 'verify'] as const).map(v => (
                    <TouchableOpacity
                        key={v}
                        style={[styles.viewTab, view === v && styles.viewTabActive]}
                        onPress={() => setView(v)}
                    >
                        <Text style={[styles.viewTabText, view === v && styles.viewTabTextActive]}>
                            {v === 'plans' ? 'Plans' : v === 'manage' ? 'Manage' : 'Verify'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── PLANS view ──────────────────────────────────────────── */}
            {view === 'plans' && (
                <>
                    {/* Role switcher */}
                    <View style={styles.roleSwitcher}>
                        {(['worker', 'client'] as const).map(role => (
                            <TouchableOpacity
                                key={role}
                                style={[styles.roleTab, activeTab === role && styles.roleTabActive]}
                                onPress={() => setActiveTab(role)}
                            >
                                <Text style={[styles.roleTabText, activeTab === role && styles.roleTabTextActive]}>
                                    {role === 'worker' ? '🔨 For Workers' : '🏢 For Employers'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Billing toggle */}
                    <View style={styles.billingToggle}>
                        <Text style={[styles.billingLabel, !isYearly && styles.billingLabelActive]}>Monthly</Text>
                        <Switch
                            value={isYearly}
                            onValueChange={setIsYearly}
                            trackColor={{ false: '#D1D5DB', true: '#3F51B5' }}
                            thumbColor="#fff"
                        />
                        <Text style={[styles.billingLabel, isYearly && styles.billingLabelActive]}>
                            Yearly <Text style={styles.savePill}>Save ~17%</Text>
                        </Text>
                    </View>

                    {/* Plan cards */}
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            isYearly={isYearly}
                            isCurrent={currentPlanId === plan.id}
                            onSelect={handleSelectPlan}
                            loading={actionLoadingId === plan.id}
                        />
                    ))}

                    {/* FAQ */}
                    <View style={styles.faqSection}>
                        <Text style={styles.faqTitle}>Frequently Asked Questions</Text>
                        {[
                            {
                                q: 'How does the 14-day free trial work?',
                                a: 'No credit card required. Get full Pro access for 14 days, then choose to subscribe or return to Free.',
                            },
                            {
                                q: 'Can I cancel anytime?',
                                a: 'Yes. Cancel anytime and keep access until your billing period ends.',
                            },
                            {
                                q: 'What is the verification badge?',
                                a: 'A blue ✓ checkmark confirms your identity, building trust across the platform. Free for all users.',
                            },
                        ].map(({ q, a }, i) => (
                            <View key={i} style={styles.faqItem}>
                                <Text style={styles.faqQ}>{q}</Text>
                                <Text style={styles.faqA}>{a}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {/* ── MANAGE view ─────────────────────────────────────────── */}
            {view === 'manage' && (
                <View style={styles.manageSection}>
                    <View style={styles.manageCard}>
                        <Text style={styles.manageTitle}>Current Plan</Text>
                        <Text style={styles.managePlanName}>
                            {planTier === 'premium' ? '💎 ' : planTier === 'pro' ? '⭐ ' : ''}
                            {planTier.charAt(0).toUpperCase() + planTier.slice(1)}
                        </Text>
                        {isTrialing && (
                            <View style={styles.trialBanner}>
                                <Ionicons name="timer-outline" size={14} color="#047857" />
                                <Text style={styles.trialBannerText}>
                                    Free trial active — ends {trialEnd ? new Date(trialEnd).toLocaleDateString() : ''}
                                </Text>
                            </View>
                        )}
                    </View>

                    {planTier !== 'free' && (
                        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSubscription}>
                            <Ionicons name="close-circle-outline" size={18} color="#DC2626" />
                            <Text style={styles.cancelText}>Cancel Subscription</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.upgradeBanner}
                        onPress={() => setView('plans')}
                    >
                        <Ionicons name="rocket-outline" size={20} color="#3F51B5" />
                        <Text style={styles.upgradeText}>View all plans & upgrade</Text>
                        <Ionicons name="chevron-forward" size={16} color="#3F51B5" />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── VERIFY view ─────────────────────────────────────────── */}
            {view === 'verify' && (
                <View style={styles.verifySection}>
                    <View style={styles.verifyIcon}>
                        <Text style={{ fontSize: 48 }}>
                            {isVerified ? '✅' : '🔵'}
                        </Text>
                    </View>
                    <Text style={styles.verifyTitle}>
                        {isVerified ? 'You are Verified!' : 'Get Your Verification Badge'}
                    </Text>
                    <Text style={styles.verifySubtitle}>
                        {isVerified
                            ? 'Your profile shows a blue ✓ badge, making you stand out and building trust with others.'
                            : 'A verified badge confirms your identity and makes your profile significantly more trustworthy to clients and workers.'}
                    </Text>

                    {!isVerified && (
                        <>
                            {[
                                { icon: '📧', label: 'Email address', note: 'Confirmed at sign-up' },
                                { icon: '📱', label: 'Phone number', note: 'Optional verification code' },
                                { icon: '🪪', label: 'Government ID', note: 'For professional badge' },
                            ].map(item => (
                                <View key={item.label} style={styles.verifyStep}>
                                    <Text style={styles.verifyStepIcon}>{item.icon}</Text>
                                    <View>
                                        <Text style={styles.verifyStepLabel}>{item.label}</Text>
                                        <Text style={styles.verifyStepNote}>{item.note}</Text>
                                    </View>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={[styles.ctaButton, { marginTop: 20, backgroundColor: '#3B82F6' }]}
                                onPress={handleRequestVerification}
                                disabled={verifyLoading}
                            >
                                {verifyLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.ctaText}>Request Verification Badge</Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.verifyNote}>
                                Free for all plan levels. Review takes 1–3 business days.
                            </Text>
                        </>
                    )}
                </View>
            )}
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    contentContainer: { paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#6B7280', fontSize: 14 },

    header: { backgroundColor: '#3F51B5', padding: 24, paddingTop: 36 },
    headerTitle: { color: '#fff', fontSize: 26, fontWeight: '800' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },

    currentPlanBanner: {
        backgroundColor: '#EFF6FF',
        margin: 16,
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    currentPlanLabel: { color: '#3B82F6', fontSize: 12, fontWeight: '600', marginBottom: 6 },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
    chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    trialEndText: { color: '#6B7280', fontSize: 12, marginTop: 6 },

    viewSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
        marginBottom: 16,
    },
    viewTab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    viewTabActive: { backgroundColor: '#3F51B5' },
    viewTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    viewTabTextActive: { color: '#fff' },

    roleSwitcher: {
        flexDirection: 'row',
        marginHorizontal: 16,
        gap: 8,
        marginBottom: 12,
    },
    roleTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    roleTabActive: { backgroundColor: '#3F51B5', borderColor: '#3F51B5' },
    roleTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    roleTabTextActive: { color: '#fff' },

    billingToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 16,
    },
    billingLabel: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
    billingLabelActive: { color: '#1E293B', fontWeight: '700' },
    savePill: { color: '#10B981', fontSize: 11, fontWeight: '700' },

    planCard: {
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    planCardHighlight: {
        borderColor: '#3F51B5',
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    planCardCurrent: { borderColor: '#10B981' },

    popularBadge: {
        alignSelf: 'center',
        backgroundColor: '#3F51B5',
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 20,
        marginBottom: 10,
    },
    popularText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    trialBadge: {
        alignSelf: 'flex-end',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        marginBottom: 8,
    },
    trialText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    planHeader: { marginBottom: 14 },
    planName: { fontSize: 22, fontWeight: '800' },
    priceRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
    priceText: { fontSize: 32, fontWeight: '900', color: '#1E293B' },
    pricePer: { fontSize: 14, color: '#9CA3AF', marginBottom: 4, marginLeft: 2 },
    savingText: { color: '#10B981', fontSize: 12, fontWeight: '700', marginTop: 2 },
    afterTrialText: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },

    ctaButton: {
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

    featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    featureText: { color: '#374151', fontSize: 13, flex: 1 },

    faqSection: { margin: 16, marginTop: 8 },
    faqTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
    faqItem: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    faqQ: { fontWeight: '700', color: '#1E293B', fontSize: 14, marginBottom: 4 },
    faqA: { color: '#6B7280', fontSize: 13, lineHeight: 20 },

    manageSection: { padding: 16 },
    manageCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
    },
    manageTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '600', marginBottom: 4 },
    managePlanName: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
    trialBanner: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        padding: 8,
        borderRadius: 8,
        marginTop: 10,
    },
    trialBannerText: { color: '#047857', fontSize: 12, fontWeight: '600' },
    cancelButton: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 14,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },
    cancelText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
    upgradeBanner: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        backgroundColor: '#EFF6FF',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#BFDBFE',
    },
    upgradeText: { flex: 1, color: '#3F51B5', fontWeight: '600', fontSize: 14 },

    verifySection: { padding: 20, alignItems: 'center' },
    verifyIcon: { marginBottom: 16 },
    verifyTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
    verifySubtitle: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    verifyStep: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        width: '100%',
    },
    verifyStepIcon: { fontSize: 24 },
    verifyStepLabel: { fontWeight: '600', color: '#1E293B', fontSize: 14 },
    verifyStepNote: { color: '#9CA3AF', fontSize: 12 },
    verifyNote: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 12 },
});
