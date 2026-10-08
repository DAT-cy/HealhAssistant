import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const bg: Record<Variant, string> = { primary: palette.primary, secondary: palette.surfaceRaised, danger: palette.danger, ghost: 'transparent' };
const fg: Record<Variant, string> = { primary: palette.textInverse, secondary: palette.text, danger: palette.text, ghost: palette.textMuted };

export default function AppButton({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityLabel }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [styles.button, { backgroundColor: bg[variant] }, variant === 'ghost' && styles.ghost, isDisabled && styles.disabled, pressed && styles.pressed]}
    >
      {loading ? <ActivityIndicator size="small" color={fg[variant]} /> : <Text style={[styles.label, { color: fg[variant] }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  ghost: { borderWidth: 1, borderColor: palette.border },
  label: { fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.75 },
});
