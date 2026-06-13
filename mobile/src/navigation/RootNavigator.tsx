import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { SubscriptionProvider } from '../context/SubscriptionContext';
import ChatAssistant from '../components/ChatAssistant';
import HamburgerMenu from '../components/HamburgerMenu';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ChooseRoleScreen from '../screens/auth/ChooseRoleScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';

// Shared screens
import JobDetailScreen from '../screens/shared/JobDetailScreen';
import AllUsersScreen from '../screens/shared/AllUsersScreen';
import PublicWorkerProfileScreen from '../screens/shared/PublicWorkerProfileScreen';
import SubscriptionScreen from '../screens/shared/SubscriptionScreen';
import PricingScreen from '../screens/shared/PricingScreen';
import PrivacyPolicyScreen from '../screens/shared/PrivacyPolicyScreen';
import TermsScreen from '../screens/shared/TermsScreen';
import FollowersScreen from '../screens/shared/FollowersScreen';
import FollowingScreen from '../screens/shared/FollowingScreen';

// Worker screens
import WorkerDashboardScreen from '../screens/worker/WorkerDashboardScreen';
import JobsScreen from '../screens/worker/JobsScreen';
import SavedJobsScreen from '../screens/worker/SavedJobsScreen';
import JobAlertsScreen from '../screens/worker/JobAlertsScreen';
import WorkerNotificationsScreen from '../screens/worker/WorkerNotificationsScreen';

// Client screens
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import BrowseWorkersScreen from '../screens/client/BrowseWorkersScreen';
import ClientNotificationsScreen from '../screens/client/ClientNotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TAB_BAR_STYLE = {
    backgroundColor: '#0f172a',
    borderTopColor: '#1e293b',
    borderTopWidth: 1,
    height: 62,
    paddingBottom: 8,
    paddingTop: 6,
};

function WorkerTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: TAB_BAR_STYLE,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons: Record<string, any> = {
                        AllUsers: focused ? 'people' : 'people-outline',
                        Jobs: focused ? 'briefcase' : 'briefcase-outline',
                        Notifications: focused ? 'notifications' : 'notifications-outline',
                        Profile: focused ? 'person-circle' : 'person-circle-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="AllUsers" component={AllUsersScreen} options={{ tabBarLabel: 'Community' }} />
            <Tab.Screen name="Jobs" component={JobsScreen} />
            <Tab.Screen name="Notifications" component={WorkerNotificationsScreen} />
            <Tab.Screen name="Profile" component={WorkerDashboardScreen} />
        </Tab.Navigator>
    );
}

function ClientTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textMuted,
                tabBarStyle: TAB_BAR_STYLE,
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarIcon: ({ focused, color, size }) => {
                    const icons: Record<string, any> = {
                        AllUsers: focused ? 'people' : 'people-outline',
                        Workers: focused ? 'hammer' : 'hammer-outline',
                        Notifications: focused ? 'notifications' : 'notifications-outline',
                        Profile: focused ? 'person-circle' : 'person-circle-outline',
                    };
                    return <Ionicons name={icons[route.name]} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="AllUsers" component={AllUsersScreen} options={{ tabBarLabel: 'Community' }} />
            <Tab.Screen name="Workers" component={BrowseWorkersScreen} />
            <Tab.Screen name="Notifications" component={ClientNotificationsScreen} />
            <Tab.Screen name="Profile" component={ClientDashboardScreen} />
        </Tab.Navigator>
    );
}

function AppNavigator() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
                    </>
                ) : !profile?.user_type ? (
                    <Stack.Screen name="ChooseRole" component={ChooseRoleScreen} />
                ) : profile.user_type === 'worker' ? (
                    <>
                        <Stack.Screen name="WorkerTabs" component={WorkerTabs} />
                        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
                        <Stack.Screen name="AllUsers" component={AllUsersScreen} />
                        <Stack.Screen name="SavedJobs" component={SavedJobsScreen} />
                        <Stack.Screen name="JobAlerts" component={JobAlertsScreen} />
                        <Stack.Screen name="PublicWorkerProfile" component={PublicWorkerProfileScreen} />
                        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
                        <Stack.Screen name="Pricing" component={PricingScreen} />
                        <Stack.Screen name="Followers" component={FollowersScreen} />
                        <Stack.Screen name="Following" component={FollowingScreen} />
                        <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="Terms" component={TermsScreen} />
                    </>
                ) : (
                    <>
                        <Stack.Screen name="ClientTabs" component={ClientTabs} />
                        <Stack.Screen name="JobDetail" component={JobDetailScreen} />
                        <Stack.Screen name="AllUsers" component={AllUsersScreen} />
                        <Stack.Screen name="PublicWorkerProfile" component={PublicWorkerProfileScreen} />
                        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
                        <Stack.Screen name="Pricing" component={PricingScreen} />
                        <Stack.Screen name="Followers" component={FollowersScreen} />
                        <Stack.Screen name="Following" component={FollowingScreen} />
                        <Stack.Screen name="Privacy" component={PrivacyPolicyScreen} />
                        <Stack.Screen name="Terms" component={TermsScreen} />
                    </>
                )}
            </Stack.Navigator>
            {!!user && <ChatAssistant />}
            {!!user && <HamburgerMenu />}
        </View>
    );
}

export default function RootNavigator() {
    return (
        <NavigationContainer>
            <AuthProvider>
                <SubscriptionProvider>
                    <AppNavigator />
                </SubscriptionProvider>
            </AuthProvider>
        </NavigationContainer>
    );
}
