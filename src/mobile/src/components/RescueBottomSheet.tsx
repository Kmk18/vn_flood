import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Dimensions, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Spacing, Typography } from '../theme';
import { useTheme } from '../theme/useTheme';
import { rescueApi, RescuePoint } from '../api/rescue';
import { useLocationStore } from '../store/useLocationStore';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.56);

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelectShelter?: (shelter: RescuePoint) => void;
}

export const RescueBottomSheet: React.FC<Props> = ({ visible, onClose, onSelectShelter }) => {
  const { colors: themeColors } = useTheme();
  const shareLocation = useLocationStore((s) => s.shareLocation);
  const locationRef = useRef<{ lat: number; lon: number } | null>(null);

  const [mounted, setMounted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState('');
  const [peopleCount, setPeopleCount] = useState(1);
  const [peopleText, setPeopleText] = useState('1');
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [shelters, setShelters] = useState<RescuePoint[]>([]);
  const [roadDistances, setRoadDistances] = useState<Record<number, { distKm: number; durationMin: number }>>({});

  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const pulseAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const holdAnim = useRef<Animated.CompositeAnimation | null>(null);

  // Fetch shelter points + get GPS location when the sheet opens
  useEffect(() => {
    if (!visible) return;
    rescueApi.getPoints().then(setShelters).catch(() => {});
    if (shareLocation) {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
          locationRef.current = coords;
          setUserLoc(coords);
        })
        .catch(() => {});
    }
  }, [visible, shareLocation]);

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
        setPeopleCount(1);
        setPeopleText('1');
        setUserLoc(null);
        setRoadDistances({});
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

  // Fetch road distances via OSRM table API (one request for all shelters)
  useEffect(() => {
    if (!userLoc || shelters.length === 0) return;

    // Pre-sort by haversine so we send at most 20 candidates to OSRM
    const candidates = [...shelters]
      .map((s) => ({ ...s, _h: haversineKm(userLoc.lat, userLoc.lon, s.lat, s.lon) }))
      .sort((a, b) => a._h - b._h)
      .slice(0, 20);

    const coords = [
      `${userLoc.lon},${userLoc.lat}`,
      ...candidates.map((s) => `${s.lon},${s.lat}`),
    ].join(';');
    const dests = candidates.map((_, i) => i + 1).join(';');
    const url =
      `https://router.project-osrm.org/table/v1/driving/${coords}` +
      `?sources=0&destinations=${dests}&annotations=distance,duration`;

    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.code !== 'Ok') return;
        const dists: (number | null)[] = data.distances[0];
        const durs: (number | null)[] = data.durations[0];
        const map: Record<number, { distKm: number; durationMin: number }> = {};
        candidates.forEach((s, i) => {
          const d = dists[i];
          const t = durs[i];
          if (d != null && t != null) {
            map[s.id] = { distKm: Math.round(d / 100) / 10, durationMin: Math.round(t / 60) };
          }
        });
        setRoadDistances(map);
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [userLoc, shelters]);

  const sortedShelters = useMemo(() => {
    return [...shelters]
      .map((s) => {
        const road = roadDistances[s.id];
        const hDist = userLoc ? haversineKm(userLoc.lat, userLoc.lon, s.lat, s.lon) : Infinity;
        return {
          ...s,
          distKm: road?.distKm ?? hDist,
          durationMin: road?.durationMin ?? null,
          isRoad: !!road,
        };
      })
      .sort((a, b) => a.distKm - b.distKm)
      .slice(0, 10);
  }, [shelters, userLoc, roadDistances]);

  const onPressIn = () => {
    if (submitted) return;
    if (!locationRef.current) {
      Alert.alert('Chưa lấy được vị trí', 'Vui lòng đợi một chút rồi thử lại.');
      return;
    }
    holdProgress.setValue(0);
    holdAnim.current = Animated.timing(holdProgress, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    });
    holdAnim.current.start(({ finished }) => {
      if (finished) {
        setSubmitted(true);
        const { lat, lon } = locationRef.current!;
        rescueApi.createRequest({ lat, lon, peopleCount, notes: description || undefined })
          .catch(() => {});
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

          {/* People count stepper */}
          <Text style={[Typography.label, { color: themeColors.textSecondary, marginBottom: Spacing.s }]}>
            SỐ NGƯỜI CẦN CỨU HỘ
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => {
                const n = Math.max(1, peopleCount - 1);
                setPeopleCount(n);
                setPeopleText(String(n));
              }}
              style={[styles.stepperBtn, { backgroundColor: themeColors.secondary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepperBtnText, { color: themeColors.text }]}>−</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.stepperValue, { color: themeColors.text }]}
              value={peopleText}
              onChangeText={(t) => {
                const clean = t.replace(/\D/g, '');
                setPeopleText(clean);
                const n = parseInt(clean, 10);
                if (!isNaN(n) && n >= 1 && n <= 100) setPeopleCount(n);
              }}
              onBlur={() => {
                const n = Math.max(1, Math.min(100, parseInt(peopleText, 10) || 1));
                setPeopleCount(n);
                setPeopleText(String(n));
              }}
              keyboardType="numeric"
              selectTextOnFocus
              textAlign="center"
            />
            <TouchableOpacity
              onPress={() => {
                const n = Math.min(100, peopleCount + 1);
                setPeopleCount(n);
                setPeopleText(String(n));
              }}
              style={[styles.stepperBtn, { backgroundColor: themeColors.secondary }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepperBtnText, { color: themeColors.text }]}>+</Text>
            </TouchableOpacity>
          </View>

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
            {sortedShelters.length === 0 ? (
              <Text style={[Typography.caption, { color: themeColors.textSecondary, padding: Spacing.m }]}>
                Đang tải điểm sơ tán...
              </Text>
            ) : sortedShelters.map((shelter, i, arr) => (
              <TouchableOpacity
                key={shelter.id}
                style={[
                  styles.shelterRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.border },
                ]}
                onPress={() => { onSelectShelter?.(shelter); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.shelterBadge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.shelterBadgeText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.body2, { color: themeColors.text, fontWeight: '600' }]}>
                    {shelter.name}
                  </Text>
                  <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                    {[
                      shelter.address || shelter.province,
                      shelter.capacity ? `${shelter.capacity} người` : null,
                      shelter.distKm !== Infinity
                        ? shelter.isRoad
                          ? `${fmtDist(shelter.distKm)}${shelter.durationMin ? ` · ${shelter.durationMin} phút` : ''}`
                          : `~${fmtDist(shelter.distKm)}`
                        : null,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>›</Text>
              </TouchableOpacity>
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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.m,
    gap: Spacing.m,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
});
