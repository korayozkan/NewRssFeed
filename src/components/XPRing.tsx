/**
 * XPRing — Avatar etrafında XP ilerleme halkası
 * Web'de conic-gradient ile yapılıyordu, RN'de react-native-svg ile.
 */

import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Rect, ClipPath } from 'react-native-svg';

interface Props {
  pct:      number;   // 0-100
  size?:    number;   // diameter px (default 80)
  children: React.ReactNode;
}

export default function XPRing({ pct, size = 80, children }: Props) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * pct) / 100;
  const accent = '#5b9cf6';
  const track = '#1a1a1a';

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {/* Track (full circle) */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={accent}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Avatar/children inside the ring */}
      <View
        style={{
          position: 'absolute',
          top: strokeWidth + 1,
          left: strokeWidth + 1,
          right: strokeWidth + 1,
          bottom: strokeWidth + 1,
          borderRadius: (size - strokeWidth * 2 - 2) / 2,
          overflow: 'hidden',
          backgroundColor: '#222',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {children}
      </View>
    </View>
  );
}
