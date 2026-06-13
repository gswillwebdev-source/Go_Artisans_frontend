import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Switch, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';

const FREQUENCIES = ['daily', 'weekly', 'instant'];

export default function JobAlertsScreen({ navigation }) {
    const { user } = useAuth();
    const { isFree, isPro, FREE_ALERT_LIMIT, PRO_ALERT_LIMIT } = useSubscription();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', skills: '', location: '', min_budget: '', max_budget: '', notification_frequency: 'daily' });
    const [saving, setSaving] = useState(false);

    async function fetchAlerts() {
        const { data } = await supabase
            .from('job_alerts')
            .select('id, name, skills, location, min_budget, max_budget, is_active, notification_frequency, created_at')
            .order('created_at', { ascending: false });
        setAlerts(data || []);
        setLoading(false);
        setRefreshing(false);
    }

    useEffect(() => { fetchAlerts(); }, []);

    async function toggleAlert(id, current) {
        await supabase.from('job_alerts').update({ is_active: !current }).eq('id', id);
        setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
    }

    async function deleteAlert(id) {
        Alert.alert('Delete Alert', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    await supabase.from('job_alerts').delete().eq('id', id);
                    setAlerts((prev) => prev.filter((a) => a.id !== id));
                }
            },
        ]);
    }

    function canCreateAlert() {
        if (!isFree && !isPro) return true; // premium
        if (isPro && alerts.length >= PRO_ALERT_LIMIT) return false;
        if (isFree && alerts.length >= FREE_ALERT_LIMIT) return false;
        return true;
    }

    async function createAlert() {
        if (!form.name.trim()) { Alert.alert('Error', 'Alert name is required.'); return; }
        setSaving(true);
        try {
            const { data, error } = await supabase.from('job_alerts').insert({
                user_id: user.id,
                name: form.name,
                skills: form.skills ? form.skills.split(',').map((s) => s.trim()) : [],
                location: form.location,
                min_budget: form.min_budget ? Number(form.min_budget) : null,
                max_budget: form.max_budget ? Number(form.max_budget) : null,
                notification_frequency: form.notification_frequency,
                is_active: true,
                email_notifications: true,
                in_app_notifications: true,
            }).select().single();
            if (error) throw error;
            setAlerts((prev) => [data, ...prev]);
            setShowCreate(false);
            setForm({ name: '', skills: '', location: '', min_budget: '', max_budget: '', notification_frequency: 'daily' });
        } catch (e) {
            Alert.alert('Error', 'Failed to create alert.');
        } finally {
            setSaving(false);
        }
    }

    const limit = isFree ? FREE_ALERT_LIMIT : isPro ? PRO_ALERT_LIMIT : 'Unlimited';

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#f97316" /></TouchableOpacity>
                <Text style={styles.title}>Job Alerts</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => {
                        if (!canCreateAlert()) {
                            Alert.alert('Limit Reached', `Upgrade to create more alerts. Current limit: ${limit}`);
                            return;
                        }
                        setShowCreate(true);
                    }}
                >
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.usageBanner}>
                <Text style={styles.usageText}>{alerts.length} / {limit} alerts used</Text>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={(a) => a.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} tintColor="#f97316" />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Ionicons name="notifications-outline" size={48} color="#374151" />
                            <Text style={styles.emptyText}>No job alerts yet</Text>
                            <Text style={styles.emptySubText}>Create an alert to get notified about matching jobs</Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.alertCard}>
                            <View style={styles.alertHeader}>
                                <Text style={styles.alertName}>{item.name}</Text>
                                <View style={styles.alertActions}>
                                    <Switch
                                        value={item.is_active}
                                        onValueChange={() => toggleAlert(item.id, item.is_active)}
                                        trackColor={{ true: '#22c55e', false: '#374151' }}
                                        thumbColor="#fff"
                                    />
                                    <TouchableOpacity onPress={() => deleteAlert(item.id)} style={{ marginLeft: 8 }}>
                                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {item.skills?.length > 0 && (
                                <Text style={styles.alertMeta}>Skills: {Array.isArray(item.skills) ? item.skills.join(', ') : item.skills}</Text>
                            )}
                            {item.location && <Text style={styles.alertMeta}>Location: {item.location}</Text>}
                            <Text style={styles.alertFreq}>{item.notification_frequency} notifications</Text>
                        </View>
                    )}
                />
            )}

            {/* Create Alert Modal */}
            <Modal visible={showCreate} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Alert</Text>
                            <TouchableOpacity onPress={() => setShowCreate(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <FlatList
                            data={[]}
                            ListHeaderComponent={
                                <>
                                    {[['Alert Name *', 'name'], ['Skills (comma-separated)', 'skills'], ['Location', 'location'], ['Min Budget ($)', 'min_budget'], ['Max Budget ($)', 'max_budget']].map(([label, key]) => (
                                        <View key={key} style={styles.editField}>
                                            <Text style={styles.editLabel}>{label}</Text>
                                            <TextInput
                                                style={styles.editInput}
                                                value={form[key]}
                                                onChangeText={(v) => setForm((p) => ({ ...p, [key]: v }))}
                                                placeholderTextColor="#6b7280"
                                                placeholder={label}
                                                keyboardType={key.includes('budget') ? 'numeric' : 'default'}
                                            />
                                        </View>
                                    ))}
                                    <View style={styles.editField}>
                                        <Text style={styles.editLabel}>Frequency</Text>
                                        <View style={styles.freqRow}>
                                            {FREQUENCIES.map((f) => (
                                                <TouchableOpacity
                                                    key={f}
                                                    style={[styles.freqBtn, form.notification_frequency === f && styles.freqBtnActive]}
                                                    onPress={() => setForm((p) => ({ ...p, notification_frequency: f }))}
                                                >
                                                    <Text style={[styles.freqBtnText, form.notification_frequency === f && styles.freqBtnTextActive]}>{f}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                    <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={createAlert} disabled={saving}>
                                        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Create Alert</Text>}
                                    </TouchableOpacity>
                                </>
                            }
                            keyExtractor={() => 'form'}
                            renderItem={() => null}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
    title: { flex: 1, fontSize: 22, fontWeight: 'bold', color: '#fff' },
    addBtn: { backgroundColor: '#f97316', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    usageBanner: { backgroundColor: '#1f2937', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#374151' },
    usageText: { color: '#9ca3af', fontSize: 13 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    list: { padding: 16, gap: 12 },
    alertCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#374151' },
    alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    alertName: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
    alertActions: { flexDirection: 'row', alignItems: 'center' },
    alertMeta: { color: '#9ca3af', fontSize: 13, marginBottom: 2 },
    alertFreq: { color: '#f97316', fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
    emptyText: { color: '#6b7280', fontSize: 15, marginTop: 12, fontWeight: '600' },
    emptySubText: { color: '#4b5563', textAlign: 'center', marginTop: 6 },
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    editField: { marginBottom: 16 },
    editLabel: { fontSize: 13, color: '#9ca3af', marginBottom: 6 },
    editInput: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 8, color: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
    freqRow: { flexDirection: 'row', gap: 8 },
    freqBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#111827', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
    freqBtnActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
    freqBtnText: { color: '#9ca3af', fontSize: 13, textTransform: 'capitalize' },
    freqBtnTextActive: { color: '#fff', fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#f97316', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8, marginBottom: 32 },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
