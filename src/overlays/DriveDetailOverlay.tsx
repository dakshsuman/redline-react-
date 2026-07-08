import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { colors } from '../theme/colors';
import { Drive } from '../data/mockData';

interface Props {
  visible: boolean;
  drive: Drive | null;
  onClose: () => void;
  onAddStory: () => void;
}

export function DriveDetailOverlay({ visible, drive, onClose, onAddStory }: Props) {
  if (!drive) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.hd}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#fff', fontSize: 23 }}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.hdTitle}>{drive.name}</Text>
            <Text style={styles.hdSub}>{drive.date} \· {drive.car}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
        </View>
        <ScrollView style={styles.body}>
          <View style={styles.mapc}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.dim }}>Map placeholder</Text>
            </View>
          </View>
          <View style={styles.grid4}>
            <View style={styles.mcard}><Text style={styles.ml}>Distance</Text><Text style={styles.mv}>{drive.dist} mi</Text></View>
            <View style={styles.mcard}><Text style={styles.ml}>Avg</Text><Text style={styles.mv}>47 mph</Text></View>
            <View style={styles.mcard}><Text style={styles.ml}>Top</Text><Text style={[styles.mv, { color: colors.acc }]}>{drive.top} mph</Text></View>
            <View style={styles.mcard}><Text style={styles.ml}>Rank</Text><Text style={styles.mv}>#3</Text></View>
          </View>
          <View style={styles.sec}>
            <Text style={[styles.eye, { marginBottom: 11 }]}>SPEED DISTRIBUTION</Text>
            <View style={styles.distbar}>
              <View style={{ flex: 14, backgroundColor: '#3B82F6', height: 12 }} />
              <View style={{ flex: 36, backgroundColor: '#22C55E', height: 12 }} />
              <View style={{ flex: 32, backgroundColor: '#F59E0B', height: 12 }} />
              <View style={{ flex: 18, backgroundColor: '#FF3B30', height: 12 }} />
            </View>
            <View style={styles.legend}>
              {[
                { color: '#3B82F6', label: '0\u201330' },
                { color: '#22C55E', label: '30\u201360' },
                { color: '#F59E0B', label: '60\u201390' },
                { color: '#FF3B30', label: '90+ mph' },
              ].map((l, i) => (
                <View key={i} style={styles.lg}><View style={[styles.dot, { backgroundColor: l.color }]} /><Text style={{ color: '#9A9AA0', fontSize: 12 }}>{l.label}</Text></View>
              ))}
            </View>
          </View>
          <View style={styles.sec}>
            <Text style={[styles.eye, { marginBottom: 11 }]}>TRAVEL TIME</Text>
            <View style={styles.ttrow}>
              <View style={styles.tp}><Text style={{ color: '#9A9AA0', fontSize: 13 }}>Expected</Text><Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>1h 24m</Text></View>
              <View style={styles.tbar}><View style={{ width: '100%', height: 10, borderRadius: 5, backgroundColor: '#5A5A62' }} /></View>
            </View>
            <View style={styles.ttrow}>
              <View style={styles.tp}><Text style={{ color: '#9A9AA0', fontSize: 13 }}>Actual</Text><Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>{drive.dur}</Text></View>
              <View style={styles.tbar}><View style={{ width: '85%', height: 10, borderRadius: 5, backgroundColor: colors.acc }} /></View>
            </View>
            <View style={styles.faster}>
              <Text style={{ color: colors.go, fontSize: 12, fontWeight: '500' }}>12 min faster than expected</Text>
            </View>
          </View>
          <View style={styles.sec}>
            <Text style={[styles.eye, { marginBottom: 11 }]}>SPEED OVER TIME</Text>
            <View style={styles.chart}>
              <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: colors.dim }}>Chart placeholder</Text>
              </View>
              <View style={styles.cx}><Text style={{ color: colors.faint, fontSize: 11 }}>Start</Text><Text style={{ color: colors.faint, fontSize: 11 }}>{drive.top} mph peak</Text><Text style={{ color: colors.faint, fontSize: 11 }}>Finish</Text></View>
            </View>
          </View>
          <View style={styles.sec}>
            <Text style={[styles.eye, { marginBottom: 11 }]}>PERFORMANCE</Text>
            <View style={styles.grid2}>
              {[{ label: '0 \u2013 60 mph', value: '4.2 s' }, { label: 'Max lateral', value: '0.94 g' }, { label: 'Hardest brake', value: '1.1 g' }, { label: 'Elevation', value: '+820 ft' }].map((p, i) => (
                <View key={i} style={styles.pcard}>
                  <View style={styles.pic}><Text style={{ color: '#FF6A3D' }}>O</Text></View>
                  <View><Text style={styles.pl}>{p.label}</Text><Text style={styles.pv}>{p.value}</Text></View>
                </View>
              ))}
            </View>
          </View>
          <TouchableOpacity style={styles.storyBtn} onPress={onAddStory}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>Add to Story</Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hd: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12 },
  hdTitle: { color: '#fff', fontSize: 17, fontWeight: '500' },
  hdSub: { color: colors.dim, fontSize: 11, marginTop: 2 },
  body: { paddingHorizontal: 16 },
  mapc: { height: 200, borderRadius: 18, backgroundColor: '#0a0b0e', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', marginBottom: 16 },
  grid4: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  mcard: { flex: 1, backgroundColor: colors.fill, borderRadius: 12, padding: 11 },
  ml: { color: colors.dim, fontSize: 11 },
  mv: { color: '#fff', fontSize: 19, fontWeight: '500', marginTop: 5 },
  sec: { marginBottom: 24 },
  eye: { color: colors.dim, fontSize: 11, fontWeight: '500', letterSpacing: 1.1 },
  distbar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dot: { width: 9, height: 9, borderRadius: 2 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ttrow: { marginBottom: 12 },
  tp: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tbar: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,.08)' },
  faster: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chart: { backgroundColor: 'rgba(255,255,255,.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,.06)', borderRadius: 14, padding: 12 },
  cx: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pcard: { width: '48%', backgroundColor: colors.fill, borderRadius: 12, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pic: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,90,46,.14)', alignItems: 'center', justifyContent: 'center' },
  pl: { color: colors.dim, fontSize: 11 },
  pv: { color: '#fff', fontSize: 16, fontWeight: '500', marginTop: 2 },
  storyBtn: {
    backgroundColor: colors.acc, paddingVertical: 16, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 6,
  },
});
