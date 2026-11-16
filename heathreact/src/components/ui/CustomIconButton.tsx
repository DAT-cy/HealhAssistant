import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { palette } from '@/theme/tokens';

export interface CustomIconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: number;
  backgroundColor?: string;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export default function CustomIconButton({
  icon,
  onPress,
  loading = false,
  disabled = false,
  size = 56,
  backgroundColor = palette.primary,
  accessibilityLabel,
  style,
}: CustomIconButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', elevation: 4, shadowColor: palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
});
