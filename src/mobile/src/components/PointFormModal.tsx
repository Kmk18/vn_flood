import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { Spacing, Typography } from '../theme';

const VIET_NAM = { latitude: 16.0, longitude: 107.0, latitudeDelta: 10, longitudeDelta: 8 };

interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: { state?: string; city?: string; town?: string };
}

export interface PointFormData {
  name: string;
  address?: string;
  capacity?: number;
  province?: string;
  lat: number;
  lon: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PointFormData) => Promise<void>;
  colors: any;
}

export const PointFormModal: React.FC<Props> = ({ visible, onClose, onSubmit, colors }) => {
  const mapRef = useRef<MapView>(null);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [province, setProvince] = useState('');
  const [coord, setCoord] = useState<{ lat: number; lon: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const reset = () => {
    setName(''); setAddress(''); setCapacity(''); setProvince('');
    setCoord(null); setSaving(false);
    setGeoQuery(''); setGeoResults([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const searchGeo = async () => {
    const q = geoQuery.trim();
    if (!q) return;
    setGeoLoading(true);
    setGeoResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1&accept-language=vi&countrycodes=vn`,
        { headers: { 'User-Agent': 'VNFloodApp/1.0' } }
      );
      setGeoResults(await res.json());
    } catch {
      Alert.alert('Lỗi', 'Không thể tìm kiếm. Kiểm tra kết nối mạng.');
    }
    setGeoLoading(false);
  };

  const pickGeoResult = (r: GeoResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setCoord({ lat, lon });
    setGeoResults([]);
    setGeoQuery('');
    if (!name) setName(r.display_name.split(',')[0].trim());
    if (!province) {
      const prov = r.address?.state ?? r.address?.city ?? r.address?.town ?? '';
      if (prov) setProvince(prov);
    }
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lon, latitudeDelta: 0.04, longitudeDelta: 0.04 },
      600
    );
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm sơ tán.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        address: address.trim() || undefined,
        capacity: capacity ? parseInt(capacity, 10) : undefined,
        province: province.trim() || undefined,
        lat: coord?.lat ?? 0,
        lon: coord?.lon ?? 0,
      });
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[s.root, { backgroundColor: colors.background }]}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>Thêm điểm sơ tán</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Geocoding search */}
            <Text style={[Typography.label, { color: colors.textSecondary }]}>TÌM KIẾM ĐỊA ĐIỂM</Text>
            <View style={[s.geoRow, { backgroundColor: colors.secondary }]}>
              <TextInput
                style={[s.geoInput, { color: colors.text }]}
                placeholder="Tên trường, địa chỉ, phường..."
                placeholderTextColor={colors.textSecondary}
                value={geoQuery}
                onChangeText={setGeoQuery}
                returnKeyType="search"
                onSubmitEditing={searchGeo}
              />
              <TouchableOpacity onPress={searchGeo} style={s.geoBtn} disabled={geoLoading}>
                {geoLoading
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="search-outline" size={18} color={colors.primary} />
                }
              </TouchableOpacity>
            </View>

            {geoResults.length > 0 && (
              <View style={[s.resultList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {geoResults.map((r) => (
                  <TouchableOpacity
                    key={r.place_id}
                    style={[s.resultItem, { borderBottomColor: colors.border }]}
                    onPress={() => pickGeoResult(r)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="location-outline" size={13} color={colors.primary} />
                    <Text style={[Typography.body2, { color: colors.text, flex: 1, marginLeft: Spacing.xs }]} numberOfLines={2}>
                      {r.display_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Map */}
            <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>
              HOẶC NHẤN TRỰC TIẾP VÀO BẢN ĐỒ
            </Text>
            <View style={s.mapWrap}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={VIET_NAM}
                onPress={(e) => {
                  setGeoResults([]);
                  setCoord({
                    lat: e.nativeEvent.coordinate.latitude,
                    lon: e.nativeEvent.coordinate.longitude,
                  });
                }}
              >
                {coord && <Marker coordinate={{ latitude: coord.lat, longitude: coord.lon }} />}
              </MapView>
              {!coord && (
                <View pointerEvents="none" style={s.mapHint}>
                  <Ionicons name="finger-print-outline" size={13} color="#fff" />
                  <Text style={[Typography.caption, { color: '#fff', marginLeft: 4 }]}>
                    Nhấn bản đồ để đặt ghim
                  </Text>
                </View>
              )}
            </View>

            {coord ? (
              <View style={s.coordRow}>
                <Ionicons name="checkmark-circle" size={13} color="#2ECC71" />
                <Text style={[Typography.caption, { color: colors.textSecondary, marginLeft: 4, flex: 1 }]}>
                  {coord.lat.toFixed(5)}°N, {coord.lon.toFixed(5)}°E
                </Text>
                <TouchableOpacity onPress={() => setCoord(null)}>
                  <Ionicons name="close-circle" size={13} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 4 }]}>
                Chưa chọn vị trí — tọa độ lưu là 0, 0
              </Text>
            )}

            {/* Form fields */}
            <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.l }]}>TÊN ĐIỂM *</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderBottomColor: colors.border }]}
              placeholder="VD: Trường THCS Lê Lợi"
              placeholderTextColor={colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>ĐỊA CHỈ</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderBottomColor: colors.border }]}
              placeholder="Số nhà, đường, phường..."
              placeholderTextColor={colors.textSecondary}
              value={address}
              onChangeText={setAddress}
            />

            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>SỨC CHỨA</Text>
                <TextInput
                  style={[s.input, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="Số người"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                  value={capacity}
                  onChangeText={setCapacity}
                />
              </View>
              <View style={{ flex: 1, marginLeft: Spacing.m }}>
                <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>TỈNH / TP</Text>
                <TextInput
                  style={[s.input, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="Tỉnh..."
                  placeholderTextColor={colors.textSecondary}
                  value={province}
                  onChangeText={setProvince}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: saving ? colors.textSecondary : colors.primary }]}
              onPress={handleSubmit}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={[Typography.button, { color: '#fff' }]}>LƯU ĐIỂM</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: Spacing.xs },
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl },
  geoRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, paddingLeft: Spacing.s,
    marginTop: Spacing.xs, marginBottom: Spacing.xs, height: 44,
  },
  geoInput: { flex: 1, fontSize: 14 },
  geoBtn: { padding: Spacing.s },
  resultList: {
    borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: Spacing.xs,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: Spacing.s, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mapWrap: { height: 240, borderRadius: 12, overflow: 'hidden', marginTop: Spacing.xs, marginBottom: 6 },
  mapHint: {
    position: 'absolute', bottom: Spacing.s, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: Spacing.s, paddingVertical: 4, borderRadius: 8,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: Spacing.xs },
  input: { fontSize: 15, borderBottomWidth: 1.5, paddingVertical: Spacing.s, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  twoCol: { flexDirection: 'row' },
  submitBtn: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
});
