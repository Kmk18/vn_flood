import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors, Spacing, Typography } from '../theme';
import { useAuthStore } from '../store/useAuthStore';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const login = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setError('');
    login(email);
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[Typography.h1, { color: themeColors.text, marginBottom: Spacing.s }]}>
          VNFlood
        </Text>
        <Text style={[Typography.body1, { color: themeColors.textSecondary, marginBottom: Spacing.xl }]}>
          Sign in to access flood forecasts and request rescue.
        </Text>

        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={(text) => { setEmail(text); setError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          isDarkMode={isDarkMode}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          secureTextEntry
          isDarkMode={isDarkMode}
          error={error}
        />

        <View style={{ marginTop: Spacing.l }}>
          <Button 
            title="Sign In" 
            onPress={handleLogin} 
            isDarkMode={isDarkMode} 
          />
          <Button 
            title="Create an Account" 
            variant="secondary" 
            onPress={() => {}} 
            isDarkMode={isDarkMode} 
            style={{ marginTop: Spacing.m }}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
  },
});
