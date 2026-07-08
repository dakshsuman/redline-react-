import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { GlassCard, SegmentedControl, StatChip, PodiumCard, LeaderboardRow } from '../components/DashboardUI';

type Row = {
  name: string; car: string; flag: string; friend?: boolean; me?: boolean;
  miles: number; top: number; battles: number; drives: number;
  _v?: number; _rank?: number;
};

const board: Row[] = [
  { name: 'Marcus Chen', car: 'M3 Competition', flag: '🇺🇸', friend: true, miles: 3842, top: 191, battles: 288, drives: 540 },
  { name: 'Sofia Ramirez', car: 'Porsche Cayman', flag: '🇲🇽', friend: true, miles: 3610, top: 196, battles: 270, drives: 512 },
  { name: 'Ray Whitaker', car: 'Nissan GTR', flag: '🇬🇧', miles: 3088, top: 168, battles: 204, drives: 488 },
  { name: 'Ethan Brooks', car: 'GR Corolla', flag: '🇨🇦', friend: true, miles: 2940, top: 162, battles: 176, drives: 455 },
  { name: 'Priya Nair', car: 'Civic Type R', flag: '🇮🇳', friend: true, miles: 2712, top: 171, battles: 121, drives: 401 },
  { name: 'Tomás Alvarez', car: 'Supra MK5', flag: '🇪🇸', miles: 2455, top: 180, battles: 98, drives: 372 },
  { name: 'Lena Vogel', car: 'M3 Comp', flag: '🇩🇪', miles: 2210, top: 178, battles: 160, drives: 330 },
  { name: 'You', car: 'M2 Competition', flag: '🇺🇸', friend: true, me: true, miles: 1204, top: 142, battles: 96, drives: 128 },
];

const metrics = ['Drives', 'Top Speed', 'Distance', 'Battle'];
const scopes = ['World', 'Country', 'Friends'];
const times = ['Week', 'Month', 'All-Time'];
const mKey: Record<string, keyof Row> = { Drives: 'drives', 'Top Speed': 'top', Distance: 'miles', Battle: 'battles' };
const timeMul: Record<string, number> = { Week: 0.1, Month: 0.34, 'All-Time': 1 };

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function metricVal(r: Row, metric: string, time: string) {
  if (metric === 'Top Speed') return r.top; // record, not cumulative
  const base = r[mKey[metric]] as number;
  if (time === 'All-Time') return base;
  const jit = 0.8 + (hash(r.name + time) % 40) / 100;
  return Math.round(base * timeMul[time] * jit);
}
function fmt(metric: string, v: number) {
  if (metric === 'Distance') return v.toLocaleString() + ' mi';
  if (metric === 'Top Speed') return v + ' mph';
  if (metric === 'Battle') return v + ' W';
  return '' + v;
}

// Brand logo drawing helpers for premium visual touch
function BmwLogo() {
  return (
    <Svg width={12} height={12} viewBox="0 0 10 10" style={{ marginRight: 4 }}>
      <Circle cx={5} cy={5} r={4.5} fill="#000" stroke="#fff" strokeWidth={0.5} />
      <Path d="M5 1 A 4 4 0 0 1 9 5 L 5 5 Z" fill="#0066B2" />
      <Path d="M1 5 A 4 4 0 0 1 5 1 L 5 5 Z" fill="#fff" />
      <Path d="M5 5 L 9 5 A 4 4 0 0 1 5 9 Z" fill="#fff" />
      <Path d="M5 5 L 5 9 A 4 4 0 0 1 1 5 Z" fill="#0066B2" />
    </Svg>
  );
}

function PorscheLogo() {
  return (
    <Svg width={12} height={12} viewBox="0 0 10 10" style={{ marginRight: 4 }}>
      <Path d="M2 1 H8 L7 7 L5 9 L3 7 Z" fill="#D4AF37" stroke="#000" strokeWidth={0.5} />
      <Path d="M5 2 L5 8" stroke="#000" strokeWidth={0.5} />
      <Path d="M3.5 4 H6.5" stroke="#000" strokeWidth={0.5} />
    </Svg>
  );
}

function NissanLogo() {
  return (
    <Svg width={12} height={12} viewBox="0 0 10 10" style={{ marginRight: 4 }}>
      <Circle cx={5} cy={5} r={4.5} stroke="#C0C0C0" strokeWidth={1} fill="none" />
      <Path d="M1.5 5 H8.5" stroke="#C0C0C0" strokeWidth={1.5} />
    </Svg>
  );
}

