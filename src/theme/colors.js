/**
 * Color tokens — ported 1:1 from the web app's src/index.css :root custom properties.
 * Every hex value below matches the web app exactly; nothing was re-picked or "improved".
 *
 * Source: e:\sahakar-seva-progress\src\index.css
 */

export const colors = {
  // Primary palette — deep indigo to violet
  primary50: '#eef2ff',
  primary100: '#e0e7ff',
  primary150: '#d4daff', // added in web app's "Additions" block
  primary200: '#c7d2fe',
  primary300: '#a5b4fc',
  primary400: '#818cf8',
  primary500: '#6366f1',
  primary600: '#4f46e5',
  primary700: '#4338ca',
  primary800: '#3730a3',
  primary900: '#312e81',

  // Accent — warm amber
  accent50: '#fffbeb',
  accent100: '#fef3c7',
  accent200: '#fde68a',
  accent300: '#fcd34d',
  accent400: '#fbbf24',
  accent500: '#f59e0b',
  accent600: '#d97706',
  accent700: '#b45309',

  // Semantic — success
  success50: '#ecfdf5',
  success100: '#d1fae5',
  success500: '#10b981',
  success600: '#059669',
  success700: '#047857',
  success800: '#065f46',

  // Semantic — warning
  warning50: '#fffbeb',
  warning100: '#fef3c7',
  warning200: '#fde68a',
  warning300: '#fcd34d',
  warning500: '#f59e0b',
  warning600: '#d97706',
  warning700: '#b45309',
  warning800: '#92400e',

  // Semantic — danger
  danger50: '#fef2f2',
  danger100: '#fee2e2',
  danger200: '#fecaca',
  danger300: '#fca5a5',
  danger400: '#f87171',
  danger500: '#ef4444',
  danger600: '#dc2626',
  danger700: '#b91c1c',

  // Semantic — info
  info50: '#eff6ff',
  info100: '#dbeafe',
  info500: '#3b82f6',
  info600: '#2563eb',
  info700: '#1d4ed8',
  info800: '#1e40af',

  // Neutrals
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Surfaces
  bgPrimary: '#f0f2f5',
  // NOTE: web's --bg-card / --bg-glass rely on CSS backdrop-filter (glassmorphism) which has
  // no RN equivalent. These are flattened translucent colors — see theme/glass.js for the
  // compromise and the @react-native-community/blur alternative discussed there.
  bgCard: 'rgba(255, 255, 255, 0.85)',
  bgGlass: 'rgba(255, 255, 255, 0.15)',
  bgDarkOverlay: 'rgba(17, 24, 39, 0.6)',
  surfaceWhite: '#ffffff',

  white: '#ffffff',
  black: '#000000',
};
