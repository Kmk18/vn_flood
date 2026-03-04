import React from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

const mockRescuePoints = [
  { id: '1', name: 'City Hall Shelter', distance: '1.2 km', capacity: 'High' },
  { id: '2', name: 'High School Gym', distance: '2.5 km', capacity: 'Medium' },
  { id: '3', name: 'Community Center', distance: '3.8 km', capacity: 'Low' },
];

export const RescueModeScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const renderRescuePoint = ({ item }: { item: typeof mockRescuePoints[0] }) => (
    <Card isDarkMode={isDarkMode} style={styles.card}>
      <Text style={[Typography.h3, { color: themeColors.text }]}>{item.name}</Text>
      <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
        Distance: {item.distance}
      </Text>
      <Text style={[Typography.body2, { color: themeColors.textSecondary }]}>
        Capacity: {item.capacity}
      </Text>
      <Button 
        title="Navigate Here" 
        onPress={() => {}} 
        style={styles.navButton}
      />
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.danger }]}>
        <Text style={[Typography.h2, { color: '#FFF' }]}>Emergency Rescue Mode</Text>
        <Text style={[Typography.body2, { color: '#FFF', marginTop: Spacing.xs }]}>
          Your distress signal is active. Head to the nearest safe zone.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {mockRescuePoints.map((item) => <React.Fragment key={item.id}>{renderRescuePoint({ item })}</React.Fragment>)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: Spacing.l,
    paddingTop: 60,
  },
  list: {
    padding: Spacing.m,
  },
  card: {
    marginBottom: Spacing.m,
  },
  navButton: {
    marginTop: Spacing.m,
    height: 40,
  },
});
