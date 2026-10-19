import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

export default function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: palette.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: palette.border, padding: spacing.lg, shadowColor: '#34335A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 },
});
