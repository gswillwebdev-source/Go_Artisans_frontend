import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radius, Spacing } from '../../theme';

const PAGE_SIZE = 24;
const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Gardening', 'Cooking', 'IT', 'Other'];

const CAT_ICONS: Record<string, any> = {
    All: 'apps', Plumbing: 'water', Electrical: 'flash', Carpentry: 'hammer',
    Painting: 'color-palette', Cleaning: 'sparkles', Gardening: 'leaf',
    Cooking: 'restaurant', IT: 'laptop', Other: 'ellipsis-horizontal',
};

export default function JobsScreen({ navigation }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [page, setPage] = useState(0);

    const fetchJobs = useCallback(async (pageNum = 0, reset = false) => {
        if (pageNum === 0) setLoading(true); else setLoadingMore(true);
        try {
            let query = supabase
                .from('jobs')
                .select('id, title, description, budget, location, category, status, created_at, client:client_id(id, first_name, last_name)')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

            if (search.trim()) {
                query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
            }
            if (category !== 'All') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;
            if (error) throw error;

            if (reset || pageNum === 0) {
                setJobs(data || []);
            } else {
                setJobs((prev) => [...prev, ...(data || [])]);
            }
            setHasMore((data || []).length === PAGE_SIZE);
            setPage(pageNum);
        } catch (e) {
            console.error('fetchJobs error', e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, [search, category]);

    useEffect(() => { fetchJobs(0, true); }, [fetchJobs]);

    function onRefresh() { setRefreshing(true); fetchJobs(0, true); }
    function onLoadMore() { if (!loadingMore && hasMore) fetchJobs(page + 1); }

    function renderJob({ item }) {
        const client = item.client;
        const daysAgo = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86400000);
        const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('JobDetail', { jobId: item.id })}
                activeOpacity={0.88}
            >
                {/* Top row */}
                <View style={styles.cardHeader}>
                    <View style={styles.categoryBadge}>
                        <Ionicons name={CAT_ICONS[item.category] || 'briefcase'} size={11} color={Colors.primary} />
                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                    </View>
                    <View style={styles.timeRow}>
                        <Ionicons name="time-outline" size={11} color={Colors.textMuted} />
                        <Text style={styles.timeAgo}>{timeLabel}</Text>
                    </View>
                </View>

                <Text style={styles.jobTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.jobDesc} numberOfLines={2}>{item.description}</Text>

                {/* Footer */}
                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Ionicons name="location-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.footerText}>{item.location || 'Remote'}</Text>
                    </View>
                    {item.budget && (
                        <View style={[styles.footerItem, styles.budgetBadge]}>
                            <Ionicons name="cash-outline" size={13} color={Colors.success} />
                            <Text style={[styles.footerText, { color: Colors.success, fontWeight: '700' }]}>${item.budget}</Text>
                        </View>
                    )}
                    {client && (
                        <View style={styles.footerItem}>
                            <Ionicons name="person-circle-outline" size={13} color={Colors.textMuted} />
                            <Text style={styles.footerText}>{client.first_name} {client.last_name}</Text>
                        </View>
                    )}
                </View>

                {/* Arrow */}
                <View style={styles.cardArrow}>
                    <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.screenTitle}>Browse Jobs</Text>
                    <Text style={styles.screenSub}>Find your next opportunity</Text>
                </View>
                <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Live</Text>
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={17} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={(v) => { setSearch(v); }}
                    onSubmitEditing={() => fetchJobs(0, true)}
                    placeholder="Search jobs, skills, keywords..."
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="search"
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearch(''); }}>
                        <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Categories */}
            <FlatList
                horizontal
                data={CATEGORIES}
                keyExtractor={(c) => c}
                showsHorizontalScrollIndicator={false}
                style={styles.catList}
                contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.lg }}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.catBtn, category === item && styles.catBtnActive]}
                        onPress={() => setCategory(item)}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name={CAT_ICONS[item] || 'ellipsis-horizontal'}
                            size={13}
                            color={category === item ? '#fff' : Colors.textMuted}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.catBtnText, category === item && styles.catBtnTextActive]}>{item}</Text>
                    </TouchableOpacity>
                )}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Finding jobs...</Text>
                </View>
            ) : (
                <FlatList
                    data={jobs}
                    keyExtractor={(j) => j.id}
                    renderItem={renderJob}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    onEndReached={onLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <View style={styles.emptyIcon}>
                                <Ionicons name="briefcase-outline" size={36} color={Colors.textMuted} />
                            </View>
                            <Text style={styles.emptyTitle}>No jobs found</Text>
                            <Text style={styles.emptyText}>Try changing your search or category filter</Text>
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
    liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.successGlow, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
    liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.success },
    liveText: { fontSize: 12, fontWeight: '700', color: Colors.success },

    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.bgCard, marginHorizontal: Spacing.lg, marginBottom: 10,
        borderRadius: Radius.md, paddingHorizontal: 12,
        borderWidth: 1, borderColor: Colors.border,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: Colors.textPrimary, paddingVertical: 11, fontSize: 14 },

    catList: { maxHeight: 42, marginBottom: 10 },
    catBtn: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full,
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    },
    catBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    catBtnText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
    catBtnTextActive: { color: '#fff' },

    list: { padding: Spacing.lg, gap: 12, paddingBottom: 100 },
    card: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    categoryBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: Colors.primaryGlow, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
    },
    categoryText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    timeAgo: { color: Colors.textMuted, fontSize: 11 },

    jobTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 5, lineHeight: 22 },
    jobDesc: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 12 },

    cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    budgetBadge: { backgroundColor: Colors.successGlow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
    footerText: { color: Colors.textMuted, fontSize: 12 },
    cardArrow: { position: 'absolute', right: Spacing.lg, bottom: Spacing.lg },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    loadingText: { color: Colors.textMuted, marginTop: 12, fontSize: 14 },
    emptyIcon: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: { color: Colors.textSecondary, fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptyText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
});
