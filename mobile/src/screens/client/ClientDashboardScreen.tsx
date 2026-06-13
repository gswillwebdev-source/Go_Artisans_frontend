import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Modal, TextInput,
    FlatList, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Colors, Radius, Spacing } from '../../theme';

const JOB_TYPES = ['Fixed Price', 'Hourly', 'Negotiable'];

export default function ClientDashboardScreen({ navigation }) {
    const { user, profile, refreshProfile, signOut } = useAuth();
    const { canPostJobs, usage, FREE_JOB_POST_LIMIT, PRO_JOB_POST_LIMIT, isFree, isPro, isPremium } = useSubscription();

    const [myJobs, setMyJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [showPostJob, setShowPostJob] = useState(false);
    const [showApplicants, setShowApplicants] = useState(null); // job id
    const [applicants, setApplicants] = useState([]);
    const [uploadingPic, setUploadingPic] = useState(false);
    const [jobForm, setJobForm] = useState({ title: '', description: '', location: '', category: '', budget: '', job_type: 'Fixed Price' });
    const [postingJob, setPostingJob] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const [jobsRes, followersRes, followingRes] = await Promise.all([
                supabase.from('jobs').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
                supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
                supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
            ]);
            setMyJobs(jobsRes.data || []);
            setFollowerCount(followersRes.count || 0);
            setFollowingCount(followingRes.count || 0);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    function onRefresh() { setRefreshing(true); refreshProfile(); fetchData(); }

    async function loadApplicants(jobId) {
        const { data } = await supabase
            .from('applications')
            .select('id, status, created_at, worker:worker_id(id, first_name, last_name, job_title, profile_picture, location, phone_number, email)')
            .eq('job_id', jobId);
        setApplicants(data || []);
        setShowApplicants(jobId);
    }

    async function updateApplicationStatus(appId, newStatus) {
        await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
        setApplicants((prev) => prev.map((a) => a.id === appId ? { ...a, status: newStatus } : a));
    }

    async function deleteJob(jobId) {
        Alert.alert('Delete Job', 'Are you sure you want to delete this job posting?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await supabase.from('jobs').delete().eq('id', jobId);
                    setMyJobs((prev) => prev.filter((j) => j.id !== jobId));
                }
            },
        ]);
    }

    async function postJob() {
        if (!canPostJobs()) {
            const limit = isFree ? FREE_JOB_POST_LIMIT : PRO_JOB_POST_LIMIT;
            Alert.alert('Limit Reached', `You've posted ${limit} jobs this month. Upgrade to post more.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => navigation.navigate('Pricing') },
            ]);
            return;
        }
        if (!jobForm.title.trim() || !jobForm.description.trim()) {
            Alert.alert('Error', 'Title and description are required.');
            return;
        }
        setPostingJob(true);
        try {
            const { data, error } = await supabase.from('jobs').insert({
                client_id: user.id,
                title: jobForm.title,
                description: jobForm.description,
                location: jobForm.location,
                category: jobForm.category,
                budget: jobForm.budget ? Number(jobForm.budget) : null,
                status: 'active',
                created_at: new Date().toISOString(),
            }).select().single();
            if (error) throw error;
            setMyJobs((prev) => [data, ...prev]);
            setShowPostJob(false);
            setJobForm({ title: '', description: '', location: '', category: '', budget: '', job_type: 'Fixed Price' });
            Alert.alert('Success', 'Job posted successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to post job.');
        } finally {
            setPostingJob(false);
        }
    }

    function startEdit() {
        setEditForm({
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            phone_number: profile?.phone_number || '',
            location: profile?.location || '',
            bio: profile?.bio || '',
        });
        setEditMode(true);
    }

    async function saveProfile() {
        setSaving(true);
        try {
            await supabase.from('users').update(editForm).eq('id', user.id);
            await refreshProfile();
            setEditMode(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
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
            await supabase.storage.from('profile-pictures').upload(fileName, blob, { upsert: true });
            const { data: { publicUrl } } = supabase.storage.from('profile-pictures').getPublicUrl(fileName);
            await supabase.from('users').update({ profile_picture: publicUrl }).eq('id', user.id);
            await refreshProfile();
        } catch {
            Alert.alert('Error', 'Failed to upload picture.');
        } finally {
            setUploadingPic(false);
        }
    }

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>;

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
                        <View style={styles.picPlaceholder}><Ionicons name="business" size={40} color="#6b7280" /></View>
                    )}
                    {uploadingPic && <ActivityIndicator style={styles.picOverlay} color="#fff" />}
                    <View style={styles.picEditBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
                </TouchableOpacity>

                <Text style={styles.name}>{profile?.first_name} {profile?.last_name}</Text>
                <Text style={styles.roleLabel}>Client / Employer</Text>
                {profile?.location && (
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={14} color="#9ca3af" />
                        <Text style={styles.locationText}>{profile.location}</Text>
                    </View>
                )}

                <View style={styles.statsRow}>
                    <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Followers')}>
                        <Text style={styles.statNum}>{followerCount}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </TouchableOpacity>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{myJobs.length}</Text>
                        <Text style={styles.statLabel}>Jobs Posted</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNum}>{usage.job_posts}/{isFree ? FREE_JOB_POST_LIMIT : isPro ? PRO_JOB_POST_LIMIT : '∞'}</Text>
                        <Text style={styles.statLabel}>This Month</Text>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={startEdit}>
                        <Ionicons name="create-outline" size={16} color="#fff" />
                        <Text style={styles.editBtnText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.postJobBtn} onPress={() => setShowPostJob(true)}>
                        <Ionicons name="add-circle-outline" size={16} color="#fff" />
                        <Text style={styles.postJobBtnText}>Post Job</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
                        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* My Jobs */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Job Postings ({myJobs.length})</Text>
                {myJobs.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="briefcase-outline" size={40} color="#374151" />
                        <Text style={styles.emptyText}>No jobs posted yet</Text>
                        <TouchableOpacity style={styles.postBtn} onPress={() => setShowPostJob(true)}>
                            <Text style={styles.postBtnText}>Post Your First Job</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    myJobs.map((job) => (
                        <View key={job.id} style={styles.jobCard}>
                            <View style={styles.jobCardHeader}>
                                <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: job.status === 'active' ? '#22c55e20' : '#6b728020' }]}>
                                    <Text style={{ color: job.status === 'active' ? '#22c55e' : '#6b7280', fontSize: 11 }}>{job.status}</Text>
                                </View>
                            </View>
                            <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
                            <View style={styles.jobCardFooter}>
                                {job.location && <Text style={styles.jobMeta}>{job.location}</Text>}
                                {job.budget && <Text style={styles.jobMeta}>${job.budget}</Text>}
                            </View>
                            <View style={styles.jobActions}>
                                <TouchableOpacity style={styles.viewAppsBtn} onPress={() => loadApplicants(job.id)}>
                                    <Ionicons name="people-outline" size={16} color="#3b82f6" />
                                    <Text style={styles.viewAppsBtnText}>View Applicants</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteJob(job.id)}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </View>

            {/* Post Job Modal */}
            <Modal visible={showPostJob} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Post a Job</Text>
                            <TouchableOpacity onPress={() => setShowPostJob(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {[['Job Title *', 'title'], ['Location', 'location'], ['Category', 'category'], ['Budget ($)', 'budget']].map(([label, key]) => (
                                <View key={key} style={styles.editField}>
                                    <Text style={styles.editLabel}>{label}</Text>
                                    <TextInput
                                        style={styles.editInput}
                                        value={jobForm[key]}
                                        onChangeText={(v) => setJobForm((p) => ({ ...p, [key]: v }))}
                                        placeholder={label.replace(' *', '')}
                                        placeholderTextColor="#6b7280"
                                        keyboardType={key === 'budget' ? 'numeric' : 'default'}
                                    />
                                </View>
                            ))}
                            <View style={styles.editField}>
                                <Text style={styles.editLabel}>Description *</Text>
                                <TextInput
                                    style={[styles.editInput, { height: 100, textAlignVertical: 'top' }]}
                                    value={jobForm.description}
                                    onChangeText={(v) => setJobForm((p) => ({ ...p, description: v }))}
                                    placeholder="Describe the job..."
                                    placeholderTextColor="#6b7280"
                                    multiline
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.saveBtn, postingJob && styles.saveBtnDisabled]}
                                onPress={postJob}
                                disabled={postingJob}
                            >
                                {postingJob ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Post Job</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Applicants Modal */}
            <Modal visible={!!showApplicants} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Applicants ({applicants.length})</Text>
                            <TouchableOpacity onPress={() => setShowApplicants(null)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={applicants}
                            keyExtractor={(a) => a.id}
                            ListEmptyComponent={<View style={{ padding: 24, alignItems: 'center' }}><Text style={{ color: '#6b7280' }}>No applicants yet</Text></View>}
                            renderItem={({ item }) => {
                                const w = item.worker;
                                return (
                                    <View style={styles.applicantCard}>
                                        <View style={styles.applicantHeader}>
                                            <View style={styles.applicantAvatar}>
                                                {w?.profile_picture ? (
                                                    <Image source={{ uri: w.profile_picture }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                ) : (
                                                    <Ionicons name="person" size={20} color="#6b7280" />
                                                )}
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.applicantName}>{w?.first_name} {w?.last_name}</Text>
                                                {w?.job_title && <Text style={styles.applicantMeta}>{w.job_title}</Text>}
                                                {w?.location && <Text style={styles.applicantMeta}>{w.location}</Text>}
                                            </View>
                                            <View style={[styles.appStatusBadge, { backgroundColor: appStatusColor(item.status) + '20' }]}>
                                                <Text style={[styles.appStatusText, { color: appStatusColor(item.status) }]}>{item.status}</Text>
                                            </View>
                                        </View>
                                        {item.status === 'pending' && (
                                            <View style={styles.applicantActions}>
                                                <TouchableOpacity
                                                    style={[styles.decisionBtn, { backgroundColor: '#22c55e20', borderColor: '#22c55e' }]}
                                                    onPress={() => updateApplicationStatus(item.id, 'accepted')}
                                                >
                                                    <Text style={{ color: '#22c55e', fontWeight: 'bold' }}>Accept</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.decisionBtn, { backgroundColor: '#ef444420', borderColor: '#ef4444' }]}
                                                    onPress={() => updateApplicationStatus(item.id, 'declined')}
                                                >
                                                    <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Decline</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                );
                            }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal visible={editMode} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditMode(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <ScrollView>
                            {[['First Name', 'first_name'], ['Last Name', 'last_name'], ['Phone', 'phone_number'], ['Location', 'location']].map(([label, key]) => (
                                <View key={key} style={styles.editField}>
                                    <Text style={styles.editLabel}>{label}</Text>
                                    <TextInput style={styles.editInput} value={editForm[key] || ''} onChangeText={(v) => setEditForm((p) => ({ ...p, [key]: v }))} placeholderTextColor="#6b7280" />
                                </View>
                            ))}
                            <View style={styles.editField}>
                                <Text style={styles.editLabel}>Bio</Text>
                                <TextInput style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]} value={editForm.bio || ''} onChangeText={(v) => setEditForm((p) => ({ ...p, bio: v }))} multiline placeholderTextColor="#6b7280" />
                            </View>
                            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveProfile} disabled={saving}>
                                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

function appStatusColor(status) {
    const map = { pending: '#f59e0b', accepted: '#22c55e', declined: '#ef4444' };
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
    profilePic: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.info },
    picPlaceholder: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.bgElevated,
        alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.border,
    },
    picOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 50, backgroundColor: '#00000080' },
    picEditBadge: {
        position: 'absolute', bottom: 2, right: 2, backgroundColor: Colors.info,
        width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.bgCard,
    },
    name: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 2, letterSpacing: -0.3 },
    roleLabel: { color: Colors.info, fontSize: 13, fontWeight: '700', marginBottom: 6 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    locationText: { color: Colors.textMuted, fontSize: 13 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, width: '100%' },
    statItem: { flex: 1, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
    statLabel: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
    statDivider: { width: 1, height: 36, backgroundColor: Colors.border },
    actionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    editBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.bgElevated, paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    },
    editBtnText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 13 },
    postJobBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 9,
        borderRadius: Radius.md,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
    },
    postJobBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    signOutBtn: { padding: 9, backgroundColor: Colors.errorGlow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '50' },
    section: { padding: Spacing.lg },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12 },
    emptyBox: { alignItems: 'center', padding: 32, gap: 12 },
    emptyText: { color: Colors.textMuted, fontSize: 14 },
    postBtn: {
        backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: Radius.md,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
    },
    postBtnText: { color: '#fff', fontWeight: '700' },
    jobCard: {
        backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
    },
    jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    jobTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginRight: 8 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
    jobDesc: { color: Colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
    jobCardFooter: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    jobMeta: { color: Colors.textMuted, fontSize: 12 },
    jobActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    viewAppsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    viewAppsBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
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
        borderRadius: Radius.md, color: Colors.textPrimary, paddingHorizontal: 12, paddingVertical: 11,
    },
    saveBtn: {
        backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: Radius.md,
        alignItems: 'center', marginTop: 8, marginBottom: 32,
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    saveBtnDisabled: { opacity: 0.55 },
    saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    applicantCard: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 14, marginBottom: 8 },
    applicantHeader: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    applicantAvatar: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgElevated,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    applicantName: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
    applicantMeta: { color: Colors.textMuted, fontSize: 12 },
    appStatusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
    appStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    applicantActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    decisionBtn: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1 },
});
