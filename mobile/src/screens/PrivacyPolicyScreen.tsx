import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const PrivacyPolicyScreen = ({ navigation }) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#3F51B5" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={styles.lastUpdated}>Last Updated: April 2026</Text>

                <Section title="1. Introduction">
                    <Text style={styles.text}>
                        Job Seeking App ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
                    </Text>
                </Section>

                <Section title="2. Information We Collect">
                    <Subsection title="Personal Information">
                        <Text style={styles.text}>
                            • Full name{'\n'}
                            • Email address{'\n'}
                            • Phone number{'\n'}
                            • Job preferences and skills{'\n'}
                            • Resume and work history{'\n'}
                            • Location information{'\n'}
                            • Profile picture
                        </Text>
                    </Subsection>

                    <Subsection title="Automatically Collected Information">
                        <Text style={styles.text}>
                            • Device information (OS, model){'\n'}
                            • Usage data and analytics{'\n'}
                            • IP address{'\n'}
                            • Cookies and similar technologies
                        </Text>
                    </Subsection>
                </Section>

                <Section title="3. How We Use Your Information">
                    <Text style={styles.text}>
                        We use the collected information for:{'\n\n'}
                        • Creating and maintaining your account{'\n'}
                        • Matching you with job opportunities{'\n'}
                        • Sending job recommendations and alerts{'\n'}
                        • Communicating with employers on your behalf{'\n'}
                        • Improving our app and services{'\n'}
                        • Analyzing usage patterns{'\n'}
                        • Complying with legal obligations
                    </Text>
                </Section>

                <Section title="4. Data Sharing">
                    <Text style={styles.text}>
                        Your personal information may be shared with:{'\n\n'}
                        • Employers (only with your consent){'\n'}
                        • Service providers who assist our operations{'\n'}
                        • Legal authorities when required by law{'\n'}
                        • Business partners for analytics (anonymized data)
                    </Text>
                    <Text style={styles.text}>
                        {'\n'}We do NOT sell your personal information to third parties.
                    </Text>
                </Section>

                <Section title="5. Data Security">
                    <Text style={styles.text}>
                        We implement industry-standard security measures including:{'\n\n'}
                        • End-to-end encryption for sensitive data{'\n'}
                        • Secure authentication (passwords, biometrics){'\n'}
                        • Regular security audits{'\n'}
                        • Secure servers and firewalls
                    </Text>
                    <Text style={styles.text}>
                        {'\n'}However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.
                    </Text>
                </Section>

                <Section title="6. Your Rights">
                    <Text style={styles.text}>
                        You have the right to:{'\n\n'}
                        • Access your personal data{'\n'}
                        • Correct inaccurate information{'\n'}
                        • Delete your account and data{'\n'}
                        • Opt-out of marketing communications{'\n'}
                        • Withdraw consent at any time{'\n'}
                        • Data portability (export your data)
                    </Text>
                </Section>

                <Section title="7. Cookies and Tracking">
                    <Text style={styles.text}>
                        The app uses cookies and similar tracking technologies to:{'\n\n'}
                        • Remember your preferences{'\n'}
                        • Track usage patterns{'\n'}
                        • Improve user experience
                    </Text>
                    <Text style={styles.text}>
                        {'\n'}You can control cookie settings through your device settings.
                    </Text>
                </Section>

                <Section title="8. Children's Privacy">
                    <Text style={styles.text}>
                        Our app is not intended for users under 18 years old. We do not knowingly collect information from children. If we become aware that a child has provided us with personal information, we will delete such information immediately.
                    </Text>
                </Section>

                <Section title="9. Third-Party Links">
                    <Text style={styles.text}>
                        Our app may contain links to third-party websites and services. We are not responsible for their privacy practices. We encourage you to review their privacy policies before providing any information.
                    </Text>
                </Section>

                <Section title="10. Changes to Privacy Policy">
                    <Text style={styles.text}>
                        We may update this Privacy Policy periodically. We will notify you of significant changes by updating the "Last Updated" date. Your continued use of the app constitutes your acceptance of the updated policy.
                    </Text>
                </Section>

                <Section title="11. Contact Us">
                    <Text style={styles.text}>
                        If you have questions about this Privacy Policy or our privacy practices, please contact us at:{'\n\n'}
                        Email: privacy@jobseekingapp.com{'\n'}
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

const Subsection = ({ title, children }) => (
    <View style={styles.subsection}>
        <Text style={styles.subsectionTitle}>{title}</Text>
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
    subsection: {
        marginBottom: 12,
    },
    subsectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
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

export default PrivacyPolicyScreen;
