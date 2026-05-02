import React from 'react';
import { View, Text, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useFloodStore, RISK_COLORS, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { BasinForecast } from '../mock/floodData';
import { Card } from '../components/Card';

export const NotificationsScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const alerts = useFloodStore((state) => state.alerts);

  const renderAlert = (basin: BasinForecast) => {
    const isCritical = basin.riskLevel === 'critical';
    const riskColor = RISK_COLORS[basin.riskLevel as RiskLevel];

    return (
      <Card
        key={basin.hybasId}
        isDarkMode={isDarkMode}
        style={isCritical ? [{ borderColor: riskColor, borderWidth: 2 }] : undefined}
      >
        <View style={GlobalStyles.listItemHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flex: 1 }}>
            <View style={{ backgroundColor: riskColor, paddingHorizontal: Spacing.s, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {RISK_LABELS[basin.riskLevel as RiskLevel].toUpperCase()}
              </Text>
            </View>
            <Text style={[Typography.h3, { color: themeColors.text, flex: 1 }]} numberOfLines={1}>
              {basin.province}
            </Text>
          </View>
          <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
            {new Date(basin.forecastDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
          </Text>
        </View>
        <Text style={[Typography.body1, { color: themeColors.textSecondary, marginTop: Spacing.s }]}>
          Xác suất lũ hôm nay: <Text style={{ color: riskColor, fontWeight: '700' }}>{(basin.floodProb * 100).toFixed(0)}%</Text>
        </Text>
        <View style={{ flexDirection: 'row', marginTop: Spacing.s, gap: Spacing.s }}>
          {basin.forecast7d.slice(1, 5).map((f, i) => (
            <View key={i} style={{ alignItems: 'center', gap: 2 }}>
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                {new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' })}
              </Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }} />
              <Text style={[Typography.caption, { color: themeColors.text, fontWeight: '600' }]}>
                {(f.floodProb * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[GlobalStyles.headerContainer, GlobalStyles.headerTitleCenter, Typography.h1, { color: themeColors.text }]}>Cảnh báo</Text>
      <ScrollView contentContainerStyle={GlobalStyles.listContainer}>
        {alerts.length === 0 ? (
          <Text style={[Typography.body1, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
            Không có cảnh báo nào.
          </Text>
        ) : (
          alerts.map((basin) => renderAlert(basin))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
