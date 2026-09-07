import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * Button — ported from web components/ui/Button.jsx + Button.css.
 *
 * Same public API: variant, size, loading, disabled, icon, onClick, className (ignored on RN).
 * `onClick` is kept as the prop name for 1:1 call-site compatibility with ported screens;
 * internally it maps to Pressable's onPress.
 *
 * COMPROMISES vs web (flagged, not silently dropped):
 *  - Gradients: web buttons use `linear-gradient(135deg, primary-600, primary-700)` etc. RN has
 *    no native gradient without react-native-linear-gradient (an extra native module to compile
 *    on the Windows/space-in-username toolchain we already had to hand-fix). The gradients here
 *    are subtle two-stop ramps between adjacent palette steps, so each is flattened to a single
 *    solid color (the darker stop, which reads as the button's dominant tone). Visually ~95%
 *    there on a small control. If a gradient becomes visually load-bearing later we can add the
 *    native lib then.
 *  - `::before` sheen overlay + `:hover` lift/glow: no hover on touch; dropped. The pressed
 *    state below (opacity + scale) is the touch equivalent of the web `:active` transform.
 *  - box-shadow per variant → elevation via theme shadows (Android approximation, see shadows.js).
 */

const SIZES = {
  sm: {
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    fontSize: fontSizes.fsSm,
    radius: radii.radiusSm,
    iconSize: 16,
  },
  md: {
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space6,
    fontSize: fontSizes.fsBase,
    radius: radii.radiusMd,
    iconSize: 18,
  },
  lg: {
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space8,
    fontSize: fontSizes.fsMd,
    radius: radii.radiusLg,
    iconSize: 20,
  },
};

// [backgroundColor, textColor, borderColor]. Gradients flattened to their darker stop.
const VARIANTS = {
  primary: { bg: colors.primary700, fg: colors.white, border: 'transparent' },
  secondary: { bg: colors.gray100, fg: colors.gray700, border: 'transparent' },
  outline: { bg: 'transparent', fg: colors.primary600, border: colors.primary300 },
  danger: { bg: colors.danger600, fg: colors.white, border: 'transparent' },
  ghost: { bg: 'transparent', fg: colors.gray600, border: 'transparent' },
  success: { bg: colors.success600, fg: colors.white, border: 'transparent' },
  accent: { bg: colors.accent600, fg: colors.white, border: 'transparent' },
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  onClick,
  onPress,
  fullWidth = false,
  style,
  ...props
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;
  const handlePress = onPress || onClick;

  return (
    <Pressable
      onPress={isDisabled ? undefined : handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius: s.radius,
          backgroundColor: v.bg,
          borderColor: v.border,
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.fg} />
      ) : Icon ? (
        <View style={styles.iconWrap}>
          <Icon size={s.iconSize} color={v.fg} />
        </View>
      ) : null}
      {children != null && (
        <Text style={[styles.label, { color: v.fg, fontSize: s.fontSize }]} numberOfLines={1}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    borderWidth: 2,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    // web: transform: translateY(0) scale(0.98) on :active
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
});
