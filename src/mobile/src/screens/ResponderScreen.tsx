import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Switch, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { rescueApi, RescuePoint, RescueRequest } from '../api/rescue';
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
  const alreadyAccepted = isAssignedToMe;
  const busy = updatingId === req.id;

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.cardAccent, { backgroundColor: STATUS_COLOR[req.status] ?? colors.border }]} />
      <View style={styles.cardInner}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <Text style={[Typography.body2, { color: colors.text, fontWeight: '700' }]}>
            YÊU CẦU #{req.id}
          </Text>
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            {req.peopleCount} người
          </Text>
        </View>

        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {req.lat.toFixed(5)}°N, {req.lon.toFixed(5)}°E
        </Text>
        {req.notes ? (
          <Text style={[Typography.caption, { color: colors.text, marginTop: Spacing.xs }]} numberOfLines={2}>
            {req.notes}
          </Text>
        ) : null}
        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {new Date(req.createdAt).toLocaleString('vi-VN')}
        </Text>

        {/* Assigned users list */}
        {assignedUsers.length > 0 && (
          <View style={[styles.assigneeList, { backgroundColor: colors.background }]}>
            <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: 2 }]}>NGƯỜI TIẾP NHẬN</Text>
            {assignedUsers.map((u) => (
              <View key={u.id} style={styles.assigneeRow}>
                <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
                <Text style={[Typography.caption, { color: colors.text, marginLeft: 4 }]}>{u.name}</Text>
                {u.id === currentUserId && (
                  <Text style={[Typography.label, { color: colors.primary, marginLeft: 4 }]}>(bạn)</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          {!alreadyAccepted && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#F39C1222' }]}
              onPress={() => onAccept(req)}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator size="small" color="#F39C12" />
                : <Text style={[Typography.label, { color: '#F39C12' }]}>TIẾP NHẬN</Text>
              }
            </TouchableOpacity>
          )}

          {isAssignedToMe && req.status !== 'resolved' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2ECC7122' }]}
              onPress={() => onResolve(req.id)}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator size="small" color="#2ECC71" />
                : <Text style={[Typography.label, { color: '#2ECC71' }]}>HOÀN THÀNH</Text>
              }
            </TouchableOpacity>
          )}
        </View>
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
                {resolvedReqs.map((req) => (
                  <View key={req.id} style={[styles.resolvedCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.cardAccent, { backgroundColor: STATUS_COLOR.resolved }]} />
                    <View style={styles.cardInner}>
                      <View style={styles.cardHeader}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]}>
                          YÊU CẦU #{req.id}
                        </Text>
                        <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                          {req.peopleCount} người
                        </Text>
                      </View>
                      {(req.assignedUsers ?? []).length > 0 && (
                        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          Cứu hộ: {(req.assignedUsers ?? []).map((u) => u.name).join(', ')}
                        </Text>
                      )}
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                        {new Date(req.updatedAt).toLocaleString('vi-VN')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
          }
        </ScrollView>
      )}

      {/* ── Evacuation points ── */}
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

          {points.length === 0
            ? <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Chưa có điểm sơ tán nào.
              </Text>
            : <View style={styles.listGap}>
                {points.map((point) => (
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
          }
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
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl, gap: Spacing.s },
  listGap: { gap: Spacing.s },
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
});
