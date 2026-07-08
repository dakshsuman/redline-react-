import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme/colors';

interface Props {
  seed: string;
  size?: number;
  border?: boolean;
  style?: any;
}

const PROFILE_PHOTOS: Record<string, string> = {
  'Sofia Ramirez': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
  'Marcus Chen': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
  'Ethan Brooks': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
  'Priya Nair': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
  'You': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=100&h=100&q=80',
  'you': 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=100&h=100&q=80',
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export function Avatar({ seed, size = 38, border, style }: Props) {
  const photoUrl = PROFILE_PHOTOS[seed];

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }, border && { borderWidth: 1.5, borderColor: colors.go }, style]}>
      {photoUrl ? (
        <Image 
          source={{ uri: photoUrl }} 
          style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
        />
      ) : (
        <Svg width={size} height={size}>
          {(() => {
            const initials = seed.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const hue = hash(seed) % 360;
            return (
              <>
                <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`hsl(${hue}, 50%, 30%)`} />
                <SvgText
                  x={size / 2}
                  y={size / 2 + size * 0.12}
                  textAnchor="middle"
                  fontSize={size * 0.4}
                  fontWeight="600"
                  fill={colors.white}
                >
                  {initials}
                </SvgText>
              </>
            );
          })()}
        </Svg>
      )}
    </View>
  );
}
