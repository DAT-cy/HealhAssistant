import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { palette, spacing } from '@/theme/tokens';

export type CustomButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type CustomButtonSize = 'sm' | 'md' | 'lg';

export interface CustomButtonProps {
  title: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  variant?: CustomButtonVariant;
  size?: CustomButtonSize;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const variantStyles: Record<CustomButtonVariant, { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: { backgroundColor: palette.primary, borderColor: palette.primary, textColor: palette.textInverse },
  secondary: { backgroundColor: palette.surfaceRaised, borderColor: palette.surfaceRaised, textColor: palette.text },
  outline: { backgroundColor: palette.surface, borderColor: palette.primary, textColor: palette.primary },
  danger: { backgroundColor: palette.danger, borderColor: palette.danger, textColor: palette.textInverse },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent', textColor: palette.textMuted },
};

const sizeStyles: Record<CustomButtonSize, { minHeight: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { minHeight: 44, paddingHorizontal: spacing.md, fontSize: 13 },
  md: { minHeight: 52, paddingHorizontal: spacing.lg, fontSize: 15 },
  lg: { minHeight: 56, paddingHorizontal: spacing.xl, fontSize: 16 },
};

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  accessibilityLabel,
  style,
  textStyle,
}: CustomButtonProps) {
  const isDisabled = disabled || loading;
  const colors = variantStyles[variant];
  const dimensions = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // foreground: true -> ripple được vẽ ở lớp trên, KHÔNG thay thế background drawable của view.
      // Với ripple mặc định (foreground: false), một số bản React Native gần đây trên Android
      // thay background của view bằng drawable ripple và làm mất backgroundColor -> nút trắng trơn.
      android_ripple={{
        color: variant === 'primary' || variant === 'danger' ? 'rgba(255,255,255,0.18)' : 'rgba(99,91,255,0.12)',
        foreground: true,
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor, minHeight: dimensions.minHeight, paddingHorizontal: dimensions.paddingHorizontal },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="small" color={colors.textColor} /> : icon}
        <Text style={[styles.label, { color: colors.textColor, fontSize: dimensions.fontSize }, textStyle]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fullWidth: { width: '100%' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.52 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
});
