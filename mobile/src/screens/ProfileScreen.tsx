import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';

const ProfileScreen = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            // TODO: Connect to Supabase auth and profile API
            setProfile({
                name: 'User Name',
                email: 'user@example.com',
                bio: 'Seeking opportunities',
            });
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#3F51B5" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.profileCard}>
                <Text style={styles.name}>{profile?.name}</Text>
                <Text style={styles.email}>{profile?.email}</Text>
                <Text style={styles.bio}>{profile?.bio}</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 15,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    email: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    bio: {
        fontSize: 14,
        color: '#999',
        marginTop: 10,
    },
});

export default ProfileScreen;
