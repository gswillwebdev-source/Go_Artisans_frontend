import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPolicyScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#f97316" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.inner}>
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.date}>Last updated: January 2025</Text>
                <Text style={styles.body}>
                    {`GoArtisans ("we", "our", "us") is committed to protecting your personal information and your right to privacy.

1. INFORMATION WE COLLECT
We collect information you provide directly, including your name, email address, phone number, and profile information. We also collect usage data and device information.

2. HOW WE USE YOUR INFORMATION
We use the information to provide and improve our services, communicate with you, match workers with clients, and send job notifications.

3. SHARING YOUR INFORMATION
We do not sell your personal information. We share data only to provide our services (e.g., showing your profile to potential clients or employers).

4. DATA SECURITY
We implement industry-standard security measures to protect your information. Your data is stored securely on Supabase infrastructure.

5. YOUR RIGHTS
You may request access to, correction of, or deletion of your personal data by contacting us at GoArtisans7@gmail.com.

6. COOKIES
We use cookies and similar technologies to improve user experience and analyze usage patterns.

7. CONTACT US
For privacy questions, contact us at:
Email: GoArtisans7@gmail.com
Location: Togo, West Africa`}
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 52, paddingHorizontal: 16, paddingBottom: 8 },
    backText: { color: '#f97316', fontSize: 16 },
    inner: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
    date: { color: '#6b7280', fontSize: 13, marginBottom: 24 },
    body: { color: '#d1d5db', fontSize: 15, lineHeight: 24 },
});
