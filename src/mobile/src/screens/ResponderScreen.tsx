import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Switch, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { rescueApi, RescuePoint, RescueRequest } from '../api/rescue';
import { API_URL } from '../api/client';
import { useResponderStore } from '../store/useResponderStore';
import { useAuthStore } from '../store/useAuthStore';

type ResponderTab = 'open' | 'assigned' | 'resolved' | 'points';

const STATUS_COLOR: Record<string, string> = {
  open: '#E74C3C',
  assigned: '#F39C12',
  resolved: '#2ECC71',
};

function openExternalNav(lat: number, lon: number) {
  const url = Platform.OS === 'ios'
    ? `maps://app?daddr=${lat},${lon}`
    : `geo:${lat},${lon}?q=${lat},${lon}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)
  );
}

// ── Request card shared between open and assigned tabs ─────────────────────

interface RequestCardProps {
  req: RescueRequest;
  currentUserId: number | undefined;
  onAccept: (req: RescueRequest) => void;
  onResolve: (id: number) => void;
  updatingId: number | null;
  colors: ReturnType<typeof import('../theme/useTheme').useTheme>['colors'];
}

const RequestCard: React.FC<RequestCardProps> = ({ req, currentUserId, onAccept, onResolve, updatingId, colors }) => {
  const assignedUsers = req.assignedUsers ?? [];
  const isAssignedToMe = assignedUsers.some((u) => u.id === currentUserId);
  const busy = updatingId === req.id;

  const timeAgo = (() => {
    const mins = Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 60000);
    if (mins < 1) return 'vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} giờ trước`;
    return `${Math.floor(hrs / 24)} ngày trước`;
  })();

  return (
    <View style={[styles.feedItem, { borderBottomColor: colors.border }]}>
      {/* Meta line */}
      <View style={styles.feedMeta}>
        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[req.status] ?? colors.border }]} />
        <Text style={[Typography.body2, { color: colors.text, fontWeight: '700', flex: 1 }]}>
          Yêu cầu #{req.id} · {req.peopleCount} người
        </Text>
        <Text style={[Typography.caption, { color: colors.textSecondary }]}>{timeAgo}</Text>
      </View>

      {/* Notes */}
      {req.notes ? (
        <Text style={[Typography.body1, { color: colors.text, marginBottom: Spacing.xs }]} numberOfLines={3}>
          {req.notes}
        </Text>
      ) : null}

      {/* Location */}
      <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
        {req.lat.toFixed(5)}°N, {req.lon.toFixed(5)}°E
      </Text>

      {/* Photos */}
      {(req.photos ?? []).length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
          {(req.photos ?? []).map((p, i) => (
            <Image key={i} source={{ uri: `${API_URL}${p}` }} style={styles.photoThumb} />
          ))}
        </ScrollView>
      )}

      {/* Assignees inline */}
      {assignedUsers.length > 0 && (
        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
          Tiếp nhận bởi{' '}
          {assignedUsers.map((u, i) => (
            <Text key={u.id} style={{ color: u.id === currentUserId ? colors.primary : colors.text, fontWeight: '600' }}>
              {u.name + (i < assignedUsers.length - 1 ? ', ' : '')}
            </Text>
          ))}
        </Text>
      )}

      {/* Action bar */}
      <View style={[styles.feedActions, { borderTopColor: colors.border }]}>
        {!isAssignedToMe && (
          <TouchableOpacity style={styles.feedAction} onPress={() => onAccept(req)} disabled={busy} activeOpacity={0.7}>
            {busy
              ? <ActivityIndicator size="small" color={colors.warning} />
              : <>
                  <Ionicons name="hand-left-outline" size={16} color={colors.warning} />
                  <Text style={[Typography.label, { color: colors.warning, marginLeft: 4 }]}>Tiếp nhận</Text>
                </>
            }
          </TouchableOpacity>
        )}
        {isAssignedToMe && req.status !== 'resolved' && (
          <TouchableOpacity style={styles.feedAction} onPress={() => onResolve(req.id)} disabled={busy} activeOpacity={0.7}>
            {busy
              ? <ActivityIndicator size="small" color={colors.success} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                  <Text style={[Typography.label, { color: colors.success, marginLeft: 4 }]}>Hoàn thành</Text>
                </>
            }
          </TouchableOpacity>
        )}
        {isAssignedToMe && (
          <View style={[styles.feedAction, { opacity: 0.5 }]}>
            <Ionicons name="checkmark-done-outline" size={14} color={colors.primary} />
            <Text style={[Typography.label, { color: colors.primary, marginLeft: 4 }]}>Đã tiếp nhận</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export const ResponderScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const setPendingNav = useResponderStore((s) => s.setPendingNav);
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<ResponderTab>('open');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [openReqs, setOpenReqs] = useState<RescueRequest[]>([]);
  const [assignedReqs, setAssignedReqs] = useState<RescueRequest[]>([]);
  const [resolvedReqs, setResolvedReqs] = useState<RescueRequest[]>([]);

  // Points state
  const [points, setPoints] = useState<RescuePoint[]>([]);
  const [pointSearch, setPointSearch] = useState('');
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [addingPoint, setAddingPoint] = useState(false);

  const loadTab = useCallback(async (tab: ResponderTab) => {
    if (tab === 'points') {
      try { setPoints(await rescueApi.getPoints()); } catch { /* keep */ }
      return;
    }
    try {
      const data = await rescueApi.getByStatus(tab as 'open' | 'assigned' | 'resolved');
      if (tab === 'open') setOpenReqs(data);
      else if (tab === 'assigned') setAssignedReqs(data);
      else setResolvedReqs(data);
    } catch { /* keep */ }
  }, []);

  useEffect(() => { loadTab('open'); loadTab('assigned'); loadTab('points'); }, [loadTab]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, loadTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTab(activeTab);
    setRefreshing(false);
  };

  const handleAccept = async (req: RescueRequest) => {
    setUpdatingId(req.id);
    try {
      await rescueApi.assignSelf(req.id);
      setPendingNav({ id: req.id, lat: req.lat, lon: req.lon, label: `Yêu cầu #${req.id}` });
      navigation.navigate('MainTabs' as never, { screen: 'Bản đồ' } as never);
    } catch {
      Alert.alert('Lỗi', 'Không thể tiếp nhận. Thử lại.');
    }
    setUpdatingId(null);
  };

  const handleResolve = async (id: number) => {
    setUpdatingId(id);
    try {
      await rescueApi.resolve(id);
      setAssignedReqs((prev) => prev.filter((r) => r.id !== id));
      await loadTab('resolved');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Không thể hoàn thành. Thử lại.';
      Alert.alert('Lỗi', msg);
    }
    setUpdatingId(null);
  };

  const handleAddPoint = async () => {
    if (!newName.trim()) { Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm sơ tán.'); return; }
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
      setNewName(''); setNewAddress(''); setNewCapacity(''); setNewProvince('');
      setShowAddPoint(false);
    } catch { Alert.alert('Lỗi', 'Không thể thêm điểm. Thử lại.'); }
    setAddingPoint(false);
  };

  const handleTogglePoint = async (point: RescuePoint) => {
    try {
      const updated = await rescueApi.updatePoint(point.id, { isActive: !point.isActive });
      setPoints((prev) => prev.map((p) => p.id === point.id ? updated : p));
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.'); }
  };

  const tabs: { key: ResponderTab; label: string; count?: number }[] = [
    { key: 'open',     label: 'Chờ xử lý', count: openReqs.length },
    { key: 'assigned', label: 'Đang xử lý', count: assignedReqs.length },
    { key: 'resolved', label: 'Hoàn thành' },
    { key: 'points',   label: 'Điểm sơ tán' },
  ];

  const renderRequests = (list: RescueRequest[]) => (
    list.length === 0
      ? <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
          Không có yêu cầu nào.
        </Text>
      : <View style={styles.listGap}>
          {list.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              currentUserId={currentUser?.id}
              onAccept={handleAccept}
              onResolve={handleResolve}
              updatingId={updatingId}
              colors={colors}
            />
          ))}
        </View>
  );

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
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
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[styles.badge, { backgroundColor: tab.key === 'open' ? colors.danger : '#F39C12' }]}>
                  <Text style={styles.badgeText}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Open requests ── */}
      {activeTab === 'open' && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {renderRequests(openReqs)}
        </ScrollView>
      )}

      {/* ── Assigned requests ── */}
      {activeTab === 'assigned' && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {renderRequests(assignedReqs)}
        </ScrollView>
      )}

      {/* ── Resolved requests (minimal) ── */}
      {activeTab === 'resolved' && (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {resolvedReqs.length === 0
            ? <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Chưa có yêu cầu nào hoàn thành.
              </Text>
            : <View style={styles.listGap}>
                {resolvedReqs.map((req) => {
                  const assignedUsers = req.assignedUsers ?? [];
                  return (
                    <View key={req.id} style={[styles.feedItem, { borderBottomColor: colors.border, opacity: 0.75 }]}>
                      <View style={styles.feedMeta}>
                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR.resolved }]} />
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '700', flex: 1 }]}>
                          Yêu cầu #{req.id} · {req.peopleCount} người
                        </Text>
                        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                          {new Date(req.updatedAt).toLocaleString('vi-VN')}
                        </Text>
                      </View>
                      {assignedUsers.length > 0 && (
                        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                          Cứu hộ: {assignedUsers.map((u) => u.name).join(', ')}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
          }
        </ScrollView>
      )}

      {/* ── Evacuation points ── */}
      {activeTab === 'points' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.pointsToolbar, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <View style={[styles.pointSearchBar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.pointSearchInput, { color: colors.text }]}
                placeholder="Tìm điểm sơ tán..."
                placeholderTextColor={colors.textSecondary}
                value={pointSearch}
                onChangeText={setPointSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <TouchableOpacity
              style={[styles.pointAddBtn, { backgroundColor: showAddPoint ? colors.primary : colors.secondary }]}
              onPress={() => setShowAddPoint((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={showAddPoint ? 'close' : 'add'} size={22} color={showAddPoint ? '#fff' : colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {showAddPoint && (
              <View style={[styles.formCard, { backgroundColor: colors.card, margin: Spacing.m, marginBottom: 0 }]}>
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

            {(() => {
              const q = pointSearch.trim().toLowerCase();
              const filtered = q
                ? points.filter((p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.address ?? '').toLowerCase().includes(q) ||
                    (p.province ?? '').toLowerCase().includes(q)
                  )
                : points;
              if (filtered.length === 0) return (
                <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.m }]}>
                  {q ? 'Không tìm thấy điểm phù hợp.' : 'Chưa có điểm sơ tán nào.'}
                </Text>
              );
              return (
                <View style={styles.listGap}>
                  {filtered.map((point) => (
                    <View key={point.id} style={[styles.pointCard, { backgroundColor: colors.card }]}>
                      <View style={[styles.pointDot, { backgroundColor: point.isActive ? '#2ECC71' : colors.border }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]}>{point.name}</Text>
                        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {point.address || point.province || 'Chưa có địa chỉ'}
                          {point.capacity ? ` · ${point.capacity} người` : ''}
                        </Text>
                      </View>
                      {point.lat !== 0 && (
                        <TouchableOpacity
                          style={styles.pointNavBtn}
                          onPress={() => openExternalNav(point.lat, point.lon)}
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
              );
            })()}
          </ScrollView>
        </View>
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
  tabBar: { borderBottomWidth: 1, flexGrow: 0 },
  tabBarContent: { paddingHorizontal: Spacing.m },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    marginRight: Spacing.l,
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
  body: { paddingBottom: Spacing.xxl },
  listGap: {},
  feedItem: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    marginBottom: Spacing.xs,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  feedActions: {
    flexDirection: 'row',
    gap: Spacing.l,
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedAction: { flexDirection: 'row', alignItems: 'center' },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resolvedCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    opacity: 0.75,
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.m },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  assigneeList: {
    marginTop: Spacing.s,
    padding: Spacing.s,
    borderRadius: 8,
    gap: 4,
  },
  assigneeRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', gap: Spacing.s, marginTop: Spacing.m },
  actionBtn: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 8,
    minWidth: 100,
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
  cardInput: { fontSize: 14, borderBottomWidth: 1, paddingVertical: Spacing.s, marginTop: Spacing.xs },
  twoCol: { flexDirection: 'row' },
  submitBtn: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
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
  photoStrip: { marginBottom: Spacing.xs },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: Spacing.s },
  pointsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  pointSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.s,
    gap: Spacing.xs,
  },
  pointSearchInput: { flex: 1, fontSize: 14 },
  pointAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
