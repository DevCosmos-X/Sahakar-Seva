import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight, ShieldCheck, BadgeCheck } from 'lucide-react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies, shadows } from '@theme';

/**
 * PromoBanner — the hero trust card near the top of the home screen. Carries the app's
 * cooperative trust message (not a discount), on-brand for a government-backed cooperative.
 *
 * Redesign: sophisticated deep-indigo surface with a single soft translucent accent ring on the
 * right holding a clean line-icon "trust seal" (replacing the 🛠️ emoji). Solid fill, no flashy
 * gradient. Same props (onPress), same copy, same "Book a service" CTA — visual only.
 */
export default function PromoBanner({ onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      {/* subtle decorative rings on the right (pure decoration) */}
      <View pointerEvents="none" style={styles.ringOuter} />
      <View pointerEvents="none" style={styles.ringInner} />

      <View style={styles.left}>
        <View style={styles.chip}>
          <ShieldCheck size={12} color={colors.accent300} />
          <Text style={styles.chipText}>Govt-backed Cooperative</Text>
        </View>
        <Text style={styles.title}>Verified pros, fair prices</Text>
        <Text style={styles.subtitle}>Every worker is cooperative-verified with transparent GST billing.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Book a service</Text>
          <ArrowRight size={14} color={colors.primary800} />
        </View>
      </View>

      <View style={styles.seal} pointerEvents="none">
        <BadgeCheck size={30} color={colors.white} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary800,
    borderRadius: radii.radiusXl,
    padding: spacing.space5,
    overflow: 'hidden',
    ...shadows.shadowLg,
    shadowColor: colors.primary900,
  },
  pressed: {
    opacity: 0.94,
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -70,
    top: -60,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ringInner: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: -30,
    bottom: -50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  left: {
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.radiusFull,
    marginBottom: spacing.space3,
  },
  chipText: {
    fontSize: 10,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.primary100,
    letterSpacing: 0.2,
  },
  title: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.white,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: fontSizes.fsXs,
    color: colors.primary200,
    fontFamily: fontFamilies.interRegular,
    lineHeight: fontSizes.fsXs * 1.45,
    marginBottom: spacing.space4,
    maxWidth: '94%',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.white,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderRadius: radii.radiusMd,
  },
  ctaText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.primary800,
  },
  seal: {
    width: 52,
    height: 52,
    borderRadius: radii.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.space3,
  },
});
