import React, { useState, useRef } from 'react';
import {
    View, Text, TouchableOpacity, Modal, StyleSheet,
    ScrollView, Animated, Dimensions, TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { Colors, Radius, Spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 320);

interface MenuLink {
    label: string;
    icon: string;
    screen: string;
    params?: object;
}

interface MenuSection {
    heading: string;
    links: MenuLink[];
}

const WORKER_MENU: MenuSection[] = [
    {
        heading: 'Discover',
        links: [
            { label: 'Browse Jobs', icon: 'briefcase-outline', screen: 'Jobs' },
            { label: 'Find Workers', icon: 'people-outline', screen: 'AllUsers' },
            { label: 'Job Alerts', icon: 'notifications-outline', screen: 'JobAlerts' },
        ],
    },
    {
        heading: 'My Account',
        links: [
            { label: 'Dashboard', icon: 'home-outline', screen: 'WorkerTabs' },
            { label: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
            { label: 'Saved Jobs', icon: 'bookmark-outline', screen: 'SavedJobs' },
        ],
    },
    {
        heading: 'Settings',
        links: [
            { label: 'Subscription & Pricing', icon: 'diamond-outline', screen: 'Pricing' },
            { label: 'Privacy Policy', icon: 'shield-outline', screen: 'Privacy' },
            { label: 'Terms of Service', icon: 'document-text-outline', screen: 'Terms' },
        ],
    },
];

const CLIENT_MENU: MenuSection[] = [
    {
        heading: 'Discover',
        links: [
            { label: 'Find Workers', icon: 'people-outline', screen: 'Workers' },
            { label: 'All Users', icon: 'person-outline', screen: 'AllUsers' },
        ],
    },
    {
        heading: 'My Account',
        links: [
            { label: 'Dashboard', icon: 'home-outline', screen: 'ClientTabs' },
            { label: 'Notifications', icon: 'bell-outline', screen: 'Notifications' },
        ],
    },
    {
        heading: 'Settings',
        links: [
            { label: 'Subscription & Pricing', icon: 'diamond-outline', screen: 'Pricing' },
            { label: 'Privacy Policy', icon: 'shield-outline', screen: 'Privacy' },
            { label: 'Terms of Service', icon: 'document-text-outline', screen: 'Terms' },
        ],
    },
];

interface Props { }

export default function HamburgerMenu({ }: Props) {
    const navigation = useNavigation<any>();
    const { user, profile, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

    function openMenu() {
        setOpen(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
        }).start();
    }

    function closeMenu() {
        Animated.timing(slideAnim, {
            toValue: -DRAWER_WIDTH,
            duration: 220,
            useNativeDriver: true,
        }).start(() => setOpen(false));
    }

    function navigate(screen: string, params?: object) {
        closeMenu();
        setTimeout(() => {
            // For tab screens, navigate to the tab and then the screen
            if (screen === 'Jobs' || screen === 'AllUsers') {
                navigation.navigate(profile?.user_type === 'worker' ? 'WorkerTabs' : 'ClientTabs', { screen });
            } else if (screen === 'Workers') {
                navigation.navigate('ClientTabs', { screen: 'Workers' });
            } else if (screen === 'Notifications') {
                const tabs = profile?.user_type === 'worker' ? 'WorkerTabs' : 'ClientTabs';
                navigation.navigate(tabs, { screen: 'Notifications' });
            } else {
                navigation.navigate(screen, params);
            }
        }, 250);
    }

    async function handleSignOut() {
        closeMenu();
        setTimeout(() => signOut(), 300);
    }

    const sections = profile?.user_type === 'client' ? CLIENT_MENU : WORKER_MENU;
    const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase();

    return (
        <>
            {/* Floating hamburger trigger */}
            {!!user && (
                <TouchableOpacity style={styles.fab} onPress={openMenu} activeOpacity={0.85}>
                    <Ionicons name="menu" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
            )}

            {/* Drawer modal */}
            <Modal
                visible={open}
                transparent
                animationType="none"
                onRequestClose={closeMenu}
                statusBarTranslucent
            >
                {/* Dim backdrop */}
                <TouchableWithoutFeedback onPress={closeMenu}>
                    <View style={styles.backdrop} />
                </TouchableWithoutFeedback>

                {/* Drawer panel */}
                <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                    {/* User profile header */}
                    <View style={styles.drawerHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.userName} numberOfLines={1}>
                                {profile?.first_name} {profile?.last_name}
                            </Text>
                            <View style={styles.rolePill}>
                                <Text style={styles.roleText}>
                                    {profile?.user_type === 'worker' ? '🔨 Worker' : '💼 Client'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity onPress={closeMenu} style={styles.closeBtn}>
                            <Ionicons name="close" size={20} color={Colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    {/* Navigation sections */}
                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        {sections.map((section) => (
                            <View key={section.heading} style={styles.section}>
                                <Text style={styles.sectionHeading}>{section.heading}</Text>
                                {section.links.map((link) => (
                                    <TouchableOpacity
                                        key={link.label}
                                        style={styles.menuItem}
                                        onPress={() => navigate(link.screen, link.params)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.menuIconWrap}>
                                            <Ionicons name={link.icon as any} size={19} color={Colors.primary} />
                                        </View>
                                        <Text style={styles.menuLabel}>{link.label}</Text>
                                        <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}

                        {/* Sign Out */}
                        <View style={styles.section}>
                            <TouchableOpacity style={[styles.menuItem, styles.signOutItem]} onPress={handleSignOut} activeOpacity={0.7}>
                                <View style={[styles.menuIconWrap, { backgroundColor: Colors.errorGlow }]}>
                                    <Ionicons name="log-out-outline" size={19} color={Colors.error} />
                                </View>
                                <Text style={[styles.menuLabel, { color: Colors.error }]}>Sign Out</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>GoArtisans © 2025</Text>
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    fab: {
        position: 'absolute',
        top: 52,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.bgCard,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        zIndex: 998,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: DRAWER_WIDTH,
        backgroundColor: Colors.bgCard,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 56,
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: Colors.primaryGlow,
        borderWidth: 2,
        borderColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
    userName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
    rolePill: {
        marginTop: 3,
        alignSelf: 'flex-start',
        backgroundColor: Colors.bgElevated,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    roleText: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
    closeBtn: { padding: 4 },
    divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.xl, marginBottom: 8 },
    scroll: { flex: 1 },
    section: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 4 },
    sectionHeading: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        borderRadius: Radius.md,
        paddingHorizontal: 4,
    },
    menuIconWrap: {
        width: 34,
        height: 34,
        borderRadius: Radius.md,
        backgroundColor: Colors.primaryGlow,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuLabel: { flex: 1, color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },
    signOutItem: { marginTop: 4 },
    footer: {
        borderTopWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 14,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
    },
    footerText: { color: Colors.textMuted, fontSize: 11 },
});
