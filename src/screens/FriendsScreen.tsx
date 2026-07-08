import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform, Image, Animated, PanResponder } from 'react-native';
import { colors } from '../theme/colors';
import { Avatar } from '../components/Avatar';
import { friends } from '../data/mockData';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { BaseMap } from '../components/BaseMap';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_EXPANDED_TOP = 140; // leaves a gap below the search bar when fully open
const POS_FULL = 0;
const POS_ORIGIN = Math.round(SCREEN_HEIGHT * 0.44) - SHEET_EXPANDED_TOP;
const SHEET_MIN_PEEK = 256; // header + search visible above the tab bar when minimized
const POS_MIN = SCREEN_HEIGHT - SHEET_MIN_PEEK - SHEET_EXPANDED_TOP;
const SNAP_POINTS = [POS_FULL, POS_ORIGIN, POS_MIN];
const nearestIdx = (v: number) =>
  SNAP_POINTS.reduce((best, p, i) => (Math.abs(p - v) < Math.abs(SNAP_POINTS[best] - v) ? i : best), 0);

const REGION = { latitude: 37.7719, longitude: -122.4312 };

const CAR_IMAGES: Record<string, any> = {
  'Porsche 718 Cayman': require('../../assets/porsche.png'),
  'Nissan GT-R': require('../../assets/gtr.png'),
  'GR Corolla': require('../../assets/corolla.png'),
  'Civic Type R': require('../../assets/civic.png'),
};

const CAR_SIZES: Record<string, { width: number; height: number }> = {
  'Porsche 718 Cayman': { width: 160, height: 85 },
  'Nissan GT-R': { width: 160, height: 85 },
  'GR Corolla': { width: 160, height: 85 },
  'Civic Type R': { width: 160, height: 85 },
};

