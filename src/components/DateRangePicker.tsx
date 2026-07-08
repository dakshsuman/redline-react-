import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type RangeResult = { label: string; days: number; all?: boolean };

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (r: RangeResult) => void;
  anchorTop?: number;  // if set, anchor the picker to top-left at this Y (e.g. under a pill)
}

const PRESETS = ['Today', 'Last 7 days', 'Last 30 days', 'This month', 'This year', 'All time'];
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const midnight = (d: Date) => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const daysBetween = (a: Date, b: Date) => Math.round((midnight(b).getTime() - midnight(a).getTime()) / 864e5) + 1;
const fmtShort = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;

function presetRange(p: string): { start: Date | null; end: Date; all?: boolean } {
  const end = midnight(new Date());
  const start = midnight(new Date());
  switch (p) {
    case 'Last 7 days': start.setDate(end.getDate() - 6); return { start, end };
    case 'Last 30 days': start.setDate(end.getDate() - 29); return { start, end };
    case 'This month': return { start: new Date(end.getFullYear(), end.getMonth(), 1), end };
    case 'This year': return { start: new Date(end.getFullYear(), 0, 1), end };
    case 'All time': return { start: null, end, all: true };
    default: return { start: new Date(end), end }; // Today
  }
}

export function DateRangePicker({ visible, onClose, onApply, anchorTop }: Props) {
  const today = midnight(new Date());
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [start, setStart] = useState<Date | null>(today);
  const [end, setEnd] = useState<Date | null>(today);
  const [preset, setPreset] = useState<string | null>('Today');
  const [allTime, setAllTime] = useState(false);

  const pickPreset = (p: string) => {
    const r = presetRange(p);
    setPreset(p); setAllTime(!!r.all);
    setStart(r.start); setEnd(r.end);
    if (r.start) setView(new Date(r.start.getFullYear(), r.start.getMonth(), 1));
    else setView(new Date(r.end.getFullYear(), r.end.getMonth(), 1));
  };

  const pickDay = (d: Date) => {
    setPreset(null); setAllTime(false);
    if (!start || (start && end)) { setStart(d); setEnd(null); }
    else if (d < start) { setStart(d); }
    else { setEnd(d); }
  };

  const apply = () => {
    if (allTime) return onApply({ label: 'All-time', days: 99999, all: true });
    if (start && end) {
      onApply({ label: preset ?? `${fmtShort(start)} – ${fmtShort(end)}`, days: daysBetween(start, end) });
    }
  };

  // Build the calendar grid (Monday-first, 6 rows)
  const y = view.getFullYear(), m = view.getMonth();
  const firstOffset = (new Date(y, m, 1).getDay() + 6) % 7;
  const gridStart = new Date(y, m, 1 - firstOffset);
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => new Date(y, m, 1 - firstOffset + i));

  const inRange = (d: Date) => start && end && d >= start && d <= end;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, anchorTop != null && { justifyContent: 'flex-start', paddingTop: anchorTop }]}
        onPress={onClose}
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Sidebar: quick presets */}
          <View style={styles.sidebar}>
            <Text style={styles.sideTitle}>Quick select</Text>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.presetRow, preset === p && styles.presetActive]}
                onPress={() => pickPreset(p)}
                activeOpacity={0.8}
              >
                <Text style={[styles.presetText, preset === p && styles.presetTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Calendar */}
          <View style={styles.calendar}>
            <View style={styles.calHead}>
              <TouchableOpacity onPress={() => setView(new Date(y, m - 1, 1))} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={18} color="#C8C8CE" />
              </TouchableOpacity>
              <Text style={styles.calMonth}>{MONTHS[m]} {y}</Text>
              <TouchableOpacity onPress={() => setView(new Date(y, m + 1, 1))} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={18} color="#C8C8CE" />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map(w => <Text key={w} style={styles.weekday}>{w}</Text>)}
            </View>

            <View style={styles.grid}>
              {cells.map((d, i) => {
                const otherMonth = d.getMonth() !== m;
                const future = d > today;
                const isStart = !!start && sameDay(d, start);
                const isEnd = !!end && sameDay(d, end);
                const isEdge = isStart || isEnd;
                const ranged = !allTime && inRange(d);
                const disabled = future;
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={disabled}
                    onPress={() => pickDay(d)}
                    activeOpacity={0.7}
                    style={[styles.cell, ranged && styles.cellRanged, isEdge && styles.cellEdge]}
                  >
                    <Text style={[
                      styles.cellText,
                      otherMonth && styles.cellDim,
                      future && styles.cellFuture,
                      ranged && !isEdge && styles.cellRangedText,
                      isEdge && styles.cellEdgeText,
                    ]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={apply} activeOpacity={0.85}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const CELL = 26;
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  sheet: {
    flexDirection: 'row', width: '100%', maxWidth: 345, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#0F0F12', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },

  sidebar: { width: 100, backgroundColor: '#0B0B0D', paddingVertical: 14, paddingHorizontal: 9, gap: 2 },
  sideTitle: { color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 9, marginLeft: 5 },
  presetRow: { paddingVertical: 8, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  presetActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.18)' },
  presetText: { color: '#9A9AA0', fontSize: 11, fontWeight: '500' },
  presetTextActive: { color: '#fff', fontWeight: '600' },

  calendar: { flex: 1, padding: 12 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  calMonth: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', color: '#6A6A70', fontSize: 8.5, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell: { width: `${100 / 7}%`, height: CELL, alignItems: 'center', justifyContent: 'center', marginVertical: 1.5 },
  cellRanged: { backgroundColor: 'rgba(245,166,35,0.16)' },
  cellEdge: { backgroundColor: '#FF5A2E', borderRadius: 7 },
  cellText: { color: '#E6E6EA', fontSize: 10.5, fontWeight: '600' },
  cellDim: { color: '#4A4A50' },
  cellFuture: { color: '#3A3A40' },
  cellRangedText: { color: '#F5C77E' },
  cellEdgeText: { color: '#fff', fontWeight: '800' },

  applyBtn: { marginTop: 10, backgroundColor: '#FF5A2E', borderRadius: 11, paddingVertical: 10, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },
});
