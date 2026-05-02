import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';

const mockRescuePoints = [
  { id: '1', name: 'Nơi trú ẩn Tòa Thị Chính', distance: '1.2 km', capacity: 'Cao' },
  { id: '2', name: 'Phòng Thể Dục Trường Trung Học', distance: '2.5 km', capacity: 'Trung bình' },
  { id: '3', name: 'Nhà Văn Hóa Cộng Đồng', distance: '3.8 km', capacity: 'Thấp' },
];

export const RescueModeScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.danger }]}>
        <Text style={[Typography.label, { color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs }]}>
          CHẾ ĐỘ KHẨN CẤP
        </Text>
        <Text style={[Typography.h2, { color: '#FFF' }]}>Cứu hộ đang đến</Text>
        <Text style={[Typography.body2, { color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs }]}>
          Tín hiệu báo nguy đã được gửi. Di chuyển đến điểm an toàn gần nhất.
        </Text>
      </View>

      <Text style={[styles.sectionLabel, Typography.label, { color: themeColors.textSecondary }]}>
        ĐIỂM SƠ TÁN GẦN BẠN
      </Text>

      <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {mockRescuePoints.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.row,
              { backgroundColor: themeColors.card },
              index < mockRescuePoints.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border },
            ]}
          >
            <View style={styles.rowLeft}>
              <Text style={[Typography.h3, { color: themeColors.text }]}>{item.name}</Text>
              <View style={styles.meta}>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                  {item.distance}
                </Text>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>·</Text>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                  Sức chứa: {item.capacity}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={[styles.dirBtn, { backgroundColor: themeColors.primary }]} onPress={() => {}}>
              <Text style={[Typography.label, { color: '#fff' }]}>CHỈ ĐƯỜNG</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.l,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.l,
    paddingBottom: Spacing.s,
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
  },
});
