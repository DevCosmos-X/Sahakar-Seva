import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle } from 'react-native-svg';

/**
 * GradientBand — a true linear-gradient background rendered with react-native-svg (already a
 * project dependency), so it needs NO new native module / linking. It self-measures via
 * onLayout and paints an absolutely-positioned gradient Rect behind whatever children you nest
 * on top of it.
 *
 * This is the app's sanctioned way to get a real gradient without adding react-native-linear-
 * gradient (a native dep). Purely presentational.
 *
 * Props:
 *  - colors:   array of hex stops (default deep indigo -> violet)
 *  - locations:optional array of 0..1 stop offsets (same length as colors)
 *  - angle:    'vertical' | 'diagonal' (default 'diagonal')
 *  - decor:    when true, adds faint decorative circles (soft lighting) — subtle, low-opacity
 *  - style:    container style (set borderRadius/overflow here)
 */
export default function GradientBand({
  colors = ['#4338ca', '#5b21b6'],
  locations,
  angle = 'diagonal',
  decor = false,
  style,
  children,
}) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  const end = angle === 'vertical' ? { x2: '0', y2: '1' } : { x2: '1', y2: '1' };

  return (
    <View style={style} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <LinearGradient id="band" x1="0" y1="0" x2={end.x2} y2={end.y2}>
              {colors.map((c, i) => (
                <Stop
                  key={i}
                  offset={locations ? locations[i] : i / (colors.length - 1)}
                  stopColor={c}
                  stopOpacity="1"
                />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={size.w} height={size.h} fill="url(#band)" />
          {decor && (
            <>
              <Circle cx={size.w * 0.86} cy={size.h * 0.18} r={size.h * 0.42} fill="#ffffff" opacity={0.06} />
              <Circle cx={size.w * 1.02} cy={size.h * 0.62} r={size.h * 0.3} fill="#ffffff" opacity={0.05} />
            </>
          )}
        </Svg>
      )}
      {children}
    </View>
  );
}
