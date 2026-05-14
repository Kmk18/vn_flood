import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Switch, Linking, Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { rescueApi, RescuePoint, RescueRequest } from '../api/rescue';
import { useResponderStore } from '../store/useResponderStore';

type ResponderTab = 'requests' | 'points';

const STATUS_COLORS: Record<string, string> = {
  open: '#E74C3C',
  assigned: '#F39C12',
  resolved: '#2ECC71',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'MỞ',
  assigned: 'ĐANG XỬ LÝ',
  resolved: 'HOÀN THÀNH',
};

const VIETNAM_REGION = {
  latitude: 16.5,
  longitude: 106.5,
  latitudeDelta: 12,
  longitudeDelta: 6,
};

function openNavigation(lat: number, lon: number) {
  const url = Platform.OS === 'ios'
    ? `maps://app?daddr=${lat},${lon}`
    : `geo:${lat},${lon}?q=${lat},${lon}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)
  );
}

export const ResponderScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const mapRef = useRef<MapView>(null);

  const [activeTab, setActiveTab] = useState<ResponderTab>('requests');
  const [refreshing, setRefreshing] = useState(false);

  // Requests
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const setPendingNav = useResponderStore((s) => s.setPendingNav);

  // Points
  const [points, setPoints] = useState<RescuePoint[]>([]);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [addingPoint, setAddingPoint] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await rescueApi.getAllRequests();
      setRequests(data);
    } catch { /* keep previous */ }
    setLoadingRequests(false);
  }, []);

  const loadPoints = useCallback(async () => {
    try {
      const data = await rescueApi.getPoints();
      setPoints(data);
    } catch { /* keep previous */ }
  }, []);

  useEffect(() => {
    loadRequests();
    loadPoints();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRequests(), loadPoints()]);
    setRefreshing(false);
  };

  const handleAccept = async (req: RescueRequest) => {
    setUpdatingId(req.id);
    try {
      await rescueApi.updateStatus(req.id, 'assigned');
      setPendingNav({ id: req.id, lat: req.lat, lon: req.lon, label: `Yêu cầu #${req.id}` });
      navigation.goBack();
    } catch {
      Alert.alert('Lỗi', 'Không thể tiếp nhận. Thử lại.');
    }
    setUpdatingId(null);
  };

  const handleResolve = async (id: number) => {
    setUpdatingId(id);
    try {
      const updated = await rescueApi.updateStatus(id, 'resolved');
      setRequests((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
    setUpdatingId(null);
  };

  const handleAddPoint = async () => {
    if (!newName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm sơ tán.');
      return;
    }
    setAddingPoint(true);
    try {
      const point = await rescueApi.createPoint({
        name: newName.trim(),
        address: newAddress.trim() || undefined,
        capacity: newCapacity ? parseInt(newCapacity, 10) : undefined,
        province: newProvince.trim() || undefined,
        lat: 0,
        lon: 0,
      });
      setPoints((prev) => [point, ...prev]);
      setNewName('');
      setNewAddress('');
      setNewCapacity('');
      setNewProvince('');
      setShowAddPoint(false);
    } catch {
      Alert.alert('Lỗi', 'Không thể thêm điểm. Thử lại.');
    }
    setAddingPoint(false);
  };

  const handleTogglePoint = async (point: RescuePoint) => {
    try {
      const updated = await rescueApi.updatePoint(point.id, { isActive: !point.isActive });
      setPoints((prev) => prev.map((p) => p.id === point.id ? updated : p));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
  };

  const openRequests = requests.filter((r) => r.status !== 'resolved');

  const tabs: { key: ResponderTab; label: string }[] = [
    { key: 'requests', label: 'Cứu hộ' },
    { key: 'points', label: 'Điểm sơ tán' },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>Điều phối cứu hộ</Text>
        <View style={[styles.roleBadge, { backgroundColor: '#F39C1222' }]}>
          <Text style={[Typography.label, { color: '#F39C12' }]}>CỨU HỘ</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[Typography.body2, {
                color: active ? colors.primary : colors.textSecondary,
                fontWeight: active ? '700' : '400',
              }]}>
                {tab.label}
              </Text>
              {tab.key === 'requests' && openRequests.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{openRequests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Requests tab ── */}
      {activeTab === 'requests' && (
        <View style={{ flex: 1 }}>
          {/* Map showing all open request pins */}
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={VIETNAM_REGION}
            showsUserLocation
          >
            {openRequests.map((req) => (
              <Marker
                key={req.id}
                coordinate={{ latitude: req.lat, longitude: req.lon }}
                pinColor={STATUS_COLORS[req.status] ?? colors.danger}
                title={`Yêu cầu #${req.id}`}
                description={`${req.peopleCount} người · ${STATUS_LABELS[req.status] ?? req.status}`}
              />
            ))}
          </MapView>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {loadingRequests ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : requests.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Không có yêu cầu cứu hộ nào.
              </Text>
            ) : (
              <View style={styles.listGap}>
                {requests.map((req) => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.accent, { backgroundColor: STATUS_COLORS[req.status] ?? colors.border }]} />
                    <View style={styles.requestInner}>
                      <View style={styles.requestHeader}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '700' }]}>
                          YÊU CẦU #{req.id}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: (STATUS_COLORS[req.status] ?? colors.border) + '22' }]}>
                          <Text style={[Typography.label, { color: STATUS_COLORS[req.status] ?? colors.textSecondary }]}>
                            {STATUS_LABELS[req.status] ?? req.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        {req.lat.toFixed(5)}°N, {req.lon.toFixed(5)}°E · {req.peopleCount} người
                      </Text>
                      {req.notes ? (
                        <Text style={[Typography.caption, { color: colors.text, marginTop: Spacing.xs }]} numberOfLines={2}>
                          {req.notes}
                        </Text>
                      ) : null}
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </Text>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.dirBtn, { borderColor: colors.primary }]}
                          onPress={() => openNavigation(req.lat, req.lon)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                          <Text style={[Typography.label, { color: colors.primary, marginLeft: 4 }]}>CHỈ ĐƯỜNG</Text>
                        </TouchableOpacity>

                        {req.status === 'open' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#F39C1222' }]}
                            onPress={() => handleAccept(req)}
                            disabled={updatingId === req.id}
                            activeOpacity={0.8}
                          >
                            {updatingId === req.id
                              ? <ActivityIndicator size="small" color="#F39C12" />
                              : <Text style={[Typography.label, { color: '#F39C12' }]}>TIẾP NHẬN</Text>
                            }
                          </TouchableOpacity>
                        )}

                        {req.status !== 'resolved' && (
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2ECC7122' }]}
                            onPress={() => handleResolve(req.id)}
                            disabled={updatingId === req.id}
                            activeOpacity={0.8}
                          >
                            {updatingId === req.id && req.status === 'assigned'
                              ? <ActivityIndicator size="small" color="#2ECC71" />
                              : <Text style={[Typography.label, { color: '#2ECC71' }]}>HOÀN THÀNH</Text>
                            }
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Points tab ── */}
      {activeTab === 'points' && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: colors.primary }]}
            onPress={() => setShowAddPoint((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons name={showAddPoint ? 'remove' : 'add'} size={20} color={colors.primary} />
            <Text style={[Typography.button, { color: colors.primary, marginLeft: Spacing.s }]}>
              {showAddPoint ? 'ĐÓNG FORM' : 'THÊM ĐIỂM SƠ TÁN'}
            </Text>
          </TouchableOpacity>

          {showAddPoint && (
            <View style={[styles.formCard, { backgroundColor: colors.card }]}>
              <Text style={[Typography.label, { color: colors.textSecondary }]}>TÊN ĐIỂM</Text>
              <TextInput
                style={[styles.cardInput, { color: colors.text, borderBottomColor: colors.border }]}
                placeholder="VD: Trường THCS Lê Lợi"
                placeholderTextColor={colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
              <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>ĐỊA CHỈ</Text>
              <TextInput
                style={[styles.cardInput, { color: colors.text, borderBottomColor: colors.border }]}
                placeholder="Số nhà, đường, phường..."
                placeholderTextColor={colors.textSecondary}
                value={newAddress}
                onChangeText={setNewAddress}
              />
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>SỨC CHỨA</Text>
                  <TextInput
                    style={[styles.cardInput, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="Số người"
                    placeholderTextColor={colors.textSecondary}
                    value={newCapacity}
                    onChangeText={setNewCapacity}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: Spacing.m }}>
                  <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>TỈNH / TP</Text>
                  <TextInput
                    style={[styles.cardInput, { color: colors.text, borderBottomColor: colors.border }]}
                    placeholder="Tỉnh..."
                    placeholderTextColor={colors.textSecondary}
                    value={newProvince}
                    onChangeText={setNewProvince}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: addingPoint ? colors.textSecondary : colors.primary, marginTop: Spacing.m }]}
                onPress={handleAddPoint}
                disabled={addingPoint}
                activeOpacity={0.8}
              >
                {addingPoint
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[Typography.button, { color: '#fff' }]}>LƯU ĐIỂM</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {points.length === 0 ? (
            <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
              Chưa có điểm sơ tán nào.
            </Text>
          ) : (
            <View style={styles.listGap}>
              {points.map((point) => (
                <View key={point.id} style={[styles.pointCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.pointDot, { backgroundColor: point.isActive ? '#2ECC71' : colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]}>
                      {point.name}
                    </Text>
                    <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                      {point.address || point.province || 'Chưa có địa chỉ'}
                      {point.capacity ? ` · ${point.capacity} người` : ''}
                    </Text>
                  </View>
                  {point.lat !== 0 && (
                    <TouchableOpacity
                      style={styles.pointNavBtn}
                      onPress={() => openNavigation(point.lat, point.lon)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={point.isActive}
                    onValueChange={() => handleTogglePoint(point)}
                    trackColor={{ false: colors.border, true: '#2ECC71' }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.s,
  },
  backBtn: { padding: Spacing.xs },
  roleBadge: { paddingHorizontal: Spacing.s, paddingVertical: 3, borderRadius: 6 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.m,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    paddingRight: Spacing.l,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: Spacing.xs,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  map: { height: 220, width: '100%' },
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl, gap: Spacing.s },
  listGap: { gap: Spacing.s },
  requestCard: {
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accent: { width: 4 },
  requestInner: { flex: 1, padding: Spacing.m },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusPill: { paddingHorizontal: Spacing.s, paddingVertical: 3, borderRadius: 6 },
  actionRow: { flexDirection: 'row', gap: Spacing.s, marginTop: Spacing.m, flexWrap: 'wrap' },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  actionBtn: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  formCard: {
    borderRadius: 12,
    padding: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardInput: {
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: Spacing.s,
    marginTop: Spacing.xs,
  },
  twoCol: { flexDirection: 'row' },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    padding: Spacing.m,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pointDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  pointNavBtn: { padding: Spacing.xs },
});
