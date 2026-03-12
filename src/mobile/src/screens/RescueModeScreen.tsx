import React from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { GlobalStyles } from '../theme/globalStyles';

const mockRescuePoints = [
  { id: '1', name: 'Nơi trú ẩn Tòa Thị Chính', distance: '1.2 km', capacity: 'Cao' },
  { id: '2', name: 'Phòng Thể Dục Trường Trung Học', distance: '2.5 km', capacity: 'Trung bình' },
  { id: '3', name: 'Nhà Văn Hóa Cộng Đồng', distance: '3.8 km', capacity: 'Thấp' },
];

export const RescueModeScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const renderRescuePoint = ({ item }: { item: typeof mockRescuePoints[0] }) => (
    <Card isDarkMode={isDarkMode} style={{ marginBottom: Spacing.m }}>
      <Text style={[Typography.h3, { color: themeColors.text }]}>{item.name}</Text>
      <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.xs }]}>
        Khoảng cách: {item.distance}
      </Text>
      <Text style={[Typography.body2, { color: themeColors.textSecondary }]}>
        Sức chứa: {item.capacity}
      </Text>
      <Button 
        title="Chỉ đường đến đây" 
        onPress={() => {}} 
        style={{ marginTop: Spacing.m, height: 40 }}
      />
    </Card>
  );

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <View style={[GlobalStyles.headerContainer, { backgroundColor: themeColors.danger, paddingBottom: Spacing.l }]}>
        <Text style={[Typography.h2, { color: '#FFF' }]}>Chế độ Cứu hộ Khẩn cấp</Text>
        <Text style={[Typography.body2, { color: '#FFF', marginTop: Spacing.xs }]}>
          Tín hiệu báo nguy của bạn đã được kích hoạt. Hãy di chuyển đến khu vực an toàn gần nhất.
        </Text>
      </View>

      <ScrollView contentContainerStyle={GlobalStyles.listContainer}>
        {mockRescuePoints.map((item) => <React.Fragment key={item.id}>{renderRescuePoint({ item })}</React.Fragment>)}
      </ScrollView>
    </SafeAreaView>
  );
};
