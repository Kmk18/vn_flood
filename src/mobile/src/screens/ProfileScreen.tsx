import React, { useState } from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { isDarkMode, colors } = useTheme();

  const { user, isAuthenticated, logout } = useAuthStore();
  const [pushNotifications, setPushNotifications] = useState(true);

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[Typography.h1, { color: colors.text }]}>Hồ sơ</Text>
        </View>

        {/* Account section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          TÀI KHOẢN
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          {isAuthenticated ? (
            <>
              <View style={styles.fieldRow}>
                <Text style={[Typography.label, { color: colors.textSecondary }]}>TÊN</Text>
                <Text style={[Typography.body1, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {user?.name || 'Chưa cập nhật'}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.fieldRow}>
                <Text style={[Typography.label, { color: colors.textSecondary }]}>EMAIL</Text>
                <Text style={[Typography.body1, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {user?.email}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.fieldRow}>
                <Text style={[Typography.label, { color: colors.textSecondary }]}>TỈNH / TP</Text>
                <Text style={[Typography.body1, { color: colors.text, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                  {user?.province || 'Chưa cập nhật'}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.fieldRow}>
              <Text style={[Typography.body1, { color: colors.textSecondary }]}>
                Bạn đang sử dụng ứng dụng với tư cách khách.
              </Text>
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={styles.editBtnWrap}>
            <Button
              title="Chỉnh sửa hồ sơ"
              variant="secondary"
              onPress={() => navigation.navigate('EditProfile')}
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {/* Settings section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          CÀI ĐẶT
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={[styles.fieldRow, styles.fieldRowCenter]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: colors.text }]}>Thông báo đẩy</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Nhận cảnh báo lũ khẩn cấp tức thì
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity
            style={[styles.fieldRow, styles.fieldRowCenter]}
            onPress={() => navigation.navigate('AppSettings')}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: colors.text }]}>Cài đặt ứng dụng</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                Giao diện, chế độ tối và thông tin
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Auth action */}
        <View style={styles.authBtnWrap}>
          {isAuthenticated ? (
            <Button title="Đăng xuất" variant="danger" onPress={() => logout()} />
          ) : (
            <Button
              title="Đăng nhập hoặc Đăng ký"
              variant="primary"
              onPress={() => navigation.navigate('Auth')}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.m,
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
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    gap: Spacing.m,
  },
  fieldRowCenter: {
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.l,
  },
  editBtnWrap: {
    paddingHorizontal: Spacing.m,
    marginTop: Spacing.s,
  },
  authBtnWrap: {
    paddingHorizontal: Spacing.m,
    marginTop: Spacing.l,
  },
});
