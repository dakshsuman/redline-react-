import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  visible: boolean;
  result: {
    outcome: 'won' | 'lost' | 'tie';
    opponent: string;
    oppScore: number;
    myScore: number;
    rating: number;
    pts: number;
    delta: number;
  } | null;
  onClose: () => void;
  onRematch: () => void;
}

export function BattleResultOverlay({ visible, result, onClose, onRematch }: Props) {
  if (!result) return null;

  const getTitle = () => {
    if (result.outcome === 'won') return 'YOU GAPPED\nTHEM';
    if (result.outcome === 'lost') return 'YOU GOT\nGAPPED';
    return 'TIED';
  };

  const getGlowColor = () => {
    if (result.outcome === 'won') return 'rgba(34, 197, 94, 0.2)';
    if (result.outcome === 'lost') return 'rgba(239, 68, 68, 0.2)';
    return 'transparent';
  };

  const isLoss = result.outcome === 'lost';
  const ptsColor = isLoss ? '#EF4444' : '#22C55E';
  const ptsBg = isLoss ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.container}>
        <View style={[styles.glow, { backgroundColor: getGlowColor() }]} />
        <View style={styles.content}>
          <Text style={styles.title}>{getTitle()}</Text>

          <View style={styles.scoresContainer}>
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreLabel}>YOUR RATING</Text>
              <Text style={styles.scoreValue}>
                {result.myScore.toFixed(1)}
                <Text style={styles.scoreMax}>/10</Text>
              </Text>
            </View>
            <View style={styles.scoreBlock}>
              <Text style={styles.scoreLabel}>OPPONENTS</Text>
              <Text style={styles.scoreValue}>
                {result.oppScore.toFixed(1)}
                <Text style={styles.scoreMax}>/10</Text>
              </Text>
            </View>
          </View>

          <View style={styles.leaderboardCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>BATTLE LEADERBOARD</Text>
            </View>

            <View style={styles.cardMiddle}>
              <Text style={styles.giantRank}>#{result.rating}</Text>
              <View style={[styles.ptsPill, { borderColor: ptsColor, backgroundColor: ptsBg }]}>
                <Text style={[styles.ptsPillText, { color: ptsColor }]}>
                  {result.pts > 0 ? '+' : ''}{result.pts} PTS
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.footerText}>296121 pts</Text>
              <Text style={styles.footerText}>1102W / 793 L</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
              <Text style={styles.primaryBtnText}>FIND NEW MATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={onRematch}>
              <Text style={styles.primaryBtnText}>REMATCH</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'rgba(10, 10, 12, 0.65)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(2px) saturate(180%)',
        WebkitBackdropFilter: 'blur(2px) saturate(180%)',
      } as any,
    }),
  },
  glow: {
    position: 'absolute', top: -50, left: '50%', width: 500, height: 400,
    borderRadius: 250,
    transform: [{ translateX: -250 }],
    ...Platform.select({
      web: { filter: 'blur(60px)', WebkitFilter: 'blur(60px)' } as any,
    }),
  },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 100, paddingBottom: 60, alignItems: 'center' },
  title: { color: '#FFF', fontSize: 56, fontWeight: '900', textAlign: 'center', lineHeight: 56, marginBottom: 60, letterSpacing: -1 },

  scoresContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 50 },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1, fontWeight: '500', marginBottom: 8 },
  scoreValue: { color: '#FFF', fontSize: 48, fontWeight: '800' },
  scoreMax: { fontSize: 24, color: '#FFF', fontWeight: '800' },

  leaderboardCard: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 24,
    marginBottom: 40,
  },
  cardHeader: { marginBottom: 12 },
  cardTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  cardMiddle: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 },
  giantRank: { color: '#FFF', fontSize: 36, fontWeight: '900' },
  ptsPill: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ptsPillText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  actions: { width: '100%', gap: 20, marginTop: 'auto', alignItems: 'center' },
  primaryBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  primaryBtnText: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
});
