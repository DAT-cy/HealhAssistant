import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/theme';
export function AppEmptyState({ title, description, icon = 'file-tray-outline' }: { title: string; description?: string; icon?: keyof typeof Ionicons.glyphMap }) { return <View style={styles.empty}><Ionicons name={icon} size={30} color={colors.textSecondary} /><Text style={styles.title}>{title}</Text>{description ? <Text style={styles.description}>{description}</Text> : null}</View>; }
const styles = StyleSheet.create({ empty: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxxl, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface }, title: { ...typography.label, color: colors.textPrimary }, description: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' } });
