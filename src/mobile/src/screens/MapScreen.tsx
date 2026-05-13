import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, LayoutAnimation, ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_DEFAULT, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { useFloodStore, RISK_COLORS, RISK_COLORS_ALPHA, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { useLocationStore } from '../store/useLocationStore';
import basinPolygons from '../assets/vietnamBasinPolygons';
import { BasinForecast } from '../mock/floodData';
import { rescueApi, RescuePoint } from '../api/rescue';

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

interface RouteInfo {
  coords: { latitude: number; longitude: number }[];
  distanceKm: number;
  durationMin: number;
}

export const MapScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, colors: themeColors } = useTheme();
  const { basins, selectedBasin, filterMinRisk, isLoading, setSelectedBasin, setFilterMinRisk } = useFloodStore();
  const { shareLocation } = useLocationStore();

  const mapRef = useRef<MapView>(null);

  const [searchQuery, setSearchQuery]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mapStyle, setMapStyle]         = useState<MapStyleId>('standard');

  // Location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  // Rescue points + routing
  const [rescuePoints, setRescuePoints]     = useState<RescuePoint[]>([]);
  const [selectedRescue, setSelectedRescue] = useState<RescuePoint | null>(null);
  const [route, setRoute]                   = useState<RouteInfo | null>(null);
  const [isRouting, setIsRouting]           = useState(false);
  const activeRescueRef  = useRef<RescuePoint | null>(null);
  const locationSubRef   = useRef<Location.LocationSubscription | null>(null);
  const fetchRouteRef    = useRef<((dest: RescuePoint, showLoader?: boolean) => Promise<void>) | null>(null);

  const mapType  = mapStyle as MapType;
  const mapUiStyle = isDarkMode ? 'dark' : 'light';
  const minOrder = RISK_ORDER.indexOf(filterMinRisk);

  const visibleBasins = useMemo(
    () => basins.filter((b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder),
    [basins, minOrder],
  );

  const suggestions: BasinForecast[] = useMemo(
    () => searchQuery.trim().length > 0
      ? basins.filter((b) => b.province.toLowerCase().includes(searchQuery.toLowerCase()))
      : [],
    [basins, searchQuery],
  );

  const basinMap = useMemo(
    () => new Map(basins.map((b) => [String(b.hybasId), b])),
    [basins],
  );

  const hasPolygons = Object.keys(basinPolygons).length > 0;

  // ── Location watch — only active when user has enabled shareLocation ────────
  useEffect(() => {
    let cancelled = false;

    if (!shareLocation) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      setLocationGranted(false);
      setUserLocation(null);
      return;
    }

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      setLocationGranted(true);
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 15 },
        (loc) => setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
      );
      if (cancelled) { sub.remove(); return; }
      locationSubRef.current = sub;
    })();

    return () => {
      cancelled = true;
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [shareLocation]);

  // ── Load rescue points ─────────────────────────────────────────────────────
  useEffect(() => {
    rescueApi.getPoints().then(setRescuePoints).catch(() => {});
  }, []);

  // ── OSRM routing ───────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (dest: RescuePoint, showLoader = true) => {
    if (!shareLocation || !userLocation) {
      if (showLoader) {
        Alert.alert(
          'Chia sẻ vị trí chưa bật',
          'Bật chia sẻ vị trí trong Cài đặt ứng dụng để chỉ đường đến điểm cứu hộ.',
          [
            { text: 'Đóng', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => navigation.navigate('AppSettings' as never) },
          ],
        );
      }
      return;
    }
    if (showLoader) setIsRouting(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${userLocation.longitude},${userLocation.latitude};${dest.lon},${dest.lat}` +
        `?overview=full&geometries=geojson`;
      const res  = await fetch(url, { signal: controller.signal });
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.length) throw new Error('no-route');
      const r = data.routes[0];
      setRoute({
        coords:      r.geometry.coordinates.map(([lon, lat]: [number, number]) => ({ latitude: lat, longitude: lon })),
        distanceKm:  Math.round(r.distance / 100) / 10,
        durationMin: Math.round(r.duration / 60),
      });
    } catch {
      if (showLoader) Alert.alert('Không tìm được đường', 'Vui lòng thử lại sau.');
    } finally {
      clearTimeout(timeout);
      if (showLoader) setIsRouting(false);
    }
  }, [userLocation, shareLocation, navigation]);

  // Keep ref in sync so the interval always calls the latest version
  fetchRouteRef.current = fetchRoute;

  // ── Re-fetch route every 30s when one is active ────────────────────────────
  useEffect(() => {
    if (!route || !selectedRescue) return;
    const interval = setInterval(() => {
      if (activeRescueRef.current && fetchRouteRef.current) {
        fetchRouteRef.current(activeRescueRef.current, false);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [route, selectedRescue]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectSuggestion = (basin: BasinForecast) => {
    setSelectedBasin(basin);
    setSearchQuery(basin.province);
    setShowSuggestions(false);
  };

  const handleMyLocation = () => {
    if (!shareLocation) {
      Alert.alert(
        'Chia sẻ vị trí chưa bật',
        'Bật chia sẻ vị trí trong Cài đặt ứng dụng để sử dụng tính năng này.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Mở Cài đặt', onPress: () => navigation.navigate('AppSettings' as never) },
        ],
      );
      return;
    }
    if (!userLocation) return;
    mapRef.current?.animateToRegion(
      { ...userLocation, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600,
    );
  };

  const handleSelectRescue = (point: RescuePoint) => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setSelectedRescue(point);
    activeRescueRef.current = point;
    setSelectedBasin(null);
    setShowSuggestions(false);
    setShowSettings(false);
    setRoute(null);
  };

  const handleStartRoute = () => {
    if (selectedRescue) fetchRoute(selectedRescue);
  };

  const handleClearRoute = () => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setRoute(null);
    setSelectedRescue(null);
    activeRescueRef.current = null;
  };

  const dismissAll = () => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setSelectedBasin(null);
    setSelectedRescue(null);
    activeRescueRef.current = null;
    setRoute(null);
    setShowSuggestions(false);
    setShowSettings(false);
  };

  const bottomPanelOpen = (selectedBasin && !showSettings) || selectedRescue != null;

  return (
    <View style={GlobalStyles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={GlobalStyles.mapAbsolute}
        initialRegion={VIETNAM_REGION}
        mapType={mapType}
        userInterfaceStyle={mapUiStyle}
        customMapStyle={Platform.OS === 'android' && mapUiStyle === 'dark' ? DARK_MAP_STYLE : []}
        showsUserLocation={shareLocation && locationGranted}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        showsCompass={false}
        zoomControlEnabled={false}
        onPress={dismissAll}
      >
        {/* Route polyline */}
        {route && (
          <Polyline
            coordinates={route.coords}
            strokeColor="#3b82f6"
            strokeWidth={4}
            lineDashPattern={undefined}
            zIndex={10}
          />
        )}

        {/* Basin polygons / markers */}
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
                    setSelectedRescue(null);
                    setRoute(null);
                    activeRescueRef.current = null;
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
                  setSelectedRescue(null);
                  setRoute(null);
                  activeRescueRef.current = null;
                  setSelectedBasin(basin);
                }}
              />
            ))
        }

        {/* Rescue point markers */}
        {rescuePoints.map((point) => (
          <Marker
            key={`rescue-${point.id}`}
            coordinate={{ latitude: point.lat, longitude: point.lon }}
            onPress={() => handleSelectRescue(point)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.rescueMarker}>
              <Ionicons name="medkit" size={14} color="#fff" />
            </View>
          </Marker>
        ))}
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
          onPress={() => {
            LayoutAnimation.configureNext(LAYOUT_ANIM);
            setShowSettings((v) => !v);
            setShowSuggestions(false);
          }}
        >
          <Text style={[GlobalStyles.mapMenuIcon, { color: showSettings ? '#fff' : themeColors.text }]}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search suggestions ── */}
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

      {/* ── My Location FAB ── */}
      <TouchableOpacity
        style={[
          styles.locationFab,
          { backgroundColor: themeColors.card, bottom: bottomPanelOpen ? 260 : Spacing.xl },
        ]}
        onPress={handleMyLocation}
        activeOpacity={0.8}
      >
        <Ionicons
          name={shareLocation && locationGranted ? 'locate' : 'locate-outline'}
          size={22}
          color={shareLocation && locationGranted ? themeColors.primary : themeColors.textSecondary}
        />
      </TouchableOpacity>

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
                onPress={() => { LayoutAnimation.configureNext(LAYOUT_ANIM); setSelectedBasin(null); }}
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

      {/* ── Rescue point detail panel ── */}
      {selectedRescue && !showSettings && (
        <View style={[GlobalStyles.mapPanel, { backgroundColor: themeColors.card, bottom: 0 }]}>
          <View style={[GlobalStyles.mapPanelAccent, { backgroundColor: '#22c55e' }]} />
          <View style={[GlobalStyles.mapPanelContent, { paddingBottom: Spacing.l }]}>
            <View style={GlobalStyles.mapPanelHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="medkit" size={14} color="#22c55e" />
                  <Text style={[Typography.label, { color: '#22c55e' }]}>ĐIỂM CỨU HỘ</Text>
                </View>
                <Text style={[Typography.h3, { color: themeColors.text, marginTop: 2 }]} numberOfLines={2}>
                  {selectedRescue.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearRoute}
                style={GlobalStyles.mapCloseBtn}
              >
                <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedRescue.address ? (
              <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.xs }]} numberOfLines={2}>
                {selectedRescue.address}
              </Text>
            ) : null}
            {selectedRescue.capacity ? (
              <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                Sức chứa: {selectedRescue.capacity} người
              </Text>
            ) : null}

            {/* Route info */}
            {route && (
              <View style={styles.routeInfo}>
                <Ionicons name="navigate" size={14} color="#3b82f6" />
                <Text style={[Typography.body2, { color: '#3b82f6', marginLeft: 4 }]}>
                  {route.distanceKm} km · {route.durationMin} phút
                </Text>
              </View>
            )}

            <View style={[GlobalStyles.mapDivider, { backgroundColor: themeColors.border }]} />

            {/* Direction buttons */}
            <View style={styles.routeBtnRow}>
              <TouchableOpacity
                style={[styles.routeBtn, { backgroundColor: '#3b82f6' }]}
                onPress={handleStartRoute}
                disabled={isRouting}
                activeOpacity={0.8}
              >
                {isRouting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={16} color="#fff" />
                    <Text style={styles.routeBtnText}>{route ? 'Cập nhật' : 'Chỉ đường'}</Text>
                  </>
                )}
              </TouchableOpacity>

              {route && (
                <TouchableOpacity
                  style={[styles.routeBtn, { backgroundColor: themeColors.secondary, borderWidth: 1, borderColor: themeColors.border }]}
                  onPress={() => setRoute(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={16} color={themeColors.text} />
                  <Text style={[styles.routeBtnText, { color: themeColors.text }]}>Xóa đường</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Settings backdrop ── */}
      {showSettings && (
        <TouchableOpacity
          style={GlobalStyles.mapBackdrop}
          activeOpacity={1}
          onPress={() => { LayoutAnimation.configureNext(LAYOUT_ANIM); setShowSettings(false); }}
        />
      )}

      {/* ── Map settings bottom sheet ── */}
      {showSettings && (
        <View style={[GlobalStyles.mapSettingsSheet, { backgroundColor: themeColors.card }]}>
          <View style={[GlobalStyles.mapSheetHandle, { backgroundColor: themeColors.border }]} />

          <View style={GlobalStyles.mapSheetHeader}>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Cài đặt bản đồ</Text>
            <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LAYOUT_ANIM); setShowSettings(false); }}>
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
                    { backgroundColor: active ? themeColors.primary : themeColors.secondary, borderColor: active ? themeColors.primary : themeColors.border },
                  ]}
                  activeOpacity={0.75}
                >
                  <Ionicons name={icon} size={20} color={active ? '#fff' : themeColors.textSecondary} />
                  <Text style={[Typography.caption, { color: active ? '#fff' : themeColors.text, fontWeight: active ? '700' : '400', marginTop: 4 }]}>
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
                  style={[GlobalStyles.mapRiskChip, { backgroundColor: active ? RISK_COLORS[risk] : themeColors.secondary }]}
                >
                  <View style={[GlobalStyles.mapRiskDot, { backgroundColor: active ? '#fff' : RISK_COLORS[risk] }]} />
                  <Text style={[Typography.body2, { color: active ? '#fff' : themeColors.text, fontWeight: active ? '700' : '400' }]}>
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
            { label: 'Lưu vực lũ',    sub: `${visibleBasins.length} lưu vực đang hiển thị`, active: true },
            { label: 'Điểm cứu hộ',   sub: `${rescuePoints.length} điểm đang hiển thị`,     active: rescuePoints.length > 0 },
            { label: 'Trạm đo mực nước', sub: 'Sắp ra mắt',                                 active: false },
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
            <View style={GlobalStyles.mapLegendItem}>
              <View style={[GlobalStyles.mapLegendDot, { backgroundColor: '#22c55e' }]} />
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>Cứu hộ</Text>
            </View>
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
  locationFab: {
    position: 'absolute',
    right: Spacing.l,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 20,
  },
  rescueMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.s,
    paddingHorizontal: 2,
  },
  routeBtnRow: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  routeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.m,
    borderRadius: 10,
  },
  routeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
