import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Colors, Radius, Spacing } from '../../theme';

interface AppUser {
    id: string;
    first_name: string;
    last_name: string;
    user_type: string;
    job_title?: string;
    location?: string;
    bio?: string;
    rating?: number;
    is_active?: boolean;
    completed_jobs?: number;
}

export default function AllUsersScreen({ navigation }) {
    const [users, setUsers] = useState<AppUser[]>([]);
    const [filtered, setFiltered] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<'all' | 'worker' | 'client'>('all');

    useEffect(() => { load(); }, []);

    useEffect(() => {
        let list = tab === 'all' ? users : users.filter(u => u.user_type === tab);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(u =>
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                u.job_title?.toLowerCase().includes(q) ||
                u.location?.toLowerCase().includes(q)
            );
        }
        setFiltered(list);
    }, [users, tab, search]);

    async function load(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const { data } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_type, job_title, location, bio, rating, is_active, completed_jobs')
            .order('first_name', { ascending: true });
        setUsers(data || []);
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
    }

    const onRefresh = useCallback(() => load(true), []);

    function renderUser({ item }: { item: AppUser }) {
        const initials = `${item.first_name?.[0] ?? ''}${item.last_name?.[0] ?? ''}`.toUpperCase();
        const isWorker = item.user_type === 'worker';
        const roleColor = isWorker ? Colors.primary : Colors.info;
        const roleBg = isWorker ? Colors.primaryGlow : '#3b82f620';

        return (
            <TouchableOpacity
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => {
                    if (isWorker) navigation.navigate('PublicWorkerProfile', { workerId: item.id });
                }}
            >
                {/* Avatar */}
                <View style={[styles.avatar, { borderColor: roleColor }]}>
                    <Text style={[styles.avatarText, { color: roleColor }]}>{initials}</Text>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                    <View style={styles.cardRow}>
                        <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
                            <Text style={[styles.roleText, { color: roleColor }]}>
                                {isWorker ? 'Worker' : 'Client'}
                            </Text>
                        </View>
                    </View>

                    {item.job_title ? (
                        <Text style={styles.jobTitle} numberOfLines={1}>{item.job_title}</Text>
                    ) : null}

                    <View style={styles.metaRow}>
                        {item.location ? (
                            <View style={styles.metaItem}>
                                <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                                <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
                            </View>
                        ) : null}
                        {isWorker && item.rating ? (
                            <View style={styles.metaItem}>
                                <Ionicons name="star" size={12} color="#f59e0b" />
                                <Text style={styles.metaText}>{Number(item.rating).toFixed(1)}</Text>
                            </View>
                        ) : null}
                        {isWorker && (
                            <View style={[styles.availBadge, { backgroundColor: item.is_active ? Colors.successGlow : Colors.bgElevated }]}>
                                <Text style={{ fontSize: 10, color: item.is_active ? Colors.success : Colors.textMuted, fontWeight: '600' }}>
                                    {item.is_active ? '● Available' : '○ Busy'}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {isWorker && (
                    <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                )}
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Community</Text>
                <Text style={styles.headerSub}>All registered users</Text>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={Colors.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, title, location..."
                    placeholderTextColor={Colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                />
                {search ? (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Filter tabs */}
            <View style={styles.tabs}>
                {(['all', 'worker', 'client'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                            {t === 'all' ? 'All' : t === 'worker' ? 'Workers' : 'Clients'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={i => i.id}
                    renderItem={renderUser}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                            <Text style={styles.emptyText}>No users found</Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    header: {
        paddingTop: 56,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.xl,
        borderBottomWidth: 1,
        borderColor: Colors.border,
    },
    headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
    headerSub: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
    searchRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginHorizontal: Spacing.xl, marginVertical: Spacing.lg,
        backgroundColor: Colors.bgElevated, borderRadius: Radius.md,
        paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: Colors.border,
    },
    searchIcon: { marginRight: 2 },
    searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
    tabs: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 8 },
    tabBtn: {
        flex: 1, paddingVertical: 8, borderRadius: Radius.md,
        alignItems: 'center', backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border,
    },
    tabBtnActive: { backgroundColor: Colors.primaryGlow, borderColor: Colors.primary },
    tabLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
    tabLabelActive: { color: Colors.primary },
    list: { paddingHorizontal: Spacing.xl, paddingBottom: 80 },
    card: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: Colors.bgCard, borderRadius: Radius.lg,
        padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border,
    },
    avatar: {
        width: 50, height: 50, borderRadius: 25,
        backgroundColor: Colors.bgElevated, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: 17, fontWeight: '700' },
    cardInfo: { flex: 1, gap: 3 },
    cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
    roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
    roleText: { fontSize: 11, fontWeight: '700' },
    jobTitle: { color: Colors.textSecondary, fontSize: 13 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaText: { color: Colors.textMuted, fontSize: 12 },
    availBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.full },
    separator: { height: 8 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
    emptyText: { color: Colors.textMuted, marginTop: 12, fontSize: 15 },
});
