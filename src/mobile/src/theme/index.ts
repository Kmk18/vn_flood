export const Colors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#0052CC',
    secondary: '#F4F5F7',
    danger: '#FF5630',
    warning: '#FFAB00',
    success: '#36B37E',
    border: '#DFE1E6',
    card: '#FFFFFF',
    textSecondary: '#5E6C84',
  },
  dark: {
    background: '#121212',
    text: '#FFFFFF',
    primary: '#4C9AFF',
    secondary: '#202124',
    danger: '#FF8F73',
    warning: '#FFC400',
    success: '#57D9A3',
    border: '#2C2D30',
    card: '#1E1E1E',
    textSecondary: '#A0AABF',
  }
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
  h1: { fontSize: 32, fontWeight: 'bold' as const },
  h2: { fontSize: 24, fontWeight: 'bold' as const },
  h3: { fontSize: 20, fontWeight: '600' as const },
  body1: { fontSize: 16 },
  body2: { fontSize: 14 },
  caption: { fontSize: 12 },
  button: { fontSize: 16, fontWeight: 'bold' as const },
};
