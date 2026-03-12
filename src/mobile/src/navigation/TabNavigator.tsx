import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapScreen } from '../screens/MapScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useColorScheme } from 'react-native';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'map';

          if (route.name === 'Bản đồ') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Cảnh báo') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Trợ lý') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Hồ sơ') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Bản đồ" component={MapScreen} />
      <Tab.Screen name="Cảnh báo" component={NotificationsScreen} />
      <Tab.Screen name="Trợ lý" component={ChatbotScreen} />
      <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
