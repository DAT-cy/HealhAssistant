import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export function AppBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) { const map = { primary: [colors.primarySoft, colors.primary], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, '#B45309'], error: [colors.errorSoft, colors.error], info: [colors.infoSoft, '#0369A1'], neutral: [colors.surfaceRaised, colors.textSecondary] }; const [backgroundColor, color] = map[tone]; return <View style={[styles.badge, { backgroundColor }]}><Text style={[styles.text, { color }]}>{label}</Text></View>; }
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill }, text: { fontSize: 11, fontWeight: '700' } });
