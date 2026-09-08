import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

/**
 * ProgressRing — a circular progress visualization drawn with react-native-svg (already a project
 * dependency; no new native module). Purely presentational: the caller passes `value` and `max`
 * from EXISTING data and the ring fills `value/max`. It renders no text itself — center content
 * is passed as children so the caller controls what numbers show.
 *
 * Props:
 *  - value, max: the existing numbers (fraction = value/max, clamped 0..1)
 *  - size: outer diameter (px)
 *  - stroke: ring thickness
 *  - color: progress arc color
 *  - trackColor: unfilled track color
 *  - children: centered content (e.g. the score text)
 */
export default function ProgressRing({
  value = 0,
  max = 100,
  size = 120,
  stroke = 10,
  color = '#4f46e5',
  trackColor = '#e5e7eb',
  children,
}) {
  const safeMax = max > 0 ? max : 1;
  const fraction = Math.max(0, Math.min(value / safeMax, 1));
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - fraction);
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          // start the arc at 12 o'clock
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
