import React from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isDarkMode?: boolean;
}

export const Input: React.FC<InputProps> = React.memo(({ 
  label, error, isDarkMode = false, style, ...props 
}) => {
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={GlobalStyles.inputContainer}>
      <Text style={[Typography.body2, { color: themeColors.textSecondary, marginBottom: Spacing.xs }]}>
        {label}
      </Text>
      <TextInput
        style={[
          GlobalStyles.inputField,
          Typography.body1,
          { 
            color: themeColors.text,
            backgroundColor: themeColors.card,
            borderColor: error ? themeColors.danger : themeColors.border,
          },
          style
        ]}
        placeholderTextColor={themeColors.textSecondary}
        {...props}
      />
      {error ? (
        <Text style={[Typography.caption, { color: themeColors.danger, marginTop: Spacing.xs }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});
