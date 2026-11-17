import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Props = { title?: string; onPress?: () => void; variant?: AppButtonVariant; loading?: boolean; disabled?: boolean; fullWidth?: boolean; leftIcon?: React.ReactNode; rightIcon?: React.ReactNode; style?: ViewStyle; accessibilityLabel?: string };

export function AppButton({ title, onPress, variant = 'primary', loading, disabled, fullWidth, leftIcon, rightIcon, style, accessibilityLabel }: Props) {
  const config = {
    primary: [colors.primary, colors.primary, colors.textInverse], secondary: [colors.surfaceRaised, colors.surfaceRaised, colors.textPrimary],
    outline: [colors.surface, colors.border, colors.primary], ghost: ['transparent', 'transparent', colors.primary], danger: [colors.error, colors.error, colors.textInverse],
  }[variant];
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.base, { backgroundColor: config[0], borderColor: config[1] }, fullWidth && styles.fullWidth, pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}>
    {loading ? <ActivityIndicator color={config[2]} /> : <>{leftIcon}{title ? <Text style={[styles.text, { color: config[2] }]}>{title}</Text> : null}{rightIcon}</>}
  </Pressable>;
}
const styles = StyleSheet.create({ base: { minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm }, fullWidth: { alignSelf: 'stretch' }, text: typography.button, pressed: { opacity: 0.78 }, disabled: { opacity: 0.5 } });
