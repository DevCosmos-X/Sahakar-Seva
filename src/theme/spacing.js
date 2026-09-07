/**
 * Spacing scale — ported from web's --space-* tokens (4px base scale, rem values at
 * the browser default of 16px/rem, so 1rem == 16px here).
 *
 * React Native layout values are unitless density-independent pixels, which map directly
 * onto the "px" a browser would compute for `rem` at the default root font size. No PixelRatio
 * scaling is applied here — RN already handles device pixel density itself.
 */

export const spacing = {
  space1: 4, // 0.25rem
  space2: 8, // 0.5rem
  space3: 12, // 0.75rem
  space4: 16, // 1rem
  space5: 20, // 1.25rem
  space6: 24, // 1.5rem
  space8: 32, // 2rem
  space10: 40, // 2.5rem
  space12: 48, // 3rem
  space16: 64, // 4rem
  space20: 80, // 5rem
};

/**
 * Border radii — ported from web's --radius-* tokens.
 */
export const radii = {
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
  radiusXl: 24,
  radius2xl: 32,
  radiusFull: 9999,
};

/**
 * Layout constants — ported from web's --sidebar-width / --header-height / --max-content-width.
 * sidebarWidth is kept only for reference/documentation: the web app's sidebar and drawer nav
 * variants are deliberately NOT ported to mobile (bottom tabs only, per the migration plan).
 */
export const layout = {
  sidebarWidth: 260,
  headerHeight: 64,
  maxContentWidth: 1200,
};

/**
 * z-index scale — ported from web's --z-* tokens. RN has no z-index cascade like the DOM;
 * these values are still useful for elevation/zIndex style props on absolutely-positioned
 * views (toasts, modals, the AI chat FAB) so relative stacking order stays consistent with web.
 */
export const zIndex = {
  zDropdown: 100,
  zSticky: 200,
  zModalBackdrop: 300,
  zModal: 400,
  zToast: 500,
};
