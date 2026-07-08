import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { View } from 'react-native';

import { AppProvider, useAppContext } from './src/context/AppContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { ProfileOverlay } from './src/overlays/ProfileOverlay';
import { DriveDetailOverlay } from './src/overlays/DriveDetailOverlay';
import { BattleResultOverlay } from './src/overlays/BattleResultOverlay';
import { FriendProfileOverlay } from './src/overlays/FriendProfileOverlay';
import { NavigationScreen } from './src/screens/NavigationScreen';

/** Inner shell — consumes AppContext after it's been provided. */
function AppShell() {
  const {
    profileVisible,  closeProfile,
    detailDrive,     closeDetail,
    battleResult,    closeBattleResult,
    friendProfile,   closeFriend,
    navVisible,      navDestination, closeNav,
  } = useAppContext();

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0C' }}>
      <StatusBar style="light" />

      {/* Tab navigator (uses @react-navigation bottom-tabs) */}
      <TabNavigator />

      {/* Global overlays / modals */}
      <ProfileOverlay visible={profileVisible} onClose={closeProfile} />
      <DriveDetailOverlay
        visible={!!detailDrive}
        drive={detailDrive}
        onClose={closeDetail}
        onAddStory={() => {}}
      />
      <BattleResultOverlay
        visible={!!battleResult}
        result={battleResult}
        onClose={closeBattleResult}
        onRematch={() => closeBattleResult()}
      />
      <FriendProfileOverlay
        visible={!!friendProfile}
        friend={friendProfile}
        onClose={closeFriend}
      />
      <NavigationScreen visible={navVisible} destination={navDestination} onClose={closeNav} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <AppShell />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
