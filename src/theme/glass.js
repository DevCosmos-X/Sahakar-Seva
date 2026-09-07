/**
 * Glassmorphism compromise.
 *
 * Web uses `backdrop-filter: blur(20px)` (--glass-blur) over semi-transparent backgrounds in
 * `.glass-card`, `Card.css` (variant="glass"), `Modal.css`, `VideoCallModal.css`,
 * `BillReceiptModal.css`, and `LiveTrackingMap.css`. There is no CSS backdrop-filter
 * equivalent in React Native's style system — blur has to come from a native view.
 *
 * Two options, in order of fidelity:
 *
 * 1. @react-native-community/blur — <BlurView> renders a real native blur (Android:
 *    RenderEffect-backed blur on API 31+, falls back to a translucent overlay + slight
 *    darken on older APIs since Android's blur APIs did not exist before Android 12).
 *    This is the closer visual match but is a new native dependency, and on
 *    minSdk 24-30 devices it degrades to option 2 anyway.
 * 2. Flatten to a solid/translucent color (no blur at all) — zero extra native surface,
 *    same look on every Android version, but loses the "frosted glass" depth entirely.
 *
 * Decision for this port: use option 2 (flatten) as the default for GLASS_FALLBACK, and
 * reserve @react-native-community/blur for the two screens where the glass effect is most
 * visually load-bearing (Modal overlays and the AI chat widget). This is a visual-fidelity
 * compromise — flagging explicitly rather than silently dropping it. Revisit if the flattened
 * look reads as "just a card" instead of "glass" once it's on a real screen.
 */

export const glass = {
  // Flattened stand-in for `.glass-card` (bg: rgba(255,255,255,0.12) + blur(20px)).
  // Bumped opacity up from the web value since there's no blur underneath it to help
  // separate it from the background — a purely transparent 12% white is nearly invisible
  // without the blur doing the visual work.
  cardBackground: 'rgba(255, 255, 255, 0.85)',
  cardBorder: 'rgba(255, 255, 255, 0.35)',

  // For BlurView-backed screens (Modal, AiChatWidget) — passed as <BlurView blurAmount>.
  blurAmount: 20,
  blurType: 'light',

  // Dark overlay behind modals — matches web's --bg-dark-overlay, no blur needed here since
  // it's a solid-ish scrim, not frosted glass.
  overlayBackground: 'rgba(17, 24, 39, 0.6)',
};
