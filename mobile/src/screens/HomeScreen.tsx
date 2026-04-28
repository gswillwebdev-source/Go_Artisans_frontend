import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AdBanner from '../components/AdBanner';

const HomeScreen = ({ navigation }) => {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.welcomeSection}>
                <Ionicons name="briefcase" size={60} color="#3F51B5" style={styles.icon} />
                <Text style={styles.title}>Welcome to Job Seeking App</Text>
                <Text style={styles.subtitle}>Find your next opportunity</Text>
            </View>

            <View style={styles.featuresSection}>
                <Text style={styles.sectionTitle}>Features</Text>

                <Feature
                    icon="search"
                    title="Browse Jobs"
                    description="Discover job opportunities matched to your skills"
                />

                <Feature
                    icon="notifications"
                    title="Job Alerts"
                    description="Get notified about new job postings"
                />

                <Feature
                    icon="checkmark-circle"
                    title="Track Applications"
                    description="Manage and track your job applications"
                />

                <Feature
                    icon="person"
                    title="Your Profile"
                    description="Build and showcase your professional profile"
                />
            </View>

            <View style={styles.footerSection}>
                <AdBanner />

                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                    <Ionicons name="shield-checkmark" size={18} color="#3F51B5" />
                    <Text style={styles.linkText}>Privacy Policy</Text>
                    <Ionicons name="chevron-forward" size={18} color="#3F51B5" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                    style={styles.linkButton}
                    onPress={() => navigation.navigate('TermsOfService')}
                >
                    <Ionicons name="document-text" size={18} color="#3F51B5" />
                    <Text style={styles.linkText}>Terms of Service</Text>
                    <Ionicons name="chevron-forward" size={18} color="#3F51B5" />
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
            </View>
        </ScrollView>
    );
};

const Feature = ({ icon, title, description }) => (
    <View style={styles.featureCard}>
        <Ionicons name={icon} size={28} color="#3F51B5" style={styles.featureIcon} />
        <View style={styles.featureText}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        padding: 15,
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 30,
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    icon: {
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    featuresSection: {
        marginBottom: 30,
    },
    featureCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 15,
        marginBottom: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    featureIcon: {
        marginRight: 15,
        marginTop: 2,
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    footerSection: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 10,
    },
    linkText: {
        flex: 1,
        fontSize: 16,
        color: '#3F51B5',
        fontWeight: '500',
        marginLeft: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#e0e0e0',
    },
    version: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 15,
        fontStyle: 'italic',
    },
});

export default HomeScreen;
