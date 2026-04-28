import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
} from 'react-native';
import { deleteAccount, signOut } from '../services/authService';

const NotificationScreen = ({ navigation }: any) => {
    const [jobAlerts, setJobAlerts] = useState(true);
    const [appUpdates, setAppUpdates] = useState(true);
    const [deleting, setDeleting] = useState(false);

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: confirmDeleteAccount,
                },
            ]
        );
    };

    const confirmDeleteAccount = async () => {
        setDeleting(true);
        try {
            await deleteAccount();
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
        } catch (error: any) {
            Alert.alert(
                'Error',
                error?.message ?? 'Failed to delete account. Please try again.'
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            {/* Notification Preferences */}
            <Text style={styles.sectionTitle}>Notification Preferences</Text>
            <View style={styles.card}>
                <View style={styles.row}>
                    <View>
                        <Text style={styles.rowTitle}>Job Alerts</Text>
                        <Text style={styles.rowSubtitle}>Get notified about new job matches</Text>
                    </View>
                    <Switch
                        value={jobAlerts}
                        onValueChange={setJobAlerts}
                        trackColor={{ false: '#ccc', true: '#3F51B5' }}
                        thumbColor="#fff"
                    />
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                    <View>
                        <Text style={styles.rowTitle}>App Updates</Text>
                        <Text style={styles.rowSubtitle}>Get notified about new features</Text>
                    </View>
                    <Switch
                        value={appUpdates}
                        onValueChange={setAppUpdates}
                        trackColor={{ false: '#ccc', true: '#3F51B5' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Account Actions */}
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.card}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                >
                    {deleting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.deleteButtonText}>Delete My Account</Text>
                    )}
                </TouchableOpacity>
                <Text style={styles.deleteWarning}>
                    Permanently deletes your account and all associated data. This cannot be undone.
                </Text>
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
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    rowTitle: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    rowSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 10,
    },
    deleteButton: {
        backgroundColor: '#D32F2F',
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    deleteWarning: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 17,
    },
});

export default NotificationScreen;
