import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, useColorScheme, ScrollView } from 'react-native';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Colors, Spacing, Typography } from '../theme';

export const SignupScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignup = () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setError('');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[Typography.h1, { color: themeColors.text, marginBottom: Spacing.s }]}>
          Create Account
        </Text>
        <Text style={[Typography.body1, { color: themeColors.textSecondary, marginBottom: Spacing.xl }]}>
          Join the emergency alert network.
        </Text>

        <Input
          label="Full Name"
          placeholder="Enter your name"
          value={name}
          onChangeText={(text) => { setName(text); setError(''); }}
          isDarkMode={isDarkMode}
        />

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
          placeholder="Create a password"
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          secureTextEntry
          isDarkMode={isDarkMode}
          error={error}
        />

        <View style={{ marginTop: Spacing.l }}>
          <Button 
            title="Sign Up" 
            onPress={handleSignup} 
            isDarkMode={isDarkMode} 
          />
          <Button 
            title="Back to Sign In" 
            variant="secondary" 
            onPress={() => {}} 
            isDarkMode={isDarkMode} 
            style={{ marginTop: Spacing.m }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.xl,
  },
});
