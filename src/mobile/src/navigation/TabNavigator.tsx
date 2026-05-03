import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapScreen } from '../screens/MapScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RescueBottomSheet } from '../components/RescueBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';

const Tab = createBottomTabNavigator();

const SOSButton = ({ onPress, color }: { onPress: () => void; color: string }) => (
  <View style={styles.sosWrap}>
    <TouchableOpacity
      style={[styles.sosBtn, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.sosBtnText}>SOS</Text>
    </TouchableOpacity>
  </View>
);

export const TabNavigator = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const [rescueOpen, setRescueOpen] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: themeColors.primary,
          tabBarInactiveTintColor: themeColors.textSecondary,
          tabBarStyle: {
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
            borderTopWidth: 1,
            overflow: 'visible',
          },
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, [string, string]> = {
              'Bản đồ':  ['map', 'map-outline'],
              'Cảnh báo': ['warning', 'warning-outline'],
              'Trợ lý':  ['chatbubbles', 'chatbubbles-outline'],
              'Hồ sơ':   ['person', 'person-outline'],
            };
            const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
            return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Bản đồ" component={MapScreen} />
        <Tab.Screen name="Cảnh báo" component={NotificationsScreen} />

        {/* Centre SOS — never navigates, button fully overridden */}
        <Tab.Screen
          name="SOS"
          component={() => null}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => (
              <SOSButton
                color={themeColors.danger}
                onPress={() => setRescueOpen(true)}
              />
            ),
          }}
        />

        <Tab.Screen name="Trợ lý" component={ChatbotScreen} />
        <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
      </Tab.Navigator>

      <RescueBottomSheet visible={rescueOpen} onClose={() => setRescueOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  sosWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  sosBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#C8171A',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 10,
  },
  sosBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
  },
});
