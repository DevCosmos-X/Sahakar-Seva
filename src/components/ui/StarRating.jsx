import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * StarRating — ported from web components/ui/StarRating.jsx + StarRating.css.
 *
 * Same API: rating, maxStars, interactive, onRate, size. Supports both display mode (shows
 * numeric value beside the stars) and interactive mode (tap to rate).
 *
 * Web used a hover-preview (`hovered` state driven by onMouseEnter/Leave). Touch has no hover,
 * so hover preview is dropped — the interactive fill simply reflects the current `rating` (or,
 * while the user is pressing, could reflect the pressed value; kept simple to match the tap
 * result). The `:hover { scale(1.2) }` is replaced by a pressed scale on each interactive star.
 */

export default function StarRating({ rating = 0, maxStars = 5, interactive = false, onRate, size = 20 }) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Rating">
      {Array.from({ length: maxStars }, (_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;
        const color = isFilled ? colors.accent400 : colors.gray300;

        if (interactive) {
          return (
            <Pressable
              key={i}
              onPress={() => onRate?.(starValue)}
              style={({ pressed }) => [styles.star, pressed && styles.starPressed]}
              accessibilityLabel={`${starValue} star${starValue > 1 ? 's' : ''}`}
            >
              <Star size={size} color={color} fill={isFilled ? color : 'none'} />
            </Pressable>
          );
        }

        return (
          <View key={i} style={styles.star}>
            <Star size={size} color={color} fill={isFilled ? color : 'none'} />
          </View>
        );
      })}
      {!interactive && rating > 0 && <Text style={styles.value}>{rating.toFixed(1)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  star: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starPressed: {
    transform: [{ scale: 1.2 }],
  },
  value: {
    marginLeft: spacing.space2,
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray700,
  },
});
