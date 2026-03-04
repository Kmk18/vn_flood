import React, { useState } from 'react';
import { View, StyleSheet, Text, useColorScheme } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { Button } from '../components/Button';
import { useMapStore } from '../store/useMapStore';

export const MapScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const { showFloodZones, toggleFloodZones } = useMapStore();

  const [region, setRegion] = useState({
    latitude: 21.0285, // Hanoi default
    longitude: 105.8542,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
      >
        {showFloodZones && (
          <Marker
            coordinate={{ latitude: 21.03, longitude: 105.85 }}
            title="High Flood Risk"
            description="Water level rising above 2 meters."
            pinColor={Colors.light.danger}
          />
        )}
      </MapView>

      <View style={styles.layerControls}>
        <Button 
          title={showFloodZones ? 'Hide Flood Zones' : 'Show Flood Zones'} 
          variant="secondary"
          onPress={toggleFloodZones}
          style={styles.controlButton}
        />
      </View>

      <View style={styles.helpButtonContainer}>
        <Button 
          title="REQUEST HELP" 
          variant="danger"
          onPress={() => navigation.navigate('RescueMode')}
          style={styles.helpButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  layerControls: {
    position: 'absolute',
    top: 50,
    right: Spacing.m,
  },
  controlButton: {
    paddingHorizontal: Spacing.s,
    height: 40,
  },
  helpButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.l,
    right: Spacing.l,
  },
  helpButton: {
    height: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
});
