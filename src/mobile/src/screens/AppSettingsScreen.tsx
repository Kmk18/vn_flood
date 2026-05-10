import React from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { useThemeStore } from '../store/useThemeStore';
import { GlobalStyles } from '../theme/globalStyles';

export const AppSettingsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { isDark, setIsDark } = useThemeStore();

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[Typography.h3, { color: colors.text }]}>Cài đặt ứng dụng</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Appearance section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          GIAO DIỆN
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={[styles.row, styles.rowCenter]}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="moon" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.body1, { color: colors.text }]}>Chế độ tối</Text>
              <Text style={[Typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                {isDark ? 'Đang bật' : 'Đang tắt'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={setIsDark}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </View>

        {/* About section */}
        <Text style={[styles.sectionLabel, Typography.label, { color: colors.textSecondary }]}>
          THÔNG TIN
        </Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Ionicons name="information-circle" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[Typography.body1, { color: colors.text, flex: 1 }]}>Phiên bản</Text>
            <Text style={[Typography.body2, { color: colors.textSecondary }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.l,
    paddingBottom: Spacing.s,
  },
  sectionCard: {
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
    gap: Spacing.m,
  },
  rowCenter: {
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
