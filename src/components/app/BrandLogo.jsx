import { Image } from 'react-native';

/**
 * BrandLogo — renders the EXACT existing Sahakar Seva app icon on in-app surfaces
 * (currently the Login and Register brand headers).
 *
 * Uses the bundled `@assets/logo.png`, which is the full composited app-icon graphic (indigo
 * background + white cooperative mark + gold arc) — generated pixel-identical to the launcher
 * icon by android/generate_icon.ps1.
 *
 * IMPORTANT — why NOT the native `ic_launcher` drawable:
 *   Referencing { uri: 'ic_launcher' } resolves, on Android 8+ (API 26+), to the ADAPTIVE icon
 *   at mipmap-anydpi-v26/ic_launcher.xml. Rendered in a small <Image>, that shows only the
 *   adaptive FOREGROUND layer (ic_launcher_foreground.png), whose canvas is fully transparent
 *   with a white mark — so the logo appeared white/blank. The image still "loaded", so an
 *   onError fallback never fired. Rendering the composited PNG directly avoids that entirely.
 *
 * Purely a presentation asset reference. It does NOT touch the app icon itself, native config,
 * authentication, or any backend. Nothing here creates or redraws a logo — it reuses the
 * existing app-icon asset.
 */

// The composited app-icon PNG (RN auto-selects @1x/@2x/@3x from src/assets).
const BRAND_LOGO = require('@assets/logo.png');

export default function BrandLogo({ style, accessibilityLabel = 'Sahakar Seva logo', resizeMode = 'cover' }) {
  return (
    <Image
      source={BRAND_LOGO}
      style={style}
      resizeMode={resizeMode}
      accessibilityLabel={accessibilityLabel}
      accessible
    />
  );
}
