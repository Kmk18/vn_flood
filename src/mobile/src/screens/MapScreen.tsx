import React, { useState } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
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
    <View style={GlobalStyles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={GlobalStyles.mapAbsolute}
        initialRegion={region}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
      >
        {showFloodZones && (
          <Marker
            coordinate={{ latitude: 21.03, longitude: 105.85 }}
            title="Nguy cơ ngập lụt cao"
            description="Mực nước đang dâng cao hơn 2 mét."
            pinColor={Colors.light.danger}
          />
        )}
      </MapView>

      <View style={GlobalStyles.mapLayerControls}>
        <Button 
          title={showFloodZones ? 'Ẩn Vùng Ngập Lụt' : 'Hiện Vùng Ngập Lụt'} 
          variant="secondary"
          onPress={toggleFloodZones}
          style={GlobalStyles.mapControlButton}
        />
      </View>

      <View style={GlobalStyles.mapHelpButtonContainer}>
        <Button 
          title="YÊU CẦU CỨU HỘ" 
          variant="danger"
          onPress={() => navigation.navigate('RescueMode')}
          style={GlobalStyles.mapHelpButton}
        />
      </View>
    </View>
  );
};
