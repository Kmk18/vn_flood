import React from 'react';
import { View, Text, StyleSheet, Switch, useColorScheme } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { Button } from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';

export const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  
  const { user, isAuthenticated, logout } = useAuthStore();
  const [locationSharing, setLocationSharing] = React.useState(true);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, Typography.h1, { color: themeColors.text }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[Typography.h3, { color: themeColors.text, marginBottom: Spacing.s }]}>
          Account
        </Text>
        {isAuthenticated ? (
          <>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Name: {user?.name || 'User'}
            </Text>
            <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
              Email: {user?.email || 'No email provided'}
            </Text>
          </>
        ) : (
          <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>
            You are currently using the app as a guest.
          </Text>
        )}
      </View>

      <View style={[styles.section, { borderTopWidth: 1, borderTopColor: themeColors.border }]}>
        <Text style={[Typography.h3, { color: themeColors.text, marginBottom: Spacing.m }]}>
          Preferences
        </Text>
        
        <View style={styles.settingRow}>
          <Text style={[Typography.body1, { color: themeColors.text }]}>Share Location</Text>
          <Switch 
            value={locationSharing} 
            onValueChange={setLocationSharing}
            trackColor={{ false: themeColors.border, true: themeColors.success }}
          />
        </View>

        <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
          Enabling location sharing helps rescue teams find you faster during emergencies.
        </Text>
      </View>

      <View style={styles.logoutContainer}>
        {isAuthenticated ? (
          <Button 
            title="Log Out" 
            variant="danger" 
            onPress={logout} 
          />
        ) : (
          <Button 
            title="Log In or Register" 
            variant="primary" 
            onPress={() => navigation.navigate('Auth')} 
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.l,
    paddingTop: 60,
    paddingBottom: Spacing.m,
  },
  title: {
    
  },
  section: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutContainer: {
    marginTop: 'auto',
    padding: Spacing.l,
    paddingBottom: Spacing.xl * 2,
  },
});
