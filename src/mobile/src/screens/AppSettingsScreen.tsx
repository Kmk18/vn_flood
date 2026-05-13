import React, { useEffect, useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useThemeStore } from '../store/useThemeStore';
import { useLocationStore } from '../store/useLocationStore';
import { GlobalStyles } from '../theme/globalStyles';

export const AppSettingsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDark, setIsDark } = useThemeStore();
  const { shareLocation, setShareLocation } = useLocationStore();

  const [osPermission, setOsPermission] = useState<Location.PermissionStatus | null>(null);

  // Check OS permission status on mount and when screen focuses
  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    setOsPermission(status);
    // If OS permission was revoked externally, reflect that in the store
    if (status !== 'granted') setShareLocation(false);
  };

  const handleLocationToggle = async (value: boolean) => {
    if (!value) {
      setShareLocation(false);
      return;
    }

    // Show explanation popup before asking for OS permission
    Alert.alert(
      'Chia sẻ vị trí',
      'VNFlood dùng vị trí của bạn để:\n\n• Hiển thị bản đồ lũ gần bạn\n• Chỉ đường đến điểm cứu hộ gần nhất\n\nVị trí chỉ dùng khi ứng dụng đang mở, không lưu trên máy chủ.',
      [
        { text: 'Không cho phép', style: 'cancel' },
        {
          text: 'Tiếp tục',
          onPress: () => requestOsPermission(),
        },
      ],
    );
  };

  const requestOsPermission = async () => {
    const current = await Location.getForegroundPermissionsAsync();

    if (current.status === 'granted') {
      setShareLocation(true);
      setOsPermission('granted');
      return;
    }

    if (current.canAskAgain) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setOsPermission(status);
      if (status === 'granted') {
        setShareLocation(true);
      } else {
        Alert.alert(
          'Không có quyền truy cập',
          'Bạn đã từ chối quyền vị trí. Vào Cài đặt hệ thống để bật lại.',
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ],
        );
      }
    } else {
      // canAskAgain = false — must go to system settings
      Alert.alert(
        'Quyền bị từ chối vĩnh viễn',
        'Vào Cài đặt hệ thống → Quyền riêng tư → Vị trí → VNFlood để bật lại.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
        ],
      );
    }
  };

  const permissionLabel = () => {
    if (!shareLocation) return 'Đang tắt';
    if (osPermission === 'granted') return 'Đang bật';
    return 'Chưa cấp quyền hệ thống';
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>Cài đặt ứng dụng</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Privacy / Location section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          QUYỀN TRUY CẬP
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={[styles.row, styles.rowCenter]}>
            <View style={[styles.iconWrap, { backgroundColor: shareLocation && osPermission === 'granted' ? '#dcfce7' : colors.secondary }]}>
              <Ionicons
                name="location"
                size={18}
                color={shareLocation && osPermission === 'granted' ? '#22c55e' : colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: colors.text }]}>Chia sẻ vị trí</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {permissionLabel()}
              </Text>
            </View>
            <Switch
              value={shareLocation && osPermission === 'granted'}
              onValueChange={handleLocationToggle}
              trackColor={{ false: colors.border, true: '#22c55e' }}
            />
          </View>

          {shareLocation && osPermission !== 'granted' && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity
                style={[styles.row, styles.rowCenter]}
                onPress={() => Linking.openSettings()}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.body2, { color: '#f59e0b' }]}>
                    Chưa cấp quyền hệ thống
                  </Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    Nhấn để mở Cài đặt hệ thống
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Appearance section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          GIAO DIỆN
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={[styles.row, styles.rowCenter]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="moon" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: colors.text }]}>Chế độ tối</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {isDark ? 'Đang bật' : 'Đang tắt'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setIsDark}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* About section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          THÔNG TIN
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[Typography.body1, { color: colors.text, flex: 1 }]}>Phiên bản</Text>
            <Text style={[Typography.body2, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.l,
    paddingBottom: Spacing.s,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    gap: Spacing.m,
  },
  rowCenter: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.l,
  },
});
