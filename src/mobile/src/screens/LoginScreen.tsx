import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAuthStore } from '../store/useAuthStore';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const login = useAuthStore((state) => state.login);
  const accounts = useAuthStore((state) => state.accounts);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (!email.includes('@')) {
      setError('Vui lòng nhập một địa chỉ email hợp lệ.');
      return;
    }
    
    setError('');
    const result = login(email, password);
    if (!result.success) {
      setError(result.error || 'Đăng nhập thất bại. Vui lòng thử lại.');
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
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
          VNFlood
        </Text>
        <Text style={[Typography.body1, { color: themeColors.textSecondary, marginBottom: Spacing.xl }]}>
          Đăng nhập để xem dự báo lũ lụt và yêu cầu cứu hộ.
        </Text>
        <Text style={[Typography.caption, { color: themeColors.textSecondary, marginBottom: Spacing.m }]}>
          Tài khoản thử nghiệm: {accounts[0]?.email} / {accounts[0]?.password}
        </Text>

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
          placeholder="Nhập mật khẩu của bạn"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          secureTextEntry
          isDarkMode={isDarkMode}
          error={error}
        />

        <View style={{ marginTop: Spacing.l }}>
          <Button 
            title="Đăng nhập" 
            onPress={handleLogin} 
            isDarkMode={isDarkMode} 
          />
          <Button 
            title="Tạo tài khoản" 
            variant="secondary" 
            onPress={() => navigation.navigate('Signup')} 
            isDarkMode={isDarkMode} 
            style={{ marginTop: Spacing.m }}
          />
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};
