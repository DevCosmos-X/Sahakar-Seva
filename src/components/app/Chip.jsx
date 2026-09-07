import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * Chip + ChipRow — pill-shaped selectable tags, the pattern Zomato/Swiggy use for quick filters
 * and that this app uses for the booking wizard's "quick select" problem tags and time slots.
 *
 * Chip: a single pill; `selected` gives it the filled/active look.
 * ChipRow: a horizontally-scrolling row of chips (wrap=false) or a wrapping flex group
 * (wrap=true), so long tag lists scroll sideways like a filter bar instead of stacking.
 */
export function Chip({ label, selected = false, onPress, style }) {
  return (
    <Pressable
      style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault, style]}
      onPress={onPress}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textDefault]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipRow({ children, wrap = false, contentStyle }) {
  if (wrap) {
    return <View style={[styles.wrapRow, contentStyle]}>{children}</View>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollRow, contentStyle]}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusFull,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: colors.surfaceWhite,
    borderColor: colors.gray200,
  },
  chipSelected: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  text: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
  },
  textDefault: {
    color: colors.gray700,
  },
  textSelected: {
    color: colors.white,
  },
  scrollRow: {
    gap: spacing.space2,
    paddingRight: spacing.space4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
  },
});
