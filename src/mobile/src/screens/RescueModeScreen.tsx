import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';

const mockRescuePoints = [
  { id: '1', name: 'Nơi trú ẩn Tòa Thị Chính', distance: '1.2 km', capacity: 'Cao' },
  { id: '2', name: 'Phòng Thể Dục Trường Trung Học', distance: '2.5 km', capacity: 'Trung bình' },
  { id: '3', name: 'Nhà Văn Hóa Cộng Đồng', distance: '3.8 km', capacity: 'Thấp' },
];

export const RescueModeScreen = () => {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.emergencyBanner, { backgroundColor: colors.danger }]}>
        <Text style={[Typography.label, { color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs }]}>
          CHẾ ĐỘ KHẨN CẤP
        </Text>
        <Text style={[Typography.h2, { color: '#FFF' }]}>Cứu hộ đang đến</Text>
        <Text style={[Typography.body2, { color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs }]}>
          Tín hiệu báo nguy đã được gửi. Di chuyển đến điểm an toàn gần nhất.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
        ĐIỂM SƠ TÁN GẦN BẠN
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          {mockRescuePoints.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.row,
                index < mockRescuePoints.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.rowLeft}>
                <Text style={[Typography.h3, { color: colors.text }]}>{item.name}</Text>
                <View style={styles.meta}>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>{item.distance}</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>·</Text>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>Sức chứa: {item.capacity}</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.dirBtn, { backgroundColor: colors.primary }]} onPress={() => {}}>
                <Text style={[Typography.label, { color: '#fff' }]}>CHỈ ĐƯỜNG</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  emergencyBanner: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.l,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.l,
    paddingBottom: Spacing.s,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  rowLeft: {
    flex: 1,
    marginRight: Spacing.m,
  },
  meta: {
    flexDirection: 'row',
    gap: Spacing.s,
    marginTop: Spacing.xs,
  },
  dirBtn: {
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 8,
  },
});
