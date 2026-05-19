import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Platform, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { PostAlertForm } from '../components/PostAlertForm';
import { rescueApi, RescueRequest, RescuePoint } from '../api/rescue';
import { useAlertStore } from '../store/useAlertStore';
import { useResponderStore } from '../store/useResponderStore';

type AuthTab = 'post' | 'requests' | 'points';
type ReqStatusFilter = 'all' | 'open' | 'assigned' | 'resolved';
type PtActiveFilter = 'all' | 'active' | 'inactive';

const STATUS_COLORS: Record<string, string> = {
  open: '#E74C3C',
  assigned: '#F39C12',
  resolved: '#2ECC71',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Chờ xử lý',
  assigned: 'Đang xử lý',
  resolved: 'Hoàn thành',
};

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

export const AuthorityScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const route = useRoute<any>();
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);
  const setPendingNav = useResponderStore((s) => s.setPendingNav);

  const [activeTab, setActiveTab] = useState<AuthTab>(
    route.params?.initialTab ?? 'post'
  );
  const [refreshing, setRefreshing] = useState(false);

  // Rescue requests
  const [requests, setRequests] = useState<RescueRequest[]>([]);
  const [reqSearch, setReqSearch] = useState('');
  const [reqStatusFilter, setReqStatusFilter] = useState<ReqStatusFilter>('all');
  const [showReqFilter, setShowReqFilter] = useState(false);
  const [reqSort, toggleReqSort] = useSort();

  // Rescue points
  const [points, setPoints] = useState<RescuePoint[]>([]);
  const [ptSearch, setPtSearch] = useState('');
  const [ptFilter, setPtFilter] = useState<PtActiveFilter>('all');
  const [showPtFilter, setShowPtFilter] = useState(false);
  const [ptSort, togglePtSort] = useSort();

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

  const loadRequests = useCallback(async () => {
    try { setRequests(await rescueApi.getAllRequests('all')); } catch { /* keep */ }
  }, []);

  const loadPoints = useCallback(async () => {
    try { setPoints(await rescueApi.getAllPoints()); } catch { /* keep */ }
  }, []);

  useEffect(() => { loadRequests(); loadPoints(); }, [loadRequests, loadPoints]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadRequests(), loadPoints()]);
    setRefreshing(false);
  };

  const handleTogglePoint = async (point: RescuePoint) => {
    try {
      const updated = await rescueApi.updatePoint(point.id, { isActive: !point.isActive });
      setPoints((prev) => prev.map((p) => p.id === point.id ? updated : p));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
  };

  const handleDeletePoint = (point: RescuePoint) => {
    Alert.alert('Xác nhận', `Xóa điểm "${point.name}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await rescueApi.deletePoint(point.id);
            setPoints((prev) => prev.filter((p) => p.id !== point.id));
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa. Thử lại.');
          }
        },
      },
    ]);
  };

  const handleNavigateToPoint = (point: RescuePoint) => {
    setPendingNav({ id: point.id, lat: point.lat, lon: point.lon, label: point.name });
    (navigation as any).navigate('MainTabs', { screen: 'Bản đồ' });
  };

  const filteredPoints = useMemo(() => {
    const q = ptSearch.trim().toLowerCase();
    const base = points.filter((p) => {
      if (ptFilter === 'active' && !p.isActive) return false;
      if (ptFilter === 'inactive' && p.isActive) return false;
      if (q) return p.name.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q);
      return true;
    });
    return sorted(base, ptSort);
  }, [points, ptSearch, ptFilter, ptSort]);

  const handleNavigateToRequest = (req: RescueRequest) => {
    setPendingNav({ id: req.id, lat: req.lat, lon: req.lon, label: `Yêu cầu #${req.id}` });
    (navigation as any).navigate('MainTabs', { screen: 'Bản đồ' });
  };

  const handleUpdateStatus = async (id: number, status: 'open' | 'assigned' | 'resolved') => {
    try {
      const updated = await rescueApi.setRequestStatus(id, status);
      setRequests((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
  };

  const filteredRequests = useMemo(() => {
    const q = reqSearch.trim().toLowerCase();
    const base = requests.filter((r) => {
      if (reqStatusFilter !== 'all' && r.status !== reqStatusFilter) return false;
      if (q) return String(r.id).includes(q) || (r.notes ?? '').toLowerCase().includes(q);
      return true;
    });
    return sorted(base, reqSort);
  }, [requests, reqSearch, reqStatusFilter, reqSort]);

  const tabs: { key: AuthTab; label: string }[] = [
    { key: 'post', label: 'Thông báo' },
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
        <Text style={[Typography.h3, { color: colors.text }]}>Quản lý cộng đồng</Text>
        <View style={[styles.roleBadge, { backgroundColor: colors.warning + '22' }]}>
          <Text style={[Typography.label, { color: colors.warning }]}>QUẢN LÝ</Text>
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
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Rescue Points ── */}
      {activeTab === 'points' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm tên hoặc địa chỉ..."
                placeholderTextColor={colors.textSecondary}
                value={ptSearch}
                onChangeText={setPtSearch}
                clearButtonMode="while-editing"
              />
              {ptSearch.length > 0 && Platform.OS === 'android' && (
                <TouchableOpacity onPress={() => setPtSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: showPtFilter ? colors.primary : colors.secondary }]}
              onPress={() => setShowPtFilter((v) => !v)}
            >
              <Ionicons name="options-outline" size={18} color={showPtFilter ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showPtFilter && (
            <View style={[styles.filterPanel, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>TRẠNG THÁI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
                {(['all', 'active', 'inactive'] as const).map((f) => {
                  const sel = ptFilter === f;
                  return (
                    <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: sel ? colors.primary : colors.secondary }]} onPress={() => setPtFilter(f)}>
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
            contentContainerStyle={styles.tableBody}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {filteredPoints.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                {ptSearch.trim() || ptFilter !== 'all' ? 'Không tìm thấy điểm phù hợp.' : 'Chưa có điểm sơ tán nào.'}
              </Text>
            ) : (
              <View style={[styles.tableCard, { backgroundColor: colors.card }]}>
                <View style={[styles.tableHeader, { backgroundColor: colors.secondary }]}>
                  <SortHdr col="name" label="TÊN ĐIỂM / ĐỊA CHỈ" s={ptSort} toggle={togglePtSort} style={styles.ptColName} />
                  <View style={styles.ptColStatus}>
                    <Text style={[Typography.label, { color: colors.textSecondary, textAlign: 'center' }]}>KÍCH HOẠT</Text>
                  </View>
                  <View style={styles.ptColNav}>
                    <Text style={[Typography.label, { color: colors.textSecondary, textAlign: 'center' }]}>CHỈ ĐƯỜNG</Text>
                  </View>
                  <View style={styles.ptColDel}>
                    <Text style={[Typography.label, { color: colors.textSecondary, textAlign: 'center' }]}>XÓA</Text>
                  </View>
                </View>

                {filteredPoints.map((point, i) => (
                  <React.Fragment key={point.id}>
                    {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.tableRow}>
                      <View style={styles.ptColName}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                          {point.name}
                        </Text>
                        {(point.address || point.province) && (
                          <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                            {[point.address, point.province].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.ptColStatus, { alignItems: 'center' }]}>
                        <Switch
                          value={point.isActive}
                          onValueChange={() => handleTogglePoint(point)}
                          trackColor={{ false: colors.border, true: '#2ECC71' }}
                          thumbColor="#fff"
                        />
                      </View>
                      <View style={[styles.ptColNav, { alignItems: 'center' }]}>
                        {point.lat !== 0 && (
                          <TouchableOpacity onPress={() => handleNavigateToPoint(point)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="navigate-outline" size={18} color="#3b82f6" />
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={[styles.ptColDel, { alignItems: 'center' }]}>
                        <TouchableOpacity onPress={() => handleDeletePoint(point)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ── Post Alert ── */}
      {activeTab === 'post' && (
        <PostAlertForm onSuccess={fetchAlerts} refreshing={refreshing} onRefresh={onRefresh} />
      )}

      {/* ── Rescue Requests ── */}
      {activeTab === 'requests' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.secondary }]}>
              <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm theo ID hoặc ghi chú..."
                placeholderTextColor={colors.textSecondary}
                value={reqSearch}
                onChangeText={setReqSearch}
                clearButtonMode="while-editing"
              />
              {reqSearch.length > 0 && Platform.OS === 'android' && (
                <TouchableOpacity onPress={() => setReqSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: showReqFilter ? colors.primary : colors.secondary }]}
              onPress={() => setShowReqFilter((v) => !v)}
            >
              <Ionicons name="options-outline" size={18} color={showReqFilter ? '#fff' : colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showReqFilter && (
            <View style={[styles.filterPanel, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: Spacing.xs }]}>TRẠNG THÁI</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
                {(['all', 'open', 'assigned', 'resolved'] as const).map((f) => {
                  const sel = reqStatusFilter === f;
                  const label = f === 'all' ? 'Tất cả' : STATUS_LABELS[f];
                  return (
                    <TouchableOpacity key={f} style={[styles.filterChip, { backgroundColor: sel ? colors.primary : colors.secondary }]} onPress={() => setReqStatusFilter(f)}>
                      <Text style={[Typography.label, { color: sel ? '#fff' : colors.textSecondary }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <ScrollView
            contentContainerStyle={styles.tableBody}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {filteredRequests.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Không có yêu cầu cứu hộ nào.
              </Text>
            ) : (
              <View style={[styles.tableCard, { backgroundColor: colors.card }]}>
                <View style={[styles.tableHeader, { backgroundColor: colors.secondary }]}>
                  <SortHdr col="id" label="YÊU CẦU / GHI CHÚ" s={reqSort} toggle={toggleReqSort} style={styles.colReqInfo} />
                  <SortHdr col="status" label="TRẠNG THÁI" s={reqSort} toggle={toggleReqSort} style={styles.colReqStatus} />
                  <View style={styles.colReqActions}>
                    <Text style={[Typography.label, { color: colors.textSecondary, textAlign: 'center' }]}>THAO TÁC</Text>
                  </View>
                </View>

                {filteredRequests.map((req, i) => (
                  <React.Fragment key={req.id}>
                    {i > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                    <View style={styles.tableRow}>
                      <View style={styles.colReqInfo}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]}>
                          #{req.id} · {req.peopleCount} người
                        </Text>
                        <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {req.lat.toFixed(4)}°N, {req.lon.toFixed(4)}°E
                        </Text>
                        {req.notes && (
                          <Text style={[Typography.caption, { color: colors.text, marginTop: 2 }]} numberOfLines={2}>
                            {req.notes}
                          </Text>
                        )}
                      </View>
                      <View style={styles.colReqStatus}>
                        <Text style={[Typography.label, { color: STATUS_COLORS[req.status] ?? '#999', fontWeight: '600' }]}>
                          {STATUS_LABELS[req.status] ?? req.status}
                        </Text>
                      </View>
                      <View style={[styles.colReqActions, { flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={styles.actionSlot}>
                          {req.status === 'open'
                            ? <TouchableOpacity onPress={() => handleUpdateStatus(req.id, 'assigned')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                <Ionicons name="hand-left-outline" size={18} color="#F39C12" />
                              </TouchableOpacity>
                            : <TouchableOpacity onPress={() => handleUpdateStatus(req.id, 'open')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                                <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                          }
                        </View>
                        <View style={styles.actionSlot}>
                          {req.status !== 'resolved' && (
                            <TouchableOpacity onPress={() => handleUpdateStatus(req.id, 'resolved')} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                              <Ionicons name="checkmark-circle-outline" size={18} color="#2ECC71" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={styles.actionSlot}>
                          <TouchableOpacity onPress={() => handleNavigateToRequest(req)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                            <Ionicons name="navigate-outline" size={18} color="#3b82f6" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </React.Fragment>
                ))}
              </View>
            )}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: Spacing.s,
    gap: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: 14 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPanel: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterOptions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  actionSlot: { width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
  tableBody: { padding: Spacing.m, paddingBottom: Spacing.xxl },
  tableCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
  },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  colReqInfo: { flex: 1 },
  colReqStatus: { width: 80, justifyContent: 'center' as const },
  colReqActions: { width: 84 },
  ptColName: { flex: 1 },
  ptColStatus: { width: 60 },
  ptColNav: { width: 44 },
  ptColDel: { width: 36 },
});
