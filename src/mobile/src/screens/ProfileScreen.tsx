import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const { isDarkMode, colors } = useTheme();

  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <View style={GlobalStyles.headerContainer}>
        <Text style={[Typography.h1, { color: colors.text }]}>Cài đặt</Text>
      </View>

      <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
        TÀI KHOẢN
      </Text>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        {isAuthenticated ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: colors.textSecondary }]}>TÊN</Text>
              <Text style={[Typography.body1, { color: colors.text }]}>{user?.name || 'Chưa cập nhật'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: colors.textSecondary }]}>EMAIL</Text>
              <Text style={[Typography.body1, { color: colors.text }]}>{user?.email}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: colors.textSecondary }]}>TỈNH / TP</Text>
              <Text style={[Typography.body1, { color: colors.text }]}>{user?.province || 'Chưa cập nhật'}</Text>
            </View>
          </>
        ) : (
          <Text style={[Typography.body1, { color: colors.textSecondary, padding: Spacing.s }]}>
            Bạn đang sử dụng ứng dụng với tư cách khách.
          </Text>
        )}
      </View>

      {isAuthenticated && (
        <View style={{ paddingHorizontal: Spacing.l, marginTop: Spacing.s }}>
          <Button
            title="Chỉnh sửa hồ sơ"
            variant="secondary"
            onPress={() => navigation.navigate('EditProfile')}
            isDarkMode={isDarkMode}
          />
        </View>
      )}

      <View style={GlobalStyles.profileLogoutContainer}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
  },
  section: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    gap: Spacing.m,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.l,
  },
});
