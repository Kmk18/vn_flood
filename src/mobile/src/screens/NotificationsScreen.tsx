import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAlertStore, Alert } from '../store/useAlertStore';
import { useFloodStore, RISK_COLORS, RISK_LABELS, RiskLevel } from '../store/useFloodStore';
import { BasinForecast } from '../mock/floodData';

type Tab = 'authority' | 'model';

export const NotificationsScreen = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('authority');

  const authorityAlerts = useAlertStore((state) => state.alerts);
  const modelAlerts = useFloodStore((state) => state.alerts);

  // Pre-expand urgent authority alerts and critical model alerts
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    authorityAlerts.forEach((a) => { if (a.isUrgent) s.add(`a-${a.id}`); });
    modelAlerts.forEach((b) => { if (b.riskLevel === 'critical') s.add(`m-${b.hybasId}`); });
    return s;
  });

  // Measured line counts for authority alert messages (hidden text trick)
  const [msgLines, setMsgLines] = useState<Record<string, number>>({});
  const recordLines = (id: string, count: number) =>
    setMsgLines((prev) => prev[id] === count ? prev : { ...prev, [id]: count });

  const isExpanded = (key: string) => expanded.has(key);
  const toggle = (key: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });

  const renderAuthorityAlert = (item: Alert) => {
    const key = `a-${item.id}`;
    const open = isExpanded(key);
    // canExpand is true once we've measured the message and it wraps to >1 line
    const canExpand = (msgLines[item.id] ?? 0) > 1;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.alertCard, { backgroundColor: colors.card }]}
        onPress={canExpand ? () => toggle(key) : undefined}
        activeOpacity={canExpand ? 0.85 : 1}
      >
        {item.isUrgent && <View style={[styles.accent, { backgroundColor: colors.danger }]} />}
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flex: 1 }}>
              {item.isUrgent && (
                <Text style={[Typography.label, { color: colors.danger }]}>KHẨN</Text>
              )}
              <Text
                style={[Typography.h3, { color: item.isUrgent ? colors.danger : colors.text, flex: 1 }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {canExpand && (
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
              )}
            </View>
          </View>

          {/* Hidden measuring text — same width, zero height, invisible */}
          <Text
            style={styles.hiddenMeasure}
            onTextLayout={(e) => recordLines(item.id, e.nativeEvent.lines.length)}
          >
            {item.message}
          </Text>

          <Text
            style={[Typography.body2, { color: colors.textSecondary, marginTop: Spacing.s }]}
            numberOfLines={canExpand && !open ? 1 : undefined}
          >
            {item.message}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderModelAlert = (basin: BasinForecast) => {
    const key = `m-${basin.hybasId}`;
    const open = isExpanded(key);
    const riskColor = RISK_COLORS[basin.riskLevel as RiskLevel];
    const isImportant = basin.riskLevel === 'critical' || basin.riskLevel === 'high';
    // forecast7d always has data — model alerts are always expandable
    const canExpand = basin.forecast7d.length > 1;

    return (
      <TouchableOpacity
        key={basin.hybasId}
        style={[styles.alertCard, { backgroundColor: colors.card }]}
        onPress={canExpand ? () => toggle(key) : undefined}
        activeOpacity={canExpand ? 0.85 : 1}
      >
        <View style={[styles.accent, { backgroundColor: riskColor }]} />
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.label, { color: riskColor }]}>
                {RISK_LABELS[basin.riskLevel as RiskLevel].toUpperCase()}
              </Text>
              <Text style={[Typography.h3, { color: colors.text, marginTop: 2 }]} numberOfLines={1}>
                {basin.province}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                {new Date(basin.forecastDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              </Text>
              {canExpand && (
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.textSecondary}
                />
              )}
            </View>
          </View>

          <Text
            style={[Typography.body2, { color: colors.textSecondary, marginTop: Spacing.s }]}
            numberOfLines={canExpand && !open && !isImportant ? 1 : undefined}
          >
            {'Xác suất lũ hôm nay: '}
            <Text style={{ color: riskColor, fontWeight: '700' }}>
              {(basin.floodProb * 100).toFixed(0)}%
            </Text>
          </Text>

          {(open || isImportant) && (
            <View style={styles.forecastRow}>
              {basin.forecast7d.slice(1, 5).map((f, i) => (
                <View key={i} style={styles.forecastDay}>
                  <Text style={[Typography.caption, { color: colors.textSecondary }]}>
                    {new Date(f.forecastDate).toLocaleDateString('vi-VN', { weekday: 'short' }).toUpperCase()}
                  </Text>
                  <View style={[styles.forecastBar, { backgroundColor: RISK_COLORS[f.riskLevel as RiskLevel] ?? '#ccc' }]} />
                  <Text style={[Typography.caption, { color: colors.text, fontWeight: '700' }]}>
                    {(f.floodProb * 100).toFixed(0)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'authority', label: 'Thông báo', count: authorityAlerts.length },
    { key: 'model', label: 'Cảnh báo lũ', count: modelAlerts.length },
  ];

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[Typography.h1, { color: colors.text }]}>Cảnh báo</Text>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                Typography.body1,
                { color: isActive ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '400' },
              ]}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={[
                  styles.countPill,
                  { backgroundColor: tab.key === 'authority' ? colors.danger : RISK_COLORS.high },
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
            <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
              Không có thông báo nào.
            </Text>
          ) : (
            authorityAlerts.map(renderAuthorityAlert)
          )
        ) : (
          modelAlerts.length === 0 ? (
            <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
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
  header: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.m,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: Spacing.l,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    paddingRight: Spacing.l,
    gap: Spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  list: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.xl,
    gap: Spacing.s,
  },
  alertCard: {
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accent: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: Spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: Spacing.s,
    flexShrink: 0,
  },
  hiddenMeasure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: Spacing.m,
    right: Spacing.m,
    ...Typography.body2,
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
    borderRadius: 2,
  },
  countPill: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
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
