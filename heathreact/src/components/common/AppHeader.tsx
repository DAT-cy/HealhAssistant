import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
export function AppHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode }) { return <View style={styles.header}>{onBack ? <Pressable onPress={onBack} accessibilityLabel="Quay lại" style={styles.icon}><Ionicons name="chevron-back" size={24} color={colors.textPrimary} /></Pressable> : null}<View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right || <View style={styles.icon} />}</View>; }
const styles = StyleSheet.create({ header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface }, copy: { flex: 1 }, title: { ...typography.heading2, color: colors.textPrimary }, subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } });
