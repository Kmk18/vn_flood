import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, useColorScheme, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAuthStore } from '../store/useAuthStore';
import { usersApi } from '../api/users';

export const EditProfileScreen = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [province, setProvince] = useState(user?.province ?? '');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Tên không được để trống.');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const updated = await usersApi.updateMe({
        name: name.trim(),
        province: province.trim() || undefined,
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
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={GlobalStyles.centeredContent}>
          <Text style={[Typography.h1, { color: themeColors.text, marginBottom: Spacing.s }]}>
            Chỉnh sửa hồ sơ
          </Text>
          <Text style={[Typography.body1, { color: themeColors.textSecondary, marginBottom: Spacing.xl }]}>
            Cập nhật thông tin cá nhân của bạn.
          </Text>

          <Input
            label="Họ và tên"
            placeholder="Nhập tên của bạn"
            value={name}
            onChangeText={(text) => { setName(text); setError(''); }}
            isDarkMode={isDarkMode}
          />

          <Input
            label="Tỉnh / Thành phố"
            placeholder="VD: Hà Nội, TP. Hồ Chí Minh"
            value={province}
            onChangeText={(text) => { setProvince(text); setError(''); }}
            isDarkMode={isDarkMode}
            error={error}
          />

          <View style={{ marginTop: Spacing.l }}>
            {isLoading ? (
              <ActivityIndicator color={themeColors.primary} />
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
