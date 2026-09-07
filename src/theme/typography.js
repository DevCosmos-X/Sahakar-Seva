import { Dimensions, PixelRatio } from 'react-native';

/**
 * Typography scale — replaces web's CSS `clamp()` fluid type tokens.
 *
 * Web (src/index.css):
 *   --fs-xs:  clamp(0.7rem,  0.65rem + 0.25vw, 0.75rem)
 *   --fs-sm:  clamp(0.8rem,  0.75rem + 0.25vw, 0.875rem)
 *   --fs-base: clamp(0.9rem, 0.85rem + 0.25vw, 1rem)
 *   --fs-md:  clamp(1rem,   0.9rem  + 0.5vw,  1.125rem)
 *   --fs-lg:  clamp(1.1rem, 1rem    + 0.5vw,  1.25rem)
 *   --fs-xl:  clamp(1.2rem, 1.05rem + 0.75vw, 1.5rem)
 *   --fs-2xl: clamp(1.5rem, 1.25rem + 1.25vw, 2rem)
 *   --fs-3xl: clamp(1.8rem, 1.5rem  + 1.5vw,  2.5rem)
 *   --fs-4xl: clamp(2.2rem, 1.8rem  + 2vw,    3rem)
 *
 * `clamp(MIN, PREFERRED, MAX)` grows the preferred value with viewport width (vw) between a
 * floor and a ceiling. React Native has no vw unit and no clamp() — but the same shape
 * (linear interpolation against screen width, clamped to a min/max) is trivial to reproduce
 * with Dimensions + plain arithmetic. That's what `fluidSize` below does.
 *
 * Values are expressed in rem in the web app; 1rem == 16px there (the browser default root
 * font size — the web app never overrides html { font-size }), so rem*16 is the px equivalent.
 */

const REM_TO_PX = 16;

/**
 * Reproduces `clamp(minRem, addRem + vw*vwPercent, maxRem)` using screen width in place of
 * viewport width. Returns a value in px, rounded to the nearest integer (RN font sizes are
 * unitless px already, no need for PixelRatio scaling on top — RN handles device density).
 */
function fluidSize(minRem, addRem, vwPercent, maxRem, screenWidth) {
  const minPx = minRem * REM_TO_PX;
  const maxPx = maxRem * REM_TO_PX;
  const preferredPx = addRem * REM_TO_PX + (vwPercent / 100) * screenWidth;
  return Math.round(Math.min(maxPx, Math.max(minPx, preferredPx)));
}

// The clamp() definitions from index.css, kept as data so fontSizes can be recomputed
// (e.g. on orientation change) without duplicating the formulas.
const FLUID_DEFS = {
  fsXs: [0.7, 0.65, 0.25, 0.75],
  fsSm: [0.8, 0.75, 0.25, 0.875],
  fsBase: [0.9, 0.85, 0.25, 1],
  fsMd: [1, 0.9, 0.5, 1.125],
  fsLg: [1.1, 1, 0.5, 1.25],
  fsXl: [1.2, 1.05, 0.75, 1.5],
  fs2xl: [1.5, 1.25, 1.25, 2],
  fs3xl: [1.8, 1.5, 1.5, 2.5],
  fs4xl: [2.2, 1.8, 2, 3],
};

/**
 * Computes the fluid font-size scale for a given screen width. Call this from a ThemeProvider
 * (or useWindowDimensions) if you need it to react to rotation/foldable resizing; a static
 * snapshot computed at module load (see `fontSizes` below) is enough for a phone-only,
 * portrait-locked app like this one.
 */
export function createFontSizes(screenWidth) {
  const out = {};
  for (const [key, [min, add, vw, max]] of Object.entries(FLUID_DEFS)) {
    out[key] = fluidSize(min, add, vw, max, screenWidth);
  }
  return out;
}

const initialWidth = Dimensions.get('window').width;

/** Static snapshot, computed once at module load using the initial window width. */
export const fontSizes = createFontSizes(initialWidth);

/**
 * Font weights — ported verbatim from web's --fw-* tokens. RN's `fontWeight` style prop wants
 * these as strings, and Android's font-matching only reliably picks distinct weights when a
 * matching static font file is bundled for that weight (see theme/fonts.js) — otherwise it
 * silently falls back to the nearest bundled weight instead of erroring.
 */
export const fontWeights = {
  fwLight: '300',
  fwNormal: '400',
  fwMedium: '500',
  fwSemibold: '600',
  fwBold: '700',
  fwExtrabold: '800',
};

/**
 * Line heights — web's --lh-* tokens are unitless multipliers (CSS line-height: 1.5 means
 * "1.5x the font size"). RN's lineHeight style prop wants an absolute px value, so these
 * multipliers need to be multiplied by whatever fontSize they're paired with at the call site
 * (see theme/typography.js usage in components, e.g. lineHeight: fontSizes.fsBase * lineHeights.lhNormal).
 */
export const lineHeights = {
  lhTight: 1.2,
  lhNormal: 1.5,
  lhRelaxed: 1.7,
};

/** Device pixel ratio, exposed for any component that needs to hairline-align borders etc. */
export const pixelRatio = PixelRatio.get();
