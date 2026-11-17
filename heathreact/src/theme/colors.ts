export const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#EFF6FF',
  aiAccent: '#7C3AED',
  aiAccentSoft: '#F5F3FF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceRaised: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  error: '#DC2626',
  errorSoft: '#FEF2F2',
  info: '#0EA5E9',
  infoSoft: '#F0F9FF',
  textInverse: '#FFFFFF',
  overlayScrim: 'rgba(15, 23, 42, 0.48)',
} as const;

// Legacy aliases keep existing user and doctor screens visually stable while
// they migrate to the shared tokens.
export const palette = {
  ...colors,
  bg: colors.background,
  text: colors.textPrimary,
  textMuted: colors.textSecondary,
  accent: colors.info,
  accentSoft: colors.infoSoft,
  danger: colors.error,
  dangerLight: colors.errorSoft,
  info: colors.info,
  landmark: colors.info,
  landmarkProblem: colors.error,
} as const;
