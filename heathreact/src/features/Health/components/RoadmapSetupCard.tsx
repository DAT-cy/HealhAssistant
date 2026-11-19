import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { navigationService } from '@/routes';
import { palette } from '@/theme/tokens';
import type { SetupItem } from '@/utils/roadmapReadiness';

/** Nhắc người dùng hoàn thành hồ sơ trước khi được tạo lộ trình. */
export default function RoadmapSetupCard({ items }: { items: SetupItem[] }) {
  return (
    <View style={styles.card} testID="roadmap-setup-card">
      <View style={styles.header}>
        <View style={styles.icon}><Ionicons name="clipboard-outline" size={20} color={palette.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Hoàn thành hồ sơ trước khi tạo lộ trình</Text>
          <Text style={styles.subtitle}>Chỉ cần thiết lập một lần. Lộ trình sẽ dùng các thông tin này, không hỏi lại.</Text>
        </View>
      </View>
      {items.map((item) => (
        <Pressable key={item.key} testID={`setup-${item.key}`} onPress={() => navigationService.navigate(item.key === 'health' ? 'HealthRecord' : 'PersonalSettings')}
          accessibilityRole="button" accessibilityLabel={`${item.label}: ${item.done ? 'đã xong' : 'chưa xong'}`} style={[styles.row, item.done && styles.rowDone]}>
          <Ionicons name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.done ? palette.success : palette.textMuted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.label}</Text>
            <Text style={styles.rowHint}>{item.hint}</Text>
          </View>
          {item.done ? null : <View style={styles.action}><Text style={styles.actionText}>Hoàn thành</Text><Ionicons name="chevron-forward" size={14} color={palette.primary} /></View>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: palette.primary, backgroundColor: palette.surface },
  header: { flexDirection: 'row', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft },
  title: { color: palette.text, fontSize: 15, fontWeight: '800' },
  subtitle: { marginTop: 3, color: palette.textMuted, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.bg },
  rowDone: { backgroundColor: palette.successSoft, borderColor: palette.successSoft },
  rowTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  rowHint: { marginTop: 2, color: palette.textMuted, fontSize: 12, lineHeight: 16 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  actionText: { color: palette.primary, fontSize: 12, fontWeight: '800' },
});
