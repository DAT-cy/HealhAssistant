import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { RoadmapReference } from '@/api/types';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';

const KIND: Record<RoadmapReference['kind'], { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  INTERNAL_DOCUMENT: { label: 'Tài liệu nội bộ', color: palette.success, bg: palette.successSoft, icon: 'document-text-outline' },
  DISEASE_CATALOG: { label: 'Danh mục bệnh', color: palette.primary, bg: palette.primarySoft, icon: 'medkit-outline' },
  EXTERNAL: { label: 'Nguồn ngoài', color: palette.warning, bg: palette.warningSoft, icon: 'globe-outline' },
};

/** Danh sách "Nguồn tham khảo" của một phương án lộ trình (dùng chung cho màn bác sĩ và người dùng). */
export default function RoadmapReferences({ references, compact }: { references?: RoadmapReference[] | null; compact?: boolean }) {
  const list = references ?? [];
  const hasInternal = list.some((item) => item.kind !== 'EXTERNAL');
  return (
    <View style={styles.wrap} testID="roadmap-references">
      <Text style={styles.label}>Nguồn tham khảo</Text>
      {!list.length ? <Text style={styles.note}>AI dùng kiến thức chung, chưa có tài liệu nội bộ cho trường hợp này.</Text> : null}
      {list.map((item, index) => {
        const kind = KIND[item.kind] ?? KIND.EXTERNAL;
        const open = item.url ? () => { void Linking.openURL(item.url as string); } : undefined;
        return (
          <Pressable key={`${item.kind}-${item.title}-${index}`} onPress={open} disabled={!open} accessibilityRole={open ? 'link' : undefined} style={styles.row}>
            <Ionicons name={kind.icon} size={14} color={kind.color} style={styles.icon} />
            <View style={styles.textCol}>
              <Text style={[styles.title, open && styles.link]} numberOfLines={compact ? 1 : 2}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.badge, { color: kind.color, backgroundColor: kind.bg }]}>{kind.label}</Text>
                {item.organization ? <Text style={styles.meta} numberOfLines={1}>{item.organization}</Text> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
      {list.length && !hasInternal ? <Text style={styles.note}>Nguồn ngoài do AI dẫn, chưa được bác sĩ xác nhận.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: { color: palette.textPrimary, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  icon: { marginTop: 2 },
  textCol: { flex: 1, minWidth: 0, gap: 2 },
  title: { color: palette.textPrimary, fontSize: 12, lineHeight: 17 },
  link: { color: palette.primary, textDecorationLine: 'underline' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  meta: { color: palette.textMuted, fontSize: 10, flexShrink: 1 },
  note: { color: palette.textMuted, fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
});
