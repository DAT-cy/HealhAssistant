import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import AppButton from './AppButton';
import { palette, spacing } from '@/theme/tokens';

export function LoadingState({ label = 'Đang tải...' }: { label?: string }) {
  return <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label}><ActivityIndicator size="large" color={palette.primary} /><Text style={styles.text}>{label}</Text></View>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={40} color={palette.danger} />
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <View style={styles.buttonWrap}><AppButton label="Thử lại" variant="secondary" onPress={onRetry} /></View> : null}
    </View>
  );
}

export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="file-tray-outline" size={40} color={palette.textMuted} />
      <Text style={styles.text}>{message}</Text>
      {actionLabel && onAction ? <View style={styles.buttonWrap}><AppButton label={actionLabel} onPress={onAction} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  text: { color: palette.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  buttonWrap: { alignSelf: 'stretch', paddingHorizontal: spacing.xl },
});
