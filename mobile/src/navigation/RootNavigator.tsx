import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import JobsScreen from '../screens/JobsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ApplicationsScreen from '../screens/ApplicationsScreen';
import NotificationScreen from '../screens/NotificationScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: true,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Jobs') {
                        iconName = focused ? 'briefcase' : 'briefcase-outline';
                    } else if (route.name === 'Applications') {
                        iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
                    } else if (route.name === 'Notifications') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else if (route.name === 'Premium') {
                        iconName = focused ? 'diamond' : 'diamond-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#3F51B5',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Home' }}
            />
            <Tab.Screen
                name="Jobs"
                component={JobsScreen}
                options={{ title: 'Job Listings' }}
            />
            <Tab.Screen
                name="Applications"
                component={ApplicationsScreen}
                options={{ title: 'My Applications' }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationScreen}
                options={{ title: 'Notifications' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
            <Tab.Screen
                name="Premium"
                component={SubscriptionScreen}
                options={{
                    title: 'Plans',
                    tabBarLabel: 'Plans',
                    tabBarActiveTintColor: '#6366F1',
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                <Stack.Screen name="MainTabs" component={HomeTabs} />
                <Stack.Group
                    screenOptions={{
                        presentation: 'card',
                    }}
                >
                    <Stack.Screen
                        name="PrivacyPolicy"
                        component={PrivacyPolicyScreen}
                        options={{
                            headerShown: false,
                        }}
                    />
                    <Stack.Screen
                        name="TermsOfService"
                        component={TermsOfServiceScreen}
                        options={{
                            headerShown: false,
                        }}
                    />
                </Stack.Group>
            </Stack.Navigator>
        </NavigationContainer>
    );
}
