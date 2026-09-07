/**
 * Shadows — ported from web's --shadow-* tokens (CSS box-shadow).
 *
 * RN's shadow* style props (shadowColor/shadowOffset/shadowOpacity/shadowRadius) are honored on
 * Android by Fabric (New Architecture) for plain Views, but Android's native shadow renderer
 * does not support multi-layer shadows the way CSS box-shadow does, and it ignores shadowOffset
 * direction the way iOS does — visually it behaves like a single soft drop shadow driven by
 * elevation. Since this app is Android-only, `elevation` is the primary signal and shadowColor/
 * shadowOpacity are kept as a secondary approximation for the parts of Fabric that do use them.
 *
 * This is a compromise, not a pixel match: web's --shadow-md is two stacked box-shadows
 * (a tight one + a soft one). Android elevation only gives one falloff curve. Flagged here
 * rather than silently treated as equivalent.
 */

export const shadows = {
  shadowSm: {
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  shadowMd: {
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  shadowLg: {
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  shadowXl: {
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  // web's --shadow-glass / --shadow-glow use the primary-600 tint instead of black —
  // used behind glass-card / glow accents (see theme/glass.js).
  shadowGlass: {
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  shadowGlow: {
    elevation: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
};
