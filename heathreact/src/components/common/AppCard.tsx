import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { colors, radius, shadows, spacing } from '@/theme';
export function AppCard({ children, style, ...props }: ViewProps) { return <View {...props} style={[styles.card, style]}>{children}</View>; }
export function AppSection({ children, title, action, style }: { children: React.ReactNode; title?: string; action?: React.ReactNode; style?: ViewProps['style'] }) { return <View style={style}><View style={styles.sectionHeader}>{title ? <View><TextLabel>{title}</TextLabel></View> : <View />}{action}</View>{children}</View>; }
export function TextLabel({ children }: { children: React.ReactNode }) { return <Text style={styles.label}>{children}</Text>; }
const styles = StyleSheet.create({ card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.card }, sectionHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }, label: { color: colors.textPrimary, fontSize: 17, lineHeight: 24, fontWeight: '700' } });
