import React, { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ActivityIndicator, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAuthStore } from '../store/useAuthStore';
import { usersApi } from '../api/users';

export const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();
  const { user, updateUser } = useAuthStore();

  const [name, setName]         = useState(user?.name ?? '');
  const [province, setProvince] = useState(user?.province ?? '');
  const [phone, setPhone]       = useState(user?.phone ?? '');
  const [address, setAddress]   = useState(user?.address ?? '');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError('Tên không được để trống.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const updated = await usersApi.updateMe({
        name:     name.trim(),
        province: province.trim() || undefined,
        phone:    phone.trim() || undefined,
        address:  address.trim() || undefined,
      });
      updateUser(updated);
      navigation.goBack();
    } catch {
      setError('Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[Typography.h1, { color: colors.text, marginBottom: Spacing.s }]}>
            Chỉnh sửa hồ sơ
          </Text>
          <Text style={[Typography.body1, { color: colors.textSecondary, marginBottom: Spacing.xl }]}>
            Cập nhật thông tin cá nhân của bạn.
          </Text>

          <Input
            label="Họ và tên"
            placeholder="Nhập tên của bạn"
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            isDarkMode={isDarkMode}
          />

          <Input
            label="Tỉnh / Thành phố"
            placeholder="VD: Hà Nội, TP. Hồ Chí Minh"
            value={province}
            onChangeText={(t) => { setProvince(t); setError(''); }}
            isDarkMode={isDarkMode}
          />

          <Input
            label="Nơi cư trú"
            placeholder="Địa chỉ cụ thể của bạn"
            value={address}
            onChangeText={(t) => { setAddress(t); setError(''); }}
            isDarkMode={isDarkMode}
          />

          <Input
            label="Số điện thoại"
            placeholder="VD: 0912 345 678"
            value={phone}
            onChangeText={(t) => { setPhone(t); setError(''); }}
            isDarkMode={isDarkMode}
            keyboardType="phone-pad"
            error={error}
          />

          <View style={{ marginTop: Spacing.l }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Button title="Lưu thay đổi" onPress={handleSave} isDarkMode={isDarkMode} />
                <Button
                  title="Huỷ"
                  variant="secondary"
                  onPress={() => navigation.goBack()}
                  isDarkMode={isDarkMode}
                  style={{ marginTop: Spacing.m }}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
});
