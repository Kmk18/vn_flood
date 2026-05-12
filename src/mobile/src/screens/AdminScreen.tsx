import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { adminApi, AdminUser, AdminStats } from '../api/admin';
import { officialAlertsApi, OfficialAlert } from '../api/officialAlerts';
import { useAlertStore } from '../store/useAlertStore';

type AdminTab = 'dashboard' | 'users' | 'alerts';

const ROLE_COLORS: Record<string, string> = {
  admin: '#8E44AD',
  responder: '#F39C12',
  user: '#5C6470',
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  responder: 'Cứu hộ',
  user: 'Người dùng',
};

const ROLES = ['user', 'responder', 'admin'] as const;

// ── User Detail Modal ─────────────────────────────────────────────────────────

interface UserDetailModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onRoleChange: (user: AdminUser, role: string) => Promise<void>;
  onDelete: (user: AdminUser) => void;
  colors: ReturnType<typeof import('../theme/useTheme').useTheme>['colors'];
}

const UserDetailModal: React.FC<UserDetailModalProps> = ({ user, onClose, onRoleChange, onDelete, colors }) => {
  const [changingRole, setChangingRole] = useState<string | null>(null);

  if (!user) return null;

  const handleRoleChange = (role: string) => {
    Alert.alert(
      'Xác nhận thay đổi quyền',
      `Đổi quyền của ${user.name || user.email} từ "${ROLE_LABELS[user.role]}" thành "${ROLE_LABELS[role]}"?`,
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
      <View style={[detailStyles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[detailStyles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={detailStyles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[Typography.h3, { color: colors.text }]}>Chi tiết người dùng</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={detailStyles.body} showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={detailStyles.avatarWrap}>
            <View style={[detailStyles.avatarLarge, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
              <Text style={[Typography.h1, { color: ROLE_COLORS[user.role] }]}>
                {(user.name || user.email)[0].toUpperCase()}
              </Text>
            </View>
            <View style={[detailStyles.roleBadgeLarge, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
              <Text style={[Typography.label, { color: ROLE_COLORS[user.role] }]}>
                {ROLE_LABELS[user.role]}
              </Text>
            </View>
          </View>

          {/* Info card */}
          <Text style={[Typography.label, { color: colors.textSecondary, marginBottom: Spacing.s }]}>THÔNG TIN</Text>
          <View style={[detailStyles.infoCard, { backgroundColor: colors.card }]}>
            {[
              { label: 'TÊN', value: user.name || '(Chưa đặt tên)' },
              { label: 'EMAIL', value: user.email },
              { label: 'TỈNH / TP', value: user.province || 'Chưa cập nhật' },
              { label: 'NGÀY TẠO', value: new Date(user.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
              { label: 'ID', value: `#${user.id}` },
            ].map((row, i, arr) => (
              <React.Fragment key={row.label}>
                <View style={detailStyles.infoRow}>
                  <Text style={[Typography.label, { color: colors.textSecondary, width: 90 }]}>{row.label}</Text>
                  <Text style={[Typography.body2, { color: colors.text, flex: 1 }]} numberOfLines={1}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={[detailStyles.divider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>

          {/* Role change */}
          <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.l, marginBottom: Spacing.s }]}>
            ĐỔI QUYỀN
          </Text>
          <View style={detailStyles.roleRow}>
            {ROLES.filter((r) => r !== user.role).map((role) => (
              <TouchableOpacity
                key={role}
                style={[detailStyles.roleBtn, { borderColor: ROLE_COLORS[role], backgroundColor: ROLE_COLORS[role] + '12' }]}
                onPress={() => handleRoleChange(role)}
                disabled={changingRole !== null}
                activeOpacity={0.8}
              >
                {changingRole === role
                  ? <ActivityIndicator size="small" color={ROLE_COLORS[role]} />
                  : <Text style={[Typography.button, { color: ROLE_COLORS[role] }]}>{ROLE_LABELS[role].toUpperCase()}</Text>
                }
              </TouchableOpacity>
            ))}
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={[detailStyles.deleteBtn, { borderColor: colors.danger }]}
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

const detailStyles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: { padding: Spacing.xs },
  body: { padding: Spacing.l, paddingBottom: Spacing.xxl, gap: Spacing.xs },
  avatarWrap: { alignItems: 'center', marginBottom: Spacing.l, gap: Spacing.m },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadgeLarge: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    gap: Spacing.m,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  roleRow: { flexDirection: 'row', gap: Spacing.s },
  roleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: Spacing.l,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export const AdminScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [officialAlerts, setOfficialAlerts] = useState<OfficialAlert[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const loadDashboard = useCallback(async () => {
    try { setStats(await adminApi.getStats()); } catch { /* show empty */ }
  }, []);

  const loadUsers = useCallback(async (q = search) => {
    setLoading(true);
    try { setUsers(await adminApi.getUsers(q || undefined)); } catch { /* keep */ }
    setLoading(false);
  }, [search]);

  const loadAlerts = useCallback(async () => {
    try { setOfficialAlerts(await officialAlertsApi.getAll()); } catch { /* keep */ }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadUsers('');
    loadAlerts();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadUsers(search), loadAlerts()]);
    setRefreshing(false);
  };

  const handleRoleChange = async (user: AdminUser, role: string) => {
    try {
      await adminApi.updateRole(user.id, role as any);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật quyền. Thử lại.');
    }
  };

  const handleDelete = (user: AdminUser) => {
    Alert.alert(
      'Xoá tài khoản',
      `Bạn có chắc muốn xoá tài khoản "${user.email}"? Hành động này không thể hoàn tác.`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá', style: 'destructive', onPress: async () => {
            try {
              await adminApi.deleteUser(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              setSelectedUser(null);
            } catch {
              Alert.alert('Lỗi', 'Không thể xoá. Thử lại.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAlert = (id: number) => {
    Alert.alert('Xoá thông báo', 'Thông báo sẽ bị ẩn với người dùng.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá', style: 'destructive', onPress: async () => {
          try {
            await officialAlertsApi.remove(id);
            setOfficialAlerts((prev) => prev.filter((a) => a.id !== id));
            fetchAlerts();
          } catch {
            Alert.alert('Lỗi', 'Không thể xoá. Thử lại.');
          }
        },
      },
    ]);
  };

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'dashboard', label: 'Tổng quan' },
    { key: 'users', label: 'Người dùng' },
    { key: 'alerts', label: 'Thông báo' },
  ];

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number | null; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[Typography.h2, { color: colors.text, marginTop: Spacing.s }]}>{value ?? '—'}</Text>
      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{label}</Text>
    </View>
  );

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

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[Typography.body2, { color: active ? colors.primary : colors.textSecondary, fontWeight: active ? '700' : '400' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Dashboard ── */}
        {activeTab === 'dashboard' && (
          <>
            <View style={styles.statGrid}>
              <StatCard icon="people" label="Người dùng" value={stats?.totalUsers ?? null} color={colors.primary} />
              <StatCard icon="alert-circle" label="Yêu cầu cứu hộ" value={stats?.activeRescueRequests ?? null} color={colors.danger} />
              <StatCard icon="analytics" label="Dự báo hôm nay" value={stats?.predictionsToday ?? null} color="#2ECC71" />
              <StatCard icon="notifications" label="Thông báo" value={stats?.activeAlerts ?? null} color="#F39C12" />
            </View>

            <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.s }]}>THAO TÁC NHANH</Text>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Authority')} activeOpacity={0.7}>
                <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
                <Text style={[Typography.body1, { color: colors.text, flex: 1, marginLeft: Spacing.m }]}>
                  Đăng thông báo / Quản lý điểm sơ tán
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
          </>
        )}

        {/* ── Users ── */}
        {activeTab === 'users' && (
          <>
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Tìm tên, email..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : users.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Không tìm thấy người dùng.
              </Text>
            ) : (
              <View style={styles.listGap}>
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={[styles.userCard, { backgroundColor: colors.card }]}
                    onPress={() => setSelectedUser(user)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
                      <Text style={[Typography.body1, { color: ROLE_COLORS[user.role], fontWeight: '700' }]}>
                        {(user.name || user.email)[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                        {user.name || '(Chưa đặt tên)'}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
                        {user.email}
                      </Text>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: ROLE_COLORS[user.role] + '22' }]}>
                      <Text style={[Typography.label, { color: ROLE_COLORS[user.role] }]}>
                        {ROLE_LABELS[user.role]}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Alerts ── */}
        {activeTab === 'alerts' && (
          <>
            <TouchableOpacity
              style={[styles.addAlertBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Authority')}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={[Typography.button, { color: '#fff', marginLeft: Spacing.s }]}>ĐĂNG THÔNG BÁO MỚI</Text>
            </TouchableOpacity>

            {officialAlerts.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Chưa có thông báo nào.
              </Text>
            ) : (
              <View style={styles.listGap}>
                {officialAlerts.map((alert) => (
                  <View key={alert.id} style={[styles.alertCard, { backgroundColor: colors.card }]}>
                    {alert.isUrgent && <View style={[styles.accent, { backgroundColor: colors.danger }]} />}
                    <View style={styles.alertInner}>
                      <View style={styles.alertHeader}>
                        <View style={{ flex: 1 }}>
                          {alert.isUrgent && (
                            <Text style={[Typography.label, { color: colors.danger }]}>KHẨN</Text>
                          )}
                          <Text style={[Typography.body2, { color: colors.text, fontWeight: '600' }]} numberOfLines={2}>
                            {alert.title}
                          </Text>
                          {alert.province && (
                            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                              {alert.province}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteAlert(alert.id)}
                          style={styles.deleteIconBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]} numberOfLines={2}>
                        {alert.message}
                      </Text>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        {new Date(alert.createdAt).toLocaleString('vi-VN')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* User detail modal */}
      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onRoleChange={handleRoleChange}
        onDelete={handleDelete}
        colors={colors}
      />
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
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: Spacing.m },
  tab: {
    paddingVertical: Spacing.m,
    paddingRight: Spacing.l,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl, gap: Spacing.s },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s, marginBottom: Spacing.s },
  statCard: {
    width: '47.5%',
    padding: Spacing.m,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.m },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing.m },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listGap: { gap: Spacing.s },
  userCard: {
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
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rolePill: { paddingHorizontal: Spacing.s, paddingVertical: 3, borderRadius: 6 },
  addAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    marginBottom: Spacing.xs,
  },
  alertCard: {
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
  alertInner: { flex: 1, padding: Spacing.m },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.s },
  deleteIconBtn: { padding: Spacing.xs },
});
