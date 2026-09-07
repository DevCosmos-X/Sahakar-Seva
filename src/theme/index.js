// Barrel export for the theme layer — lets components do
//   import { colors, spacing, fontSizes } from '@theme';
// instead of reaching into each file. Nothing here is new; it just re-exports Phase 2's modules.

export { colors } from './colors';
export { spacing, radii, layout, zIndex } from './spacing';
export { shadows } from './shadows';
export { glass } from './glass';
export { fontSizes, fontWeights, lineHeights, createFontSizes, pixelRatio } from './typography';
export { fontFamilies, fontFamilyFor } from './fonts';
