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
  const visibleBasins = basins.filter(
    (b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder
  );

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
              style={[styles.chip, { backgroundColor: active ? RISK_COLORS[risk] : themeColors.card, borderColor: RISK_COLORS[risk] }]}
            >
              <Text style={[Typography.caption, { color: active ? '#fff' : RISK_COLORS[risk], fontWeight: '600' }]}>
                {RISK_LABELS[risk]}+
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Basin detail panel */}
      {selectedBasin && (
        <View style={[styles.panel, { backgroundColor: themeColors.card }]}>
          <View style={styles.panelHeader}>
            <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[selectedBasin.riskLevel] }]}>
              <Text style={styles.riskBadgeText}>{RISK_LABELS[selectedBasin.riskLevel].toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedBasin(null)}>
              <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[Typography.h3, { color: themeColors.text, marginBottom: Spacing.xs }]}>
            {selectedBasin.province}
          </Text>
          <Text style={[Typography.body1, { color: themeColors.textSecondary, marginBottom: Spacing.m }]}>
            Xác suất lũ hôm nay: {(selectedBasin.floodProb * 100).toFixed(0)}%
          </Text>

          {/* 7-day mini forecast */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedBasin.forecast7d.map((f, i) => (
              <View key={i} style={styles.forecastDay}>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                  {i === 0 ? 'Hôm nay' : new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' })}
                </Text>
                <View style={[styles.forecastDot, { backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }]} />
                <Text style={[Typography.caption, { color: themeColors.text, fontWeight: '600' }]}>
                  {(f.floodProb * 100).toFixed(0)}%
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Rescue button */}
      <View style={GlobalStyles.mapHelpButtonContainer}>
        <TouchableOpacity
          style={styles.rescueButton}
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
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  panel: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.m,
    right: Spacing.m,
    borderRadius: 16,
    padding: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s,
  },
  riskBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forecastDay: {
    alignItems: 'center',
    marginRight: Spacing.m,
    gap: 4,
  },
  forecastDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rescueButton: {
    backgroundColor: '#E74C3C',
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.xl,
    borderRadius: 999,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  rescueButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
});
