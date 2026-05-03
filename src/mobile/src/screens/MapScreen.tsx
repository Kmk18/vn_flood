import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
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
      <View style={GlobalStyles.mapSearchRow}>
        <View style={[GlobalStyles.mapSearchBar, { backgroundColor: themeColors.card }]}>
          <Text style={[GlobalStyles.mapSearchIcon, { color: themeColors.textSecondary }]}>⌕</Text>
          <TextInput
            style={[GlobalStyles.mapSearchInput, { color: themeColors.text }]}
            placeholder="Tìm kiếm tỉnh thành..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); setShowSuggestions(true); setSelectedBasin(null); }}
            onFocus={() => setShowSuggestions(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSuggestions(false); }}>
              <Text style={[GlobalStyles.mapClearBtn, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[GlobalStyles.mapMenuBtn, { backgroundColor: showSettings ? themeColors.primary : themeColors.card }]}
          onPress={() => { setShowSettings((v) => !v); setShowSuggestions(false); }}
        >
          <Text style={[GlobalStyles.mapMenuIcon, { color: showSettings ? '#fff' : themeColors.text }]}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search suggestions dropdown ── */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[GlobalStyles.mapSuggestions, { backgroundColor: themeColors.card }]}>
          {suggestions.map((basin, i) => (
            <TouchableOpacity
              key={basin.hybasId}
              style={[
                GlobalStyles.mapSuggestionRow,
                { borderBottomColor: themeColors.border },
                i === suggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectSuggestion(basin)}
            >
              <View style={[GlobalStyles.mapSuggestionDot, { backgroundColor: RISK_COLORS[basin.riskLevel] }]} />
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
        <View style={[GlobalStyles.mapPanel, { backgroundColor: themeColors.card }]}>
          <View style={[GlobalStyles.mapPanelAccent, { backgroundColor: RISK_COLORS[selectedBasin.riskLevel] }]} />
          <View style={GlobalStyles.mapPanelContent}>
            <View style={GlobalStyles.mapPanelHeader}>
              <View>
                <Text style={[Typography.label, { color: RISK_COLORS[selectedBasin.riskLevel] }]}>
                  {RISK_LABELS[selectedBasin.riskLevel].toUpperCase()}
                </Text>
                <Text style={[Typography.h3, { color: themeColors.text, marginTop: 2 }]}>
                  {selectedBasin.province}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBasin(null)} style={GlobalStyles.mapCloseBtn}>
                <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
              Xác suất lũ hôm nay:{' '}
              <Text style={{ color: RISK_COLORS[selectedBasin.riskLevel], fontWeight: '700' }}>
                {(selectedBasin.floodProb * 100).toFixed(0)}%
              </Text>
            </Text>

            <View style={[GlobalStyles.mapDivider, { backgroundColor: themeColors.border }]} />

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedBasin.forecast7d.map((f, i) => (
                <View key={i} style={GlobalStyles.mapForecastDay}>
                  <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                    {i === 0 ? 'HÔM NAY' : new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <View style={[GlobalStyles.mapForecastBar, { backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }]} />
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
          style={GlobalStyles.mapBackdrop}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        />
      )}

      {/* ── Map settings bottom sheet ── */}
      {showSettings && (
        <View style={[GlobalStyles.mapSettingsSheet, { backgroundColor: themeColors.card }]}>
          <View style={[GlobalStyles.mapSheetHandle, { backgroundColor: themeColors.border }]} />

          <View style={GlobalStyles.mapSheetHeader}>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Cài đặt bản đồ</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Risk filter */}
          <Text style={[GlobalStyles.mapSheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            HIỂN THỊ TỪ MỨC RỦI RO
          </Text>
          <View style={GlobalStyles.mapRiskRow}>
            {RISK_ORDER.map((risk) => {
              const active = filterMinRisk === risk;
              return (
                <TouchableOpacity
                  key={risk}
                  onPress={() => setFilterMinRisk(risk)}
                  style={[
                    GlobalStyles.mapRiskChip,
                    { backgroundColor: active ? RISK_COLORS[risk] : themeColors.secondary },
                  ]}
                >
                  <View style={[GlobalStyles.mapRiskDot, { backgroundColor: active ? '#fff' : RISK_COLORS[risk] }]} />
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
          <View style={[GlobalStyles.mapSheetDivider, { backgroundColor: themeColors.border }]} />
          <Text style={[GlobalStyles.mapSheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
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
                GlobalStyles.mapLayerRow,
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
              <View style={[GlobalStyles.mapLayerIndicator, { backgroundColor: layer.active ? themeColors.primary : themeColors.border }]} />
            </View>
          ))}

          {/* Legend */}
          <View style={[GlobalStyles.mapSheetDivider, { backgroundColor: themeColors.border }]} />
          <Text style={[GlobalStyles.mapSheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            CHÚ THÍCH MÀU SẮC
          </Text>
          <View style={GlobalStyles.mapLegendRow}>
            {RISK_ORDER.map((risk) => (
              <View key={risk} style={GlobalStyles.mapLegendItem}>
                <View style={[GlobalStyles.mapLegendDot, { backgroundColor: RISK_COLORS[risk] }]} />
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