function CarIcon() {
  return <Ionicons name="car-outline" size={10} color="rgba(255, 255, 255, 0.55)" style={{ marginRight: 4 }} />;
}

export function LeaderboardScreen() {
  const [metric, setMetric] = useState('Drives');
  const [scope, setScope] = useState('World');
  const [time, setTime] = useState('All-Time');

  let list = board.slice();
  if (scope === 'Friends') list = list.filter(r => r.friend || r.me);
  else if (scope === 'Country') { const f = (board.find(r => r.me) || {}).flag; list = list.filter(r => r.flag === f); }
  list = list.map(r => ({ ...r, _v: metricVal(r, metric, time) })).sort((a, b) => (b._v as number) - (a._v as number));
  list.forEach((r, i) => (r._rank = i + 1));
  const me = list.find(r => r.me);
  const top3 = list.slice(0, 3);
  const rest = list.slice(3).filter(r => !r.me);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Title & Share header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <TouchableOpacity style={styles.shareBtn} activeOpacity={0.8}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Metric/Category selection tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
        {metrics.map(m => (
          <StatChip
            key={m}
            label={m}
            active={metric === m}
            onPress={() => setMetric(m)}
            style={{ marginRight: m === 'Battle' ? 0 : 10 }}
          />
        ))}
      </ScrollView>

      {/* Scope segmented control */}
      <SegmentedControl
        options={scopes}
        selected={scope}
        onSelect={setScope}
        style={{ marginBottom: 24 }}
      />


      {/* Top 3 Podium Cards */}
      <View style={styles.podium}>
        {/* Rank 2 (Left) */}
        {top3[1] && (
          <PodiumCard
            rank={2}
            name={top3[1].name}
            value={fmt(metric, top3[1]._v as number)}
            car={top3[1].name === 'Sofia Ramirez' ? '718 Cayman' : top3[1].car}
            logoComponent={top3[1].name === 'Sofia Ramirez' ? <PorscheLogo /> : <CarIcon />}
          />
        )}

        {/* Rank 1 (Middle - elevated card with accent border) */}
        {top3[0] && (
          <PodiumCard
            rank={1}
            name={top3[0].name}
            value={fmt(metric, top3[0]._v as number)}
            car={top3[0].name === 'Marcus Chen' ? 'M3 Comp' : top3[0].car}
            isFirst
            logoComponent={top3[0].name === 'Marcus Chen' ? <BmwLogo /> : <CarIcon />}
          />
        )}

        {/* Rank 3 (Right) */}
        {top3[2] && (
          <PodiumCard
            rank={3}
            name={top3[2].name}
            value={fmt(metric, top3[2]._v as number)}
            car={top3[2].name === 'Ray Whitaker' ? 'GTR' : top3[2].car}
            logoComponent={top3[2].name === 'Ray Whitaker' ? <NissanLogo /> : <CarIcon />}
          />
        )}
      </View>

      {/* Ranks 4-7 list card */}
      {rest.length > 0 && (
        <GlassCard style={styles.listCard}>
          {rest.map((r, i) => (
            <LeaderboardRow
              key={i}
              rank={r._rank as number}
              name={r.name}
              car={r.car}
              value={fmt(metric, r._v as number)}
              isLast={i === rest.length - 1}
            />
          ))}
        </GlassCard>
      )}

      {/* Sticky "You" rank card (matches design guidelines: subtle accent border and slightly brighter bg) */}
      {me && (
        <LeaderboardRow
          rank={me._rank as number}
          name="You"
          car={me.car}
          value={fmt(metric, me._v as number)}
          isMe
          trend={<Text style={{ color: colors.go, fontSize: 12, fontWeight: '700' }}>▲ 2</Text>}
        />
      )}

      {/* City Location indicator */}
      <View style={styles.cityRow}>
        <Ionicons name="compass-outline" size={14} color="rgba(255, 255, 255, 0.55)" style={{ marginRight: 6 }} />
        <Text style={styles.cityText}>#{me ? me._rank : '—'} in your city • San Francisco</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  metricsRow: { paddingBottom: 4, marginBottom: 16, flexGrow: 1, justifyContent: 'center', flexDirection: 'row' },
  podium: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 24 },
  listCard: { marginBottom: 16 },

  cityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 28 },
  cityText: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12.5, fontWeight: '500' },
});
