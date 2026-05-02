import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, useColorScheme, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAlertStore, Alert } from '../store/useAlertStore';
import { useFloodStore, RISK_COLORS, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { BasinForecast } from '../mock/floodData';

type Tab = 'authority' | 'model';

export const NotificationsScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const [activeTab, setActiveTab] = useState<Tab>('authority');

  const authorityAlerts = useAlertStore((state) => state.alerts);
  const modelAlerts = useFloodStore((state) => state.alerts);

  const renderAuthorityAlert = (item: Alert) => (
    <View
      key={item.id}
      style={[
        styles.row,
        { backgroundColor: themeColors.card },
        item.isUrgent && { borderLeftWidth: 3, borderLeftColor: themeColors.danger },
      ]}
    >
      <View style={GlobalStyles.listItemHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flex: 1 }}>
          {item.isUrgent && (
            <Text style={[Typography.label, { color: themeColors.danger }]}>KHẨN</Text>
          )}
          <Text
            style={[Typography.h3, { color: item.isUrgent ? themeColors.danger : themeColors.text, flex: 1 }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
        </View>
        <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
          {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.s }]}>
        {item.message}
      </Text>
    </View>
  );

  const renderModelAlert = (basin: BasinForecast) => {
    const riskColor = RISK_COLORS[basin.riskLevel as RiskLevel];
    return (
      <View
        key={basin.hybasId}
        style={[
          styles.row,
          { backgroundColor: themeColors.card },
          { borderLeftWidth: 3, borderLeftColor: riskColor },
        ]}
      >
        <View style={GlobalStyles.listItemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.label, { color: riskColor }]}>
              {RISK_LABELS[basin.riskLevel as RiskLevel].toUpperCase()}
            </Text>
            <Text style={[Typography.h3, { color: themeColors.text, marginTop: 2 }]} numberOfLines={1}>
              {basin.province}
            </Text>
          </View>
          <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
            {new Date(basin.forecastDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
          </Text>
        </View>

        <Text style={[Typography.body2, { color: themeColors.textSecondary, marginTop: Spacing.s }]}>
          Xác suất lũ hôm nay:{' '}
          <Text style={{ color: riskColor, fontWeight: '700' }}>
            {(basin.floodProb * 100).toFixed(0)}%
          </Text>
        </Text>

        <View style={styles.forecastRow}>
          {basin.forecast7d.slice(1, 5).map((f, i) => (
            <View key={i} style={styles.forecastDay}>
              <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>
                {new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase()}
              </Text>
              <View style={[styles.forecastBar, { backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }]} />
              <Text style={[Typography.caption, { color: themeColors.text, fontWeight: '700' }]}>
                {(f.floodProb * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'authority', label: 'Thông báo', count: authorityAlerts.length },
    { key: 'model', label: 'Cảnh báo lũ', count: modelAlerts.length },
  ];

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[GlobalStyles.headerContainer, GlobalStyles.headerTitleCenter, Typography.h1, { color: themeColors.text }]}>
        Cảnh báo
      </Text>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: themeColors.border }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && { borderBottomColor: themeColors.primary, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                Typography.body1,
                { color: isActive ? themeColors.primary : themeColors.textSecondary, fontWeight: isActive ? '700' : '400' },
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.countPill,
                  { backgroundColor: tab.key === 'authority' ? themeColors.danger : RISK_COLORS.high },
                ]}>
                  <Text style={styles.countText}>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {activeTab === 'authority' ? (
          authorityAlerts.length === 0 ? (
            <Text style={[Typography.body1, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
              Không có thông báo nào.
            </Text>
          ) : (
            authorityAlerts.map(renderAuthorityAlert)
          )
        ) : (
          modelAlerts.length === 0 ? (
            <Text style={[Typography.body1, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
              Không có cảnh báo lũ nào.
            </Text>
          ) : (
            modelAlerts.map(renderModelAlert)
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.m,
    gap: Spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  list: {
    paddingBottom: Spacing.xl,
    gap: 1,
  },
  row: {
    padding: Spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  forecastRow: {
    flexDirection: 'row',
    marginTop: Spacing.m,
    gap: Spacing.m,
  },
  forecastDay: {
    alignItems: 'center',
    gap: 4,
  },
  forecastBar: {
    width: 4,
    height: 16,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
