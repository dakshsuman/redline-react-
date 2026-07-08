import { useState, useEffect, useCallback } from 'react';

export type BattleStatus = 'idle' | 'finding' | 'found' | 'challenge' | 'playing' | 'analyzing';

export interface BattleOutcome {
  outcome: 'won' | 'lost' | 'tie';
  opponent: string;
  oppScore: number;
  myScore: number;
  rating: number;
  pts: number;
  delta: number;
}

export function useLiveBattleEngine(onBattleEnd: (outcome: BattleOutcome) => void) {
  const [status, setStatus] = useState<BattleStatus>('idle');
  const [time, setTime] = useState(15);

  // State to hold the WebRTC tracks. 
  // In a real LiveKit implementation, we would use `useTracks()` from @livekit/react-native
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<any>(null);

  // 1. Finding Match
  useEffect(() => {
    if (status !== 'finding') return;
    const interval = setInterval(() => setTime((t) => t + 1), 1000);
    const timeout = setTimeout(() => {
      setStatus('found');
      setTime(3);
    }, 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [status]);

  // 2. Match Found Countdown
  useEffect(() => {
    if (status !== 'found') return;
    if (time > 0) {
      const timeout = setTimeout(() => setTime((t) => t - 1), 1000);
      return () => clearTimeout(timeout);
    } else {
      setStatus('challenge');
      setTime(3);
    }
  }, [status, time]);

  // 3. Challenge Countdown
  useEffect(() => {
    if (status !== 'challenge') return;
    if (time > 0) {
      const timeout = setTimeout(() => setTime((t) => t - 1), 1000);
      return () => clearTimeout(timeout);
    } else {
      setStatus('playing');
      setTime(15);
      // Here is where the P2P connection would fully open
    }
  }, [status, time]);

  // 4. Playing Match Countdown (Live Stream)
  useEffect(() => {
    if (status !== 'playing') return;
    if (time > 0) {
      const timeout = setTimeout(() => setTime((t) => t - 1), 1000);
      return () => clearTimeout(timeout);
    } else {
      setStatus('analyzing');
    }
  }, [status, time]);

  // 5. Analyzing Overlay (AI Vision Scoring)
  useEffect(() => {
    if (status !== 'analyzing') return;
    
    // In production, we would send the final 720p frames to an AI Vision backend here.
    const timeout = setTimeout(() => {
      setStatus('idle');
      setTime(15);
      
      const rand = Math.random();
      const outcome = rand > 0.66 ? 'won' : rand > 0.33 ? 'lost' : 'tie';
      let myScore = 7.0;
      let oppScore = 3.0;
      if (outcome === 'lost') { myScore = 3.0; oppScore = 7.0; }
      else if (outcome === 'tie') { myScore = 5.0; oppScore = 5.0; }

      onBattleEnd({
        outcome,
        opponent: 'ABEL',
        oppScore,
        myScore,
        rating: 2,
        pts: outcome === 'won' ? 253 : outcome === 'lost' ? -253 : 0,
        delta: outcome === 'won' ? 6 : 0,
      });
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [status, onBattleEnd]);

  const startBattle = useCallback(() => {
    // Here we would call livekit.connect() and request permissions
    setStatus('finding');
    setTime(0);
  }, []);

  const leaveBattle = useCallback(() => {
    // Here we would call livekit.disconnect()
    setStatus('idle');
    setTime(15);
  }, []);

  return {
    status,
    time,
    localVideoTrack,
    remoteVideoTrack,
    startBattle,
    leaveBattle
  };
}
