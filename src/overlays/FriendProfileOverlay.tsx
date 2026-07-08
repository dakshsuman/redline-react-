import React from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ImageBackground, Image } from 'react-native';
import Svg, { Polygon, Path, Circle } from 'react-native-svg';

interface Props {
  visible: boolean;
  friend: any;
  onClose: () => void;
}

const HERO = 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=900&q=80';

const CAR_IMAGES: Record<string, any> = {
  'Porsche 718 Cayman': require('../../assets/porsche.png'),
  'Nissan GT-R': require('../../assets/gtr.png'),
  'GR Corolla': require('../../assets/corolla.png'),
  'Civic Type R': require('../../assets/civic.png'),
};

const achievements: { label: string; color: string; icon: any; lib: 'ion' | 'mci' }[] = [
  { label: '100 MPH Club', color: '#FF4438', icon: 'speedometer', lib: 'mci' },
  { label: 'Night Rider', color: '#A56BFF', icon: 'moon', lib: 'ion' },
  { label: 'Road Warrior', color: '#5FA85F', icon: 'shield-checkmark', lib: 'ion' },
  { label: 'Speed Demon', color: '#F0C040', icon: 'flash', lib: 'ion' },
  { label: 'Explorer', color: '#5B8DEF', icon: 'location', lib: 'ion' },
];

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

function Hex({ size, color, fill = 'rgba(255,255,255,0.03)', stroke = 4, children }: { size: number; color: string; fill?: string; stroke?: number; children?: React.ReactNode }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill as any}>
        <Polygon points="50,3 91,26 91,74 50,97 9,74 9,26" fill={fill} stroke={color} strokeWidth={stroke} strokeLinejoin="round" />
      </Svg>
      {children}
    </View>
  );
}

function AchIcon({ a }: { a: (typeof achievements)[number] }) {
  if (a.lib === 'mci') return <MaterialCommunityIcons name={a.icon} size={22} color={a.color} />;
  return <Ionicons name={a.icon} size={20} color={a.color} />;
}

function Spark({ data, w = 60, h = 26 }: { data: number[]; w?: number; h?: number }) {
  const max = Math.max(...data), min = Math.min(...data), rng = max - min || 1, pad = 4;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / rng) * (h - pad * 2);
    return [x, y] as const;
  });
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={w} height={h}>
      <Path d={d} stroke="#FF3B30" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={2.6} fill="#FF3B30" />
    </Svg>
  );
}

