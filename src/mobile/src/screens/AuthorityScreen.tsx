import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Switch, ActivityIndicator, KeyboardAvoidingView,
  Platform, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { officialAlertsApi } from '../api/officialAlerts';
import { rescueApi, RescuePoint } from '../api/rescue';
import { useAlertStore } from '../store/useAlertStore';

type AuthTab = 'post' | 'points' | 'requests';

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

interface RescueRequest {
  id: number;
  lat: number;
  lon: number;
  peopleCount: number;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export const AuthorityScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<any>>();
  const fetchAlerts = useAlertStore((s) => s.fetchAlerts);

  const [activeTab, setActiveTab] = useState<AuthTab>('post');
  const [refreshing, setRefreshing] = useState(false);

  // Post alert form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [province, setProvince] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [posting, setPosting] = useState(false);

  // Evacuation points
  const [points, setPoints] = useState<RescuePoint[]>([]);
  const [showAddPoint, setShowAddPoint] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newProvince, setNewProvince] = useState('');
  const [addingPoint, setAddingPoint] = useState(false);

  // Rescue requests
  const [requests, setRequests] = useState<RescueRequest[]>([]);

  const loadPoints = useCallback(async () => {
    try {
      const data = await rescueApi.getPoints();
      setPoints(data);
    } catch { /* keep previous */ }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const { api } = await import('../api/client');
      const data = await api.get<RescueRequest[]>('/api/rescue/requests').then((r) => r.data);
      setRequests(data);
    } catch { /* keep previous */ }
  }, []);

  useEffect(() => {
    loadPoints();
    loadRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadPoints(), loadRequests()]);
    setRefreshing(false);
  };

  const handlePostAlert = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung.');
      return;
    }
    setPosting(true);
    try {
      await officialAlertsApi.create({
        title: title.trim(),
        message: message.trim(),
        isUrgent,
        province: province.trim() || undefined,
      });
      setTitle('');
      setMessage('');
      setProvince('');
      setIsUrgent(false);
      fetchAlerts();
      Alert.alert('Đã đăng', 'Thông báo đã được gửi đến người dùng.');
    } catch {
      Alert.alert('Lỗi', 'Không thể đăng thông báo. Thử lại.');
    }
    setPosting(false);
  };

  const handleAddPoint = async () => {
    if (!newName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên điểm sơ tán.');
      return;
    }
    setAddingPoint(true);
    try {
      const { api } = await import('../api/client');
      const point = await api.post<RescuePoint>('/api/rescue/points', {
        name: newName.trim(),
        address: newAddress.trim() || undefined,
        capacity: newCapacity ? parseInt(newCapacity, 10) : undefined,
        province: newProvince.trim() || undefined,
        lat: 0,
        lon: 0,
      }).then((r) => r.data);
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
      const { api } = await import('../api/client');
      const updated = await api.patch<RescuePoint>(`/api/rescue/points/${point.id}`, {
        isActive: !point.isActive,
      }).then((r) => r.data);
      setPoints((prev) => prev.map((p) => p.id === point.id ? updated : p));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const { api } = await import('../api/client');
      const updated = await api.patch<RescueRequest>(`/api/rescue/requests/${id}/status`, { status }).then((r) => r.data);
      setRequests((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Thử lại.');
    }
  };

  const tabs: { key: AuthTab; label: string }[] = [
    { key: 'post', label: 'Thông báo' },
    { key: 'points', label: 'Điểm sơ tán' },
    { key: 'requests', label: 'Cứu hộ' },
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
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* ── Post Alert ── */}
          {activeTab === 'post' && (
            <>
              <Text style={[Typography.label, { color: colors.textSecondary }]}>TIÊU ĐỀ</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                placeholder="Tên thông báo..."
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>NỘI DUNG</Text>
              <TextInput
                style={[styles.textarea, { color: colors.text, borderBottomColor: colors.border }]}
                placeholder="Chi tiết thông báo, hướng dẫn sơ tán..."
                placeholderTextColor={colors.textSecondary}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={[Typography.label, { color: colors.textSecondary, marginTop: Spacing.m }]}>
                TỈNH / TP (TÙY CHỌN)
              </Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderBottomColor: colors.border }]}
                placeholder="Để trống nếu áp dụng toàn quốc"
                placeholderTextColor={colors.textSecondary}
                value={province}
                onChangeText={setProvince}
              />

              <View style={[styles.urgentRow, { backgroundColor: colors.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.body1, { color: colors.text }]}>Thông báo khẩn cấp</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                    Hiển thị nổi bật, màu đỏ, ưu tiên cao nhất
                  </Text>
                </View>
                <Switch
                  value={isUrgent}
                  onValueChange={setIsUrgent}
                  trackColor={{ false: colors.border, true: colors.danger }}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: posting ? colors.textSecondary : colors.primary }]}
                onPress={handlePostAlert}
                disabled={posting}
                activeOpacity={0.8}
              >
                {posting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[Typography.button, { color: '#fff' }]}>ĐĂNG THÔNG BÁO</Text>
                }
              </TouchableOpacity>
            </>
          )}

          {/* ── Evacuation Points ── */}
          {activeTab === 'points' && (
            <>
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
                  <View style={styles.row}>
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
            </>
          )}

          {/* ── Rescue Requests ── */}
          {activeTab === 'requests' && (
            requests.length === 0 ? (
              <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
                Không có yêu cầu cứu hộ nào đang mở.
              </Text>
            ) : (
              <View style={styles.listGap}>
                {requests.map((req) => (
                  <View key={req.id} style={[styles.requestCard, { backgroundColor: colors.card }]}>
                    <View style={[styles.requestAccent, { backgroundColor: STATUS_COLORS[req.status] ?? colors.border }]} />
                    <View style={styles.requestInner}>
                      <View style={styles.requestHeader}>
                        <Text style={[Typography.body2, { color: colors.text, fontWeight: '700' }]}>
                          YÊU CẦU #{req.id}
                        </Text>
                        <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[req.status] + '22' }]}>
                          <Text style={[Typography.label, { color: STATUS_COLORS[req.status] }]}>
                            {STATUS_LABELS[req.status] ?? req.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        {req.lat.toFixed(4)}°N, {req.lon.toFixed(4)}°E · {req.peopleCount} người
                      </Text>
                      {req.notes && (
                        <Text style={[Typography.caption, { color: colors.text, marginTop: Spacing.xs }]} numberOfLines={2}>
                          {req.notes}
                        </Text>
                      )}
                      <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </Text>

                      {req.status !== 'resolved' && (
                        <View style={styles.actionBtns}>
                          {req.status === 'open' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: '#F39C1222' }]}
                              onPress={() => handleUpdateStatus(req.id, 'assigned')}
                            >
                              <Text style={[Typography.label, { color: '#F39C12' }]}>TIẾP NHẬN</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: '#2ECC7122' }]}
                            onPress={() => handleUpdateStatus(req.id, 'resolved')}
                          >
                            <Text style={[Typography.label, { color: '#2ECC71' }]}>HOÀN THÀNH</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  roleBadge: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.m,
  },
  tab: {
    paddingVertical: Spacing.m,
    paddingRight: Spacing.l,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  body: {
    padding: Spacing.m,
    paddingBottom: Spacing.xxl,
    gap: Spacing.s,
  },
  input: {
    fontSize: 15,
    borderBottomWidth: 1.5,
    paddingVertical: Spacing.s,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  textarea: {
    fontSize: 15,
    borderBottomWidth: 1.5,
    paddingVertical: Spacing.s,
    marginTop: Spacing.xs,
    minHeight: 80,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.m,
    borderRadius: 12,
    marginTop: Spacing.m,
  },
  submitBtn: {
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.l,
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
  row: { flexDirection: 'row' },
  listGap: { gap: Spacing.s },
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
  pointDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
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
  requestAccent: { width: 4 },
  requestInner: { flex: 1, padding: Spacing.m },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPill: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBtns: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  actionBtn: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 8,
  },
});
