import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

type Tone = 'success' | 'warning' | 'danger' | 'info';
const tone: Record<Tone, string> = { success: palette.success, warning: palette.warning, danger: palette.danger, info: palette.info };

export default function Badge({ label, tone: badgeTone = 'info' }: { label: string; tone?: Tone }) {
  const color = tone[badgeTone];
  return <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}><Text style={[styles.text, { color }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: 5 },
  text: { fontSize: 11, fontWeight: '700' },
});