export function FriendsScreen() {
  const { openFriend: onOpenFriend, openProfile: onOpenProfile, openNav: onOpenNav } = useAppContext();
  const [search, setSearch] = useState('');

  const filtered = friends.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  // Draggable bottom sheet — 3 snap points: Full / Origin / Minimized (starts at Origin)
  const sheetY = useRef(new Animated.Value(POS_ORIGIN)).current;
  const dragStart = useRef(POS_ORIGIN);
  const expandedRef = useRef(false);
  const snapToIdx = (idx: number) => {
    expandedRef.current = idx === 0;
    Animated.spring(sheetY, {
      toValue: SNAP_POINTS[idx],
      useNativeDriver: false,
      tension: 90,
      friction: 14,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
    }).start();
  };
  const expand = () => { if (!expandedRef.current) snapToIdx(0); };
  const settle = (g: { dy: number; vy: number }) => {
    const cur = Math.max(POS_FULL, Math.min(POS_MIN, dragStart.current + g.dy));
    const startIdx = nearestIdx(dragStart.current);
    const up = g.dy < -6 || g.vy < -0.25;
    const down = g.dy > 6 || g.vy > 0.25;
    const idx = up ? Math.max(0, startIdx - 1)
      : down ? Math.min(SNAP_POINTS.length - 1, startIdx + 1)
      : nearestIdx(cur);
    snapToIdx(idx);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx),
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 3 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => { sheetY.stopAnimation((v: number) => (dragStart.current = v)); },
      onPanResponderMove: (_, g) => {
        const ny = Math.max(POS_FULL, Math.min(POS_MIN, dragStart.current + g.dy));
        sheetY.setValue(ny);
      },
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderRelease: (_, g) => settle(g),
      onPanResponderTerminate: (_, g) => settle(g),
    })
  ).current;

  // Map driving friends to their map markers
  const friendMarkers = friends
    .filter(f => f.driving)
    .map((f, i) => ({
      key: f.name,
      coordinate: [
        REGION.longitude + (i - 0.5) * 0.015,
        REGION.latitude + (i - 0.5) * 0.015,
      ] as [number, number],
      title: f.name,
      avatarSeed: f.name,
    }));

  return (
    <View style={styles.container}>
      {/* Live dark MapLibre map — same as DriveScreen */}
      <BaseMap
        center={[REGION.longitude, REGION.latitude]}
        zoom={13}
        dark
        showUser
        markers={friendMarkers}
      />

      {/* Dark map overlay tint — pointerEvents none so map below stays interactive */}
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* Map controls (dark glass pill, right side) */}
      <View style={styles.mapCtrls}>
        <TouchableOpacity style={styles.ctrlBtn}>
          <Ionicons name="settings-sharp" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn}>
          <Ionicons name="moon" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn}>
          <Ionicons name="location-sharp" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn} onPress={onOpenProfile}>
          <Ionicons name="person-circle" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Drawer (draggable bottom sheet) */}
      <Animated.View style={[styles.drawer, { transform: [{ translateY: sheetY }] }]}>
        {/* Header drag zone */}
        <View {...pan.panHandlers}>
          <View style={styles.grabber}>
            <View style={styles.handle} />
          </View>
          <View style={styles.dhd}>
            <View>
              <Text style={styles.dhdTitle}>Friends</Text>
              <Text style={styles.dhdSub}>8 friends · 2 driving now</Text>
            </View>
            <TouchableOpacity style={styles.addBtn}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar — outside pan.panHandlers so it receives focus and click events on web */}
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.faint} style={{ marginRight: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find friends"
            placeholderTextColor={colors.faint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} onScrollBeginDrag={expand} scrollEventThrottle={16}>
          {filtered.map(f => (
            <TouchableOpacity key={f.name} style={[styles.frow, !f.driving && { opacity: 0.45 }]} onPress={() => onOpenFriend(f)}>
              <Avatar seed={f.name} size={38} border={f.driving} />
              <View style={styles.fm}>
                <Text style={styles.fh}>{f.name}</Text>
                <Text style={styles.fc}>{f.car}</Text>
                {f.driving ? (
                  <Text style={styles.driving}>Live • {f.speed || f.location || 'Driving'}</Text>
                ) : (
                  <Text style={styles.off}>Offline</Text>
                )}
              </View>
              {CAR_IMAGES[f.car] && (
                <Image
                  source={CAR_IMAGES[f.car]}
                  style={{
                    position: 'absolute',
                    right: 8,
                    width: CAR_SIZES[f.car]?.width ?? 110,
                    height: CAR_SIZES[f.car]?.height ?? 54,
                    resizeMode: 'contain',
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(7,7,9,0.15)',
  },
  grabber: { alignItems: 'center', paddingBottom: 12, marginTop: -4, paddingTop: 4 },
  drawer: {
    position: 'absolute', left: 12, right: 12, bottom: 12, top: SHEET_EXPANDED_TOP,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 32,
    paddingHorizontal: 20, paddingTop: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: -10 }, elevation: 12,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px) saturate(180%) brightness(0.9)', WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.9)' } as any,
      default: {},
    }),
  },
  mapSearch: {
    position: 'absolute', top: 52, left: 16, right: 16, height: 46, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.85)',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    zIndex: 90,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)' } as any,
      default: {},
    }),
  },
  mapSearchText: { flex: 1, color: '#3A3A40', fontSize: 15 },
  handle: { width: 36, height: 5, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center' },
  dhd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 8 },
  dhdTitle: { color: '#f2f2f5', fontSize: 34, fontWeight: '800', letterSpacing: -0.5, lineHeight: 38 },
  dhdSub: { color: '#555560', fontSize: 13, fontWeight: '500', marginTop: 4 },
  addBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)' } as any,
      default: {},
    }),
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500', outlineStyle: 'none' as any },
  frow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 12, marginBottom: 6,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  fm: { flex: 1, marginRight: 110 },
  fh: { color: '#fff', fontSize: 15, fontWeight: '600' },
  fc: { color: '#888892', fontSize: 11, marginTop: 2 },
  driving: { color: colors.go, fontSize: 12, fontWeight: '500', marginTop: 4 },
  drivingSub: { color: colors.faint, fontSize: 11, textAlign: 'right' },
  off: { color: colors.faint, fontSize: 12, marginTop: 4 },
  mapCtrls: {
    position: 'absolute', top: 112, right: 14, zIndex: 90,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20,
    paddingVertical: 4, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%) brightness(0.9)', WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.9)' } as any,
      default: {},
    }),
  },
  ctrlBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ctrlDivider: { height: 1, width: 26, backgroundColor: 'rgba(255,255,255,0.08)' },
});
