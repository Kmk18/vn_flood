import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  isDarkMode?: boolean;
}

export const Card: React.FC<CardProps> = React.memo(({ children, style, isDarkMode = false }) => {
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: themeColors.card,
        borderColor: themeColors.border,
      },
      style
    ]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.m,
    marginVertical: Spacing.s,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
