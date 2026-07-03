/**
 * constants/typography.js
 * Sistem tipografi KosanKu — ukuran font, berat, dan line height
 */

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 38,
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
  extraBold: '800',
};

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const FONT_FAMILY = {
  // System font fallback — Expo akan menggunakan sistem font device
  // Jika ingin custom font, load via expo-font di App.js
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

/**
 * Text style presets yang siap pakai di komponen
 */
export const TEXT_STYLES = {
  h1: {
    fontSize: FONT_SIZE['3xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['3xl'] * LINE_HEIGHT.tight,
  },
  h2: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['2xl'] * LINE_HEIGHT.tight,
  },
  h3: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.semiBold,
    lineHeight: FONT_SIZE.xl * LINE_HEIGHT.normal,
  },
  h4: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semiBold,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.normal,
  },
  bodyLarge: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.normal,
  },
  body: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.normal,
  },
  bodySmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  },
  caption: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.relaxed,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  },
  button: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semiBold,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.tight,
  },
};

export default { FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT, FONT_FAMILY, TEXT_STYLES };
