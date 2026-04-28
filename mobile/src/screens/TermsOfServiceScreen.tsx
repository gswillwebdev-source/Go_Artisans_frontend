import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const TermsOfServiceScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#3F51B5" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Terms of Service</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last Updated: April 2026</Text>

                <Section title="1. Acceptance of Terms">
                    <Text style={styles.text}>
                        By downloading and using the Job Seeking App, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                    </Text>
                </Section>

                <Section title="2. Use License">
                    <Text style={styles.text}>
                        Permission is granted to temporarily download one copy of the materials (information or software) on Job Seeking App for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:{'\n\n'}
                        • Modify or copy the materials{'\n'}
                        • Use the materials for any commercial purpose or for any public display{'\n'}
                        • Attempt to decompile or reverse engineer any software{'\n'}
                        • Remove any copyright or other proprietary notations from the materials{'\n'}
                        • Transfer the materials to another person or "mirror" the materials
                    </Text>
                </Section>

                <Section title="3. Disclaimer">
                    <Text style={styles.text}>
                        The materials on Job Seeking App are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                    </Text>
                </Section>

                <Section title="4. Limitations">
                    <Text style={styles.text}>
                        In no event shall Job Seeking App or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Job Seeking App.
                    </Text>
                </Section>

                <Section title="5. Accuracy of Materials">
                    <Text style={styles.text}>
                        The materials appearing on Job Seeking App could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our app are accurate, complete, or current. We may make changes to the materials contained on our app at any time without notice.
                    </Text>
                </Section>

                <Section title="6. Materials and Content">
                    <Text style={styles.text}>
                        The materials on Job Seeking App are protected by copyrights and trademarks. You may not use or reproduce any materials from this app without prior written permission from us or the copyright holder.
                    </Text>
                </Section>

                <Section title="7. Links">
                    <Text style={styles.text}>
                        We have not reviewed all of the sites linked to our app and are not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by us of the site. Use of any such linked website is at the user's own risk.
                    </Text>
                </Section>

                <Section title="8. Modifications">
                    <Text style={styles.text}>
                        We may revise these terms of service for our app at any time without notice. By using this app, you are agreeing to be bound by the then current version of these terms of service.
                    </Text>
                </Section>

                <Section title="9. Governing Law">
                    <Text style={styles.text}>
                        These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts located in this location.
                    </Text>
                </Section>

                <Section title="10. User Responsibilities">
                    <Text style={styles.text}>
                        You are responsible for maintaining the confidentiality of your account information and password and for restricting access to your device. You agree to accept responsibility for all activities that occur under your account or password.
                    </Text>
                </Section>

                <Section title="11. Prohibited Uses">
                    <Text style={styles.text}>
                        You agree not to use the app:{'\n\n'}
                        • For any illegal purposes or in violation of any laws{'\n'}
                        • To harass, threaten, or harm others{'\n'}
                        • To post spam, viruses, or malicious code{'\n'}
                        • To impersonate or misrepresent yourself{'\n'}
                        • To infringe on intellectual property rights
                    </Text>
                </Section>

                <Section title="12. Termination">
                    <Text style={styles.text}>
                        We reserve the right to terminate your account and access to the app at any time, for any reason, with or without cause or notice.
                    </Text>
                </Section>

                <Section title="13. Contact Information">
                    <Text style={styles.text}>
                        If you have any questions about these Terms of Service, please contact us at:{'\n\n'}
                        Email: support@jobseekingapp.com{'\n'}
                        Address: Tech City, USA
                    </Text>
                </Section>

                <View style={styles.footer} />
            </ScrollView>
        </View>
    );
};

const Section = ({ title, children }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 15,
    },
    lastUpdated: {
        fontSize: 12,
        color: '#999',
        marginBottom: 15,
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 20,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#3F51B5',
        marginBottom: 10,
    },
    text: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
    },
    footer: {
        height: 30,
    },
});

export default TermsOfServiceScreen;
