import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, Image, ScrollView, Platform, useWindowDimensions, PanResponder, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { garageCars } from '../data/mockData';

// Best-effort photo per car name — falls back to a car icon when we don't have art.
function carImage(name: string): any | null {
  const n = name.toLowerCase();
  if (n.includes('porsche')) return require('../../assets/porsche.png');
  if (n.includes('gt-r') || n.includes('gtr') || n.includes('nissan')) return require('../../assets/gtr.png');
  if (n.includes('corolla')) return require('../../assets/corolla.png');
  if (n.includes('civic')) return require('../../assets/civic.png');
  return null;
}

interface Props {
  visible: boolean;
  current: string;            // selected car name, or 'All Cars'
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function CarPicker({ visible, current, onSelect, onClose }: Props) {
  const totalDrives = garageCars.reduce((s, c) => s + c.drives, 0);
  const totalMiles = garageCars.reduce((s, c) => s + c.miles, 0);
  const { width: winW, height: winH } = useWindowDimensions();
  const choose = (name: string) => { onSelect(name); onClose(); };

  const scrollRef = React.useRef<ScrollView>(null);
  const scrollX = React.useRef(0);
  const startScrollX = React.useRef(0);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.current = e.nativeEvent.contentOffset.x;
  };

  const pan = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Platform.OS === 'web' && Math.abs(g.dx) > 10,
    onPanResponderGrant: () => {
      startScrollX.current = scrollX.current;
    },
    onPanResponderMove: (_, g) => {
      if (Platform.OS === 'web' && scrollRef.current) {
        scrollRef.current.scrollTo({ x: Math.max(0, startScrollX.current - g.dx), animated: false });
      }
    },
    onPanResponderRelease: (_, g) => {
      if (Platform.OS === 'web' && scrollRef.current) {
        const itemWidth = winW * 0.70 + 12;
        const targetX = startScrollX.current - g.dx;
        let snapIdx = Math.round(targetX / itemWidth);
        if (g.vx < -0.5) snapIdx++;
        else if (g.vx > 0.5) snapIdx--;
        snapIdx = Math.max(0, Math.min(garageCars.length - 1, snapIdx));
        scrollRef.current.scrollTo({ x: snapIdx * itemWidth, animated: true });
      }
    },
    onPanResponderTerminate: () => { }
  }), [winW]);

  const content = (
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={[styles.sheet, { marginTop: winH * 0.38 }]} onPress={(e) => e.stopPropagation?.()}>
        <View style={styles.handle} />
        <Text style={styles.title}>Your Garage</Text>
        <Text style={styles.sub}>Filter drives by car</Text>

        <View style={{ flex: 1 }}>
          {/* All Cars */}
          <TouchableOpacity
            style={[styles.allRow, current === 'All Cars' && styles.rowSel]}
            activeOpacity={0.85}
            onPress={() => choose('All Cars')}
          >
            <View style={styles.allIcon}>
              <Ionicons name="car-sport" size={22} color={current === 'All Cars' ? '#FF7A4E' : '#C9CCD2'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.allName}>All Cars</Text>
              <Text style={styles.allMeta}>{garageCars.length} cars · {totalDrives} drives · {totalMiles.toLocaleString()} mi</Text>
            </View>
            {current === 'All Cars' && <Ionicons name="checkmark-circle" size={22} color="#FF5A2E" />}
          </TouchableOpacity>

          {/* Cars - Horizontal Scroll */}
          <ScrollView
            ref={scrollRef}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flex: 1, marginHorizontal: -18 }}
            contentContainerStyle={{ height: '100%', paddingHorizontal: 18 }}
            snapToInterval={winW * 0.68 + 12}
            decelerationRate="fast"
            snapToAlignment="start"
          >
            <View style={{ height: '100%', flexDirection: 'row', gap: 12 }} {...pan.panHandlers}>
              {garageCars.map((car, index) => {
                const img = carImage(car.name);
                const sel = current === car.name;
                const subtitle = index === 0 ? "Most Driven Car" : "Fastest Driven Car";

                return (
                  <TouchableOpacity
                    key={car.name}
                    style={[styles.card, { width: winW * 0.68 }, sel && styles.cardSel]}
                    activeOpacity={0.85}
                    onPress={() => choose(car.name)}
                  >
                    <View style={{ marginBottom: 4 }}>
                      <Text style={styles.carSub}>{subtitle}</Text>
                      <View style={styles.cardHead}>
                        <Text style={styles.carName}>{car.name}</Text>
                        {sel && <Ionicons name="checkmark-circle" size={20} color="#FF5A2E" />}
                      </View>
                    </View>

                    <View style={styles.imgWrap}>
                      {img
                        ? <Image source={img} style={styles.img} resizeMode="contain" />
                        : <MaterialCommunityIcons name="car-sports" size={72} color="#C9CCD2" />}
                    </View>

                    <View style={styles.stats}>
                      <View>
                        <Text style={styles.statN}>{car.drives}</Text>
                        <Text style={styles.statL}>Drives</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.statN}>{car.miles.toLocaleString()}</Text>
                        <Text style={styles.statL}>Miles</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Pressable>
    </Pressable>
  );

  if (Platform.OS === 'web') {
    if (!visible) return null;
    return content;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const CARD = 'rgba(255, 255, 255, 0.05)';
const BORDER = 'rgba(255, 255, 255, 0.08)';
const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
      } as any,
      default: {
        flex: 1,
      },
    }),
  },
  sheet: {
    backgroundColor: 'rgba(10, 10, 12, 0.2)', borderRadius: 32,
    flex: 1, marginHorizontal: 12, marginBottom: 12,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 110,
    borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.22)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(5px) saturate(180%)',
        WebkitBackdropFilter: 'blur(5px) saturate(180%)',
      } as any,
    }),
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  sub: { color: '#8A8A90', fontSize: 13, marginTop: 1, marginBottom: 8 },

  allRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 10, marginBottom: 8,
  },
  rowSel: { borderColor: '#FF5A2E', backgroundColor: 'rgba(255,90,46,0.06)' },
  allIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  allName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  allMeta: { color: '#8A8A90', fontSize: 11, marginTop: 1 },

  card: { height: '100%', backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 12 },
  cardSel: { borderColor: '#FF5A2E', backgroundColor: 'rgba(255,90,46,0.06)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carSub: { color: '#8A8A90', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  carName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  imgWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  img: { width: '100%', height: '100%' },
  stats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  statN: { color: '#fff', fontSize: 24, fontWeight: '800' },
  statL: { color: '#8A8A90', fontSize: 12, marginTop: 1 },
});
