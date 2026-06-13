import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';

export default function PublicWorkerProfileScreen({ navigation, route }) {
    const workerId = route?.params?.workerId;
    const { user, profile } = useAuth();
    const { isPro, isPremium } = useSubscription();

    const [worker, setWorker] = useState(null);
    const [ratings, setRatings] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [followLoading, setFollowLoading] = useState(false);

    useEffect(() => {
        if (!workerId) { setLoading(false); return; }
        fetchWorker();
        if (user) checkFollowing();
    }, [workerId]);

    async function fetchWorker() {
        const [workerRes, ratingsRes] = await Promise.all([
            supabase.from('users')
                .select('id, first_name, last_name, job_title, location, bio, years_experience, services, portfolio, profile_picture, rating, is_active, user_type, email_verified, user_subscriptions(plan_id, status), verification_badges(status, badge_type)')
                .eq('id', workerId)
                .single(),
            supabase.from('job_completions')
                .select('rating, review, created_at, client:client_id(id, first_name, last_name, profile_picture)')
                .eq('worker_id', workerId)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);
        setWorker(workerRes.data);
        setRatings(ratingsRes.data || []);
        setLoading(false);

        // Track profile view
        if (user && user.id !== workerId) {
            await supabase.from('profile_views').upsert({
                viewer_id: user.id,
                viewed_id: workerId,
                view_date: new Date().toISOString().split('T')[0],
                viewed_at: new Date().toISOString(),
            }, { onConflict: 'viewer_id,viewed_id,view_date' });
        }
    }

    async function checkFollowing() {
        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', workerId)
            .maybeSingle();
        setIsFollowing(!!data);
    }

    async function toggleFollow() {
        setFollowLoading(true);
        try {
            if (isFollowing) {
                await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', workerId);
                setIsFollowing(false);
            } else {
                await supabase.from('follows').insert({ follower_id: user.id, following_id: workerId });
                setIsFollowing(true);
                // Notify the worker
                await supabase.from('notifications').insert({
                    user_id: workerId,
                    type: 'follow',
                    message: `${profile?.first_name} ${profile?.last_name} started following you`,
                    related_id: user.id,
                });
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to update follow status.');
        } finally {
            setFollowLoading(false);
        }
    }

    function contactWhatsApp() {
        if (!isPro && !isPremium) {
            Alert.alert('Pro Feature', 'Upgrade to Pro or Premium to contact workers directly.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => navigation.navigate('Pricing') },
            ]);
            return;
        }
        if (worker?.phone_number) {
            const number = worker.phone_number.replace(/\D/g, '');
            Linking.openURL(`whatsapp://send?phone=${number}`);
        } else {
            Alert.alert('No phone number available');
        }
    }

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;
    }
    if (!worker) {
        return <View style={styles.center}><Text style={styles.errorText}>Worker not found</Text></View>;
    }

    const planTier = worker.user_subscriptions?.[0]?.plan_id?.includes('premium') ? 'premium'
        : worker.user_subscriptions?.[0]?.plan_id?.includes('pro') ? 'pro' : 'free';
    const planColors = { free: '#6b7280', pro: '#f59e0b', premium: '#a855f7' };
    const verified = worker.verification_badges?.some((b) => b.status === 'verified');

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#f97316" />
            </TouchableOpacity>

            {/* Hero */}
            <View style={styles.hero}>
                {worker.profile_picture ? (
                    <Image source={{ uri: worker.profile_picture }} style={styles.profilePic} />
                ) : (
                    <View style={styles.picPlaceholder}>
                        <Ionicons name="person" size={48} color="#6b7280" />
                    </View>
                )}

                <View style={styles.nameRow}>
                    <Text style={styles.name}>{worker.first_name} {worker.last_name}</Text>
                    {verified && <Ionicons name="shield-checkmark" size={20} color="#22c55e" />}
                </View>

                {worker.job_title && <Text style={styles.jobTitle}>{worker.job_title}</Text>}

                {worker.location && (
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" />
                        <Text style={styles.metaText}>{worker.location}</Text>
                    </View>
                )}

                <View style={styles.statsRow}>
                    {worker.rating && (
                        <View style={styles.stat}>
                            <Ionicons name="star" size={16} color="#f59e0b" />
                            <Text style={styles.statVal}>{worker.rating.toFixed(1)}</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    )}
                    {worker.years_experience > 0 && (
                        <View style={styles.stat}>
                            <Text style={styles.statVal}>{worker.years_experience}</Text>
                            <Text style={styles.statLabel}>Years Exp</Text>
                        </View>
                    )}
                    <View style={styles.stat}>
                        <View style={[styles.availDot, { backgroundColor: worker.is_active ? '#22c55e' : '#ef4444' }]} />
                        <Text style={styles.statLabel}>{worker.is_active ? 'Available' : 'Unavailable'}</Text>
                    </View>
                </View>

                {/* Plan badge */}
                {planTier !== 'free' && (
                    <View style={[styles.planBadge, { borderColor: planColors[planTier] }]}>
                        <Text style={[styles.planText, { color: planColors[planTier] }]}>{planTier.toUpperCase()}</Text>
                    </View>
                )}

                {/* Action buttons */}
                {user && user.id !== workerId && (
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={[styles.followBtn, isFollowing && styles.followingBtn]}
                            onPress={toggleFollow}
                            disabled={followLoading}
                        >
                            {followLoading ? <ActivityIndicator size="small" color="#fff" /> : (
                                <Text style={styles.followBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
                            )}
                        </TouchableOpacity>
                        {profile?.user_type === 'client' && (
                            <TouchableOpacity style={styles.contactBtn} onPress={contactWhatsApp}>
                                <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                                <Text style={styles.contactBtnText}>Contact</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Bio */}
            {worker.bio && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.bioText}>{worker.bio}</Text>
                </View>
            )}

            {/* Services */}
            {worker.services?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Services</Text>
                    <View style={styles.tagsRow}>
                        {worker.services.map((s, i) => (
                            <View key={i} style={styles.tag}>
                                <Text style={styles.tagText}>{s}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Portfolio */}
            {worker.portfolio?.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Portfolio ({worker.portfolio.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
                        {worker.portfolio.map((url, i) => (
                            <Image key={i} source={{ uri: url }} style={styles.portfolioImage} />
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Ratings */}
            {ratings.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Reviews ({ratings.length})</Text>
                    {ratings.map((r, i) => (
                        <View key={i} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.reviewStars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Ionicons key={star} name="star" size={14} color={star <= r.rating ? '#f59e0b' : '#374151'} />
                                    ))}
                                </View>
                                <Text style={styles.reviewClient}>
                                    {r.client?.first_name} {r.client?.last_name}
                                </Text>
                                <Text style={styles.reviewDate}>{new Date(r.created_at).toLocaleDateString()}</Text>
                            </View>
                            {r.review && <Text style={styles.reviewText}>{r.review}</Text>}
                        </View>
                    ))}
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
    backBtn: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
    hero: { backgroundColor: '#1f2937', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#374151' },
    profilePic: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#f97316', marginBottom: 12 },
    picPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    name: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    jobTitle: { color: '#9ca3af', fontSize: 15, marginBottom: 6 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    metaText: { color: '#9ca3af', fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
    stat: { alignItems: 'center', gap: 2 },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    statLabel: { fontSize: 11, color: '#6b7280' },
    availDot: { width: 10, height: 10, borderRadius: 5 },
    planBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
    planText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    actionRow: { flexDirection: 'row', gap: 10 },
    followBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#f97316', borderRadius: 8 },
    followingBtn: { backgroundColor: '#374151' },
    followBtnText: { color: '#fff', fontWeight: 'bold' },
    contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#22c55e20', borderRadius: 8, borderWidth: 1, borderColor: '#22c55e' },
    contactBtnText: { color: '#22c55e', fontWeight: 'bold' },
    section: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    bioText: { color: '#d1d5db', fontSize: 14, lineHeight: 20 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#374151' },
    tagText: { color: '#d1d5db', fontSize: 13 },
    portfolioScroll: { marginHorizontal: -16 },
    portfolioImage: { width: 140, height: 140, borderRadius: 8, marginRight: 10 },
    reviewCard: { backgroundColor: '#1f2937', borderRadius: 10, padding: 14, marginBottom: 8 },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
    reviewStars: { flexDirection: 'row', gap: 2 },
    reviewClient: { color: '#d1d5db', fontSize: 13, fontWeight: '600' },
    reviewDate: { color: '#6b7280', fontSize: 11, marginLeft: 'auto' },
    reviewText: { color: '#9ca3af', fontSize: 13, lineHeight: 18 },
    errorText: { color: '#ef4444' },
});
