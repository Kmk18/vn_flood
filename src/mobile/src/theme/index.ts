export const Colors = {
  light: {
    background: '#F5F7FA',
    text: '#0D1117',
    primary: '#FF4B33',
    secondary: '#EDF0F5',
    danger: '#C8171A',
    warning: '#D97706',
    success: '#15803D',
    border: '#D8DCE3',
    card: '#FFFFFF',
    textSecondary: '#5C6470',
  },
  dark: {
    background: '#1C1C1C',
    text: '#EFEFEF',
    primary: '#FF6B55',
    secondary: '#323232',
    danger: '#F04040',
    warning: '#F59E0B',
    success: '#22C55E',
    border: '#454545',
    card: '#272727',
    textSecondary: '#9A9A9A',
  },
};

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  h1: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 26, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '700' as const },
  body1: { fontSize: 15 },
  body2: { fontSize: 13 },
  caption: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 0.8 },
  button: { fontSize: 14, fontWeight: '700' as const, letterSpacing: 0.6 },
};
