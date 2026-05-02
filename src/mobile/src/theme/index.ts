export const Colors = {
  light: {
    background: '#F5F7FA',
    text: '#0D1117',
    primary: '#1A4ED8',
    secondary: '#EDF0F5',
    danger: '#C8171A',
    warning: '#D97706',
    success: '#15803D',
    border: '#D8DCE3',
    card: '#FFFFFF',
    textSecondary: '#5C6470',
  },
  dark: {
    background: '#0D1117',
    text: '#E6ECF3',
    primary: '#4B7CF4',
    secondary: '#161B25',
    danger: '#F04040',
    warning: '#F59E0B',
    success: '#22C55E',
    border: '#1E2533',
    card: '#131820',
    textSecondary: '#8892A4',
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
