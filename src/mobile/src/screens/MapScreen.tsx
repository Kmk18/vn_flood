import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Platform, LayoutAnimation, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_DEFAULT, MapType } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useFloodStore, RISK_COLORS, RISK_COLORS_ALPHA, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import basinPolygons from '../assets/vietnamBasinPolygons';
import { BasinForecast } from '../mock/floodData';


const LAYOUT_ANIM = LayoutAnimation.create(220, 'easeInEaseOut', 'opacity');

const DARK_MAP_STYLE = [
  { elementType: 'geometry.fill',                                                           stylers: [{ visibility: 'on' }, { color: '#324447' }] },
  { elementType: 'geometry.stroke',                                                         stylers: [{ visibility: 'on' }, { color: '#263538' }] },
  { elementType: 'labels.text.fill',                                                        stylers: [{ visibility: 'on' }, { color: '#cccccc' }] },
  { elementType: 'labels.text.stroke',                                                      stylers: [{ visibility: 'on' }, { weight: 0.1 }, { color: '#152022' }] },
  { featureType: 'landscape',        elementType: 'geometry.fill',                          stylers: [{ visibility: 'on' }, { color: '#324447' }] },
  { featureType: 'administrative',   elementType: 'geometry.stroke',                        stylers: [{ color: '#152022' }, { visibility: 'on' }, { weight: 1 }] },
  { featureType: 'water',            elementType: 'geometry.fill',                          stylers: [{ visibility: 'on' }, { color: '#2d4a5a' }] },
  { featureType: 'poi',              elementType: 'geometry',                               stylers: [{ visibility: 'on' }, { color: '#473d40' }] },
  { featureType: 'poi',              elementType: 'labels.text',                            stylers: [{ visibility: 'simplified' }, { lightness: -24 }] },
  { featureType: 'poi.park',         elementType: 'geometry.fill',                          stylers: [{ visibility: 'on' }, { color: '#2f4e43' }] },
  { featureType: 'road',             elementType: 'geometry.fill',                          stylers: [{ visibility: 'on' }, { color: '#263538' }] },
  { featureType: 'road',             elementType: 'geometry.stroke',                        stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line',     elementType: 'geometry.fill',                          stylers: [{ visibility: 'on' }, { color: '#243942' }] },
  { featureType: 'transit.line',     elementType: 'geometry.stroke',                        stylers: [{ visibility: 'on' }, { color: '#263538' }] },
  { featureType: 'transit.station.airport', elementType: 'geometry.fill',                   stylers: [{ visibility: 'on' }, { color: '#473d40' }] },
];

const RISK_ORDER: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
const VIETNAM_REGION = { latitude: 16.0, longitude: 107.5, latitudeDelta: 13.0, longitudeDelta: 9.0 };

type MapStyleId = 'standard' | 'satellite' | 'hybrid';

const MAP_STYLES: { id: MapStyleId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'standard',  label: 'Tiêu chuẩn', icon: 'map-outline' },
  { id: 'satellite', label: 'Vệ tinh',    icon: 'earth-outline' },
  { id: 'hybrid',    label: 'Kết hợp',    icon: 'layers-outline' },
];


