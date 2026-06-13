import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radius, Spacing } from '../../theme';

const PAGE_SIZE = 24;

export default function BrowseWorkersScreen({ navigation }) {
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [location, setLocation] = useState('');
    const [page, setPage] = useState(0);

    const fetchWorkers = useCallback(async (pageNum = 0, reset = false) => {
        if (pageNum === 0) setLoading(true); else setLoadingMore(true);
        try {
            let query = supabase
                .from('users')
                .select('id, first_name, last_name, job_title, location, bio, years_experience, profile_picture, rating, is_active, user_subscriptions(plan_id, status), verification_badges!verification_badges_user_id_fkey(status, badge_type)')
                .eq('user_type', 'worker')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

            if (search.trim()) {
                query = query.or(`job_title.ilike.%${search}%,bio.ilike.%${search}%`);
            }
            if (location.trim()) {
                query = query.ilike('location', `%${location}%`);
            }

            const { data } = await query;
            const sorted = sortByPlan(data || []);

            if (reset || pageNum === 0) setWorkers(sorted);
            else setWorkers((prev) => [...prev, ...sorted]);

            setHasMore((data || []).length === PAGE_SIZE);
            setPage(pageNum);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [search, location]);

    function sortByPlan(workers) {
        const tier = (w) => {
            const plan = w.user_subscriptions?.[0]?.plan_id || '';
            if (plan.includes('premium')) return 0;
            if (plan.includes('pro')) return 1;
            return 2;
        };
        return [...workers].sort((a, b) => tier(a) - tier(b));
    }

    useEffect(() => { fetchWorkers(0, true); }, [fetchWorkers]);

    function onRefresh() { setRefreshing(true); fetchWorkers(0, true); }
    function onLoadMore() { if (!loadingMore && hasMore) fetchWorkers(page + 1); }

    function renderWorker({ item }) {
        const planId = item.user_subscriptions?.[0]?.plan_id || '';
        const isPremium = planId.includes('premium');
        const isPro = planId.includes('pro');
        const verified = item.verification_badges?.some((b) => b.status === 'verified');
        const initials = `${item.first_name?.[0] || ''}${item.last_name?.[0] || ''}`.toUpperCase();

        return (
            <TouchableOpacity
                style={[styles.card, isPremium && styles.cardPremium, isPro && !isPremium && styles.cardPro]}
                onPress={() => navigation.navigate('PublicWorkerProfile', { workerId: item.id })}
                activeOpacity={0.88}
            >
                {/* Plan ribbon */}
                {(isPremium || isPro) && (
                    <View style={[styles.planRibbon, isPremium ? styles.ribbonPremium : styles.ribbonPro]}>
                        <Text style={styles.ribbonText}>{isPremium ? '💎 Premium' : '⭐ Pro'}</Text>
                    </View>
                )}

                <View style={styles.cardTop}>
                    {item.profile_picture ? (
                        <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, isPremium ? styles.avatarPremium : isPro ? styles.avatarPro : null]}>
                            <Text style={styles.avatarInitials}>{initials || '?'}</Text>
                        </View>
                    )}
                    <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                            <Text style={styles.workerName} numberOfLines={1}>{item.first_name} {item.last_name}</Text>
                            {verified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="shield-checkmark" size={13} color={Colors.success} />
                                </View>
                            )}
                        </View>
                        {item.job_title && (
                            <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title}</Text>
                        )}
                        {item.location && (
                            <View style={styles.metaRow}>
                                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                <Text style={styles.metaText}>{item.location}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {item.bio && <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>}

                <View style={styles.cardFooter}>
                    {item.years_experience > 0 && (
                        <View style={styles.footerChip}>
                            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                            <Text style={styles.footerChipText}>{item.years_experience}y exp</Text>
                        </View>
                    )}
                    {item.rating && (
                        <View style={styles.footerChip}>
                            <Ionicons name="star" size={12} color={Colors.warning} />
                            <Text style={[styles.footerChipText, { color: Colors.warning }]}>{item.rating.toFixed(1)}</Text>
                        </View>
                    )}
                    <View style={[styles.availBadge, { backgroundColor: item.is_active ? Colors.successGlow : Colors.bgElevated }]}>
                        <View style={[styles.availDot, { backgroundColor: item.is_active ? Colors.success : Colors.textMuted }]} />
                        <Text style={{ color: item.is_active ? Colors.success : Colors.textMuted, fontSize: 11, fontWeight: '600' }}>
                            {item.is_active ? 'Available' : 'Busy'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.screenTitle}>Browse Workers</Text>
                    <Text style={styles.screenSub}>Find the perfect talent</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{workers.length}+</Text>
                </View>
            </View>

            <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    onSubmitEditing={() => fetchWorkers(0, true)}
                    placeholder="Search by skill or job title..."
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="search"
                />
            </View>

            <View style={styles.searchRow}>
                <Ionicons name="location-outline" size={17} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    value={location}
                    onChangeText={setLocation}
                    onSubmitEditing={() => fetchWorkers(0, true)}
                    placeholder="Filter by location..."
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="search"
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Finding workers...</Text>
                </View>
            ) : (
                <FlatList
                    data={workers}
                    keyExtractor={(w) => w.id}
                    renderItem={renderWorker}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="people-outline" size={36} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No workers found</Text>
                            <Text style={styles.emptyText}>Try adjusting your search filters</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },

    topBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingTop: 52, paddingBottom: 12,
    },
    screenTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
    screenSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
    countBadge: { backgroundColor: Colors.primaryGlow, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full },
    countText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },

    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgCard, marginHorizontal: Spacing.lg, marginBottom: 8,
        borderRadius: Radius.md, paddingHorizontal: 12,
        borderWidth: 1, borderColor: Colors.border,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: Colors.textPrimary, paddingVertical: 11, fontSize: 14 },

    list: { padding: Spacing.lg, gap: 12, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md + 2,
        borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
    },
    cardPremium: { borderColor: Colors.premium + '60' },
    cardPro: { borderColor: Colors.pro + '50' },

    planRibbon: {
        position: 'absolute', top: 10, right: -24,
        paddingHorizontal: 28, paddingVertical: 3,
        transform: [{ rotate: '35deg' }],
    },
    ribbonPremium: { backgroundColor: Colors.premiumGlow },
    ribbonPro: { backgroundColor: Colors.proGlow },
    ribbonText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    cardTop: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: Colors.border },
    avatarPlaceholder: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: Colors.bgElevated,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.border,
    },
    avatarPremium: { borderColor: Colors.premium },
    avatarPro: { borderColor: Colors.pro },
    avatarInitials: { fontSize: 18, fontWeight: '800', color: Colors.textSecondary },

    cardInfo: { flex: 1, justifyContent: 'center' },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    workerName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
    verifiedBadge: { backgroundColor: Colors.successGlow, borderRadius: 10, padding: 2 },
    jobTitle: { color: Colors.textSecondary, fontSize: 13, marginBottom: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: Colors.textMuted, fontSize: 12 },

    bio: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 10 },

    cardFooter: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
    footerChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.bgElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    },
    footerChipText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
    availBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full,
    },
    availDot: { width: 6, height: 6, borderRadius: 3 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { color: Colors.textMuted, marginTop: 12, fontSize: 14 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { color: Colors.textSecondary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});

