import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  isDarkMode?: boolean;
}

export const Card: React.FC<CardProps> = React.memo(({ children, style, isDarkMode = false }) => {
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <View style={[
      GlobalStyles.card, 
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
