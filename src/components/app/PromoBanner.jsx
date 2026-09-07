import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies, shadows } from '@theme';

/**
 * PromoBanner — the bold colored hero card near the top of the home screen (Amazon/Flipkart
 * deal banner, Zomato promo strip). Here it carries the app's cooperative trust message rather
 * than a discount, which keeps it on-brand for a government-backed cooperative platform instead
 * of feeling like a generic e-commerce sale banner.
 *
 * Solid indigo fill (flattened from what would be a gradient on web — consistent with the
 * Phase 4 gradient-flatten decision) with an amber accent chip.
 */
export default function PromoBanner({ onPress }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.left}>
        <View style={styles.chip}>
          <ShieldCheck size={12} color={colors.warning800} />
          <Text style={styles.chipText}>Govt-backed Cooperative</Text>
        </View>
        <Text style={styles.title}>Verified pros, fair prices</Text>
        <Text style={styles.subtitle}>Every worker is cooperative-verified with transparent GST billing.</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Book a service</Text>
          <ArrowRight size={14} color={colors.white} />
        </View>
      </View>
      <Text style={styles.emoji}>🛠️</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary700,
    borderRadius: radii.radiusXl,
    padding: spacing.space5,
    overflow: 'hidden',
    ...shadows.shadowGlass,
  },
  left: {
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: colors.accent200,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radii.radiusFull,
    marginBottom: spacing.space2,
  },
  chipText: {
    fontSize: 10,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.warning800,
  },
  title: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.white,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: fontSizes.fsXs,
    color: colors.primary100,
    fontFamily: fontFamilies.interRegular,
    marginBottom: spacing.space3,
    maxWidth: '92%',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.accent500,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
  },
  ctaText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.white,
  },
  emoji: {
    fontSize: 44,
    marginLeft: spacing.space2,
  },
});
