import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from './Avatar';

// ─── GlassCard Component ──────────────────────────────────────────────────────

interface GlassCardProps {
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
}

export function GlassCard({ style, children }: GlassCardProps) {
  // Separate outer positioning/layout styles from inner styling
  const outerStyle = StyleSheet.flatten(style);
  const {
    margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
    position, top, bottom, left, right, width, height, flex, alignSelf, zIndex,
    ...innerStyle
  } = outerStyle || {};

  return (
    <View style={[{
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 12,
      elevation: 1,
      margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
      position, top, bottom, left, right, width, height, flex, alignSelf, zIndex,
    }]}>
      <LinearGradient
        colors={['#0B0B0D', '#050505']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.cardGradient, innerStyle]}
      >
        {/* Top reflection light leak */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topReflection}
        />

        {/* Inner stroke for premium layered edge */}
        <View style={styles.innerStroke} pointerEvents="none" />

        {children}
      </LinearGradient>
    </View>
  );
}

// ─── SegmentedControl Component ────────────────────────────────────────────────

interface SegmentedControlProps {
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
  style?: ViewStyle;
}

export function SegmentedControl({ options, selected, onSelect, style }: SegmentedControlProps) {
  return (
    <View style={[styles.segContainer, style]}>
      {options.map((opt) => {
        const active = opt === selected;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.segItem, active && styles.segItemActive]}
            onPress={() => onSelect(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── StatChip Component ────────────────────────────────────────────────────────

interface StatChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export function StatChip({ label, active, onPress, style }: StatChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── PodiumCard Component ──────────────────────────────────────────────────────

interface PodiumCardProps {
  rank: number;
  name: string;
  value: string;
  car: string;
  isFirst?: boolean;
  style?: ViewStyle | ViewStyle[];
  logoComponent?: React.ReactNode;
}

export function PodiumCard({ rank, name, value, car, isFirst = false, style, logoComponent }: PodiumCardProps) {
  const outerStyle = StyleSheet.flatten(style);
  const {
    margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
    position, top, bottom, left, right, width, height, flex, alignSelf, zIndex,
    ...innerStyle
  } = outerStyle || {};

  const baseHeight = 236;
  const scale = rank === 1 ? 1 : rank === 2 ? 0.85 : 0.72;
  const h = baseHeight * scale;
  const flexWidth = rank === 1 ? 1.15 : rank === 2 ? 1 : 0.95;

  const avSize = rank === 1 ? 68 : rank === 2 ? 56 : 48;
  const ringSize = avSize + 6;
  const nameSize = rank === 1 ? 14 : rank === 2 ? 13 : 11;
  const valSize = rank === 1 ? 18 : rank === 2 ? 16 : 14;

  return (
    <View style={[{
      shadowColor: '#FFFFFF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.03,
      shadowRadius: 12,
      elevation: 1,
      margin, marginHorizontal, marginVertical, marginTop, marginBottom, marginLeft, marginRight,
      position, top, bottom, left, right, width, height, flex, alignSelf, zIndex,
    }]}>
      <LinearGradient
        colors={isFirst ? ['#15151A', '#0A0A0C'] : ['#0B0B0D', '#050505']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.podiumCard,
          { height: h, flex: flexWidth, justifyContent: 'space-between', paddingVertical: 16 },
          isFirst && { borderColor: 'rgba(255, 255, 255, 0.16)' },
          innerStyle
        ]}
      >
        {/* Top reflection light leak */}
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[styles.topReflection, { borderTopLeftRadius: 28, borderTopRightRadius: 28 }]}
        />

        {/* Inner stroke for premium layered edge */}
        <View style={[styles.innerStroke, { borderRadius: 27 }]} pointerEvents="none" />
        
        {/* Rank Badge */}
        <View style={[styles.avatarRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: isFirst ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.08)' }]}>
          <Avatar seed={name} size={avSize} />
          <View style={[styles.rankBadge, { width: 22, height: 22, borderRadius: 11, bottom: -6 }]}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{rank}</Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text style={[styles.name, { fontSize: nameSize }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.value, { fontSize: valSize, color: '#fff', fontWeight: '800' }]} numberOfLines={1}>
            {value}
          </Text>
        </View>
        
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', alignItems: 'center', justifyContent: 'center' }}>
          {logoComponent}
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── LeaderboardRow Component ──────────────────────────────────────────────────

interface LeaderboardRowProps {
  rank: number;
  name: string;
  car: string;
  value: string;
  isMe?: boolean;
  isLast?: boolean;
  trend?: React.ReactNode;
}

export function LeaderboardRow({ rank, name, car, value, isMe = false, isLast = false, trend }: LeaderboardRowProps) {
  return (
    <View style={[
      styles.rowContainer,
      isMe && styles.meRow,
      !isLast && !isMe && styles.borderBottom
    ]}>
      <Text style={[styles.rowRank, isMe && styles.meText]}>{rank}</Text>
      <Avatar seed={name} size={36} />
      <View style={styles.infoCol}>
        <Text style={styles.nameText}>{name}</Text>
        <Text style={styles.rowCar}>{car}</Text>
      </View>
      {trend && <View style={styles.trendWrap}>{trend}</View>}
      <Text style={[styles.valueText, isMe && styles.meText]}>{value}</Text>
    </View>
  );
}

// ─── Internal Stylesheet ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // GlassCard
  cardGradient: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    overflow: 'hidden',
    position: 'relative',
  },
  innerStroke: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  topReflection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },

  // SegmentedControl
  segContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 4,
  },
  segItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 20,
  },
  segItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  segText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  segTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // StatChip
  chip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // PodiumCard
  podiumCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  firstCard: {
    flex: 1.15,
    height: 236,
    borderColor: 'rgba(255, 255, 255, 0.16)', // accent border for 1st place
  },
  sideCard: {
    flex: 1,
    height: 212,
  },
  avatarRing: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'relative',
  },
  firstRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  sideRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  rankBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    alignSelf: 'center',
    borderWidth: 1.5,
    borderColor: '#0F0F12',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  firstBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    bottom: -4,
  },
  sideBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    bottom: -5,
  },
  rankText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  name: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  value: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  carPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 10,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  carText: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 10,
    fontWeight: '600',
  },

  // LeaderboardRow
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: 'transparent',
  },
  meRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 4,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowRank: {
    width: 24,
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  meText: {
    color: '#fff',
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    marginLeft: 12,
  },
  nameText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '600',
  },
  rowCar: {
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  trendWrap: {
    marginRight: 12,
  },
  valueText: {
    color: '#fff',
    fontSize: 15.5,
    fontWeight: '700',
    marginLeft: 'auto',
  },
});
