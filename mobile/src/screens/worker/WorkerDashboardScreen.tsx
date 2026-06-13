import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Image, Switch, Alert,
    Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Colors, Radius, Spacing } from '../../theme';

export default function WorkerDashboardScreen({ navigation }) {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const { planTier, isPro, isPremium } = useSubscription();

    const [appliedJobs, setAppliedJobs] = useState([]);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('applied'); // 'applied' | 'pending' | 'finished'
    const [uploadingPic, setUploadingPic] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const [appsRes, followersRes, followingRes] = await Promise.all([
                supabase
                    .from('applications')
                    .select('id, status, created_at, job:job_id(id, title, description, budget, location, status, created_at)')
                    .eq('worker_id', user.id)
                    .order('created_at', { ascending: false }),
                supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
                supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
            ]);
            setAppliedJobs(appsRes.data || []);
            setFollowerCount(followersRes.count || 0);
            setFollowingCount(followingRes.count || 0);
        } catch (e) {
            console.error('fetchData error', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function onRefresh() {
        setRefreshing(true);
        refreshProfile();
        fetchData();
    }

    function startEdit() {
        setEditForm({
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            phone_number: profile?.phone_number || '',
            job_title: profile?.job_title || '',
            location: profile?.location || '',
            bio: profile?.bio || '',
            years_experience: String(profile?.years_experience || ''),
        });
        setEditMode(true);
    }

    async function saveProfile() {
        setSaving(true);
        try {
            const { error } = await supabase.from('users').update({
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                phone_number: editForm.phone_number,
                job_title: editForm.job_title,
                location: editForm.location,
                bio: editForm.bio,
                years_experience: parseInt(editForm.years_experience) || 0,
            }).eq('id', user.id);
            if (error) throw error;
            await refreshProfile();
            setEditMode(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    }

    async function toggleAvailability() {
        const newVal = !profile?.is_active;
        await supabase.from('users').update({ is_active: newVal }).eq('id', user.id);
        await refreshProfile();
    }

    async function pickProfilePicture() {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
        if (result.canceled) return;
        setUploadingPic(true);
        try {
            const uri = result.assets[0].uri;
            const ext = uri.split('.').pop();
            const fileName = `${user.id}-${Date.now()}.${ext}`;
            const response = await fetch(uri);
            const blob = await response.blob();
            const { error: uploadError } = await supabase.storage.from('profile-pictures').upload(fileName, blob, { upsert: true });
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
            await supabase.from('users').update({ profile_picture: publicUrl }).eq('id', user.id);
            await refreshProfile();
        } catch (e) {
            Alert.alert('Error', 'Failed to upload picture.');
        } finally {
            setUploadingPic(false);
        }
    }

    const filteredJobs = appliedJobs.filter((a) => {
        if (activeTab === 'applied') return ['pending', 'viewed'].includes(a.status);
        if (activeTab === 'pending') return a.status === 'accepted';
        if (activeTab === 'finished') return a.status === 'completed' || a.status === 'declined';
        return true;
    });

    const planColors = { free: '#6b7280', pro: '#f59e0b', premium: '#a855f7' };
    const planColor = planColors[planTier] || '#6b7280';

    if (loading) {
        return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        >
            {/* Profile Hero */}
            <View style={styles.hero}>
                <TouchableOpacity style={styles.picContainer} onPress={pickProfilePicture}>
                    {profile?.profile_picture ? (
                        <Image source={{ uri: profile.profile_picture }} style={styles.profilePic} />
                    ) : (
                        <View style={styles.picPlaceholder}>
                            <Ionicons name="person" size={40} color="#6b7280" />
                        </View>
                    )}
                    {uploadingPic && <ActivityIndicator style={styles.picOverlay} color="#fff" />}
                    <View style={styles.picEditBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
                </TouchableOpacity>

                <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
                {profile?.job_title && <Text style={styles.jobTitle}>{profile.job_title}</Text>}
                {profile?.location && (
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" />
                        <Text style={styles.locationText}>{profile.location}</Text>
                    </View>
                )}

                {/* Plan badge */}
                <View style={[styles.planBadge, { backgroundColor: planColor + '20', borderColor: planColor }]}>
                    <Text style={[styles.planText, { color: planColor }]}>{planTier.toUpperCase()} PLAN</Text>
                </View>

                {/* Stats row */}
                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Followers')}>
                        <Text style={styles.statNum}>{followerCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Following')}>
                        <Text style={styles.statNum}>{followingCount}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{profile?.rating?.toFixed(1) || '—'}</Text>
                        <Text style={styles.statLabel}>Rating</Text>
                    </View>
                </View>

                {/* Availability toggle */}
                <View style={styles.availRow}>
                    <Text style={styles.availLabel}>Available for work</Text>
                    <Switch
                        value={!!profile?.is_active}
                        onValueChange={toggleAvailability}
                        trackColor={{ true: '#22c55e', false: '#374151' }}
                        thumbColor="#fff"
                    />
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subBtn} onPress={() => navigation.navigate('Subscription')}>
                        <Ionicons name="diamond-outline" size={16} color="#a855f7" />
                        <Text style={styles.subBtnText}>Subscription</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bio */}
            {profile?.bio && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>
                    <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
            )}

            {/* Jobs Tabs */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Applications</Text>
                <View style={styles.tabs}>
                    {[['applied', 'Applied'], ['pending', 'Accepted'], ['finished', 'Finished']].map(([key, label]) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.tab, activeTab === key && styles.tabActive]}
                            onPress={() => setActiveTab(key)}
                        >
                            <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {filteredJobs.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Text style={styles.emptyText}>No applications here yet</Text>
                    </View>
                ) : (
                    filteredJobs.map((app) => (
                        <TouchableOpacity
                            key={app.id}
                            style={styles.appCard}
                            onPress={() => navigation.navigate('JobDetail', { jobId: app.job?.id })}
                        >
                            <View style={styles.appCardHeader}>
                                <Text style={styles.appJobTitle} numberOfLines={1}>{app.job?.title || 'Job'}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: statusColor(app.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: statusColor(app.status) }]}>{app.status}</Text>
                                </View>
                            </View>
                            {app.job?.location && (
                                <View style={styles.appCardRow}>
                                    <Ionicons name="location-outline" size={12} color="#6b7280" />
                                    <Text style={styles.appCardMeta}>{app.job.location}</Text>
                                </View>
                            )}
                            {app.job?.budget && (
                                <View style={styles.appCardRow}>
                                    <Ionicons name="cash-outline" size={12} color="#6b7280" />
                                    <Text style={styles.appCardMeta}>${app.job.budget}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Edit Profile Modal */}
            <Modal visible={editMode} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditMode(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {[
                                ['First Name', 'first_name'],
                                ['Last Name', 'last_name'],
                                ['Phone', 'phone_number'],
                                ['Job Title', 'job_title'],
                                ['Location', 'location'],
                                ['Years Experience', 'years_experience'],
                            ].map(([label, key]) => (
                                <View key={key} style={styles.editField}>
                                    <Text style={styles.editLabel}>{label}</Text>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editForm[key] || ''}
                                        onChangeText={(v) => setEditForm((p) => ({ ...p, [key]: v }))}
                                        placeholderTextColor="#6b7280"
                                        keyboardType={key === 'years_experience' ? 'numeric' : 'default'}
                                    />
                                </View>
                            ))}
                            <View style={styles.editField}>
                                <Text style={styles.editLabel}>Bio</Text>
                                <TextInput
                                    style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]}
                                    value={editForm.bio || ''}
                                    onChangeText={(v) => setEditForm((p) => ({ ...p, bio: v }))}
                                    multiline
                                    placeholderTextColor="#6b7280"
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                                onPress={saveProfile}
                                disabled={saving}
                            >
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

function statusColor(status) {
    const map = { pending: '#f59e0b', accepted: '#22c55e', declined: '#ef4444', completed: '#3b82f6', viewed: '#a855f7' };
    return map[status] || '#6b7280';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
    hero: {
        backgroundColor: Colors.bgCard, padding: Spacing.xl, paddingTop: 52,
        alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    picContainer: { position: 'relative', marginBottom: 14 },
    profilePic: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.primary },
    picPlaceholder: {
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center',
        borderWidth: 3, borderColor: Colors.border,
    },
    picOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 50, backgroundColor: '#00000080' },
    picEditBadge: {
        position: 'absolute', bottom: 2, right: 2,
        backgroundColor: Colors.primary, width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.bgCard,
    },
    name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
    jobTitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
    locationText: { color: Colors.textMuted, fontSize: 13 },
    planBadge: {
        paddingHorizontal: 14, paddingVertical: 5, borderRadius: Radius.full,
        borderWidth: 1, marginBottom: 14,
    },
    planText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, width: '100%' },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
    availRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, backgroundColor: Colors.bgElevated, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full },
    availLabel: { color: Colors.textSecondary, fontSize: 14 },
    actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: Radius.md,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
    },
    editBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    subBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.premiumGlow, paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.premium,
    },
    subBtnText: { color: Colors.premium, fontWeight: '700', fontSize: 13 },
    signOutBtn: { padding: 9, backgroundColor: Colors.errorGlow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '50' },
    section: { padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
    bioText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    tab: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full,
        backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
    },
    tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
    tabTextActive: { color: '#fff', fontWeight: '700' },
    emptyBox: { padding: 28, alignItems: 'center' },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    appCard: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 14,
        marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
    },
    appCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    appJobTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginRight: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
    statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    appCardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    appCardMeta: { color: Colors.textMuted, fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalBox: {
        backgroundColor: Colors.bgCard, borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl, padding: Spacing.xxl, maxHeight: '85%',
        borderTopWidth: 1, borderColor: Colors.border,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
    editField: { marginBottom: 16 },
    editLabel: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    editInput: {
        backgroundColor: Colors.bg, borderColor: Colors.border, borderWidth: 1,
        borderRadius: Radius.md, color: Colors.textPrimary,
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    },
    saveBtn: {
        backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: Radius.md,
        alignItems: 'center', marginTop: 8, marginBottom: 32,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.55 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
