import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
export function AppLoading({ label = 'Đang tải...' }: { label?: string }) { return <View style={styles.wrap}><ActivityIndicator color={colors.primary} /><Text style={styles.label}>{label}</Text></View>; }
const styles = StyleSheet.create({ wrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxxl }, label: { ...typography.caption, color: colors.textSecondary } });
