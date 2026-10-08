// Design system tokens cho Health Assistant (dark-first, tối ưu phòng tập).
// Nguồn: HealthAssistantProject/.kilo/skills/rn-health-assistant/references/design-system.md
export const palette = {
  bg: '#0B0F14',
  surface: '#131A22',
  surfaceRaised: '#1B242E',
  border: '#2A3542',
  text: '#F2F5F8',
  textMuted: '#9AA7B4',
  textInverse: '#0B0F14',
  primary: '#22C55E',
  primaryMuted: '#16A34A',
  accent: '#38BDF8',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',
  overlayScrim: 'rgba(11, 15, 20, 0.72)',
  landmark: '#38BDF8',
  landmarkProblem: '#EF4444',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const fontSize = { caption: 12, body: 14, subtitle: 16, title: 20, heading: 24, display: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
