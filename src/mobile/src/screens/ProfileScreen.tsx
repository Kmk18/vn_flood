import React from 'react';
import { View, Text, Switch, useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const { user, isAuthenticated, logout } = useAuthStore();
  const [locationSharing, setLocationSharing] = React.useState(true);

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <View style={GlobalStyles.headerContainer}>
        <Text style={[Typography.h1, { color: themeColors.text }]}>Cài đặt</Text>
      </View>

      {/* Account section */}
      <Text style={[styles.sectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
        TÀI KHOẢN
      </Text>
      <View style={[styles.section, { backgroundColor: themeColors.card }]}>
        {isAuthenticated ? (
          <>
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: themeColors.textSecondary }]}>TÊN</Text>
              <Text style={[Typography.body1, { color: themeColors.text }]}>{user?.name || 'Chưa cập nhật'}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: themeColors.textSecondary }]}>EMAIL</Text>
              <Text style={[Typography.body1, { color: themeColors.text }]}>{user?.email}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <View style={styles.fieldRow}>
              <Text style={[Typography.label, { color: themeColors.textSecondary }]}>TỈNH / TP</Text>
              <Text style={[Typography.body1, { color: themeColors.text }]}>{user?.province || 'Chưa cập nhật'}</Text>
            </View>
          </>
        ) : (
          <Text style={[Typography.body1, { color: themeColors.textSecondary, padding: Spacing.s }]}>
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

      {/* Preferences section */}
      <Text style={[styles.sectionLabel, Typography.label, { color: themeColors.textSecondary, marginTop: Spacing.l }]}>
        TÙY CHỌN
      </Text>
      <View style={[styles.section, { backgroundColor: themeColors.card }]}>
        <View style={[styles.fieldRow, { alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.body1, { color: themeColors.text }]}>Chia sẻ Vị trí</Text>
            <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
              Giúp đội cứu hộ tìm thấy bạn nhanh hơn
            </Text>
          </View>
          <Switch
            value={locationSharing}
            onValueChange={setLocationSharing}
            trackColor={{ false: themeColors.border, true: themeColors.success }}
          />
        </View>
      </View>

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
