import Svg, { Circle, Path, Rect, ClipPath, Defs, G } from 'react-native-svg';

/**
 * AvatarPortrait — an ORIGINAL react-native-svg illustration of a friendly professional
 * head-and-shoulders portrait, used as a picture-style avatar beside an account holder's name
 * when no real profile image exists.
 *
 * Why this approach (frontend-only, no backend, no new dependency, no copyright risk):
 *   - react-native-svg is already a project dependency (see RoleIllustrations).
 *   - It draws original vector art, NOT a photo of a real person, so there is no licensing or
 *     privacy concern and nothing is fetched at runtime.
 *   - The palette (background, skin tone, hair, clothing) is chosen deterministically from a
 *     `seed` (the user's name/id) so each account gets a stable, distinct-looking portrait and
 *     the set feels diverse across users.
 *
 * A REAL avatar image still takes priority in the screens that use this — this only renders as
 * the fallback. No profile data, schema, or field is added or changed.
 */

// Palette variants — warm, natural, professional tones (varied skin/hair/clothing + backdrop).
const VARIANTS = [
  { bg: '#e0e7ff', skin: '#e6b98f', hair: '#3b2b23', shirt: '#4f46e5' },
  { bg: '#fef3c7', skin: '#c98a5e', hair: '#241a14', shirt: '#b45309' },
  { bg: '#d1fae5', skin: '#8d5a3c', hair: '#1c130d', shirt: '#047857' },
  { bg: '#dbeafe', skin: '#f0c9a4', hair: '#4a3526', shirt: '#1d4ed8' },
  { bg: '#fae8ff', skin: '#b07a52', hair: '#20160f', shirt: '#7c3aed' },
  { bg: '#fee2e2', skin: '#d69b70', hair: '#2a1d15', shirt: '#b91c1c' },
];

// Small, stable string hash → variant index (deterministic per seed).
// Uses modular arithmetic (no bitwise ops) to keep the value bounded and lint-clean.
function seedIndex(seed, mod) {
  const s = String(seed || 'user');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 100000;
  }
  return h % mod;
}

export default function AvatarPortrait({ size = 96, seed = 'user' }) {
  const v = VARIANTS[seedIndex(seed, VARIANTS.length)];

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96" accessibilityLabel="Profile avatar">
      <Defs>
        <ClipPath id="avatarClip">
          <Circle cx="48" cy="48" r="48" />
        </ClipPath>
      </Defs>
      <G clipPath="url(#avatarClip)">
        {/* Backdrop */}
        <Rect x="0" y="0" width="96" height="96" fill={v.bg} />
        {/* Shoulders / clothing */}
        <Path d="M14 96 V84 a34 34 0 0 1 68 0 V96 Z" fill={v.shirt} />
        {/* Collar accent */}
        <Path d="M40 70 l8 9 l8 -9 l-4 -5 h-8 Z" fill="#ffffff" opacity="0.92" />
        {/* Neck */}
        <Path d="M41 60 h14 v11 a7 7 0 0 1 -14 0 Z" fill={v.skin} />
        {/* Head */}
        <Circle cx="48" cy="40" r="17" fill={v.skin} />
        {/* Hair */}
        <Path d="M31 40 a17 17 0 0 1 34 0 q-3 -6 -8 -7 q-9 4 -18 0 q-5 1 -8 7 Z" fill={v.hair} />
        <Path d="M31 40 q-2 -14 17 -15 q19 1 17 15 q-4 -8 -17 -8 q-13 0 -17 8 Z" fill={v.hair} />
        {/* Eyes */}
        <Circle cx="42" cy="40" r="1.8" fill="#2b2b2b" />
        <Circle cx="54" cy="40" r="1.8" fill="#2b2b2b" />
        {/* Soft smile */}
        <Path d="M43 47 q5 4 10 0" stroke="#8a5a3c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}
