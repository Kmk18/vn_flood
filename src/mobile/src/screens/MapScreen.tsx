import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, TextInput,
  StyleSheet, Platform, LayoutAnimation, ActivityIndicator, Alert, Modal,
} from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_DEFAULT, MapType } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { useFloodStore, RISK_COLORS, RISK_COLORS_ALPHA, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { useLocationStore } from '../store/useLocationStore';
import { useAuthStore } from '../store/useAuthStore';
import { useResponderStore } from '../store/useResponderStore';
import basinPolygons from '../assets/vietnamBasinPolygons';
import { rescueApi, RescuePoint, RescueRequest } from '../api/rescue';
import { API_URL } from '../api/client';
import { useAlertStore } from '../store/useAlertStore';
import { useNotifications } from '../hooks/useNotifications';

const LAYOUT_ANIM = LayoutAnimation.create(220, 'easeInEaseOut', 'opacity');

function haversineMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6_371_000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
    Math.cos((b.latitude * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function isPointInPolygon(
  point: { latitude: number; longitude: number },
  polygon: { latitude: number; longitude: number }[],
): boolean {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude, yi = polygon[i].latitude;
    const xj = polygon[j].longitude, yj = polygon[j].latitude;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function timeAgo(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

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
const HAS_POLYGONS = Object.keys(basinPolygons).length > 0;

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

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
  const { basins, selectedBasin, filterMinRisk, isLoading, fetchData, setSelectedBasin, setFilterMinRisk } = useFloodStore();
  const user = useAuthStore((s) => s.user);
  const isResponder = user?.role === 'responder' || user?.role === 'admin';
  const { pendingNav, setPendingNav } = useResponderStore();
  const addAlert = useAlertStore((s) => s.addAlert);
  const { scheduleAlert } = useNotifications();
  const notifiedZonesRef = useRef<Set<string>>(new Set());

  // Re-fetch when the map tab is focused (respects 5-min cooldown in the store)
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const { shareLocation } = useLocationStore();

  const mapRef = useRef<MapView>(null);

  const [searchQuery, setSearchQuery]   = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState<GeoResult[]>([]);
  const [searchedLocation, setSearchedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [mapStyle, setMapStyle]         = useState<MapStyleId>('standard');

  // Location
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationGranted, setLocationGranted] = useState(false);

  // Rescue requests overlay (responder/admin only)
  const [rescueRequests, setRescueRequests]     = useState<import('../api/rescue').RescueRequest[]>([]);
  const [showRescueRequests, setShowRescueRequests] = useState(true);

  // Rescue points + routing
  const [rescuePoints, setRescuePoints]       = useState<RescuePoint[]>([]);
  const [selectedRescue, setSelectedRescue]   = useState<RescuePoint | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RescueRequest | null>(null);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [route, setRoute]                   = useState<RouteInfo | null>(null);
  const [isRouting, setIsRouting]           = useState(false);

  const activeRescueRef      = useRef<RescuePoint | null>(null);
  const locationSubRef       = useRef<Location.LocationSubscription | null>(null);
  const fetchRouteRef        = useRef<((dest: RescuePoint, showLoader?: boolean) => Promise<void>) | null>(null);
  const lastRoutedLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const mapType  = mapStyle as MapType;
  const mapUiStyle = isDarkMode ? 'dark' : 'light';
  const minOrder = RISK_ORDER.indexOf(filterMinRisk);

  const visibleBasins = useMemo(
    () => basins.filter((b) => RISK_ORDER.indexOf(b.riskLevel) >= minOrder),
    [basins, minOrder],
  );


  const basinMap = useMemo(
    () => new Map(basins.map((b) => [String(b.hybasId), b])),
    [basins],
  );

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
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 20 },
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

  // ── Danger zone detection — notify when user enters high/critical basin ──────
  useEffect(() => {
    if (!userLocation) return;
    const dangerBasins = basins.filter(
      (b) => b.riskLevel === 'critical' || b.riskLevel === 'high',
    );
    for (const basin of dangerBasins) {
      const key = String(basin.hybasId);
      if (notifiedZonesRef.current.has(key)) continue;
      const poly = basinPolygons[key];
      if (!poly) continue;
      const inside = poly.parts.some((part) => isPointInPolygon(userLocation, part));
      if (!inside) continue;
      notifiedZonesRef.current.add(key);
      const title = `Cảnh báo lũ: ${basin.province}`;
      const body = `Bạn đang ở vùng ${RISK_LABELS[basin.riskLevel].toLowerCase()}. Xác suất lũ: ${(basin.floodProb * 100).toFixed(0)}%.`;
      scheduleAlert(title, body);
      addAlert({
        id: `auto-${key}-${Date.now()}`,
        title,
        message: body,
        isUrgent: basin.riskLevel === 'critical',
        timestamp: new Date().toISOString(),
        province: basin.province,
      });
    }
  }, [userLocation, basins, scheduleAlert, addAlert]);

  // ── Cleanup debounce on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, []);

  // ── Load rescue points ─────────────────────────────────────────────────────
  useEffect(() => {
    rescueApi.getPoints().then(setRescuePoints).catch(() => {});
  }, []);

  // ── Load open rescue requests (responder/admin only) ───────────────────────
  const loadRescueRequests = useCallback(async () => {
    if (!isResponder) return;
    rescueApi.getAllRequests().then(setRescueRequests).catch(() => {});
  }, [isResponder]);

  // On focus: refresh requests + handle accepted request routed back from ResponderScreen
  useFocusEffect(useCallback(() => { loadRescueRequests(); }, [loadRescueRequests]));

  // Handle navigation to a rescue point set from the SOS sheet or ResponderScreen.
  // Needs useEffect (not useFocusEffect) so it fires even when MapScreen is already focused.
  useEffect(() => {
    if (!pendingNav) return;
    const point: RescuePoint = {
      id: pendingNav.id,
      name: pendingNav.label,
      lat: pendingNav.lat,
      lon: pendingNav.lon,
      capacity: 0,
      province: '',
      address: '',
      isActive: true,
    };
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setSelectedRescue(point);
    setPanelCollapsed(false);
    activeRescueRef.current = point;
    setSelectedBasin(null);
    setShowSuggestions(false);
    setShowSettings(false);
    setRoute(null);
    mapRef.current?.animateToRegion(
      { latitude: point.lat, longitude: point.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600,
    );
    setPendingNav(null);
  }, [pendingNav, setPendingNav, setSelectedBasin]);

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

  // Keep ref in sync so location effect always calls the latest version
  fetchRouteRef.current = fetchRoute;

  // ── Re-fetch route when user moves ≥30 m (navigation progress) ────────────
  useEffect(() => {
    if (!route || !activeRescueRef.current || !userLocation) return;
    const last = lastRoutedLocationRef.current;
    if (last && haversineMeters(last, userLocation) < 30) return;
    lastRoutedLocationRef.current = userLocation;
    fetchRouteRef.current?.(activeRescueRef.current, false);
  }, [userLocation, route]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const searchGeo = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setGeoLoading(true);
    setPlaceSuggestions([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&accept-language=vi&countrycodes=vn`,
        { headers: { 'User-Agent': 'VNFloodApp/1.0' } },
      );
      setPlaceSuggestions(await res.json());
      setShowSuggestions(true);
    } catch {}
    setGeoLoading(false);
  };

  const handleSelectGeoResult = (r: GeoResult) => {
    setSearchQuery(r.display_name.split(',')[0]);
    setShowSuggestions(false);
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setSearchedLocation({ latitude: lat, longitude: lon });
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lon, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      600,
    );
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

  const handleSelectRescue = useCallback((point: RescuePoint) => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setSelectedRescue(point);
    setPanelCollapsed(false);
    activeRescueRef.current = point;
    setSelectedBasin(null);
    setShowSuggestions(false);
    setShowSettings(false);
    setRoute(null);
  }, []);

  const handleStartRoute = () => {
    if (selectedRescue) fetchRoute(selectedRescue);
  };

  const handleClearRoute = () => {
    LayoutAnimation.configureNext(LAYOUT_ANIM);
    setRoute(null);
    setSelectedRescue(null);
    activeRescueRef.current = null;
    lastRoutedLocationRef.current = null;
  };

  // Memoized so hundreds of polygons don't re-mount on every location tick / search keystroke
  const polygonChildren = useMemo(() =>
    Object.entries(basinPolygons).map(([id, poly]) => {
      const basin = basinMap.get(id);
      if (!basin) return null;
      if (RISK_ORDER.indexOf(basin.riskLevel) < minOrder) return null;

      const fill   = RISK_COLORS_ALPHA[basin.riskLevel];
      const stroke = RISK_COLORS[basin.riskLevel];

      return poly.parts.map((coords, i) => (
        <Polygon
          key={`${id}-${i}`}
          coordinates={coords}
          fillColor={fill}
          strokeColor={stroke}
          strokeWidth={1.5}
        />
      ));
    }),
  [basinMap, minOrder]); // no onPress — polygons are display-only

  // Rescue request pins for responder/admin
  const requestMarkers = useMemo(() =>
    rescueRequests
      .filter((r) => r.status !== 'resolved')
      .map((r) => {
        const pinColor = r.status === 'open' ? themeColors.danger : themeColors.warning;
        return (
          <Marker
            key={`req-${r.id}`}
            coordinate={{ latitude: r.lat, longitude: r.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            onPress={() => setSelectedRequest(r)}
          >
            <View style={[styles.requestPin, { backgroundColor: pinColor }]}>
              <Ionicons name="alert" size={12} color="#fff" />
            </View>
          </Marker>
        );
      }),
  [rescueRequests, themeColors, setSelectedRequest]);


  const panelFullOpen = (selectedBasin && !showSettings) || (selectedRescue != null && !panelCollapsed);
  const fabOffset = panelFullOpen ? 260 : (selectedRescue != null && panelCollapsed) ? 64 : Spacing.xl;

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
      >
        {/* Route polyline */}
        {route && (
          <Polyline
            coordinates={route.coords}
            strokeColor="#3b82f6"
            strokeWidth={4}
            zIndex={10}
          />
        )}

        {/* Basin polygons / markers */}
        {HAS_POLYGONS ? polygonChildren : visibleBasins.map((basin) => (
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
        ))}

        {/* Rescue request pins (responder/admin only) */}
        {isResponder && showRescueRequests && requestMarkers}

        {/* Search result pin */}
        {searchedLocation && (
          <Marker coordinate={searchedLocation} zIndex={50} />
        )}

        {/* Selected evacuation point — default pin marker */}
        {selectedRescue && (
          <Marker
            key={`selected-rescue-${selectedRescue.id}`}
            coordinate={{ latitude: selectedRescue.lat, longitude: selectedRescue.lon }}
            zIndex={100}
          />
        )}
      </MapView>


      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      )}

      {/* ── Search row ── */}
      <View style={GlobalStyles.mapSearchRow}>
        <View style={[GlobalStyles.mapSearchBar, { backgroundColor: themeColors.card }]}>
          {geoLoading
            ? <ActivityIndicator size="small" color={themeColors.textSecondary} />
            : <Ionicons name="search-outline" size={18} color={themeColors.textSecondary} />
          }
          <TextInput
            style={[GlobalStyles.mapSearchInput, { color: themeColors.text }]}
            placeholder="Tìm kiếm địa điểm..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={(t) => {
              setSearchQuery(t);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              if (!t) { setShowSuggestions(false); setPlaceSuggestions([]); setSearchedLocation(null); return; }
              searchDebounceRef.current = setTimeout(async () => {
                setGeoLoading(true);
                try {
                  const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(t)}&format=json&limit=5&addressdetails=1&accept-language=vi&countrycodes=vn`,
                    { headers: { 'User-Agent': 'VNFloodApp/1.0' } },
                  );
                  setPlaceSuggestions(await res.json());
                  setShowSuggestions(true);
                } catch {}
                setGeoLoading(false);
              }, 200);
            }}
            onSubmitEditing={searchGeo}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && !geoLoading && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSuggestions(false); setPlaceSuggestions([]); setSearchedLocation(null); }}>
              <Text style={[GlobalStyles.mapClearBtn, { color: themeColors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[GlobalStyles.mapMenuBtn, { backgroundColor: showSettings ? themeColors.primary : themeColors.card }]}
          onPress={() => {
            setShowSettings((v) => !v);
            setShowSuggestions(false);
          }}
        >
          <Text style={[GlobalStyles.mapMenuIcon, { color: showSettings ? '#fff' : themeColors.text }]}>≡</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search suggestions ── */}
      {showSuggestions && placeSuggestions.length > 0 && (
        <View style={[GlobalStyles.mapSuggestions, { backgroundColor: themeColors.card }]}>
          {placeSuggestions.map((r, i) => (
            <TouchableOpacity
              key={r.place_id}
              style={[
                GlobalStyles.mapSuggestionRow,
                { borderBottomColor: themeColors.border },
                i === placeSuggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectGeoResult(r)}
            >
              <Ionicons name="location-outline" size={16} color={themeColors.textSecondary} style={{ flexShrink: 0 }} />
              <Text style={[Typography.body1, { color: themeColors.text, flex: 1 }]} numberOfLines={2}>
                {r.display_name}
              </Text>
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Rescue requests toggle FAB (responder/admin only) ── */}
      {isResponder && (
        <TouchableOpacity
          style={[
            styles.locationFab,
            {
              backgroundColor: showRescueRequests ? '#E74C3C' : themeColors.card,
              bottom: fabOffset + 52,
            },
          ]}
          onPress={() => setShowRescueRequests((v) => !v)}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={20} color={showRescueRequests ? '#fff' : themeColors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* ── My Location FAB ── */}
      <TouchableOpacity
        style={[
          styles.locationFab,
          { backgroundColor: themeColors.card, bottom: fabOffset },
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

          {panelCollapsed ? (
            /* ── Collapsed tab ── */
            <TouchableOpacity
              style={styles.collapsedTab}
              onPress={() => { LayoutAnimation.configureNext(LAYOUT_ANIM); setPanelCollapsed(false); }}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit" size={14} color="#22c55e" />
              <Text style={[Typography.body2, { color: themeColors.text, flex: 1, marginLeft: Spacing.s, fontWeight: '600' }]} numberOfLines={1}>
                {selectedRescue.name}
              </Text>
              {route && (
                <Text style={[Typography.caption, { color: '#3b82f6', marginRight: Spacing.xs }]}>
                  {route.distanceKm} km
                </Text>
              )}
              <Ionicons name="chevron-up" size={22} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ) : (
            /* ── Expanded content ── */
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
                  onPress={() => { LayoutAnimation.configureNext(LAYOUT_ANIM); setPanelCollapsed(true); }}
                  style={GlobalStyles.mapCloseBtn}
                >
                  <Ionicons name="chevron-down" size={22} color={themeColors.textSecondary} />
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

              {route && (
                <View style={styles.routeInfo}>
                  <Ionicons name="navigate" size={14} color="#3b82f6" />
                  <Text style={[Typography.body2, { color: '#3b82f6', marginLeft: 4 }]}>
                    {route.distanceKm} km
                  </Text>
                </View>
              )}

              <View style={[GlobalStyles.mapDivider, { backgroundColor: themeColors.border }]} />

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
                    onPress={handleClearRoute}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color={themeColors.text} />
                    <Text style={[styles.routeBtnText, { color: themeColors.text }]}>Xóa đường</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Map settings Modal (above tab bar + SOS button) ── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
        statusBarTranslucent
      >
        <TouchableOpacity
          style={[GlobalStyles.mapBackdrop, { backgroundColor: 'transparent' }]}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        />
        <View style={[GlobalStyles.mapSettingsSheet, { backgroundColor: themeColors.card }]}>
          <View style={[GlobalStyles.mapSheetHandle, { backgroundColor: themeColors.border }]} />

          <View style={GlobalStyles.mapSheetHeader}>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Cài đặt bản đồ</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
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
            {(RISK_ORDER.filter((r) => r !== 'low') as Exclude<RiskLevel, 'low'>[]).map((risk) => {
              const active = filterMinRisk === risk;
              return (
                <TouchableOpacity
                  key={risk}
                  onPress={() => setFilterMinRisk(risk as Exclude<RiskLevel, 'low'>)}
                  style={[GlobalStyles.mapRiskChip, { backgroundColor: active ? RISK_COLORS[risk] : themeColors.secondary }]}
                >
                  <View style={[GlobalStyles.mapRiskDot, { backgroundColor: active ? '#fff' : RISK_COLORS[risk] }]} />
                  <Text style={[Typography.body2, { color: active ? '#fff' : themeColors.text, fontWeight: active ? '700' : '400' }]}>
                    {RISK_LABELS[risk as RiskLevel]}+
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[GlobalStyles.mapSheetDivider, { backgroundColor: themeColors.border }]} />
          <Text style={[GlobalStyles.mapSheetSectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
            LỚP BẢN ĐỒ
          </Text>
          <View style={[GlobalStyles.mapLayerRow, { borderBottomColor: themeColors.border, borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: themeColors.text }]}>Lưu vực lũ</Text>
              <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                {visibleBasins.length} lưu vực đang hiển thị
              </Text>
            </View>
            <View style={[GlobalStyles.mapLayerIndicator, { backgroundColor: themeColors.primary }]} />
          </View>
        </View>
      </Modal>

      {/* ── Request info card (tapping a rescue request pin) ── */}
      {selectedRequest && (
        <View style={[styles.reqCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.reqCardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flex: 1 }}>
              <View style={[styles.statusDotReq, {
                backgroundColor: selectedRequest.status === 'open' ? themeColors.danger : themeColors.warning,
              }]} />
              <Text style={[Typography.body2, { color: themeColors.text, fontWeight: '700' }]}>
                Yêu cầu #{selectedRequest.id}
              </Text>
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                · {timeAgo(selectedRequest.createdAt)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedRequest(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
            {selectedRequest.status === 'open' ? 'Chờ xử lý' : 'Đang xử lý'} · {selectedRequest.peopleCount} người
          </Text>
          {selectedRequest.notes ? (
            <Text style={[Typography.body2, { color: themeColors.text, marginTop: Spacing.xs }]} numberOfLines={2}>
              {selectedRequest.notes}
            </Text>
          ) : null}
          {(selectedRequest.assignedUsers ?? []).length > 0 && (
            <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
              Tiếp nhận: {(selectedRequest.assignedUsers ?? []).map((u) => u.name).join(', ')}
            </Text>
          )}
          {(selectedRequest.photos ?? []).length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.s }}>
              {(selectedRequest.photos ?? []).map((p, i) => (
                <Image key={i} source={{ uri: `${API_URL}${p}` }} style={styles.reqCardPhoto} />
              ))}
            </ScrollView>
          )}
          <TouchableOpacity
            style={[styles.reqCardBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => {
              setSelectedRequest(null);
              (navigation as any).navigate('Authority', { initialTab: 'requests' });
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="list-outline" size={14} color="#fff" />
            <Text style={styles.reqCardBtnText}>Điều phối</Text>
          </TouchableOpacity>
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
  collapsedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    gap: Spacing.xs,
  },
  requestPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  reqCard: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.m,
    right: Spacing.m,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.m,
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  reqCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusDotReq: { width: 8, height: 8, borderRadius: 4 },
  reqCardPhoto: { width: 80, height: 80, borderRadius: 8, marginRight: Spacing.s },
  reqCardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, height: 32, borderRadius: 8, marginTop: Spacing.s,
  },
  reqCardBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  selectedRescueMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
});
