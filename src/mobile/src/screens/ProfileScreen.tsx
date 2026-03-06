import React from 'react';
import { View, Text, Switch, useColorScheme } from 'react-native';
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

      <View style={GlobalStyles.profileSection}>
        <Text style={[Typography.h3, { color: themeColors.text, marginBottom: Spacing.s }]}>
          Tài khoản
        </Text>
        {isAuthenticated ? (
          <>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Tên: {user?.name || 'Người dùng'}
            </Text>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Email: {user?.email || 'Chưa cung cấp email'}
            </Text>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Số điện thoại: {user?.phone || 'Chưa cập nhật'}
            </Text>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Khu vực: {user?.district || 'Chưa cập nhật'}
            </Text>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Liên hệ khẩn cấp: {user?.emergencyContact || 'Chưa cập nhật'}
            </Text>
          </>
        ) : (
          <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
            Bạn đang sử dụng ứng dụng với tư cách khách.
          </Text>
        )}
      </View>

      <View style={[GlobalStyles.profileSection, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
        <Text style={[Typography.h3, { color: themeColors.text, marginBottom: Spacing.m }]}>
          Tùy chọn
        </Text>
        
        <View style={GlobalStyles.profileSettingRow}>
          <Text style={[Typography.body1, { color: themeColors.text }]}>Chia sẻ Vị trí</Text>
          <Switch 
            value={locationSharing} 
            onValueChange={setLocationSharing}
            trackColor={{ false: themeColors.border, true: themeColors.success }}
          />
        </View>

        <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
          Bật chia sẻ vị trí giúp đội cứu hộ tìm thấy bạn nhanh hơn trong trường hợp khẩn cấp.
        </Text>
      </View>

      <View style={GlobalStyles.profileLogoutContainer}>
        {isAuthenticated ? (
          <Button 
            title="Đăng xuất" 
            variant="danger" 
            onPress={logout} 
          />
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
