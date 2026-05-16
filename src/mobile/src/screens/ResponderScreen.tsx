import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { GlobalStyles } from '../theme/globalStyles';
import { PostAlertForm } from '../components/PostAlertForm';
import { API_URL } from '../api/client';
import { useResponderStore } from '../store/useResponderStore';
import { useAuthStore } from '../store/useAuthStore';
import { useAlertStore } from '../store/useAlertStore';
import { PointFormModal, PointFormData } from '../components/PointFormModal';

type ResponderTab = 'open' | 'assigned' | 'resolved' | 'points' | 'alerts';
type PointFilter = 'all' | 'active' | 'inactive';

type Sort = { col: string; dir: 'asc' | 'desc' } | null;

function useSort(): [Sort, (col: string) => void] {
  const [s, setS] = useState<Sort>(null);
  const toggle = (col: string) =>
    setS((prev) =>
      prev?.col !== col ? { col, dir: 'asc' }
      : prev.dir === 'asc' ? { col, dir: 'desc' }
      : null
    );
  return [s, toggle];
}

function sorted<T extends Record<string, any>>(data: T[], s: Sort): T[] {
  if (!s) return data;
  return [...data].sort((a, b) => {
    const av = a[s.col] ?? '';
    const bv = b[s.col] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), 'vi');
    return s.dir === 'asc' ? cmp : -cmp;
  });
}

const STATUS_COLOR: Record<string, string> = {
  open: '#E74C3C',
  assigned: '#F39C12',
  resolved: '#2ECC71',
};

const STATUS_LABEL: Record<string, string> = {
  open: 'Chờ xử lý',
  assigned: 'Đang xử lý',
  resolved: 'Hoàn thành',
};

function openExternalNav(lat: number, lon: number) {
  const url = Platform.OS === 'ios'
    ? `maps://app?daddr=${lat},${lon}`
    : `geo:${lat},${lon}?q=${lat},${lon}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`)
  );
}

