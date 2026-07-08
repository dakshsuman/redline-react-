import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle, Line, G, Defs, Pattern, Rect, RadialGradient, Stop, Filter, FeGaussianBlur, Text as SvgText } from 'react-native-svg';

interface Props {
  speed: number;
  size?: number;
}

// 7-segment configuration mapping (A, B, C, D, E, F, G)
const segmentsConfig: Record<number, boolean[]> = {
  0: [true, true, true, true, true, true, false],
  1: [false, true, true, false, false, false, false],
  2: [true, true, false, true, true, false, true],
  3: [true, true, true, true, false, false, true],
  4: [false, true, true, false, false, true, true],
  5: [true, false, true, true, false, true, true],
  6: [true, false, true, true, true, true, true],
  7: [true, true, true, false, false, false, false],
  8: [true, true, true, true, true, true, true],
  9: [true, true, true, true, false, true, true],
};

// Rounded capsule segment lines
const segmentLines = [
  { x1: 7,  y1: 4,  x2: 21, y2: 4  }, // A (Top)
  { x1: 24, y1: 7,  x2: 24, y2: 19 }, // B (Top-Right)
  { x1: 24, y1: 27, x2: 24, y2: 39 }, // C (Bottom-Right)
  { x1: 7,  y1: 42, x2: 21, y2: 42 }, // D (Bottom)
  { x1: 4,  y1: 27, x2: 4,  y2: 39 }, // E (Bottom-Left)
  { x1: 4,  y1: 7,  x2: 4,  y2: 19 }, // F (Top-Left)
  { x1: 7,  y1: 23, x2: 21, y2: 23 }, // G (Middle)
];

interface DigitProps {
  val: number | null;
  color: string;
  glowColor: string;
  hasGlow: boolean;
}

