/**
 * Font family names — must match the PostScript names of the .ttf files bundled under
 * android/app/src/main/assets/fonts/ (see MIGRATION_NOTES.md for the bundling step).
 *
 * Web (index.html) loads these three families from Google Fonts CDN:
 *   - Inter (latin UI text)
 *   - Noto Sans Devanagari (Hindi script)
 *   - Noto Sans Bengali (Bengali script)
 *
 * This is a tier-1 requirement, not polish: without these bundled as native assets, every
 * Hindi/Bengali string in the app (see src/data/translations.js and any :lang(hi)/:lang(bn)
 * styled text) falls back to the OS system font, which most Android builds render for
 * Devanagari/Bengali with noticeably worse shaping and spacing than Noto Sans.
 *
 * On Android, RN resolves `fontFamily` against the *file name* of the bundled font asset
 * (minus extension), not an internal "family" name embedded in the font — so the constants
 * below must exactly match the .ttf file names placed in assets/fonts/.
 */

export const fontFamilies = {
  // Weight-specific static files (Android does not reliably vary weight from a single
  // variable font via fontWeight the way iOS/web do — bundling static weights per file
  // is the safe, cross-device approach).
  interRegular: 'Inter-Regular',
  interMedium: 'Inter-Medium',
  interSemiBold: 'Inter-SemiBold',
  interBold: 'Inter-Bold',
  interExtraBold: 'Inter-ExtraBold',

  notoDevanagariRegular: 'NotoSansDevanagari-Regular',
  notoDevanagariMedium: 'NotoSansDevanagari-Medium',
  notoDevanagariBold: 'NotoSansDevanagari-Bold',

  notoBengaliRegular: 'NotoSansBengali-Regular',
  notoBengaliMedium: 'NotoSansBengali-Medium',
  notoBengaliBold: 'NotoSansBengali-Bold',
};

/**
 * Picks the right font family for the given app language + weight. Mirrors web's
 * `:lang(hi)`/`:lang(bn)` CSS selectors (index.css: ".hindi-text"/"bengali-text" and
 * :lang() pseudoclasses), which swap the font family based on script rather than per-string.
 *
 * `language` is LanguageContext's 'en' | 'hi' | 'bn' (see src/context/LanguageContext).
 * `weight` accepts the same loose names used when choosing which static file to load.
 */
export function fontFamilyFor(language, weight = 'regular') {
  if (language === 'hi') {
    if (weight === 'bold') return fontFamilies.notoDevanagariBold;
    if (weight === 'medium' || weight === 'semibold') return fontFamilies.notoDevanagariMedium;
    return fontFamilies.notoDevanagariRegular;
  }
  if (language === 'bn') {
    if (weight === 'bold') return fontFamilies.notoBengaliBold;
    if (weight === 'medium' || weight === 'semibold') return fontFamilies.notoBengaliMedium;
    return fontFamilies.notoBengaliRegular;
  }
  // Default: Inter (English / fallback)
  if (weight === 'extrabold') return fontFamilies.interExtraBold;
  if (weight === 'bold') return fontFamilies.interBold;
  if (weight === 'semibold') return fontFamilies.interSemiBold;
  if (weight === 'medium') return fontFamilies.interMedium;
  return fontFamilies.interRegular;
}
