import { View, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radii, shadows, glass } from '@theme';

/**
 * Card — ported from web components/ui/Card.jsx + Card.css.
 *
 * Same API: variant ('default' | 'glass' | 'elevated'), padding ('sm'|'md'|'lg'|'none'),
 * hover (ignored — no hover on touch), onClick, className (ignored).
 *
 * Notes:
 *  - `card-glass` used backdrop-filter blur — flattened to a translucent surface (see glass.js).
 *  - `card-hover` translateY lift + fadeIn entry animation are dropped for now; entry animations
 *    are re-added selectively in Phase 12 polish where users actually notice them.
 *  - `card-clickable:active { transform: scale(0.99) }` → Pressable pressed scale below.
 */

const PADDING = {
  sm: spacing.space3,
  md: spacing.space6,
  lg: spacing.space8,
  none: 0,
};

function variantStyle(variant) {
  switch (variant) {
    case 'glass':
      return {
        backgroundColor: glass.cardBackground,
        borderWidth: 1,
        borderColor: glass.cardBorder,
        ...shadows.shadowGlass,
      };
    case 'elevated':
      return {
        backgroundColor: colors.surfaceWhite,
        borderWidth: 0,
        ...shadows.shadowLg,
      };
    case 'default':
    default:
      return {
        backgroundColor: colors.surfaceWhite,
        borderWidth: 1,
        borderColor: colors.gray200,
        ...shadows.shadowSm,
      };
  }
}

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  onClick,
  onPress,
  style,
  ...props
}) {
  const pad = PADDING[padding] ?? PADDING.md;
  const base = [styles.card, variantStyle(variant), { padding: pad }, style];
  const handlePress = onPress || onClick;

  if (handlePress) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={base} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.radiusLg,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
});
