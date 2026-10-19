import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

export default function SafetyBanner({ text }: { text: string }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="shield-checkmark-outline" size={18} color={palette.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.sm, backgroundColor: '#EAF8FF', borderWidth: 1, borderColor: '#CDEFFF', borderRadius: radius.md, padding: spacing.md },
  text: { flex: 1, color: '#315C7A', fontSize: 11, lineHeight: 17 },
});
