import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { adminApi, AdminUser, AdminStats } from '../api/admin';
import { officialAlertsApi, OfficialAlert } from '../api/officialAlerts';
import { useAlertStore } from '../store/useAlertStore';

type AdminTab = 'dashboard' | 'users' | 'alerts';
type Sort = { col: string; dir: 'asc' | 'desc' } | null;

const ROLE_COLORS: Record<string, string> = {
  admin: '#8E44AD', responder: '#F39C12', user: '#5C6470',
};
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', responder: 'Cứu hộ', user: 'Người dùng',
};
const ROLES = ['user', 'responder', 'admin'] as const;


// ── helpers ───────────────────────────────────────────────────────────────────

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

function useSort(): [Sort, (col: string) => void] {
  const [s, setS] = useState<Sort>(null);
  const toggle = (col: string) =>
    setS((prev) =>
      prev?.col === col
        ? prev.dir === 'asc' ? { col, dir: 'desc' } : null
        : { col, dir: 'asc' }
    );
  return [s, toggle];
}

// ── User Detail Modal ─────────────────────────────────────────────────────────

interface UserDetailModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onRoleChange: (user: AdminUser, role: string) => Promise<void>;
  onDelete: (user: AdminUser) => void;
  colors: ReturnType<typeof import('../theme/useTheme').useTheme>['colors'];
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onRoleChange, onDelete, colors }) => {
  const insets = useSafeAreaInsets();
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  if (!user) return null;

  const handleRoleChange = (role: string) => {
    setShowRoleDropdown(false);
    Alert.alert(
      'Xác nhận thay đổi quyền',
      `Đổi quyền "${user.name || user.email}" sang "${ROLE_LABELS[role]}"?`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setChangingRole(role);
            await onRoleChange(user, role);
            setChangingRole(null);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[dStyles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[dStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={dStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>Chi tiết người dùng</Text>
          <View style={{ width: 32 }} />
        </View>
        <ScrollView contentContainerStyle={dStyles.body} showsVerticalScrollIndicator={false}>
          <View style={dStyles.avatarWrap}>
            <View style={[dStyles.avatarLarge, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
              <Text style={[Typography.h1, { color: ROLE_COLORS[user.role] }]}>
                {(user.name || user.email)[0].toUpperCase()}
              </Text>
            </View>
            <Text style={[Typography.body2, { color: ROLE_COLORS[user.role], fontWeight: '700' }]}>
              {ROLE_LABELS[user.role]}
            </Text>
          </View>

          <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: Spacing.s }]}>THÔNG TIN</Text>
          <View style={[dStyles.infoCard, { backgroundColor: colors.card }]}>
            {[
              { label: 'TÊN', value: user.name || '(Chưa đặt tên)' },
              { label: 'EMAIL', value: user.email },
              { label: 'TỈNH / TP', value: user.province || 'Chưa cập nhật' },
              { label: 'NGÀY TẠO', value: new Date(user.createdAt).toLocaleDateString('vi-VN') },
              { label: 'ID', value: `#${user.id}` },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={dStyles.infoRow}>
                  <Text style={[Typography.label, { color: colors.textSecondary, width: 90 }]}>{row.label}</Text>
                  <Text style={[Typography.body2, { color: colors.text, flex: 1 }]} numberOfLines={1}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={[dStyles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>

          <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.l, marginBottom: Spacing.s }]}>
            ĐỔI QUYỀN
          </Text>

          {/* Role selector */}
          <TouchableOpacity
            style={[dStyles.roleSelector, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowRoleDropdown((v) => !v)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s }}>
              <View style={[dStyles.roleColorDot, { backgroundColor: ROLE_COLORS[user.role] }]} />
              <Text style={[Typography.body1, { color: colors.text }]}>{ROLE_LABELS[user.role]}</Text>
            </View>
            <Ionicons
              name={showRoleDropdown ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {showRoleDropdown && (
            <View style={[dStyles.roleDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {ROLES.map((role, i) => {
                const isCurrent = role === user.role;
                const isChanging = changingRole === role;
                return (
                  <React.Fragment key={role}>
                    {i > 0 && <View style={[dStyles.roleOptionDivider, { backgroundColor: colors.border }]} />}
                    <TouchableOpacity
                      style={dStyles.roleOption}
                      onPress={() => !isCurrent && handleRoleChange(role)}
                      disabled={isCurrent || changingRole !== null}
                      activeOpacity={isCurrent ? 1 : 0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.m, flex: 1 }}>
                        <View style={[dStyles.roleColorDot, { backgroundColor: ROLE_COLORS[role] }]} />
                        <Text style={[Typography.body1, {
                          color: isCurrent ? ROLE_COLORS[role] : colors.text,
                          fontWeight: isCurrent ? '700' : '400',
                        }]}>
                          {ROLE_LABELS[role]}
                        </Text>
                      </View>
                      {isChanging
                        ? <ActivityIndicator size="small" color={ROLE_COLORS[role]} />
                        : isCurrent
                          ? <Ionicons name="checkmark" size={18} color={ROLE_COLORS[role]} />
                          : null}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[dStyles.deleteBtn, { borderColor: colors.danger }]}
            onPress={() => onDelete(user)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[Typography.button, { color: colors.danger, marginLeft: Spacing.s }]}>XOÁ TÀI KHOẢN</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
};

const dStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.m, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: Spacing.xs },
  body: { padding: Spacing.l, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  avatarWrap: { alignItems: 'center', marginBottom: Spacing.l, gap: Spacing.s },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  infoCard: { borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.m, paddingVertical: Spacing.m, gap: Spacing.m },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  roleSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.m,
    borderRadius: 10, borderWidth: 1,
  },
  roleColorDot: { width: 10, height: 10, borderRadius: 5 },
  roleDropdown: {
    borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginTop: Spacing.xs,
  },
  roleOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.m,
  },
  roleOptionDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: 10, borderWidth: 1.5, marginTop: Spacing.l },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export const AdminScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Users
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, toggleUserSort] = useSort();
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userProvinceFilter, setUserProvinceFilter] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<OfficialAlert[]>([]);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertSort, toggleAlertSort] = useSort();
  const [showAlertFilter, setShowAlertFilter] = useState(false);
  const [alertUrgency, setAlertUrgency] = useState('all');
  const [alertProvince, setAlertProvince] = useState('');

  const loadDashboard = useCallback(async () => {
    try { setStats(await adminApi.getStats()); } catch { /* show empty */ }
  }, []);

  const loadUsers = useCallback(async (q = userSearch) => {
    setLoadingUsers(true);
    try { setUsers(await adminApi.getUsers(q || undefined)); } catch { /* keep */ }
    setLoadingUsers(false);
  }, [userSearch]);

  const loadAlerts = useCallback(async () => {
    try { setAlerts(await officialAlertsApi.getAll()); } catch { /* keep */ }
  }, []);

  useEffect(() => {
    loadDashboard(); loadUsers(''); loadAlerts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadUsers(userSearch), loadAlerts()]);
    setRefreshing(false);
  };

  // ── CRUD handlers ────────────────────────────────────────────────────────────

  const handleRoleChange = async (user: AdminUser, role: string) => {
    try {
      await adminApi.updateRole(user.id, role as any);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
    } catch { Alert.alert('Lỗi', 'Không thể cập nhật quyền.'); }
  };

  const handleDeleteUser = (user: AdminUser) => {
    Alert.alert('Xoá tài khoản', `Xoá "${user.email}"? Không thể hoàn tác.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await adminApi.deleteUser(user.id);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            setSelectedUser(null);
          } catch { Alert.alert('Lỗi', 'Không thể xoá.'); }
        },
      },
    ]);
  };

  const handleDeleteAlert = (id: number) => {
    Alert.alert('Xoá thông báo', 'Thông báo sẽ bị ẩn với người dùng.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await officialAlertsApi.remove(id);
            setAlerts((prev) => prev.filter((a) => a.id !== id));
            fetchAlerts();
          } catch { Alert.alert('Lỗi', 'Không thể xoá.'); }
        },
      },
    ]);
  };

  // ── Filtered + sorted data ───────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    let d = users;
    if (userRoleFilter !== 'all') d = d.filter((u) => u.role === userRoleFilter);
    if (userProvinceFilter.trim()) {
      const q = userProvinceFilter.toLowerCase();
      d = d.filter((u) => (u.province ?? '').toLowerCase().includes(q));
    }
    return sorted(d, userSort);
  }, [users, userRoleFilter, userProvinceFilter, userSort]);

  const filteredAlerts = useMemo(() => {
    let d = alerts;
    if (alertUrgency === 'urgent') d = d.filter((a) => a.isUrgent);
    if (alertUrgency === 'normal') d = d.filter((a) => !a.isUrgent);
    if (alertProvince.trim()) {
      const q = alertProvince.toLowerCase();
      d = d.filter((a) => (a.province ?? '').toLowerCase().includes(q));
    }
    if (alertSearch.trim()) {
      const q = alertSearch.toLowerCase();
      d = d.filter((a) => a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q));
    }
    return sorted(d, alertSort);
  }, [alerts, alertUrgency, alertProvince, alertSearch, alertSort]);

  // ── Sub-components ───────────────────────────────────────────────────────────

  const SortHdr = ({ col, label, s, toggle }: { col: string; label: string; s: Sort; toggle: (c: string) => void }) => (
    <TouchableOpacity style={styles.sortHdr} onPress={() => toggle(col)}>
      <Text style={[Typography.label, { color: s?.col === col ? colors.primary : colors.textSecondary }]}>
        {label}
      </Text>
      <Ionicons
        name={s?.col !== col ? 'swap-vertical-outline' : s.dir === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={10}
        color={s?.col === col ? colors.primary : colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const Toolbar = ({
    search, onSearch, placeholder,
    showFilter, onToggleFilter, onAdd,
  }: {
    search: string; onSearch: (v: string) => void; placeholder: string;
    showFilter: boolean; onToggleFilter: () => void; onAdd?: () => void;
  }) => (
    <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.secondary }]}>
        <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={onSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: showFilter ? colors.primary + '22' : 'transparent' }]}
        onPress={onToggleFilter}
      >
        <Ionicons name="options-outline" size={20} color={showFilter ? colors.primary : colors.textSecondary} />
      </TouchableOpacity>
      {onAdd && (
        <TouchableOpacity style={[styles.iconBtn, { backgroundColor: colors.primary }]} onPress={onAdd}>
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number | null; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[Typography.h2, { color: colors.text, marginTop: Spacing.s }]}>{value ?? '—'}</Text>
      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'dashboard', label: 'Tổng quan' },
    { key: 'users', label: 'Người dùng' },
    { key: 'alerts', label: 'Thông báo' },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>Quản trị hệ thống</Text>
        <View style={[styles.roleBadge, { backgroundColor: '#8E44AD18' }]}>
          <Text style={[Typography.label, { color: '#8E44AD' }]}>ADMIN</Text>
        </View>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
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

      {/* ── Dashboard ── */}
      {activeTab === 'dashboard' && (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={styles.statGrid}>
            <View style={styles.statRow}>
              <StatCard icon="people" label="Người dùng" value={stats?.totalUsers ?? null} color={colors.primary} />
              <StatCard icon="alert-circle" label="Yêu cầu cứu hộ" value={stats?.activeRescueRequests ?? null} color={colors.danger} />
            </View>
            <View style={styles.statRow}>
              <StatCard icon="analytics" label="Dự báo hôm nay" value={stats?.predictionsToday ?? null} color="#2ECC71" />
              <StatCard icon="notifications" label="Thông báo" value={stats?.activeAlerts ?? null} color="#F39C12" />
            </View>
          </View>
          <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.s }]}>THAO TÁC NHANH</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Authority')} activeOpacity={0.7}>
              <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
              <Text style={[Typography.body1, { color: colors.text, flex: 1, marginLeft: Spacing.m }]}>
                Đăng thông báo
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity style={styles.actionRow} onPress={() => setActiveTab('users')} activeOpacity={0.7}>
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={[Typography.body1, { color: colors.text, flex: 1, marginLeft: Spacing.m }]}>
                Quản lý người dùng
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Users ── */}
      {activeTab === 'users' && (
        <View style={{ flex: 1 }}>
          <Toolbar
            search={userSearch} onSearch={setUserSearch} placeholder="Tìm tên, email..."
            showFilter={showUserFilter} onToggleFilter={() => setShowUserFilter((v) => !v)}
          />
          {showUserFilter && (
            <View style={[styles.filterPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.filterRow}>
                <Text style={[Typography.label, { color: colors.textSecondary, width: 60 }]}>QUYỀN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.filterOptions}>
                  {['all', 'user', 'responder', 'admin'].map((v) => {
                    const sel = userRoleFilter === v;
                    return (
                      <TouchableOpacity key={v} style={[styles.filterChip, { backgroundColor: sel ? colors.primary : colors.secondary }]} onPress={() => setUserRoleFilter(v)}>
                        <Text style={[Typography.label, { color: sel ? '#fff' : colors.textSecondary }]}>
                          {v === 'all' ? 'Tất cả' : ROLE_LABELS[v]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.filterRow}>
                <Text style={[Typography.label, { color: colors.textSecondary, width: 60 }]}>TỈNH</Text>
                <TextInput
                  style={[styles.filterInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="Lọc theo tỉnh..."
                  placeholderTextColor={colors.textSecondary}
                  value={userProvinceFilter}
                  onChangeText={setUserProvinceFilter}
                />
              </View>
            </View>
          )}
          <ScrollView
            contentContainerStyle={styles.tableBody}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {loadingUsers
              ? <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
              : filteredUsers.length === 0
                ? <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>Không tìm thấy người dùng.</Text>
                : (
                  <View style={[styles.tableCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.tableHeader, { backgroundColor: colors.secondary }]}>
                      <View style={styles.colUser}><SortHdr col="name" label="TÊN / EMAIL" s={userSort} toggle={toggleUserSort} /></View>
                      <View style={styles.colProvince}><SortHdr col="province" label="TỈNH/TP" s={userSort} toggle={toggleUserSort} /></View>
                      <View style={styles.colRole}><SortHdr col="role" label="QUYỀN" s={userSort} toggle={toggleUserSort} /></View>
                    </View>
                    {filteredUsers.map((user, i) => (
                      <React.Fragment key={user.id}>
                        {i > 0 && <View style={[styles.rowDiv, { backgroundColor: colors.border }]} />}
                        <TouchableOpacity style={styles.tableRow} onPress={() => setSelectedUser(user)} activeOpacity={0.7}>
                          <View style={styles.colUser}>
                            <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                              {user.name || '(Chưa đặt tên)'}
                            </Text>
                            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                              {user.email}
                            </Text>
                          </View>
                          <View style={styles.colProvince}>
                            <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                              {user.province || '—'}
                            </Text>
                          </View>
                          <View style={styles.colRole}>
                            <Text style={[Typography.body2, { color: ROLE_COLORS[user.role], fontWeight: '600' }]}>
                              {ROLE_LABELS[user.role]}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      </React.Fragment>
                    ))}
                  </View>
                )
            }
          </ScrollView>
        </View>
      )}

      {/* ── Alerts ── */}
      {activeTab === 'alerts' && (
        <View style={{ flex: 1 }}>
          <Toolbar
            search={alertSearch} onSearch={setAlertSearch} placeholder="Tìm tiêu đề, nội dung..."
            showFilter={showAlertFilter} onToggleFilter={() => setShowAlertFilter((v) => !v)}
            onAdd={() => navigation.navigate('Authority')}
          />
          {showAlertFilter && (
            <View style={[styles.filterPanel, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={styles.filterRow}>
                <Text style={[Typography.label, { color: colors.textSecondary, width: 60 }]}>ƯU TIÊN</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.filterOptions}>
                  {[['all', 'Tất cả'], ['urgent', 'Khẩn'], ['normal', 'Thường']].map(([v, l]) => {
                    const sel = alertUrgency === v;
                    return (
                      <TouchableOpacity key={v} style={[styles.filterChip, { backgroundColor: sel ? colors.primary : colors.secondary }]} onPress={() => setAlertUrgency(v)}>
                        <Text style={[Typography.label, { color: sel ? '#fff' : colors.textSecondary }]}>{l}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <View style={styles.filterRow}>
                <Text style={[Typography.label, { color: colors.textSecondary, width: 60 }]}>TỈNH</Text>
                <TextInput
                  style={[styles.filterInput, { color: colors.text, borderBottomColor: colors.border }]}
                  placeholder="Lọc theo tỉnh..."
                  placeholderTextColor={colors.textSecondary}
                  value={alertProvince}
                  onChangeText={setAlertProvince}
                />
              </View>
            </View>
          )}
          <ScrollView
            contentContainerStyle={styles.tableBody}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {filteredAlerts.length === 0
              ? <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>Chưa có thông báo nào.</Text>
              : (
                <View style={[styles.tableCard, { backgroundColor: colors.card }]}>
                  <View style={[styles.tableHeader, { backgroundColor: colors.secondary }]}>
                    <View style={styles.colAlertTitle}><SortHdr col="title" label="TIÊU ĐỀ" s={alertSort} toggle={toggleAlertSort} /></View>
                    <View style={styles.colAlertProvince}><SortHdr col="province" label="TỈNH" s={alertSort} toggle={toggleAlertSort} /></View>
                    <View style={styles.colAlertDate}><SortHdr col="createdAt" label="NGÀY" s={alertSort} toggle={toggleAlertSort} /></View>
                    <View style={{ width: 32 }} />
                  </View>
                  {filteredAlerts.map((alert, i) => (
                    <React.Fragment key={alert.id}>
                      {i > 0 && <View style={[styles.rowDiv, { backgroundColor: colors.border }]} />}
                      <View style={styles.tableRow}>
                        <View style={styles.colAlertTitle}>
                          <Text style={[Typography.body2, { color: alert.isUrgent ? colors.danger : colors.text, fontWeight: alert.isUrgent ? '700' : '400' }]} numberOfLines={1}>{alert.title}</Text>
                        </View>
                        <View style={styles.colAlertProvince}>
                          <Text style={[Typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                            {alert.province || 'Toàn quốc'}
                          </Text>
                        </View>
                        <View style={styles.colAlertDate}>
                          <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                            {new Date(alert.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={{ width: 32, alignItems: 'center' }}
                          onPress={() => handleDeleteAlert(alert.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              )
            }
          </ScrollView>
        </View>
      )}

      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onRoleChange={handleRoleChange}
        onDelete={handleDeleteUser}
        colors={colors}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.s,
  },
  backBtn: { padding: Spacing.xs },
  roleBadge: { paddingHorizontal: Spacing.s, paddingVertical: 3, borderRadius: 6 },
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl, gap: Spacing.s },
  // Dashboard
  statGrid: { gap: Spacing.s, marginBottom: Spacing.s },
  statRow: { flexDirection: 'row', gap: Spacing.s },
  statCard: { flex: 1, padding: Spacing.m, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.m },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  // Toolbar
  toolbar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.s,
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    height: 40, borderRadius: 10, paddingHorizontal: Spacing.s, gap: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: 14 },
  iconBtn: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  // Filter panel
  filterPanel: {
    paddingHorizontal: Spacing.m, paddingVertical: Spacing.s,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.s,
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  filterOptions: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  filterInput: { flex: 1, fontSize: 13, borderBottomWidth: 1, paddingVertical: 3 },
  actionSlot: { width: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
  // Table
  tableBody: { padding: Spacing.m, paddingBottom: Spacing.xxl },
  tableCard: { borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.m, paddingVertical: Spacing.s },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.m, paddingVertical: Spacing.m },
  rowDiv: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  sortHdr: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  // Users columns
  colUser: { flex: 1 },
  colProvince: { width: 88 },
  colRole: { width: 64 },
  // Alerts columns
  colAlertTitle: { flex: 1 },
  colAlertProvince: { width: 72 },
  colAlertDate: { width: 44 },

});
