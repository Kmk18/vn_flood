import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useFloodStore, RISK_COLORS, RISK_LABELS, RiskLevel } from '../store/useFloodStore';

const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const VIETNAM_REGION = { latitude: 16.0, longitude: 107.5, latitudeDelta: 13.0, longitudeDelta: 9.0 };

export const MapScreen = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const { basins, selectedBasin, filterMinRisk, setSelectedBasin, setFilterMinRisk } = useFloodStore();

  const minOrder = RISK_ORDER.indexOf(filterMinRisk);
  const visibleBasins = basins.filter((b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder);

  return (
    <View style={GlobalStyles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={GlobalStyles.mapAbsolute}
        initialRegion={VIETNAM_REGION}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
        onPress={() => setSelectedBasin(null)}
      >
        {visibleBasins.map((basin) => (
          <Marker
            key={basin.hybasId}
            coordinate={{ latitude: basin.lat, longitude: basin.lon }}
            pinColor={RISK_COLORS[basin.riskLevel]}
            onPress={() => setSelectedBasin(basin)}
          />
        ))}
      </MapView>

      {/* Risk filter chips */}
      <View style={styles.filterRow}>
        {RISK_ORDER.map((risk) => {
          const active = filterMinRisk === risk;
          return (
            <TouchableOpacity
              key={risk}
              onPress={() => setFilterMinRisk(risk)}
              style={[
                styles.chip,
                { backgroundColor: active ? RISK_COLORS[risk] : themeColors.card },
              ]}
            >
              <Text style={[Typography.label, { color: active ? '#fff' : RISK_COLORS[risk] }]}>
                {RISK_LABELS[risk].toUpperCase()}+
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Basin detail panel */}
      {selectedBasin && (
        <View style={[styles.panel, { backgroundColor: themeColors.card }]}>
          <View style={[styles.panelAccent, { backgroundColor: RISK_COLORS[selectedBasin.riskLevel] }]} />
          <View style={styles.panelContent}>
            <View style={styles.panelHeader}>
              <View>
                <Text style={[Typography.label, { color: RISK_COLORS[selectedBasin.riskLevel] }]}>
                  {RISK_LABELS[selectedBasin.riskLevel].toUpperCase()}
                </Text>
                <Text style={[Typography.h3, { color: themeColors.text, marginTop: 2 }]}>
                  {selectedBasin.province}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBasin(null)} style={styles.closeBtn}>
                <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
              Xác suất lũ hôm nay:{' '}
              <Text style={{ color: RISK_COLORS[selectedBasin.riskLevel], fontWeight: '700' }}>
                {(selectedBasin.floodProb * 100).toFixed(0)}%
              </Text>
            </Text>

            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedBasin.forecast7d.map((f, i) => (
                <View key={i} style={styles.forecastDay}>
                  <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                    {i === 0 ? 'HÔM NAY' : new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <View style={[styles.forecastBar, { backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }]} />
                  <Text style={[Typography.caption, { color: themeColors.text, fontWeight: '700' }]}>
                    {(f.floodProb * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Rescue button */}
      <View style={GlobalStyles.mapHelpButtonContainer}>
        <TouchableOpacity
          style={[styles.rescueButton, { backgroundColor: themeColors.danger }]}
          onPress={() => navigation.navigate('RescueMode')}
        >
          <Text style={styles.rescueButtonText}>YÊU CẦU CỨU HỘ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  filterRow: {
    position: 'absolute',
    top: 56,
    left: Spacing.m,
    right: Spacing.m,
    flexDirection: 'row',
    gap: Spacing.s,
  },
  chip: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  panel: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  panelAccent: {
    width: 4,
  },
  panelContent: {
    flex: 1,
    padding: Spacing.m,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.m,
  },
  forecastDay: {
    alignItems: 'center',
    marginRight: Spacing.m,
    gap: 4,
  },
  forecastBar: {
    width: 4,
    height: 20,
  },
  rescueButton: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#C8171A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  rescueButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1.5,
  },
});