function SevenSegmentDigit({ val, color, hasGlow, glowColor }: DigitProps) {
  const activeSegments = val !== null ? segmentsConfig[val] : Array(7).fill(false);
  // Unlit segment color: very dim background color
  const unlitColor = 'rgba(255, 255, 255, 0.04)';
  
  return (
    <G transform="skewX(-8)">
      {/* Glow Layer (underneath) */}
      {hasGlow && (
        <G filter="url(#digitGlow)" opacity={0.88}>
          {segmentLines.map((line, i) => {
            if (!activeSegments[i]) return null;
            return (
              <Line
                key={`glow-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={glowColor}
                strokeWidth={7.5}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      )}
      
      {/* Solid Front Layer */}
      {segmentLines.map((line, i) => {
        const isActive = activeSegments[i];
        return (
          <Line
            key={`front-${i}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={isActive ? color : unlitColor}
            strokeWidth={6.8}
            strokeLinecap="round"
          />
        );
      })}
    </G>
  );
}

// Color interpolation helper: White -> Orange -> Red
function getSpeedColor(speed: number, maxSpeed: number): string {
  const ratio = Math.min(Math.max(speed, 0), maxSpeed) / maxSpeed; // 0 to 1
  
  if (ratio <= 0.5) {
    // Interpolate White (255, 255, 255) to Orange (255, 90, 46)
    const t = ratio * 2;
    const r = 255;
    const g = Math.round(255 - (255 - 90) * t);
    const b = Math.round(255 - (255 - 46) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Interpolate Orange (255, 90, 46) to Red (255, 31, 31)
    const t = (ratio - 0.5) * 2;
    const r = 255;
    const g = Math.round(90 - (90 - 31) * t);
    const b = Math.round(46 - (46 - 31) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function Speedometer({ speed, size = 158 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.47;
  const maxSpeed = 250;
  
  // Progress calculations
  const gaugeRadius = r - 12;
  const circumference = 2 * Math.PI * gaugeRadius;
  
  // Tick angles distribution over 270 degrees (-225 to 45)
  const tickInner = gaugeRadius - 6;
  const tickOuter = gaugeRadius - 2;
  const tickAngles = [-225, -180, -135, -90, -45, 0, 45];

  // Dynamic glow calculations for high speeds
  const ratio = Math.min(Math.max(speed, 0), maxSpeed) / maxSpeed;
  const speedColor = getSpeedColor(speed, maxSpeed);
  
  // High intensity neon red glow (opacity scaled up for extra glow!)
  const hasGlow = ratio > 0.4;
  const glowColor = `rgba(255, 31, 74, ${Math.min((ratio - 0.4) * 2.2, 0.98)})`; 

  // Digits splitting for 7-segment display
  const hundreds = speed >= 100 ? Math.floor(speed / 100) : null;
  const tens = speed >= 10 ? Math.floor((speed % 100) / 10) : null;
  const ones = Math.min(Math.max(Math.floor(speed), 0), 250) % 10;

  // Layout calculations to center the three 7-segment digits inside the dial
  const digitScale = (size * 0.51) / 92; // scale factor
  const tx = cx - (92 * digitScale) / 2;
  const ty = cy - (50 * digitScale) / 2 - size * 0.065; // centered vertically and offset slightly upwards

  // CSS transition for smooth analog-like arc sweeping on Web
  const arcStyle = Platform.select({
    web: {
      transition: 'stroke-dashoffset 0.08s linear, stroke 0.15s ease-out',
    },
    default: {},
  }) as any;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Carbon Fiber checkerboard weave pattern */}
          <Pattern id="carbon" width="6" height="6" patternUnits="userSpaceOnUse">
            <Rect width="6" height="6" fill="#121315" />
            <Rect width="3" height="3" fill="#1A1C1F" />
            <Rect x="3" y="3" width="3" height="3" fill="#1A1C1F" />
          </Pattern>
          
          {/* Dark dial face radial gradient */}
          <RadialGradient id="dialGrad" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#1E1F22" />
            <Stop offset="100%" stopColor="#0B0B0C" />
          </RadialGradient>

          {/* Directional Motion Blur filter (horizontal) */}
          <Filter id="motionBlur" x="-30%" y="-30%" width="160%" height="160%">
            <FeGaussianBlur stdDeviation="0.8 0" />
          </Filter>

          {/* Glowing filter for high-speed digits */}
          <Filter id="digitGlow" x="-40%" y="-40%" width="180%" height="180%">
            <FeGaussianBlur stdDeviation="3.2" />
          </Filter>
        </Defs>

        {/* Outer carbon fiber dial plate */}
        <Circle cx={cx} cy={cy} r={r} fill="url(#carbon)" stroke="#222326" strokeWidth={1.2} />

        {/* Metallic outer bezel */}
        <Circle cx={cx} cy={cy} r={r - 3.5} fill="none" stroke="#2D2E32" strokeWidth={1.5} />
        <Circle cx={cx} cy={cy} r={r - 5} fill="none" stroke="#0E0E10" strokeWidth={1} />

        {/* Inner dial face gradient */}
        <Circle cx={cx} cy={cy} r={r - 6} fill="url(#dialGrad)" />

        {/* Background track arc (starts at 135 degrees, sweeps 270 degrees) */}
        <G transform={`rotate(135 ${cx} ${cy})`}>
          <Circle
            cx={cx}
            cy={cy}
            r={gaugeRadius}
            fill="none"
            stroke="#1D1E22"
            strokeWidth={4.5}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${circumference * 0.25}`}
            strokeLinecap="round"
          />
          
          {/* Neon orange progress glow arc */}
          {speed > 0 && (
            <Circle
              cx={cx}
              cy={cy}
              r={gaugeRadius}
              fill="none"
              stroke={speedColor}
              strokeOpacity={0.35}
              strokeWidth={9.5}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - (Math.min(speed, maxSpeed) / maxSpeed) * 0.75)}`}
              strokeLinecap="round"
              // @ts-ignore
              style={arcStyle}
            />
          )}

          {/* Neon orange progress core arc */}
          {speed > 0 && (
            <Circle
              cx={cx}
              cy={cy}
              r={gaugeRadius}
              fill="none"
              stroke={speedColor}
              strokeWidth={4.5}
              strokeDasharray={`${circumference}`}
              strokeDashoffset={`${circumference * (1 - (Math.min(speed, maxSpeed) / maxSpeed) * 0.75)}`}
              strokeLinecap="round"
              // @ts-ignore
              style={arcStyle}
            />
          )}
        </G>

        {/* Dial radial tick marks */}
        <G>
          {tickAngles.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const x1 = cx + tickInner * Math.cos(rad);
            const y1 = cy + tickInner * Math.sin(rad);
            const x2 = cx + tickOuter * Math.cos(rad);
            const y2 = cy + tickOuter * Math.sin(rad);
            const isStart = i === 0;
            return (
              <Line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isStart ? '#FF3B30' : '#333438'}
                strokeWidth={isStart ? 1.8 : 1.2}
              />
            );
          })}
        </G>

        {/* 7-Segment Digital Speed Display (Nested Group) */}
        <G transform={`translate(${tx} ${ty}) scale(${digitScale})`}>
          {/* Motion blur active during acceleration runs */}
          <G filter={speed > 0 && speed < 250 ? 'url(#motionBlur)' : undefined}>
            <G transform="translate(0 0)">
              <SevenSegmentDigit val={hundreds} color={speedColor} hasGlow={hasGlow} glowColor={glowColor} />
            </G>
            <G transform="translate(32 0)">
              <SevenSegmentDigit val={tens} color={speedColor} hasGlow={hasGlow} glowColor={glowColor} />
            </G>
            <G transform="translate(64 0)">
              <SevenSegmentDigit val={ones} color={speedColor} hasGlow={hasGlow} glowColor={glowColor} />
            </G>
          </G>
        </G>

        {/* "MPH" unit indicator */}
        <SvgText
          x={cx}
          y={cy + size * 0.26}
          textAnchor="middle"
          fill="#ffffff"
          opacity={0.85}
          fontSize={size * 0.09}
          fontWeight="700"
          letterSpacing={0.5}
          fontFamily={Platform.OS === 'ios' ? 'Outfit' : 'System'}
        >
          MPH
        </SvgText>
      </Svg>
    </View>
  );
}
