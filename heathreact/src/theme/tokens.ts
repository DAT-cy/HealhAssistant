// Shared light fitness design system.
export const palette = {
  bg: '#F7F8FC',
  surface: '#FFFFFF',
  surfaceRaised: '#F0F2FA',
  border: '#E8EAF4',
  text: '#20213A',
  textMuted: '#7A8099',
  textInverse: '#FFFFFF',
  primary: '#635BFF',
  primaryDark: '#4438CA',
  primarySoft: '#EFEEFF',
  accent: '#36B9F6',
  accentSoft: '#E8F7FF',
  success: '#22C993',
  warning: '#FFB547',
  danger: '#F26D85',
  dangerLight: '#FFF0F3',
  info: '#36B9F6',
  overlayScrim: 'rgba(32, 33, 58, 0.48)',
  landmark: '#36B9F6',
  landmarkProblem: '#F26D85',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const fontSize = { caption: 12, body: 14, subtitle: 16, title: 20, heading: 24, display: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 20, pill: 999 } as const;
