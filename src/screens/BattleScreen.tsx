import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppContext } from '../context/AppContext';
import { useLiveBattleEngine, BattleStatus } from '../hooks/useLiveBattleEngine';

// If we had a real token, we would import VideoView from @livekit/react-native
// import { VideoView } from '@livekit/react-native';

export function BattleScreen() {
  const { openBattleResult } = useAppContext();
  
  // Encapsulated WebRTC & AI Scoring Logic
  const { 
    status, 
    time, 
    localVideoTrack, 
    remoteVideoTrack, 
    startBattle, 
    leaveBattle 
  } = useLiveBattleEngine(openBattleResult);

  const handleAction = () => {
    if (status === 'idle') {
      startBattle();
    } else {
      leaveBattle();
    }
  };

  const getSubtitle = () => {
    switch (status) {
      case 'idle': return 'Your sleeper build right now';
      case 'finding': return 'Finding match...';
      case 'found': return 'Match found! Starting in...';
      case 'challenge': return 'Challenge: Your sleeper build right now';
      case 'playing': return 'Challenge: Your sleeper build right now';
      case 'analyzing': return 'Analyzing performance...';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Gap-Battle</Text>
          <Text style={styles.subtitle}>{getSubtitle()}</Text>
          <View style={[styles.timerWrap, status === 'analyzing' && { opacity: 0 }]}>
            <Text style={styles.timerNum}>{time}</Text>
            {status !== 'found' && status !== 'challenge' && (
              <Text style={styles.timerSec}>Sec</Text>
            )}
          </View>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Image 
              source={{ uri: 'https://picsum.photos/seed/mark/800/600' }} 
              style={StyleSheet.absoluteFillObject} 
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
            <View style={[styles.pill, styles.pillTop]}>
              <Text style={styles.pillText}>UNRANKED #42345245</Text>
            </View>
            <View style={[styles.pill, styles.pillBottom]}>
              <Text style={styles.pillText}>Mark ruzz</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Image 
              source={{ uri: 'https://picsum.photos/seed/you/800/600' }} 
              style={StyleSheet.absoluteFillObject} 
            />
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />
            <View style={[styles.pill, styles.pillTop]}>
              <Text style={styles.pillText}>UNRANKED #82345624</Text>
            </View>
            <View style={[styles.pill, styles.pillBottom]}>
              <Text style={styles.pillText}>You</Text>
            </View>
          </View>

          {status === 'analyzing' && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 16 }} />
              <Text style={styles.analyzingText}>Analyzing...</Text>
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.btnLeave} onPress={handleAction}>
            <Text style={styles.btnText}>{status !== 'idle' ? 'Leave' : 'Start'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnFlag}>
            <MaterialCommunityIcons name="flag" size={16} color="#e0e0e0" />
          </TouchableOpacity>
        </View>

        {/* Temporary Debug Buttons to quickly view the 3 screens */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, justifyContent: 'center' }}>
          {(['won', 'lost', 'tie'] as const).map(outcome => (
            <TouchableOpacity 
              key={outcome}
              style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
              onPress={() => {
                let myScore = 7.0;
                let oppScore = 3.0;
                if (outcome === 'lost') { myScore = 3.0; oppScore = 7.0; }
                else if (outcome === 'tie') { myScore = 5.0; oppScore = 5.0; }
                openBattleResult({
                  outcome, opponent: 'ABEL', oppScore, myScore, rating: 2,
                  pts: outcome === 'won' ? 253 : outcome === 'lost' ? -253 : 0,
                  delta: 0,
                });
              }}
            >
              <Text style={{ color: '#fff', fontSize: 10, textTransform: 'uppercase' }}>Show {outcome}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 120 },
  header: { alignItems: 'center' },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', alignSelf: 'flex-start', marginBottom: 24, letterSpacing: -0.5 },
  subtitle: { color: '#e0e0e0', fontSize: 13, marginBottom: 12 },
  timerWrap: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 24 },
  timerNum: { color: '#fff', fontSize: 64, fontWeight: '800', lineHeight: 68 },
  timerSec: { color: '#fff', fontSize: 14, marginLeft: 6, paddingBottom: 8, fontWeight: '500' },
  cards: { flex: 1, gap: 16, marginBottom: 24 },
  card: {
    flex: 1,
    backgroundColor: '#151515',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillTop: { top: 16, left: 16 },
  pillBottom: { bottom: 16, left: 16 },
  pillText: { color: '#e0e0e0', fontSize: 9, letterSpacing: 0.5, fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  btnLeave: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: { color: '#e0e0e0', fontSize: 13, fontWeight: '500' },
  btnFlag: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
