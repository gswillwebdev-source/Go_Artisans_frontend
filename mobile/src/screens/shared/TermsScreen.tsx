import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#f97316" />
                <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={styles.inner}>
                <Text style={styles.title}>Terms of Service</Text>
                <Text style={styles.date}>Last updated: January 2025</Text>
                <Text style={styles.body}>
                    {`By using GoArtisans, you agree to these Terms of Service.

1. ACCEPTANCE OF TERMS
By accessing or using our platform, you agree to be bound by these Terms. If you do not agree, do not use our services.

2. USER ACCOUNTS
You are responsible for maintaining the security of your account. You must provide accurate information during registration.

3. USER CONDUCT
You agree not to post false information, harass other users, or use our platform for illegal activities.

4. WORKER RESPONSIBILITIES
Workers must accurately represent their skills and complete work as agreed with clients.

5. CLIENT RESPONSIBILITIES
Clients must provide clear job descriptions and pay workers fairly for completed work.

6. PAYMENT
All payment arrangements are between workers and clients. GoArtisans is not responsible for payment disputes.

7. SUBSCRIPTION PLANS
Subscription fees are charged as described in our Pricing page. Cancellations take effect at the end of the billing period.

8. TERMINATION
We reserve the right to terminate accounts that violate these Terms.

9. LIMITATION OF LIABILITY
GoArtisans is not liable for any disputes between workers and clients.

10. CONTACT
For questions about these Terms, contact us at GoArtisans7@gmail.com`}
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
