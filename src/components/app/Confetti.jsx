import { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

/**
 * Confetti — a lightweight, dependency-free celebratory burst built entirely on React Native's
 * built-in Animated API (no new npm package). Particles spawn at a center point and fan outward
 * with a slight fall + fade, evoking a premium confetti pop.
 *
 * Purely presentational. It renders nothing meaningful until `run` flips true, then plays once.
 * Designed to be triggered AFTER the success-check animation completes (see BookingScreen).
 *
 * Props:
 *   run      boolean — when it becomes true, the burst plays once.
 *   count    number  — particle count (default 22).
 *   colors   string[] — palette (defaults to a tasteful purple/green/yellow/accent mix).
 *   duration number  — burst duration in ms (default 1100 — short + smooth).
 *   originY  number  — vertical origin offset from the container top (default 0, i.e. top-center).
 */
const DEFAULT_COLORS = ['#7c3aed', '#4f46e5', '#10b981', '#facc15', '#f59e0b', '#a5b4fc'];

export default function Confetti({
  run = false,
  count = 22,
  colors = DEFAULT_COLORS,
  duration = 1100,
  originY = 0,
}) {
  // One Animated.Value per particle, plus a stable set of randomized trajectories.
  const progress = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (Math.PI * (i / count)) + (Math.random() * 0.5 - 0.25); // fan across the top arc
        const distance = 90 + Math.random() * 130;
        return {
          color: colors[i % colors.length],
          // Horizontal spread is symmetric around center; vertical goes up a bit then falls.
          dx: Math.cos(angle) * distance * (Math.random() > 0.5 ? 1 : -1),
          rise: 60 + Math.random() * 70,
          fall: 140 + Math.random() * 120,
          size: 6 + Math.random() * 6,
          rounded: Math.random() > 0.5,
          rotate: (Math.random() * 720 - 360),
          delay: Math.random() * 120,
        };
      }),
    [count, colors],
  );

  useEffect(() => {
    if (!run) return;
    const animations = progress.map((v, i) => {
      v.setValue(0);
      return Animated.timing(v, {
        toValue: 1,
        duration,
        delay: particles[i].delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    });
    Animated.stagger(8, animations).start();
  }, [run, duration, progress, particles]);

  if (!run) return null;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {particles.map((p, i) => {
        const v = progress[i];
        // Up-then-down vertical path.
        const translateY = v.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [originY, originY - p.rise, originY + p.fall],
        });
        const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] });
        const opacity = v.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });
        const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.rotate}deg`] });
        const scale = v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.9] });

        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                width: p.size,
                height: p.size,
                borderRadius: p.rounded ? p.size / 2 : 1.5,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }, { scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Sits above the success icon, centered horizontally; does not intercept touches.
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
