import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { DateRangePicker, RangeResult } from '../components/DateRangePicker';
import { GlassCard, SegmentedControl, StatChip } from '../components/DashboardUI';

import { drives } from '../data/mockData';

const AMBER = '#F5A623';

type Longest = { date: string; time: string; meta: string; avgMph: string; topMph: string; distMi: number; dur: string };
type StatSet = {
  recap: string;
  distance: string;   // total distance, comma-formatted
  drives: string;
  hours: string;
  avg: string;
  topSpeed: string;
  zeroSixty: string;
  longestDrive: string;
  longest: Longest;
};

const WINDOWS = ['All-time', 'Custom', 'July', 'Jun', 'May'];

function parseDurationToMins(dur: string): number {
  const hMatch = dur.match(/(\d+)\s*h/);
  const mMatch = dur.match(/(\d+)\s*m/);
  let mins = 0;
  if (hMatch) mins += parseInt(hMatch[1], 10) * 60;
  if (mMatch) mins += parseInt(mMatch[1], 10);
  return mins;
}

function getStatsForDrives(filteredDrives: typeof drives, recapLabel: string): StatSet {
  if (filteredDrives.length === 0) {
    return {
      recap: recapLabel,
      distance: '0',
      drives: '0',
      hours: '0 hrs',
      avg: '0 Mph',
      topSpeed: '0 Mph',
      zeroSixty: '3.4 Sec',
      longestDrive: '0 Miles',
      longest: { date: '—', time: '—', meta: '0 mi · 0m', avgMph: '0', topMph: '0', distMi: 0, dur: '0m' },
    };
  }

  const totalDistance = filteredDrives.reduce((sum, drv) => sum + drv.dist, 0);
  const totalDrives = filteredDrives.length;
  const totalMinutes = filteredDrives.reduce((sum, drv) => sum + parseDurationToMins(drv.dur), 0);
  const totalHours = Math.round(totalMinutes / 60);

  // Top speed
  const maxTopSpeed = Math.max(...filteredDrives.map(drv => drv.top));
  
  // Longest drive
  const longestDriveObj = filteredDrives.reduce((prev, current) => (prev.dist > current.dist) ? prev : current);

  // Average speed (weighted by duration)
  const avgSpeed = totalMinutes > 0 ? Math.round((totalDistance / (totalMinutes / 60))) : 0;

  // Let's compute average speed of the longest drive specifically to fill "avgMph" field
  const longestMins = parseDurationToMins(longestDriveObj.dur);
  const longestAvgMph = longestMins > 0 ? Math.round(longestDriveObj.dist / (longestMins / 60)) : 0;

  // Split date and time for the longest inset card
  const dateParts = longestDriveObj.date.split(' \· ');
  const longestDate = dateParts[0];
  const longestTime = dateParts[1] ? dateParts[1] : 'Commute';

  return {
    recap: recapLabel,
    distance: Math.round(totalDistance).toLocaleString(),
    drives: String(totalDrives),
    hours: `${totalHours} hrs`,
    avg: `${avgSpeed} Mph`,
    topSpeed: `${maxTopSpeed} Mph`,
    zeroSixty: '3.4 Sec',
    longestDrive: `${Math.round(longestDriveObj.dist)} Miles`,
    longest: {
      date: longestDate,
      time: longestTime,
      meta: `${longestDriveObj.dist} mi · ${longestDriveObj.dur}`,
      avgMph: String(longestAvgMph),
      topMph: String(longestDriveObj.top),
      distMi: longestDriveObj.dist,
      dur: longestDriveObj.dur,
    }
  };
}

function RouteSquiggle() {
  return (
    <View style={styles.thumb}>
      <Svg width={30} height={30} viewBox="0 0 30 30">
        <Path d="M6 24 C9 14 13 21 15 13 C16.5 7 20 12 20 8 C20 5 22 4 24 5" stroke="#EDEDED" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function StatRow({ label, value, valueColor = '#fff' }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function LongestInset({ l, mph, mphColor = '#fff', onPress }: { l: Longest; mph: string; mphColor?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.inset} activeOpacity={0.85} onPress={onPress}>
      <RouteSquiggle />
      <View style={{ flex: 1 }}>
        <Text style={styles.insetEyebrow}>Longest Drive</Text>
        <Text style={styles.insetDate}>{l.date}</Text>
        <Text style={styles.insetTime}>{l.time}</Text>
        <Text style={styles.insetMeta}>{l.meta}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.insetMph, { color: mphColor }]}>{mph}</Text>
        <Text style={styles.insetMphUnit}>MPH</Text>
      </View>
    </TouchableOpacity>
  );
}

