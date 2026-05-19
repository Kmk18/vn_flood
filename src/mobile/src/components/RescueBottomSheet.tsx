import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated, Image,
  Dimensions, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
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
  onSubmitted?: () => void;
}

export const RescueBottomSheet: React.FC<Props> = ({ visible, onClose, onSelectShelter, onSubmitted }) => {
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
  const [photos, setPhotos] = useState<string[]>([]);

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
        setPhotos([]);
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

  const handlePickImage = () => {
    const remaining = 5 - photos.length;
    if (remaining <= 0) return;
    Alert.alert('Thêm ảnh', undefined, [
      {
        text: 'Chụp ảnh',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled) setPhotos((p) => [...p, result.assets[0].uri].slice(0, 5));
        },
      },
      {
        text: 'Chọn từ thư viện',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
            quality: 0.7,
          });
          if (!result.canceled)
            setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)].slice(0, 5));
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

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
        rescueApi.createRequest({ lat, lon, peopleCount, notes: description || undefined, photos })
          .catch(() => {});
        setTimeout(() => onSubmitted?.(), 1500);
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
          <TextInput
            style={[styles.descInput, { color: themeColors.text }]}
            placeholder="Mô tả tình huống: vị trí, sức khỏe..."
            placeholderTextColor={themeColors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* People count row */}
          <View style={[styles.metaRow, { borderTopColor: themeColors.border }]}>
            <Ionicons name="people-outline" size={18} color={themeColors.textSecondary} />
            <Text style={[styles.metaLabel, { color: themeColors.text }]}>Số người</Text>
            <View style={styles.stepperInline}>
              <TouchableOpacity
                style={styles.stepperHit}
                onPress={() => { const n = Math.max(1, peopleCount - 1); setPeopleCount(n); setPeopleText(String(n)); }}
                activeOpacity={0.6}
              >
                <Text style={[styles.stepperTick, { color: themeColors.primary }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={[styles.stepperValueInput, { color: themeColors.text }]}
                value={peopleText}
                onChangeText={(t) => {
                  const clean = t.replace(/\D/g, '');
                  setPeopleText(clean);
                  const n = parseInt(clean, 10);
                  if (!isNaN(n) && n >= 1 && n <= 100) setPeopleCount(n);
                }}
                onBlur={() => {
                  const n = Math.max(1, Math.min(100, parseInt(peopleText, 10) || 1));
                  setPeopleCount(n); setPeopleText(String(n));
                }}
                keyboardType="numeric"
                selectTextOnFocus
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.stepperHit}
                onPress={() => { const n = Math.min(100, peopleCount + 1); setPeopleCount(n); setPeopleText(String(n)); }}
                activeOpacity={0.6}
              >
                <Text style={[styles.stepperTick, { color: themeColors.primary }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photos row */}
          <View style={[styles.metaRow, { borderTopColor: themeColors.border, alignItems: 'flex-start', paddingVertical: Spacing.m }]}>
            <Ionicons name="camera-outline" size={18} color={themeColors.textSecondary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.metaLabel, { color: themeColors.text, marginBottom: photos.length > 0 ? Spacing.s : 0 }]}>
                Ảnh hiện trường
              </Text>
              {photos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.xs }}>
                  {photos.map((uri, i) => (
                    <View key={i} style={styles.thumbWrap}>
                      <Image source={{ uri }} style={styles.thumb} />
                      <TouchableOpacity
                        style={styles.thumbRemove}
                        onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close-circle" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < 5 && (
                    <TouchableOpacity
                      style={[styles.thumbAdd, { borderColor: themeColors.border }]}
                      onPress={handlePickImage}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={26} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
              {photos.length === 0 && (
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
                  <Text style={[Typography.body2, { color: themeColors.primary }]}>Thêm ảnh</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Shelter list */}
          <Text style={[Typography.label, { color: themeColors.textSecondary, marginTop: Spacing.l, marginBottom: 0 }]}>
            Điểm sơ tán gần nhất
          </Text>
          {sortedShelters.length === 0 ? (
            <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: Spacing.s }]}>
              Đang tải...
            </Text>
          ) : sortedShelters.map((shelter) => (
            <TouchableOpacity
              key={shelter.id}
              style={[styles.shelterRow, { borderTopColor: themeColors.border }]}
              onPress={() => { onSelectShelter?.(shelter); onClose(); }}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={[Typography.body2, { color: themeColors.text, fontWeight: '600' }]} numberOfLines={1}>
                  {shelter.name}
                </Text>
                <Text style={[Typography.caption, { color: themeColors.textSecondary, marginTop: 2 }]}>
                  {[
                    shelter.address || shelter.province,
                    shelter.capacity ? `${shelter.capacity} người` : null,
                    shelter.distKm !== Infinity
                      ? shelter.isRoad ? fmtDist(shelter.distKm) : `~${fmtDist(shelter.distKm)}`
                      : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={themeColors.textSecondary} />
            </TouchableOpacity>
          ))}

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
    bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.s, marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.l, paddingVertical: Spacing.m,
  },
  pulseWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24 },
  sosDot: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sosText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  closeBtn: { padding: Spacing.s },

  body: { paddingHorizontal: Spacing.l, paddingBottom: Spacing.m },

  descInput: {
    fontSize: 15,
    paddingVertical: Spacing.m,
    minHeight: 72,
    lineHeight: 22,
  },

  // Row-style fields (people count, photos)
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.m,
  },
  metaLabel: { flex: 1, fontSize: 15 },

  // Stepper
  stepperInline: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepperHit: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperTick: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
  stepperValueInput: { fontSize: 16, fontWeight: '600', minWidth: 32, textAlign: 'center' },

  // Photo thumbnails
  thumbWrap: { marginRight: Spacing.s, position: 'relative' },
  thumb: { width: 76, height: 76, borderRadius: 8 },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  thumbAdd: {
    width: 76, height: 76, borderRadius: 8,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Shelter rows — flat, divider only
  shelterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.m,
    gap: Spacing.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  // Hold-to-submit
  holdWrap: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.m,
    paddingBottom: Spacing.l,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  holdOuter: { height: 52, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  holdFill: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  holdText: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