// ── Request card ──────────────────────────────────────────────────────────────

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

  const accentColor = STATUS_COLOR[req.status] ?? colors.border;

  return (
    <View style={[styles.reqCard, { backgroundColor: colors.card }]}>
      <View style={[styles.reqAccent, { backgroundColor: accentColor }]} />
      <View style={styles.reqInner}>
        <View style={styles.reqHeader}>
          <Text style={[Typography.body2, { color: colors.text, fontWeight: '700', flex: 1 }]}>
            Yêu cầu #{req.id} · {req.peopleCount} người
          </Text>
          <Text style={[Typography.label, { color: accentColor, fontWeight: '600' }]}>
            {STATUS_LABEL[req.status] ?? req.status}
          </Text>
        </View>

        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.s }]}>
          {timeAgo}
        </Text>

        {req.notes ? (
          <Text style={[Typography.body1, { color: colors.text, marginBottom: Spacing.s }]} numberOfLines={3}>
            {req.notes}
          </Text>
        ) : null}

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
            {req.lat.toFixed(5)}°N, {req.lon.toFixed(5)}°E
          </Text>
        </View>

        {(req.photos ?? []).length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
            {(req.photos ?? []).map((p, i) => (
              <Image key={i} source={{ uri: `${API_URL}${p}` }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        )}

        {assignedUsers.length > 0 && (
          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
            Tiếp nhận bởi{' '}
            {assignedUsers.map((u, i) => (
              <Text key={u.id} style={{ color: u.id === currentUserId ? colors.primary : colors.text, fontWeight: '600' }}>
                {u.name + (i < assignedUsers.length - 1 ? ', ' : '')}
              </Text>
            ))}
          </Text>
        )}

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
    </View>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────

export const ResponderScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const setPendingNav = useResponderStore((s) => s.setPendingNav);
  const currentUser = useAuthStore((s) => s.user);
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);

  const [activeTab, setActiveTab] = useState<ResponderTab>('open');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [openReqs, setOpenReqs] = useState<RescueRequest[]>([]);
  const [assignedReqs, setAssignedReqs] = useState<RescueRequest[]>([]);
  const [resolvedReqs, setResolvedReqs] = useState<RescueRequest[]>([]);

  // Points
  const [points, setPoints] = useState<RescuePoint[]>([]);
  const [pointSearch, setPointSearch] = useState('');
  const [pointFilter, setPointFilter] = useState<PointFilter>('all');
  const [showPointFilter, setShowPointFilter] = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [pointSort, togglePointSort] = useSort();


  const SortHdr = ({ col, label, s, toggle, style }: {
    col: string; label: string; s: Sort; toggle: (c: string) => void; style?: any;
  }) => (
    <TouchableOpacity
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 2 }, style]}
      onPress={() => toggle(col)}
    >
      <Text style={[
        Typography.label,
        { color: s?.col === col ? colors.primary : colors.textSecondary, fontWeight: s?.col === col ? '700' : '400' },
      ]}>
        {label}
      </Text>
      <Ionicons
        name={s?.col !== col ? 'swap-vertical-outline' : s.dir === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={11}
        color={s?.col === col ? colors.primary : colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const loadTab = useCallback(async (tab: ResponderTab) => {
    if (tab === 'points') {
      try { setPoints(await rescueApi.getAllPoints()); } catch { /* keep */ }
      return;
    }
    if (tab === 'alerts') return;
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
      (navigation as any).navigate('MainTabs', { screen: 'Bản đồ' });
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

  const handleAddPoint = async (data: PointFormData) => {
    const point = await rescueApi.createPoint(data);
    setPoints((prev) => [point, ...prev]);
    setShowPointModal(false);
  };

  const handleTogglePoint = async (point: RescuePoint) => {
    try {
      const updated = await rescueApi.updatePoint(point.id, { isActive: !point.isActive });
      setPoints((prev) => prev.map((p) => p.id === point.id ? updated : p));
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.'); }
  };

  const filteredPoints = useMemo(() => {
    const q = pointSearch.trim().toLowerCase();
    const base = points.filter((p) => {
      if (pointFilter === 'active' && !p.isActive) return false;
      if (pointFilter === 'inactive' && p.isActive) return false;
      if (q) return p.name.toLowerCase().includes(q) ||
        (p.address ?? '').toLowerCase().includes(q) ||
        (p.province ?? '').toLowerCase().includes(q);
      return true;
    });
    return sorted(base, pointSort);
  }, [points, pointSearch, pointFilter, pointSort]);

  const tabs: { key: ResponderTab; label: string; count?: number }[] = [
    { key: 'open',     label: 'Chờ xử lý', count: openReqs.length },
    { key: 'assigned', label: 'Đang xử lý', count: assignedReqs.length },
    { key: 'resolved', label: 'Hoàn thành' },
    { key: 'points',   label: 'Điểm sơ tán' },
    { key: 'alerts',   label: 'Thông báo' },
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
        style={[GlobalStyles.screenTabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={GlobalStyles.screenTabBarContent}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[GlobalStyles.screenTab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
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

      {/* ── Resolved requests ── */}
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
                    <View key={req.id} style={[styles.reqCard, { backgroundColor: colors.card, opacity: 0.72 }]}>
                      <View style={[styles.reqAccent, { backgroundColor: STATUS_COLOR.resolved }]} />
                      <View style={styles.reqInner}>
                        <View style={styles.reqHeader}>
                          <Text style={[Typography.body2, { color: colors.text, fontWeight: '700', flex: 1 }]}>
                            Yêu cầu #{req.id} · {req.peopleCount} người
                          </Text>
                          <Text style={[Typography.label, { color: STATUS_COLOR.resolved, fontWeight: '600' }]}>
                            Hoàn thành
                          </Text>
                        </View>
                        <Text style={[Typography.caption, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>
                          {new Date(req.updatedAt).toLocaleString('vi-VN')}
                        </Text>
                        {assignedUsers.length > 0 && (
                          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                            Cứu hộ: {assignedUsers.map((u) => u.name).join(', ')}
                          </Text>
                        )}
                      </View>
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
          <View style={[styles.pointsToolbar, { borderBottomColor: colors.border }]}>
            <View style={[styles.pointSearchBar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.pointSearchInput, { color: colors.text }]}
                placeholder="Tìm điểm sơ tán..."
                placeholderTextColor={colors.textSecondary}
                value={pointSearch}
                onChangeText={setPointSearch}
                clearButtonMode="while-editing"
              />
              {pointSearch.length > 0 && Platform.OS === 'android' && (
                <TouchableOpacity onPress={() => setPointSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.pointIconBtn, { backgroundColor: showPointFilter ? colors.primary : colors.secondary }]}
              onPress={() => setShowPointFilter((v) => !v)}
            >
              <Ionicons name="options-outline" size={18} color={showPointFilter ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pointIconBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowPointModal(true)}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {showPointFilter && (
            <View style={[styles.filterPanel, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>TRẠNG THÁI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
                {(['all', 'active', 'inactive'] as const).map((f) => {
                  const sel = pointFilter === f;
                  return (
                    <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: sel ? colors.primary : colors.secondary }]} onPress={() => setPointFilter(f)}>
                      <Text style={[Typography.label, { color: sel ? '#fff' : colors.textSecondary }]}>
                        {f === 'all' ? 'Tất cả' : f === 'active' ? 'Hoạt động' : 'Ngưng'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.ptTableBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {filteredPoints.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                {pointSearch.trim() || pointFilter !== 'all' ? 'Không tìm thấy điểm phù hợp.' : 'Chưa có điểm sơ tán nào.'}
              </Text>
            ) : (
              <View style={[styles.ptTableCard, { backgroundColor: colors.card }]}>
                <View style={[styles.ptTableHeader, { backgroundColor: colors.secondary }]}>
                  <SortHdr col="name" label="TÊN ĐIỂM / ĐỊA CHỈ" s={pointSort} toggle={togglePointSort} style={styles.ptColName} />
                  <SortHdr col="capacity" label="SỨC CHỨA" s={pointSort} toggle={togglePointSort} style={styles.ptColCap} />
                  <View style={styles.ptColStatus}>
                    <Text style={[Typography.label, { color: colors.textSecondary, textAlign: 'center' }]}>KÍCH HOẠT</Text>
                  </View>
                </View>
                {filteredPoints.map((point, i) => (
                  <React.Fragment key={point.id}>
                    {i > 0 && <View style={[styles.ptRowDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.ptTableRow}>
                      <View style={styles.ptColName}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[Typography.body2, { color: colors.text, fontWeight: '600', flex: 1 }]} numberOfLines={1}>
                            {point.name}
                          </Text>
                          {point.lat !== 0 && (
                            <TouchableOpacity
                              onPress={() => openExternalNav(point.lat, point.lon)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            >
                              <Ionicons name="navigate-outline" size={14} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                        {(point.address || point.province) && (
                          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                            {[point.address, point.province].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                      <View style={styles.ptColCap}>
                        <Text style={[Typography.body2, { color: colors.text, textAlign: 'center' }]}>
                          {point.capacity || '—'}
                        </Text>
                      </View>
                      <View style={[styles.ptColStatus, { alignItems: 'center' }]}>
                        <Switch
                          value={point.isActive}
                          onValueChange={() => handleTogglePoint(point)}
                          trackColor={{ false: colors.border, true: '#2ECC71' }}
                          thumbColor="#fff"
                        />
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}
          </ScrollView>

          <PointFormModal
            visible={showPointModal}
            onClose={() => setShowPointModal(false)}
            onSubmit={handleAddPoint}
            colors={colors}
          />
        </View>
      )}

      {/* ── Post Alert ── */}
      {activeTab === 'alerts' && (
        <PostAlertForm onSuccess={fetchAlerts} refreshing={refreshing} onRefresh={onRefresh} />
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
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { paddingTop: Spacing.m, paddingBottom: Spacing.xxl },
  listGap: { gap: Spacing.m },
  reqCard: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  reqAccent: { width: 5 },
  reqInner: { flex: 1, padding: Spacing.m },
  reqHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s, marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: Spacing.xs },
  feedActions: {
    flexDirection: 'row',
    gap: Spacing.l,
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feedAction: { flexDirection: 'row', alignItems: 'center' },
  photoStrip: { marginBottom: Spacing.xs },
  photoThumb: { width: 80, height: 80, borderRadius: 8, marginRight: Spacing.s },
  // Points tab toolbar
  pointsToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  pointIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Filter panel
  filterPanel: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterOptions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  // Points table
  ptTableBody: { padding: Spacing.m, paddingBottom: Spacing.xxl },
  ptTableCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  ptTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  ptTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
  },
  ptRowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  ptColName: { flex: 1 },
  ptColCap: { width: 52 },
  ptColStatus: { width: 60 },
});
