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
import { usersApi } from '../api/users';

export const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [isLoading, setIsLoading]             = useState(false);

  const handleSave = async () => {
    if (!currentPassword) { setError('Vui lòng nhập mật khẩu hiện tại.'); return; }
    if (newPassword.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    if (newPassword === currentPassword) { setError('Mật khẩu mới phải khác mật khẩu hiện tại.'); return; }

    setError('');
    setIsLoading(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.error;
      setError(msg === 'Mật khẩu hiện tại không đúng'
        ? 'Mật khẩu hiện tại không đúng.'
        : 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successWrap}>
          <Text style={[Typography.h2, { color: colors.text, marginBottom: Spacing.s }]}>
            Đổi mật khẩu thành công!
          </Text>
          <Text style={[Typography.body1, { color: colors.textSecondary, marginBottom: Spacing.xl, textAlign: 'center' }]}>
            Mật khẩu của bạn đã được cập nhật.
          </Text>
          <Button title="Quay lại" onPress={() => navigation.goBack()} isDarkMode={isDarkMode} />
        </View>
      </SafeAreaView>
    );
  }

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
            Đổi mật khẩu
          </Text>
          <Text style={[Typography.body1, { color: colors.textSecondary, marginBottom: Spacing.xl }]}>
            Mật khẩu mới phải có ít nhất 8 ký tự.
          </Text>

          <Input
            label="Mật khẩu hiện tại"
            placeholder="Nhập mật khẩu hiện tại"
            value={currentPassword}
            onChangeText={(t) => { setCurrentPassword(t); setError(''); }}
            isDarkMode={isDarkMode}
            secureTextEntry
          />

          <Input
            label="Mật khẩu mới"
            placeholder="Ít nhất 8 ký tự"
            value={newPassword}
            onChangeText={(t) => { setNewPassword(t); setError(''); }}
            isDarkMode={isDarkMode}
            secureTextEntry
          />

          <Input
            label="Xác nhận mật khẩu mới"
            placeholder="Nhập lại mật khẩu mới"
            value={confirmPassword}
            onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
            isDarkMode={isDarkMode}
            secureTextEntry
            error={error}
          />

          <View style={{ marginTop: Spacing.l }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Button title="Lưu mật khẩu" onPress={handleSave} isDarkMode={isDarkMode} />
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
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
