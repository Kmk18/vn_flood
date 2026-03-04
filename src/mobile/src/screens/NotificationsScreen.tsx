import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { useAlertStore, Alert } from '../store/useAlertStore';
import { Card } from '../components/Card';

export const NotificationsScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const alerts = useAlertStore((state) => state.alerts);

  const renderAlert = ({ item }: { item: Alert }) => (
    <Card 
      isDarkMode={isDarkMode} 
      style={item.isUrgent ? [styles.card, { borderColor: themeColors.danger, borderWidth: 2 }] : styles.card}
    >
      <View style={styles.header}>
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
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, Typography.h1, { color: themeColors.text }]}>Alerts</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {alerts.length === 0 ? (
          <Text style={[Typography.body1, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
            No alerts at this time.
          </Text>
        ) : (
          alerts.map(item => <React.Fragment key={item.id}>{renderAlert({ item })}</React.Fragment>)
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    paddingHorizontal: Spacing.l,
    paddingTop: 60,
    paddingBottom: Spacing.m,
  },
  list: {
    paddingHorizontal: Spacing.m,
  },
  card: {
    marginBottom: Spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