export function FriendProfileOverlay({ visible, friend, onClose }: Props) {
  if (!friend) return null;

  const seed = hash(friend.name);
  const drives = Math.max(40, Math.round(friend.totalMiles / 68));
  const hours = Math.round(friend.totalMiles / 48);
  const rankLetter = friend.rank <= 1 ? 'S' : friend.rank <= 3 ? 'A' : friend.rank <= 6 ? 'B' : 'C';
  const pct = Math.max(0.15, Math.min(0.95, 1 - friend.rank / 12));
  const carImg = CAR_IMAGES[friend.car];

  const stats = [
    { label: 'Total Drives', value: `${drives}` },
    { label: 'Top Speed', value: `${friend.topSpeed}` },
    { label: 'Total Distance', value: friend.totalMiles.toLocaleString() },
    { label: 'Total Time', value: `${hours}h` },
  ];

  const perf: { label: string; val: string; unit?: string; spark: number[] }[] = [
    { label: 'Average Speed', val: `${Math.round(friend.topSpeed * 0.42)}`, unit: 'MPH', spark: [2, 1.4 + (seed % 3), 2.2, 1.8, 3.4, 4.2] },
    { label: 'Longest Drive', val: `${friend.longest}`, unit: 'mi', spark: [2, 3.6, 4.4, 3, 3.8, 2.2] },
    { label: 'Total Drives', val: `${drives}`, spark: [2, 2.4, 2.9, 3.4, 4, 3.7] },
    { label: 'Drive Time', val: `${hours}h`, spark: [3, 2, 2.6, 3.9, 4.6, 3.9] },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Hero */}
          <ImageBackground source={{ uri: HERO }} style={styles.hero} imageStyle={{ resizeMode: 'cover' }}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroBottom}>
              <View style={styles.avatarRing}>
                <Ionicons name="person" size={44} color="#fff" />
              </View>
              <Text style={styles.name}>{friend.name}</Text>
              {friend.driving
                ? <Text style={styles.member}><Text style={{ color: '#3ED686' }}>● Driving now</Text> · {friend.speed}</Text>
                : <Text style={styles.member}>{friend.car}</Text>}
            </View>
          </ImageBackground>

          {/* Compare / Battle actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cmpBtn} activeOpacity={0.8}>
              <Ionicons name="git-compare" size={16} color="#E8E8EA" />
              <Text style={styles.cmpText}>Compare</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.battleBtn} activeOpacity={0.85}>
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.battleText}>Battle</Text>
            </TouchableOpacity>
          </View>

          {/* Stat cards */}
          <View style={styles.statRow}>
            {stats.map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{s.value}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Driver Rank */}
          <View style={styles.rankCard}>
            <View style={styles.rankRow}>
              <Hex size={64} color="#FF4438" fill="rgba(255,68,56,0.10)" stroke={5}>
                <Text style={styles.rankHexS}>{rankLetter}</Text>
              </Hex>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.eyebrow}>Driver Rank</Text>
                <Text style={styles.rankTitle}>{rankLetter} Rank Driver</Text>
              </View>
            </View>
            <View style={styles.xpBarTrack}>
              <View style={[styles.xpBarFill, { width: `${pct * 100}%` }]} />
            </View>
            <View style={styles.xpRow}>
              <Text style={styles.xpText}>{friend.totalMiles.toLocaleString()} mi</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.xpTextDim}>Global Rank</Text>
                <Text style={styles.xpText}>#{friend.rank}</Text>
              </View>
            </View>
          </View>

          {/* Car */}
          <View style={styles.carRow}>
            <View style={styles.carCard}>
              <Text style={styles.eyebrow}>Main Car</Text>
              <Text style={styles.carName}>{friend.car}</Text>
              <View style={styles.carImgWrap}>
                {carImg
                  ? <Image source={carImg} style={styles.carImg} resizeMode="contain" />
                  : <MaterialCommunityIcons name="car-sports" size={78} color="#C9CCD2" />}
              </View>
              <View style={styles.carStats}>
                <View>
                  <Text style={styles.carStatN}>{drives}</Text>
                  <Text style={styles.carStatL}>Drives</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.carStatN}>{friend.totalMiles.toLocaleString()}</Text>
                  <Text style={styles.carStatL}>Miles</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Achievements */}
          <View style={styles.achCard}>
            <View style={styles.achHeader}>
              <Text style={styles.achTitle}>Achievements</Text>
              <TouchableOpacity><Text style={styles.viewAll}>View All ›</Text></TouchableOpacity>
            </View>
            <View style={styles.achRow}>
              {achievements.map(a => (
                <View key={a.label} style={styles.achItem}>
                  <Hex size={54} color={a.color} fill={`${a.color}18`} stroke={3}>
                    <AchIcon a={a} />
                  </Hex>
                  <Text style={styles.achLabel} numberOfLines={1}>{a.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Performance Overview */}
          <View style={styles.perfCard}>
            <View style={styles.perfHeader}>
              <Text style={styles.perfTitle}>Performance Overview</Text>
              <TouchableOpacity style={styles.perfDrop}>
                <Text style={styles.perfDropText}>This Month</Text>
                <Ionicons name="chevron-down" size={14} color="#C8C8CE" />
              </TouchableOpacity>
            </View>
            <View style={styles.perfRow}>
              {perf.map((p, i) => (
                <React.Fragment key={p.label}>
                  {i > 0 && <View style={styles.perfDivider} />}
                  <View style={styles.perfCell}>
                    <Text style={styles.perfLabel} numberOfLines={1}>{p.label}</Text>
                    <View style={styles.perfValRow}>
                      <Text style={styles.perfVal}>{p.val}</Text>
                      {p.unit && <Text style={styles.perfUnit}>{p.unit}</Text>}
                    </View>
                    <Spark data={p.spark} />
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const CARD = '#161618';
const BORDER = 'rgba(255,255,255,0.06)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  hero: { height: 290, justifyContent: 'flex-end', backgroundColor: '#141416' },
  closeBtn: {
    position: 'absolute', top: 48, left: 18, width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: { alignItems: 'center', paddingBottom: 20 },
  avatarRing: {
    width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: '#fff',
    backgroundColor: 'rgba(20,20,22,0.55)', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  name: { color: '#fff', fontSize: 26, fontWeight: '700' },
  member: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  cmpBtn: {
    flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center',
  },
  cmpText: { color: '#E8E8EA', fontSize: 14, fontWeight: '600' },
  battleBtn: {
    flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#FF5A2E', alignItems: 'center', justifyContent: 'center',
  },
  battleText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  statRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  statCard: {
    flex: 1, minHeight: 90, backgroundColor: '#1B1B1E', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 8, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  statVal: { color: '#fff', fontSize: 21, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: '#B0B0B6', fontSize: 11.5, fontWeight: '500', textAlign: 'center' },

  eyebrow: { color: '#8A8A90', fontSize: 11, fontWeight: '600' },

  rankCard: { marginHorizontal: 16, marginTop: 14, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center' },
  rankHexS: { color: '#FF4438', fontSize: 26, fontWeight: '800' },
  rankTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 },
  xpBarTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 16, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3, backgroundColor: '#FF4438' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  xpText: { color: '#C8C8CE', fontSize: 12, fontWeight: '600' },
  xpTextDim: { color: '#6A6A70', fontSize: 11 },

  carRow: { paddingHorizontal: 16, paddingTop: 14 },
  carCard: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  carName: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 4 },
  carImgWrap: { height: 138, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  carImg: { width: '100%', height: 138 },
  carStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  carStatN: { color: '#fff', fontSize: 24, fontWeight: '700' },
  carStatL: { color: '#8A8A90', fontSize: 12 },

  achCard: { marginHorizontal: 16, marginTop: 14, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  achHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  achTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  viewAll: { color: '#FF4438', fontSize: 13, fontWeight: '600' },
  achRow: { flexDirection: 'row', justifyContent: 'space-between' },
  achItem: { alignItems: 'center', width: 64 },
  achLabel: { color: '#8A8A90', fontSize: 9.5, marginTop: 6, textAlign: 'center' },

  perfCard: { marginHorizontal: 16, marginTop: 14, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 16 },
  perfHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  perfTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  perfDrop: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  perfDropText: { color: '#E8E8EA', fontSize: 13, fontWeight: '500' },
  perfRow: { flexDirection: 'row' },
  perfCell: { flex: 1, paddingHorizontal: 6 },
  perfDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 2 },
  perfLabel: { color: '#8A8A90', fontSize: 11, marginBottom: 8 },
  perfValRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 10 },
  perfVal: { color: '#fff', fontSize: 22, fontWeight: '700' },
  perfUnit: { color: '#9A9AA0', fontSize: 11, marginBottom: 3, fontWeight: '600' },
});
