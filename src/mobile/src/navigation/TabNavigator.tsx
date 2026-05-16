import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { MapScreen } from '../screens/MapScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RescueBottomSheet } from '../components/RescueBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/useTheme';
import { useFloodStore } from '../store/useFloodStore';
import { useAlertStore } from '../store/useAlertStore';
import { useLocationStore } from '../store/useLocationStore';
import { useResponderStore } from '../store/useResponderStore';
import type { RescuePoint } from '../api/rescue';

const Tab = createBottomTabNavigator();

// Stable reference — avoids the "inline component" re-render warning
const EmptyScreen = () => null;

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

const formatBadge = (n: number) => (n >= 10 ? '9+' : n);

export const TabNavigator = () => {
  const { colors } = useTheme();
  const [rescueOpen, setRescueOpen] = useState(false);
  const fetchData = useFloodStore((s) => s.fetchData);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const alertList = useAlertStore((s) => s.alerts);
  const readIds = useAlertStore((s) => s.readIds);
  const unreadCount = alertList.filter((a) => !readIds.has(a.id)).length;
  const { shareLocation } = useLocationStore();
  const { setPendingNav } = useResponderStore();
  const navigation = useNavigation<any>();

  useEffect(() => { fetchData(); fetchAlerts(); }, []);

  const handleSosPress = () => {
    if (!shareLocation) {
      Alert.alert(
        'Cần bật vị trí',
        'Bật chia sẻ vị trí để đội cứu hộ biết chính xác nơi bạn cần giúp đỡ.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => navigation.navigate('AppSettings' as never) },
        ],
      );
      return;
    }
    setRescueOpen(true);
  };

  const handleShelterSelect = (shelter: RescuePoint) => {
    setPendingNav({ id: shelter.id, lat: shelter.lat, lon: shelter.lon, label: shelter.name });
    setRescueOpen(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
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
        <Tab.Screen
          name="Cảnh báo"
          component={NotificationsScreen}
          options={{ tabBarBadge: unreadCount > 0 ? formatBadge(unreadCount) : undefined }}
        />

        <Tab.Screen
          name="SOS"
          component={EmptyScreen}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => (
              <SOSButton
                color={colors.danger}
                onPress={handleSosPress}
              />
            ),
          }}
        />

        <Tab.Screen name="Trợ lý" component={ChatbotScreen} />
        <Tab.Screen name="Hồ sơ" component={ProfileScreen} />
      </Tab.Navigator>

      <RescueBottomSheet
        visible={rescueOpen}
        onClose={() => setRescueOpen(false)}
        onSelectShelter={handleShelterSelect}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sosWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  sosBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
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
