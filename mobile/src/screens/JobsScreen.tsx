import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';

const JobsScreen = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch jobs from backend
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            // TODO: Connect to actual backend API
            setJobs([
                { id: '1', title: 'Software Engineer', company: 'Tech Corp' },
                { id: '2', title: 'Product Manager', company: 'Startup Inc' },
            ]);
        } catch (error) {
            console.error('Error fetching jobs:', error);
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

    const renderJob = ({ item }) => (
        <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{item.title}</Text>
            <Text style={styles.company}>{item.company}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={jobs}
                renderItem={renderJob}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 10,
    },
    jobCard: {
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    company: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
    },
});

export default JobsScreen;
