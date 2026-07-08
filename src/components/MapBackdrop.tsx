import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  height?: number;
  children?: React.ReactNode;
  routes?: { color: string; d: string }[];
  dots?: { x: number; y: number; color?: string; size?: number }[];
}

export function MapBackdrop({ height = 320, children, routes, dots }: Props) {
  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height="100%" viewBox="0 0 393 320" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="mapGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#14161b" stopOpacity="1" />
            <Stop offset="1" stopColor="#0a0b0e" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path d="M0 0 H393 V320 H0 Z" fill="url(#mapGrad)" />
        {routes?.map((r, i) => (
          <Path key={i} d={r.d} stroke={r.color} strokeOpacity={0.85} strokeWidth={3} fill="none" strokeLinecap="round" />
        ))}
        {dots?.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={d.size ?? 7} fill={d.color ?? colors.go} stroke={colors.bg} strokeWidth={2.5} />
        ))}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
