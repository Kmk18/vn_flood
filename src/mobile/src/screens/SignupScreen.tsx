import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAuthStore } from '../store/useAuthStore';
import { isValidEmail } from '../utils/validation';

export const SignupScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();
  const { signup, isLoading } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Vui lòng nhập một địa chỉ email hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải dài ít nhất 8 ký tự.');
      return;
    }

    setError('');
    const result = await signup(name, email, password);
    if (!result.success) {
      setError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.');
      return;
    }

    if (navigation.canGoBack()) navigation.goBack();
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={GlobalStyles.scrollContent}>
          <Text style={[Typography.h1, { color: colors.text, marginBottom: Spacing.s }]}>
            Tạo tài khoản
          </Text>
          <Text style={[Typography.body1, { color: colors.textSecondary, marginBottom: Spacing.xl }]}>
            Tham gia mạng lưới cảnh báo khẩn cấp.
          </Text>

          <Input
            label="Họ và tên"
            placeholder="Nhập tên của bạn"
            value={name}
            onChangeText={(text) => { setName(text); setError(''); }}
            isDarkMode={isDarkMode}
          />

          <Input
            label="Email"
            placeholder="Nhập email của bạn"
            value={email}
            onChangeText={(text) => { setEmail(text); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            isDarkMode={isDarkMode}
          />

          <Input
            label="Mật khẩu"
            placeholder="Tạo một mật khẩu (ít nhất 8 ký tự)"
            value={password}
            onChangeText={(text) => { setPassword(text); setError(''); }}
            secureTextEntry
            isDarkMode={isDarkMode}
            error={error}
          />

          <View style={{ marginTop: Spacing.l }}>
            {isLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Button title="Đăng ký" onPress={handleSignup} isDarkMode={isDarkMode} />
                <Button
                  title="Quay lại Đăng nhập"
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
