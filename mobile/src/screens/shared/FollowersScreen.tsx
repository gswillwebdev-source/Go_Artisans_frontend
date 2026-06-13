import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function FollowersScreen({ navigation }) {
    const { user } = useAuth();
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from('follows')
            .select('follower:follower_id(id, first_name, last_name, job_title, profile_picture, user_type)')
            .eq('following_id', user.id)
            .then(({ data }) => { setFollowers(data || []); setLoading(false); });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#f97316" /></TouchableOpacity>
                <Text style={styles.title}>Followers ({followers.length})</Text>
            </View>
            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#f97316" /></View>
            ) : (
                <FlatList
                    data={followers}
                    keyExtractor={(f) => String(f.follower?.id)}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No followers yet</Text></View>}
                    renderItem={({ item }) => {
                        const f = item.follower;
                        return (
                            <TouchableOpacity
                                style={styles.row}
                                onPress={() => navigation.navigate('PublicWorkerProfile', { workerId: f.id })}
                            >
                                {f.profile_picture ? (
                                    <Image source={{ uri: f.profile_picture }} style={styles.avatar} />
                                ) : (
                                    <View style={styles.avatarPlaceholder}><Ionicons name="person" size={20} color="#6b7280" /></View>
                                )}
                                <View style={styles.info}>
                                    <Text style={styles.name}>{f.first_name} {f.last_name}</Text>
                                    {f.job_title && <Text style={styles.meta}>{f.job_title}</Text>}
                                    <Text style={styles.type}>{f.user_type}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#374151" />
                            </TouchableOpacity>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 12 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    list: { padding: 16, gap: 8 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1f2937', borderRadius: 12, padding: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { color: '#fff', fontWeight: '600', fontSize: 15 },
    meta: { color: '#9ca3af', fontSize: 13 },
    type: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
    emptyText: { color: '#6b7280', fontSize: 15 },
});
