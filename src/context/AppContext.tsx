import React, { createContext, useCallback, useContext, useState } from 'react';
import { Drive } from '../data/mockData';
import { Place } from '../services/navigation';

interface AppContextType {
  // Profile overlay
  profileVisible: boolean;
  openProfile: () => void;
  closeProfile: () => void;

  // Drive detail overlay
  detailDrive: Drive | null;
  openDetail: (drive: Drive) => void;
  closeDetail: () => void;

  // Battle result overlay
  battleResult: any;
  openBattleResult: (result: any) => void;
  closeBattleResult: () => void;

  // Friend profile overlay
  friendProfile: any;
  openFriend: (f: any) => void;
  closeFriend: () => void;

  // Navigation / map screen
  navVisible: boolean;
  navDestination: Place | null;
  openNav: (dest?: Place | null) => void;
  closeNav: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profileVisible, setProfileVisible] = useState(false);
  const [detailDrive, setDetailDrive]       = useState<Drive | null>(null);
  const [battleResult, setBattleResult]     = useState<any>(null);
  const [friendProfile, setFriendProfile]   = useState<any>(null);
  const [navVisible, setNavVisible]         = useState(false);
  const [navDestination, setNavDestination] = useState<Place | null>(null);

  const openProfile       = useCallback(() => setProfileVisible(true),  []);
  const closeProfile      = useCallback(() => setProfileVisible(false), []);
  const openDetail        = useCallback((d: Drive) => setDetailDrive(d), []);
  const closeDetail       = useCallback(() => setDetailDrive(null),      []);
  const openBattleResult  = useCallback((r: any) => setBattleResult(r), []);
  const closeBattleResult = useCallback(() => setBattleResult(null),    []);
  const openFriend        = useCallback((f: any) => setFriendProfile(f),[]);
  const closeFriend       = useCallback(() => setFriendProfile(null),   []);
  const openNav           = useCallback((dest?: Place | null) => {
    setNavDestination(dest ?? null);
    setNavVisible(true);
  }, []);
  const closeNav          = useCallback(() => {
    setNavVisible(false);
    setNavDestination(null);
  }, []);

  return (
    <AppContext.Provider value={{
      profileVisible, openProfile, closeProfile,
      detailDrive,    openDetail,  closeDetail,
      battleResult,   openBattleResult, closeBattleResult,
      friendProfile,  openFriend, closeFriend,
      navVisible,     navDestination, openNav, closeNav,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within <AppProvider>');
  return ctx;
}
