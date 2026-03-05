import React from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAlertStore, Alert } from '../store/useAlertStore';
import { Card } from '../components/Card';

export const NotificationsScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const alerts = useAlertStore((state) => state.alerts);

  const renderAlert = ({ item }: { item: Alert }) => (
    <Card 
      isDarkMode={isDarkMode} 
      style={item.isUrgent ? [{ borderColor: themeColors.danger, borderWidth: 2 }] : undefined}
    >
      <View style={GlobalStyles.listItemHeader}>
        <Text style={[Typography.h3, { color: item.isUrgent ? themeColors.danger : themeColors.text }]}>
          {item.title}
        </Text>
        <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={[Typography.body1, { color: themeColors.textSecondary, marginTop: Spacing.s }]}>
        {item.message}
      </Text>
    </Card>
  );

  return (
    <View style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[GlobalStyles.headerContainer, GlobalStyles.headerTitleCenter, Typography.h1, { color: themeColors.text }]}>Cảnh báo</Text>
      <ScrollView contentContainerStyle={GlobalStyles.listContainer}>
        {alerts.length === 0 ? (
          <Text style={[Typography.body1, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
            Không có cảnh báo nào.
          </Text>
        ) : (
          alerts.map(item => <React.Fragment key={item.id}>{renderAlert({ item })}</React.Fragment>)
        )}
      </ScrollView>
    </View>
  );
};
