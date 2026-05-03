import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Dimensions, StyleSheet, ScrollView, useColorScheme, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Spacing, Typography } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.56);

const MOCK_SHELTERS = [
  { id: 1, name: 'Trường THPT Nguyễn Trãi', distanceKm: 1.2, capacity: 500 },
  { id: 2, name: 'Nhà văn hóa Quận 1', distanceKm: 2.8, capacity: 300 },
  { id: 3, name: 'Trung tâm Thể thao Hòa Bình', distanceKm: 4.1, capacity: 800 },
];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const RescueBottomSheet: React.FC<Props> = ({ visible, onClose }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;

  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState('');

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const pulseAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Mount before animating in; unmount only after animating out
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
        setSubmitted(false);
        setDescription('');
        holdProgress.setValue(0);
      });
    }
  }, [visible]);

  // Slide up + pulse loops when mounted
  useEffect(() => {
    if (!mounted) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 70,
      friction: 12,
      useNativeDriver: true,
    }).start();

    // Each ring takes exactly 3000ms to loop; staggered by 1000ms
    const loops = pulseAnims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 1000),
          Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.delay(Math.max(0, (2 - i) * 1000)),
        ])
      )
    );
    loops.forEach((l) => l.start());

    return () => loops.forEach((l) => l.stop());
  }, [mounted]);

  const onPressIn = () => {
    if (submitted) return;
    holdProgress.setValue(0);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        setSubmitted(true);
        // TODO: POST /api/rescue/requests with { lat, lon, description, peopleCount }
      }
    });
  };

  const onPressOut = () => {
    if (submitted) return;
    holdAnim.current?.stop();
    Animated.timing(holdProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        styles.sheet,
        { backgroundColor: themeColors.card, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Drag handle */}
      <View style={[styles.handle, { backgroundColor: themeColors.border }]} />

      {/* Header */}
      <View style={styles.header}>
        {/* Pulsing SOS indicator */}
        <View style={styles.pulseWrap}>
          {pulseAnims.map((anim, i) => (
            <Animated.View
              key={i}
              style={[
                styles.pulseRing,
                {
                  backgroundColor: themeColors.danger,
                  opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] }) }],
                },
              ]}
            />
          ))}
          <View style={[styles.sosDot, { backgroundColor: themeColors.danger }]}>
            <Text style={styles.sosText}>SOS</Text>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: Spacing.m }}>
          <Text style={[Typography.h3, { color: themeColors.danger }]}>YÊU CẦU CỨU HỘ</Text>
          <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
            Vị trí của bạn sẽ được gửi đến đội cứu hộ
          </Text>
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={[Typography.body1, { color: themeColors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* Description */}
          <Text style={[Typography.label, { color: themeColors.textSecondary, marginBottom: Spacing.s }]}>
            MÔ TẢ TÌNH HUỐNG
          </Text>
          <TextInput
            style={[styles.descInput, { color: themeColors.text, borderBottomColor: themeColors.border }]}
            placeholder="Số người, vị trí cụ thể, tình trạng sức khỏe..."
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Image upload */}
          <TouchableOpacity
            style={[styles.imageBtn, { backgroundColor: themeColors.secondary }]}
            activeOpacity={0.7}
          >
            <Text style={[Typography.label, { color: themeColors.textSecondary }]}>
              📷  THÊM ẢNH (TÙY CHỌN)
            </Text>
          </TouchableOpacity>

          {/* Evacuation recommendations */}
          <Text style={[Typography.label, { color: themeColors.textSecondary, marginTop: Spacing.l, marginBottom: Spacing.s }]}>
            ĐIỂM SƠ TÁN GẦN NHẤT
          </Text>
          <View style={{ backgroundColor: themeColors.secondary }}>
            {MOCK_SHELTERS.map((shelter, i, arr) => (
              <View
                key={shelter.id}
                style={[
                  styles.shelterRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border },
                ]}
              >
                <View style={[styles.shelterBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.shelterBadgeText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.body2, { color: themeColors.text, fontWeight: '600' }]}>
                    {shelter.name}
                  </Text>
                  <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                    {shelter.distanceKm} km · Sức chứa {shelter.capacity} người
                  </Text>
                </View>
              </View>
            ))}
          </View>

        </ScrollView>

        {/* Hold-to-submit — anchored outside ScrollView */}
        <View style={[styles.holdWrap, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
          <TouchableOpacity
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={1}
            disabled={submitted}
            style={[styles.holdOuter, { backgroundColor: themeColors.secondary }]}
          >
            <Animated.View
              style={[
                styles.holdFill,
                {
                  backgroundColor: submitted ? themeColors.success : themeColors.danger,
                  width: submitted
                    ? '100%'
                    : holdProgress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
            <Text style={[styles.holdText, { color: submitted ? themeColors.success : themeColors.danger }]}>
              {submitted ? '✓  YÊU CẦU ĐÃ ĐƯỢC GỬI' : 'GIỮ 3 GIÂY ĐỂ GỬI YÊU CẦU'}
            </Text>
          </TouchableOpacity>
          {!submitted && (
            <Text style={[Typography.caption, { color: themeColors.textSecondary, textAlign: 'center', marginTop: Spacing.s }]}>
              Giữ nút để xác nhận — tránh gửi nhầm
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.s,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  pulseWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sosDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: Spacing.s,
  },
  body: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.m,
  },
  descInput: {
    fontSize: 15,
    borderBottomWidth: 1.5,
    paddingVertical: Spacing.s,
    marginBottom: Spacing.m,
    minHeight: 64,
  },
  imageBtn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s,
  },
  shelterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
  },
  shelterBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  shelterBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  holdWrap: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.l,
    borderTopWidth: 1,
  },
  holdOuter: {
    height: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  holdText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