function SharePill() {
  return (
    <TouchableOpacity style={styles.sharePill} activeOpacity={0.7}>
      <Ionicons name="share-outline" size={15} color="#D6D6DA" />
      <Text style={styles.shareText}>Share</Text>
    </TouchableOpacity>
  );
}

export function StatsScreen() {
  const { openDetail } = useAppContext();
  const [win, setWin] = useState('All-time');
  const [customModal, setCustomModal] = useState(false);
  const [custom, setCustom] = useState<{ label: string; days: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'driving' | 'performance'>('driving');

  const onPill = (w: string) => {
    if (w === 'Custom') { setCustomModal(true); }
    else setWin(w);
  };
  const applyRange = (r: RangeResult) => {
    setCustomModal(false);
    if (r.all) { setCustom(null); setWin('All-time'); }
    else { setCustom({ label: r.label, days: r.days }); setWin('Custom'); }
  };

  // Filter drives based on window selection
  let filtered = drives;
  if (win === 'July') {
    filtered = drives.filter(drv => drv.date.toLowerCase().includes('july'));
  } else if (win === 'Jun') {
    filtered = drives.filter(drv => drv.date.toLowerCase().includes('june'));
  } else if (win === 'May') {
    filtered = drives.filter(drv => drv.date.toLowerCase().includes('may'));
  } else if (win === 'Custom' && custom) {
    const maxCount = Math.max(1, Math.min(drives.length, Math.round(drives.length * (custom.days / 365))));
    filtered = drives.slice(0, maxCount);
  }

  const d = getStatsForDrives(filtered, win === 'Custom' && custom ? custom.label : win);

  const openLongest = () =>
    openDetail({ id: 1, name: 'Longest Drive', date: d.longest.date, dist: d.longest.distMi, top: parseInt(d.longest.topMph, 10), dur: d.longest.dur, pb: true, car: 'Civic Type R' });

  // Scale factor for garage stats
  let garageScale = 1.0;
  if (win === 'July') garageScale = 0.1;
  else if (win === 'Jun') garageScale = 0.12;
  else if (win === 'May') garageScale = 0.11;
  else if (win === 'Custom' && custom) {
    garageScale = Math.min(1.0, custom.days / 365);
  }

    const getDrivingRecords = () => {
      const avgSpeeds = drives.map(drv => {
        const mins = parseDurationToMins(drv.dur);
        return { drv, avg: mins > 0 ? (drv.dist / (mins / 60)) : 0 };
      });
      const fastestAvg = avgSpeeds.reduce((prev, curr) => prev.avg > curr.avg ? prev : curr, { drv: drives[0], avg: 0 });

      const nightOwlDrive = drives.find(drv => drv.name.toLowerCase().includes('night')) || drives[7] || drives[0];

      const juneDrives = drives.filter(drv => drv.date.toLowerCase().includes('june'));
      const juneMiles = juneDrives.reduce((sum, drv) => sum + drv.dist, 0);

      const longestDurDrive = drives.reduce((prev, curr) => parseDurationToMins(prev.dur) > parseDurationToMins(curr.dur) ? prev : curr, drives[0]);

      const explorerRoads = 24;

      const furthestDrive = drives.reduce((prev, curr) => prev.dist > curr.dist ? prev : curr, drives[0]);

      return [
        { title: 'Fastest Run', desc: 'Fastest average speed over 10 miles', value: `${Math.round(fastestAvg.avg)} Mph`, sub: fastestAvg.drv?.name || 'Canyon Run' },
        { title: 'Night Owl', desc: 'Longest drive between 10 PM–5 AM', value: `${nightOwlDrive.dist} mi`, sub: nightOwlDrive.name },
        { title: 'Road Warrior', desc: 'Most miles in a single week', value: `${Math.round(juneMiles)} mi`, sub: 'June Week 4' },
        { title: 'Endurance Driver', desc: 'Longest continuous drive', value: longestDurDrive.dur, sub: longestDurDrive.name },
        { title: 'Explorer', desc: 'Most new roads discovered', value: `${explorerRoads} roads`, sub: 'Canyon Blast' },
        { title: 'Adventure Day', desc: 'Furthest distance from home', value: `${furthestDrive.dist} mi`, sub: furthestDrive.name },
      ];
    };

    const getPerformanceRecords = () => {
      const maxTopSpeed = drives.reduce((prev, curr) => prev.top > curr.top ? prev : curr, drives[0]);

      return [
        { title: '0-60 Launcher', desc: 'Fastest acceleration from 0 to 60 MPH', value: '3.4 Sec', sub: 'BMW M2' },
        { title: 'G-Force Hero', desc: 'Highest lateral G-force recorded in a turn', value: '1.24 G', sub: 'Canyon Run' },
        { title: 'Quarter Mile King', desc: 'Best quarter-mile drag time', value: '11.45 Sec', sub: 'BMW M2' },
        { title: 'Braking Master', desc: 'Shortest stopping distance from 60 MPH', value: '98 ft', sub: 'Toyota GR86' },
        { title: 'Launch Control', desc: 'Most consecutive successful launch control starts', value: '8 starts', sub: 'BMW M2' },
        { title: 'Top Speed Run', desc: 'Highest top speed reached in a single drive', value: `${maxTopSpeed.top} Mph`, sub: maxTopSpeed.car },
      ];
    };

    const records = activeTab === 'driving' ? getDrivingRecords() : getPerformanceRecords();

    return (
      <View style={styles.screenContainer}>
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Statistics</Text>

          {/* Time filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
            {WINDOWS.map(w => {
              const label = w === 'Custom' && custom ? custom.label : w;
              return (
                <StatChip
                  key={w}
                  label={label}
                  active={win === w}
                  onPress={() => onPill(w)}
                  style={{ marginRight: 10 }}
                />
              );
            })}
          </ScrollView>

          {/* Recap banner */}
          <GlassCard style={styles.recap}>
            <TouchableOpacity style={styles.recapClick} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={styles.recapTitle}>Your {d.recap} Recap is here</Text>
                <Text style={styles.recapSub}>See how you performed</Text>
              </View>
              <Image source={require('../../assets/porsche.png')} style={styles.recapCar} resizeMode="contain" />
            </TouchableOpacity>
          </GlassCard>

          {/* Personal Best */}
          <GlassCard style={styles.card}>
            <Text style={styles.cardSectionTitle}>Personal Best</Text>
            <View style={styles.rows}>
              <StatRow label="Top speed" value={d.topSpeed} />
              <StatRow label="0-60 MPH" value={d.zeroSixty} />
              <StatRow label="Longest drive" value={d.longestDrive} />
            </View>
            <LongestInset l={d.longest} mph={d.longest.topMph} onPress={openLongest} />
          </GlassCard>

          {/* Total Drive Distance */}
          <GlassCard style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>Total Drive Distance</Text>
              <SharePill />
            </View>
            <Text style={styles.big}>{d.distance} <Text style={styles.bigUnit}>mi</Text></Text>
            <View style={styles.rows}>
              <StatRow label="Drives" value={d.drives} />
              <StatRow label="Time behind the wheel" value={d.hours} />
              <StatRow label="Average speed" value={d.avg} />
            </View>
            <LongestInset l={d.longest} mph={d.longest.avgMph} mphColor={AMBER} onPress={openLongest} />
          </GlassCard>

          {/* Garage Stats */}
          <Text style={styles.sectionHeader}>Garage Stats</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.garageScroll}>
            <GlassCard style={styles.garageCard}>
              <Text style={styles.garageEyebrow}>Most Driven Car</Text>
              <Text style={styles.garageCarName}>{"Porsche 718\nCayman"}</Text>
              <View style={styles.garageImgWrap}>
                <Image source={require('../../assets/cars/porsche.png')} style={styles.garageCarImg} resizeMode="contain" />
              </View>
              <View style={styles.garageStats}>
                <View>
                  <Text style={styles.garageStatN}>{Math.round(242 * garageScale)}</Text>
                  <Text style={styles.garageStatL}>Drives</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.garageStatN}>{Math.round(1346 * garageScale)}</Text>
                  <Text style={styles.garageStatL}>Miles</Text>
                </View>
              </View>
            </GlassCard>

            <GlassCard style={styles.garageCard}>
              <Text style={styles.garageEyebrow}>Fastest Driven Car</Text>
              <Text style={styles.garageCarName}>{"Nissan\nGTR"}</Text>
              <View style={styles.garageImgWrap}>
                <Image source={require('../../assets/cars/gtr.png')} style={styles.garageCarImg} resizeMode="contain" />
              </View>
              <View style={styles.garageStats}>
                <View>
                  <Text style={styles.garageStatN}>{Math.round(142 * garageScale)}</Text>
                  <Text style={styles.garageStatL}>Drives</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.garageStatN}>{Math.round(890 * garageScale)}</Text>
                  <Text style={styles.garageStatL}>Miles</Text>
                </View>
              </View>
            </GlassCard>
          </ScrollView>

          {/* Records selector & list */}
          <SegmentedControl
            options={['Driving Records', 'Performance Records']}
            selected={activeTab === 'driving' ? 'Driving Records' : 'Performance Records'}
            onSelect={(opt) => setActiveTab(opt === 'Driving Records' ? 'driving' : 'performance')}
            style={{ marginTop: 26, marginBottom: 16 }}
          />

          <View style={styles.recordsList}>
            {records.map(item => (
              <GlassCard key={item.title} style={styles.recordCard}>
                <View style={styles.recordRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.recordTitle}>{item.title}</Text>
                    <Text style={styles.recordDesc}>{item.desc}</Text>
                  </View>
                  <View style={styles.recordValueContainer}>
                    <Text style={styles.recordValueText}>{item.value}</Text>
                    <Text style={styles.recordSubText} numberOfLines={1}>{item.sub}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>
        </ScrollView>

      {/* Custom date-range picker */}
      <DateRangePicker visible={customModal} onClose={() => setCustomModal(false)} onApply={applyRange} anchorTop={150} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#000000' },
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20 },

  pills: { paddingBottom: 4, marginBottom: 16 },

  recap: { marginTop: 18 },
  recapClick: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingVertical: 14, paddingRight: 8 },
  recapTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recapSub: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, marginTop: 3 },
  recapCar: { width: 150, height: 70 },

  card: { marginTop: 22, padding: 22 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 17, fontWeight: '600' },
  sharePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  shareText: { color: 'rgba(255, 255, 255, 0.65)', fontSize: 13, fontWeight: '500' },

  big: { color: '#fff', fontSize: 42, fontWeight: '800', letterSpacing: -1.5, marginTop: 10 },
  bigUnit: { fontSize: 24, fontWeight: '700', letterSpacing: 0, color: 'rgba(255, 255, 255, 0.65)' },

  rows: { marginTop: 16, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 15.5, fontWeight: '500' },
  rowValue: { color: '#fff', fontSize: 16, fontWeight: '700' },

  inset: {
    flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 14,
  },
  thumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  insetEyebrow: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  insetDate: { color: '#fff', fontSize: 15, fontWeight: '700' },
  insetTime: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, marginTop: 2 },
  insetMeta: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, marginTop: 1 },
  insetMph: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  insetMphUnit: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 10, fontWeight: '700', marginTop: -2 },

  cardSectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 28, marginBottom: 16 },
  garageScroll: { paddingBottom: 4 },
  garageCard: { width: 307, padding: 16, marginRight: 14 },
  garageEyebrow: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  garageCarName: { color: '#fff', fontSize: 19, fontWeight: '700', marginTop: 4, lineHeight: 23 },
  garageImgWrap: { height: 138, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  garageCarImg: { width: '100%', height: 138 },
  garageStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  garageStatN: { color: '#fff', fontSize: 24, fontWeight: '700' },
  garageStatL: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12 },

  recordsList: { gap: 10 },
  recordCard: { paddingVertical: 16, paddingHorizontal: 20 },
  recordTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  recordDesc: { color: 'rgba(255, 255, 255, 0.55)', fontSize: 12, marginTop: 4, fontWeight: '500' },
  recordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recordValueContainer: { alignItems: 'flex-end', justifyContent: 'center', minWidth: 90 },
  recordValueText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  recordSubText: { color: 'rgba(255, 255, 255, 0.45)', fontSize: 10, fontWeight: '600', marginTop: 2 },
});
