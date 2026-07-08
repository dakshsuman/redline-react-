import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image, Animated, LayoutChangeEvent } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';

import { DriveScreen } from '../screens/DriveScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { BattleScreen } from '../screens/BattleScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';

// ─── Tab definitions ────────────────────────────────────────────────────────

type TabConfig = {
  name: string;
  label: string;
  isBattle?: boolean;
};

const TABS: TabConfig[] = [
  { name: 'drive',   label: 'Drive'   },
  { name: 'friends', label: 'Friends' },
  { name: 'battle',  label: 'Battle', isBattle: true },
  { name: 'stats',   label: 'Stats'   },
  { name: 'board',   label: 'Board'   },
];

// Custom local assets mapping
const tabImages: { [key: string]: any } = {
  drive: require('../../assets/tab_drive.png'),
  friends: require('../../assets/tab_friends.png'),
  battle: require('../../assets/tab_battle.png'),
  stats: require('../../assets/tab_stats.png'),
  board: require('../../assets/tab_board.png'),
};

// Helper Glow component for focused tab aura (layered neon glow effect)
function Glow({ size }: { size: number }) {
  return (
    <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      {/* Outer soft ambient glow */}
      <View
        style={{
          position: 'absolute',
          width: size * 1.8,
          height: size * 1.8,
          borderRadius: (size * 1.8) / 2,
          backgroundColor: 'rgba(229, 9, 20, 0.55)', // brand red diffusion
          ...Platform.select({
            web: {
              filter: 'blur(16px)',
              WebkitFilter: 'blur(16px)',
            } as any,
            default: {
              shadowColor: '#E50914',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.95,
              shadowRadius: 16,
            },
          }),
        }}
      />
      {/* Inner intense neon glow core */}
      <View
        style={{
          position: 'absolute',
          width: size * 1.1,
          height: size * 1.1,
          borderRadius: (size * 1.1) / 2,
          backgroundColor: 'rgba(255, 45, 85, 0.85)', // neon pinkish-red hot core
          ...Platform.select({
            web: {
              filter: 'blur(6px)',
              WebkitFilter: 'blur(6px)',
            } as any,
            default: {
              shadowColor: '#FF2D55',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 1.0,
              shadowRadius: 6,
            },
          }),
        }}
      />
    </View>
  );
}

// ─── Custom tab bar ──────────────────────────────────────────────────────────

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const [tabbarWidth, setTabbarWidth] = React.useState(0);
  const animatedIndex = React.useRef(new Animated.Value(state.index)).current;

  React.useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 600, // increased tension for another 50% speed boost
      friction: 36, // damp the high-tension speed safely
    }).start();
  }, [state.index]);

  const onLayout = (event: LayoutChangeEvent) => {
    setTabbarWidth(event.nativeEvent.layout.width);
  };

  const tabLayoutWidth = tabbarWidth - 32; // subtracting horizontal padding (16 left + 16 right)
  const tabWidth = tabLayoutWidth / 5;

  const translateX = animatedIndex.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: [0, tabWidth, tabWidth * 2, tabWidth * 3, tabWidth * 4],
  });

  // Stretch horizontally when moving (liquid motion stretch)
  const scaleX = animatedIndex.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
    outputRange: [1.0, 1.8, 1.0, 2.0, 1.27, 2.0, 1.0, 1.8, 1.0], // stretches in-transit, expands at battle
  });

  // Shrink/squish vertically when moving (optical flattening)
  const scaleY = animatedIndex.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
    outputRange: [1.0, 0.6, 1.0, 0.7, 1.27, 0.7, 1.0, 0.6, 1.0], // flattens in-transit, expands at battle
  });

  return (
    <View style={styles.tabbarWrap} pointerEvents="box-none">
      <View style={styles.tabbar} onLayout={onLayout}>
        {/* Animated swooshing Glow indicator with horizontal stretch motion blur */}
        {tabbarWidth > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 16,
              width: tabWidth,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ translateX }, { scaleX }, { scaleY }],
              pointerEvents: 'none',
            }}
          >
            <Glow size={33} />
          </Animated.View>
        )}

        {TABS.map((tab, index) => {
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
            if (!event.defaultPrevented) navigation.navigate(tab.name);
          };

          const imgSource = tabImages[tab.name];

          if (tab.isBattle) {
            return (
              <TouchableOpacity key={tab.name} style={styles.tab} onPress={onPress} activeOpacity={0.85}>
                <View style={[styles.ctr, focused && styles.ctrActive]}>
                  {imgSource ? (
                    <Image
                      source={imgSource}
                      style={{ width: 42, height: 42, tintColor: '#fff' }}
                      resizeMode="contain"
                    />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity key={tab.name} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
              {imgSource ? (
                <Image
                  source={imgSource}
                  style={{
                    width: 33,
                    height: 33,
                    tintColor: focused ? '#fff' : 'rgba(255, 255, 255, 0.3)', // grayed out inactive
                  }}
                  resizeMode="contain"
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Navigator ───────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
      initialRouteName="drive"
    >
      <Tab.Screen name="drive"   component={DriveScreen}       />
      <Tab.Screen name="friends" component={FriendsScreen}     />
      <Tab.Screen name="battle"  component={BattleScreen}      />
      <Tab.Screen name="stats"   component={StatsScreen}       />
      <Tab.Screen name="board"   component={LeaderboardScreen} />
    </Tab.Navigator>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabbarWrap: {
    position: 'absolute',
    bottom: 20, // slightly elevated to sit inside the floating panel
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
  },
  tabbar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 12, 0.2)', // reduced opacity glass background
    borderRadius: 28, // capsule shape
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5, // slightly thicker white glass border
    borderColor: 'rgba(255, 255, 255, 0.22)', // bright translucent edge highlight
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(5px) saturate(180%)', // reduced blur
        WebkitBackdropFilter: 'blur(5px) saturate(180%)',
      } as any,
    }),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ctr: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 27,
  },
  lb:       { display: 'none' }, // hide labels
  lbActive: { display: 'none' },
});
