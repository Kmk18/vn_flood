import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, useColorScheme, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useFloodStore, RISK_COLORS, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { BasinForecast } from '../mock/floodData';

const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const VIETNAM_REGION = { latitude: 16.0, longitude: 107.5, latitudeDelta: 13.0, longitudeDelta: 9.0 };

export const MapScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const { basins, selectedBasin, filterMinRisk, setSelectedBasin, setFilterMinRisk } = useFloodStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const minOrder = RISK_ORDER.indexOf(filterMinRisk);
  const visibleBasins = basins.filter((b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder);

  const suggestions: BasinForecast[] = searchQuery.trim().length > 0
    ? basins.filter((b) => b.province.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleSelectSuggestion = (basin: BasinForecast) => {
    setSelectedBasin(basin);
    setSearchQuery(basin.province);
    setShowSuggestions(false);
  };

  const dismissAll = () => {
    setSelectedBasin(null);
    setShowSuggestions(false);
    setShowSettings(false);
  };

  return (
    <View style={GlobalStyles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={GlobalStyles.mapAbsolute}
        initialRegion={VIETNAM_REGION}
        userInterfaceStyle={isDarkMode ? 'dark' : 'light'}
        onPress={dismissAll}
      >
        {visibleBasins.map((basin) => (
          <Marker
            key={basin.hybasId}
            coordinate={{ latitude: basin.lat, longitude: basin.lon }}
            pinColor={RISK_COLORS[basin.riskLevel]}
            onPress={() => { setShowSuggestions(false); setShowSettings(false); setSelectedBasin(basin); }}
          />
        ))}
      </MapView>

      {/* ── Search row ── */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: themeColors.card }]}>
          <Text style={[styles.searchIcon, { color: themeColors.textSecondary }]}>⌕</Text>
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Tìm kiếm tỉnh thành..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); setShowSuggestions(true); setSelectedBasin(null); }}
            onFocus={() => setShowSuggestions(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSuggestions(false); }}>
              <Text style={[styles.clearBtn, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: showSettings ? themeColors.primary : themeColors.card }]}
          onPress={() => { setShowSettings((v) => !v); setShowSuggestions(false); }}
        >
          <Text style={[styles.menuIcon, { color: showSettings ? '#fff' : themeColors.text }]}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search suggestions dropdown ── */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestions, { backgroundColor: themeColors.card }]}>
          {suggestions.map((basin, i) => (
            <TouchableOpacity
              key={basin.hybasId}
              style={[
                styles.suggestionRow,
                { borderBottomColor: themeColors.border },
                i === suggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectSuggestion(basin)}
            >
              <View style={[styles.suggestionDot, { backgroundColor: RISK_COLORS[basin.riskLevel] }]} />
              <View style={{ flex: 1 }}>
                <Text style={[Typography.body1, { color: themeColors.text }]}>{basin.province}</Text>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                  {RISK_LABELS[basin.riskLevel]} · {(basin.floodProb * 100).toFixed(0)}% xác suất lũ
                </Text>
              </View>
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Basin detail panel ── */}
      {selectedBasin && !showSettings && (
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


      {/* ── Settings backdrop ── */}
      {showSettings && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        />
      )}

      {/* ── Map settings bottom sheet ── */}
      {showSettings && (
        <View style={[styles.settingsSheet, { backgroundColor: themeColors.card }]}>
          <View style={[styles.sheetHandle, { backgroundColor: themeColors.border }]} />

          <View style={styles.sheetHeader}>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Cài đặt bản đồ</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Risk filter */}
          <Text style={[styles.sheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            HIỂN THỊ TỪ MỨC RỦI RO
          </Text>
          <View style={styles.riskRow}>
            {RISK_ORDER.map((risk) => {
              const active = filterMinRisk === risk;
              return (
                <TouchableOpacity
                  key={risk}
                  onPress={() => setFilterMinRisk(risk)}
                  style={[
                    styles.riskChip,
                    { backgroundColor: active ? RISK_COLORS[risk] : themeColors.secondary },
                  ]}
                >
                  <View style={[styles.riskDot, { backgroundColor: active ? '#fff' : RISK_COLORS[risk] }]} />
                  <Text style={[
                    Typography.body2,
                    { color: active ? '#fff' : themeColors.text, fontWeight: active ? '700' : '400' },
                  ]}>
                    {RISK_LABELS[risk]}+
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Layer list */}
          <View style={[styles.sheetDivider, { backgroundColor: themeColors.border }]} />
          <Text style={[styles.sheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            LỚP BẢN ĐỒ
          </Text>
          {[
            { label: 'Lưu vực lũ', sub: `${visibleBasins.length} lưu vực đang hiển thị`, active: true },
            { label: 'Điểm cứu hộ', sub: 'Sắp ra mắt', active: false },
            { label: 'Trạm đo mực nước', sub: 'Sắp ra mắt', active: false },
          ].map((layer, i, arr) => (
            <View
              key={layer.label}
              style={[
                styles.layerRow,
                { borderBottomColor: themeColors.border },
                i === arr.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Typography.body1, { color: layer.active ? themeColors.text : themeColors.textSecondary }]}>
                  {layer.label}
                </Text>
                <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                  {layer.sub}
                </Text>
              </View>
              <View style={[styles.layerIndicator, { backgroundColor: layer.active ? themeColors.primary : themeColors.border }]} />
            </View>
          ))}

          {/* Legend */}
          <View style={[styles.sheetDivider, { backgroundColor: themeColors.border }]} />
          <Text style={[styles.sheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            CHÚ THÍCH MÀU SẮC
          </Text>
          <View style={styles.legendRow}>
            {RISK_ORDER.map((risk) => (
              <View key={risk} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: RISK_COLORS[risk] }]} />
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                  {RISK_LABELS[risk]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Search
  searchRow: {
    position: 'absolute',
    top: 52,
    left: Spacing.m,
    right: Spacing.m,
    flexDirection: 'row',
    gap: Spacing.s,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    height: 48,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: Spacing.s,
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 14,
    padding: 2,
  },
  menuBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  menuIcon: {
    fontSize: 22,
    lineHeight: 26,
  },

  // Suggestions
  suggestions: {
    position: 'absolute',
    top: 108,
    left: Spacing.m,
    right: Spacing.m + 48 + Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
  },
  suggestionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  // Basin detail panel
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


  // Settings
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  settingsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.s,
    marginBottom: Spacing.s,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  sheetSectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
  },
  sheetDivider: {
    height: 1,
    marginHorizontal: Spacing.l,
    marginVertical: Spacing.m,
  },
  riskRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
  },
  riskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
    gap: Spacing.m,
  },
  layerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
    gap: Spacing.l,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
