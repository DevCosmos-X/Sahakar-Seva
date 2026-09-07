import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * Badge + FairnessBadge — ported from web components/ui/Badge.jsx + Badge.css.
 *
 * Same API: variant, size, icon, pulse (animation dropped for now — re-added in Phase 12 if
 * needed), className (ignored). Also ports the status-specific variants from Badge.css
 * (en-route, in-progress, completed, etc.) since screens reference them via `variant={status}`.
 *
 * `pulse` animation and the fairness-badge gradient background are visual polish; the gradient
 * is flattened to its lighter stop. Flagged rather than silently dropped.
 */

const SIZES = {
  sm: { paddingV: 2, paddingH: 8, fontSize: fontSizes.fsXs, iconSize: 12 },
  md: { paddingV: 4, paddingH: 12, fontSize: fontSizes.fsSm, iconSize: 14 },
  lg: { paddingV: 6, paddingH: 16, fontSize: fontSizes.fsBase, iconSize: 16 },
};

// [background, foreground] per variant — includes both the base variants and the
// status-specific ones from Badge.css.
const VARIANTS = {
  default: [colors.gray100, colors.gray700],
  success: [colors.success50, colors.success600],
  warning: [colors.warning50, colors.warning600],
  danger: [colors.danger50, colors.danger600],
  info: [colors.info50, colors.info600],
  primary: [colors.primary50, colors.primary700],
  purple: ['#f3e8ff', '#7c3aed'],
  // status-specific (from .badge-en-route etc.)
  'en-route': ['#dbeafe', '#1d4ed8'],
  'in-progress': ['#fef3c7', '#b45309'],
  completed: ['#d1fae5', '#065f46'],
  cancelled: ['#fee2e2', '#b91c1c'],
  assigned: ['#e0e7ff', '#3730a3'],
  pending: ['#fef3c7', '#b45309'],
  approved: ['#d1fae5', '#065f46'],
  rejected: ['#fee2e2', '#b91c1c'],
  open: ['#fee2e2', '#b91c1c'],
  resolved: ['#d1fae5', '#065f46'],
};

export default function Badge({ children, variant = 'default', size = 'md', icon: Icon, style }) {
  const s = SIZES[size] || SIZES.md;
  const [bg, fg] = VARIANTS[variant] || VARIANTS.default;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, paddingVertical: s.paddingV, paddingHorizontal: s.paddingH },
        style,
      ]}
    >
      {Icon && <Icon size={s.iconSize} color={fg} />}
      <Text style={[styles.text, { color: fg, fontSize: s.fontSize }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export function FairnessBadge({ position }) {
  return (
    <View style={styles.fairness}>
      <Text style={styles.fairnessIcon}>⚖️</Text>
      <Text style={styles.fairnessText}>#{position} in fair queue</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.space1,
    borderRadius: radii.radiusFull,
  },
  text: {
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  fairness: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.space2,
    paddingVertical: 4,
    paddingHorizontal: 14,
    // web: linear-gradient(135deg, #ecfdf5, #d1fae5) — flattened to the lighter stop
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radii.radiusFull,
  },
  fairnessIcon: {
    fontSize: 16,
  },
  fairnessText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: '#065f46',
  },
});
