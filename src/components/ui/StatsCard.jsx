import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * StatsCard — ported from web components/ui/StatsCard.jsx + StatsCard.css.
 *
 * Same API: label, value, icon, trend ('up'|'down'), trendValue, color.
 * The animated count-up (setInterval, 30 steps over 1000ms) is ported VERBATIM — it's pure
 * JS/timers, works identically in RN. formatValue (k-suffix for >= 10000, toLocaleString
 * otherwise) is also ported unchanged.
 *
 * CSS media query at 640px shrinks padding/font on small screens. Since this is a phone-only
 * app effectively always below that breakpoint, the mobile branch values are baked in directly
 * (per the plan: "take the mobile branch and delete the rest") rather than kept as a runtime
 * breakpoint check.
 */

const ICON_COLORS = {
  primary: { bg: colors.primary50, fg: colors.primary600 },
  success: { bg: colors.success50, fg: colors.success600 },
  warning: { bg: colors.warning50, fg: colors.warning600 },
  danger: { bg: colors.danger50, fg: colors.danger600 },
  info: { bg: colors.info50, fg: colors.info600 },
};

export default function StatsCard({ label, value, icon: Icon, trend, trendValue, color = 'primary' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    if (numValue === 0) {
      setDisplayValue(value);
      return;
    }

    const duration = 1000;
    const steps = 30;
    const increment = numValue / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const current = Math.min(Math.round(increment * step), numValue);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatValue = (val) => {
    if (typeof val === 'string') return val;
    if (val >= 10000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  const ic = ICON_COLORS[color] || ICON_COLORS.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {Icon && (
          <View style={[styles.icon, { backgroundColor: ic.bg }]}>
            <Icon size={16} color={ic.fg} />
          </View>
        )}
      </View>
      <Text style={styles.value}>{formatValue(displayValue)}</Text>
      {trend && (
        <View style={styles.trend}>
          <Text style={[styles.trendValue, trend === 'up' ? styles.trendUp : styles.trendDown]}>
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </Text>
          <Text style={styles.trendLabel}>vs last week</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusMd, // mobile branch (640px media query)
    padding: spacing.space4, // mobile branch
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadows.shadowMd,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space2, // mobile branch
  },
  label: {
    flex: 1,
    fontSize: 11, // mobile branch
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  icon: {
    width: 32, // mobile branch
    height: 32,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: fontSizes.fsXl, // mobile branch
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.gray900,
    marginBottom: spacing.space1,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendValue: {
    fontSize: 11,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  trendUp: {
    color: colors.success600,
  },
  trendDown: {
    color: colors.danger600,
  },
  trendLabel: {
    fontSize: 11,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
  },
});