export const MapScreen = () => {
  const { isDarkMode, colors: themeColors } = useTheme();
  const { basins, selectedBasin, filterMinRisk, isLoading, setSelectedBasin, setFilterMinRisk } = useFloodStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleId>('standard');

  const mapType = mapStyle as MapType;
  const mapUiStyle = isDarkMode ? 'dark' : 'light';
  const minOrder = RISK_ORDER.indexOf(filterMinRisk);

  const visibleBasins = useMemo(
    () => basins.filter((b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder),
    [basins, minOrder]
  );

  const suggestions: BasinForecast[] = useMemo(
    () => searchQuery.trim().length > 0
      ? basins.filter((b) => b.province.toLowerCase().includes(searchQuery.toLowerCase()))
      : [],
    [basins, searchQuery]
  );

  // keyed lookup used by polygon renderer to find prediction for each basin
  const basinMap = useMemo(
    () => new Map(basins.map((b) => [String(b.hybasId), b])),
    [basins]
  );

  const hasPolygons = Object.keys(basinPolygons).length > 0;

  const handleSelectSuggestion = (basin: BasinForecast) => {
    setSelectedBasin(basin);
    setSearchQuery(basin.province);
    setShowSuggestions(false);
  };

  const dismissAll = () => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
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
        mapType={mapType}
        userInterfaceStyle={mapUiStyle}
        customMapStyle={Platform.OS === 'android' && mapUiStyle === 'dark' ? DARK_MAP_STYLE : []}
        toolbarEnabled={false}
        showsCompass={false}
        showsMyLocationButton={false}
        zoomControlEnabled={false}
        onPress={dismissAll}
      >
        {hasPolygons
          ? Object.entries(basinPolygons).map(([id, poly]) => {
              const basin = basinMap.get(id);
              if (basin && RISK_ORDER.indexOf(basin.riskLevel) < minOrder) return null;
              const fill   = basin ? RISK_COLORS_ALPHA[basin.riskLevel] : 'rgba(100,100,100,0.08)';
              const stroke = basin ? RISK_COLORS[basin.riskLevel]       : 'rgba(150,150,150,0.3)';
              return poly.parts.map((coords, i) => (
                <Polygon
                  key={`${id}-${i}`}
                  coordinates={coords}
                  fillColor={fill}
                  strokeColor={stroke}
                  strokeWidth={basin ? 1.5 : 0.5}
                  tappable={!!basin}
                  onPress={basin ? () => {
                    setShowSuggestions(false);
                    setShowSettings(false);
                    setSelectedBasin(basin);
                  } : undefined}
                />
              ));
            })
          : visibleBasins.map((basin) => (
              <Marker
                key={basin.hybasId}
                coordinate={{ latitude: basin.lat, longitude: basin.lon }}
                pinColor={RISK_COLORS[basin.riskLevel]}
                onPress={() => {
                  setShowSuggestions(false);
                  setShowSettings(false);
                  setSelectedBasin(basin);
                }}
              />
            ))
        }
      </MapView>

      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      )}

      {/* ── Search row ── */}
      <View style={GlobalStyles.mapSearchRow}>
        <View style={[GlobalStyles.mapSearchBar, { backgroundColor: themeColors.card }]}>
          <Text style={[GlobalStyles.mapSearchIcon, { color: themeColors.textSecondary }]}>⌕</Text>
          <TextInput
            style={[GlobalStyles.mapSearchInput, { color: themeColors.text }]}
            placeholder="Tìm kiếm tỉnh thành..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              setShowSuggestions(true);
              setSelectedBasin(null);
            }}
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
          onPress={() => {
            LayoutAnimation.configureNext(LAYOUT_ANIM);
            setShowSettings((v) => !v);
            setShowSuggestions(false);
          }}
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
        <View style={[GlobalStyles.mapPanel, { backgroundColor: themeColors.card, bottom: 0 }]}>
          <View style={[GlobalStyles.mapPanelAccent, { backgroundColor: RISK_COLORS[selectedBasin.riskLevel] }]} />
          <View style={[GlobalStyles.mapPanelContent, { paddingBottom: Spacing.l }]}>
            <View style={GlobalStyles.mapPanelHeader}>
              <View>
                <Text style={[Typography.label, { color: RISK_COLORS[selectedBasin.riskLevel] }]}>
                  {RISK_LABELS[selectedBasin.riskLevel].toUpperCase()}
                </Text>
                <Text style={[Typography.h3, { color: themeColors.text, marginTop: 2 }]}>
                  {selectedBasin.province}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LAYOUT_ANIM);
                  setSelectedBasin(null);
                }}
                style={GlobalStyles.mapCloseBtn}
              >
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
          onPress={() => {
            LayoutAnimation.configureNext(LAYOUT_ANIM);
            setShowSettings(false);
          }}
        />
      )}

      {/* ── Map settings bottom sheet ── */}
      {showSettings && (
        <View style={[GlobalStyles.mapSettingsSheet, { backgroundColor: themeColors.card }]}>
          <View style={[GlobalStyles.mapSheetHandle, { backgroundColor: themeColors.border }]} />

          <View style={GlobalStyles.mapSheetHeader}>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Cài đặt bản đồ</Text>
            <TouchableOpacity onPress={() => {
              LayoutAnimation.configureNext(LAYOUT_ANIM);
              setShowSettings(false);
            }}>
              <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <Text style={[GlobalStyles.mapSheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            KIỂU BẢN ĐỒ
          </Text>
          <View style={styles.mapStyleRow}>
            {MAP_STYLES.map(({ id, label, icon }) => {
              const active = mapStyle === id;
              return (
                <TouchableOpacity
                  key={id}
                  onPress={() => setMapStyle(id)}
                  style={[
                    styles.mapStyleChip,
                    {
                      backgroundColor: active ? themeColors.primary : themeColors.secondary,
                      borderColor: active ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <Ionicons name={icon} size={20} color={active ? '#fff' : themeColors.textSecondary} />
                  <Text style={[
                    Typography.caption,
                    { color: active ? '#fff' : themeColors.text, fontWeight: active ? '700' : '400', marginTop: 4 },
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[GlobalStyles.mapSheetDivider, { backgroundColor: themeColors.border }]} />
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

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    zIndex: 10,
  },
  mapStyleRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
    gap: Spacing.s,
  },
  mapStyleChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.m,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 2,
  },
});
