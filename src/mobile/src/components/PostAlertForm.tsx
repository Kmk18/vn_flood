import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Switch,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView,
  Platform, StyleSheet, RefreshControl,
} from 'react-native';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { officialAlertsApi } from '../api/officialAlerts';

interface Props {
  onSuccess?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const PostAlertForm: React.FC<Props> = ({ onSuccess, refreshing = false, onRefresh }) => {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [province, setProvince] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề và nội dung thông báo.');
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
      setTitle(''); setMessage(''); setProvince(''); setIsUrgent(false);
      Alert.alert('Đã đăng', 'Thông báo đã được gửi đến người dùng.');
      onSuccess?.();
    } catch {
      Alert.alert('Lỗi', 'Không thể đăng thông báo. Thử lại.');
    }
    setPosting(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh
            ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            : undefined
        }
      >
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
          onPress={handleSubmit}
          disabled={posting}
          activeOpacity={0.8}
        >
          {posting
            ? <ActivityIndicator color="#fff" />
            : <Text style={[Typography.button, { color: '#fff' }]}>ĐĂNG THÔNG BÁO</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  body: { padding: Spacing.m, paddingBottom: Spacing.xxl, gap: Spacing.s },
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
});
