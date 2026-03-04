import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDarkMode?: boolean;
}

export const Button: React.FC<ButtonProps> = React.memo(({ 
  title, onPress, variant = 'primary', loading, disabled, style, textStyle, isDarkMode = false 
}) => {
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  let backgroundColor = themeColors.primary;
  let textColor = '#FFFFFF';

  if (variant === 'secondary') {
    backgroundColor = themeColors.secondary;
    textColor = themeColors.text;
  } else if (variant === 'danger') {
    backgroundColor = themeColors.danger;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? themeColors.border : backgroundColor },
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, Typography.button, { color: textColor }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    marginVertical: Spacing.s,
  },
  text: {
    textAlign: 'center',
  },
});
