import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { GlobalStyles } from '../theme/globalStyles';
import { useAlertStore, Alert } from '../store/useAlertStore';

const formatBadge = (n: number) => (n >= 10 ? '9+' : String(n));

export const NotificationsScreen = () => {
  const { colors } = useTheme();
  const alerts = useAlertStore((state) => state.alerts);
  const readIds = useAlertStore((state) => state.readIds);
  const markRead = useAlertStore((state) => state.markRead);
  const markAllRead = useAlertStore((state) => state.markAllRead);

  const unreadCount = alerts.filter((a) => !readIds.has(a.id)).length;

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    alerts.forEach((a) => { if (a.isUrgent) s.add(a.id); });
    return s;
  });

  const [msgLines, setMsgLines] = useState<Record<string, number>>({});
  const recordLines = (id: string, count: number) =>
    setMsgLines((prev) => prev[id] === count ? prev : { ...prev, [id]: count });

  const [titleLines, setTitleLines] = useState<Record<string, number>>({});
  const recordTitleLines = (id: string, count: number) =>
    setTitleLines((prev) => prev[id] === count ? prev : { ...prev, [id]: count });

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const handlePress = (item: Alert, canExpand: boolean) => {
    markRead(item.id);
    if (canExpand) toggle(item.id);
  };

  const renderAlert = (item: Alert) => {
    const open = expanded.has(item.id);
    const isUnread = !readIds.has(item.id);
    const canExpand = (msgLines[item.id] ?? 0) > 1 || (titleLines[item.id] ?? 0) > 1;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.alertCard, { backgroundColor: colors.card }]}
        onPress={() => handlePress(item, canExpand)}
        activeOpacity={0.85}
      >
        {isUnread && !item.isUrgent && <View style={[styles.accent, { backgroundColor: colors.primary }]} />}
        {item.isUrgent && <View style={[styles.accent, { backgroundColor: colors.danger }]} />}
        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flex: 1 }}>
              {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              {item.isUrgent && (
                <Text style={[Typography.label, { color: colors.danger }]}>KHẨN</Text>
              )}
              <Text
                style={[Typography.h3, {
                  color: item.isUrgent ? colors.danger : colors.text,
                  fontWeight: isUnread ? '700' : '600',
                  flex: 1,
                }]}
                numberOfLines={open ? undefined : 1}
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

          {/* Hidden measuring texts */}
          <Text
            style={[styles.hiddenMeasure, Typography.h3]}
            onTextLayout={(e) => recordTitleLines(item.id, e.nativeEvent.lines.length)}
          >
            {item.title}
          </Text>
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

          {item.province && (
            <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
              {item.province}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[Typography.h1, { color: colors.text }]}>Thông báo</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s }}>
          {unreadCount > 0 && (
            <View style={[styles.countPill, { backgroundColor: colors.primary }]}>
              <Text style={styles.countText}>{formatBadge(unreadCount)}</Text>
            </View>
          )}
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={[Typography.caption, { color: colors.primary }]}>Đọc tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {alerts.length === 0 ? (
          <Text style={[Typography.body1, { color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.xl }]}>
            Không có thông báo nào.
          </Text>
        ) : (
          alerts.map(renderAlert)
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.m,
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
  accent: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.m },
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  countPill: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
