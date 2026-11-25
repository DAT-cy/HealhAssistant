import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { knowledgeService } from '@/api/services/knowledge.service';
import type { RoadmapReference } from '@/api/types';
import AppModal from '@/components/ui/AppModal';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';

const KIND: Record<RoadmapReference['kind'], { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  INTERNAL_DOCUMENT: { label: 'Tài liệu nội bộ', color: palette.success, bg: palette.successSoft, icon: 'document-text-outline' },
  DISEASE_CATALOG: { label: 'Danh mục bệnh', color: palette.primary, bg: palette.primarySoft, icon: 'medkit-outline' },
  EXTERNAL: { label: 'Nguồn ngoài', color: palette.warning, bg: palette.warningSoft, icon: 'globe-outline' },
};

const kindOf = (item: RoadmapReference) => KIND[item.kind] ?? KIND.EXTERNAL;
const hasInternalPreview = (item: RoadmapReference) => item.documentId != null || Boolean(item.diseaseCode);

/** Danh sách "Nguồn tham khảo" của một phương án lộ trình (dùng chung cho màn bác sĩ và người dùng). Bấm để mở modal xem trước. */
export default function RoadmapReferences({ references, compact }: { references?: RoadmapReference[] | null; compact?: boolean }) {
  const list = references ?? [];
  const hasInternal = list.some((item) => item.kind !== 'EXTERNAL');
  const [previewing, setPreviewing] = useState<RoadmapReference | null>(null);
  return (
    <View style={styles.wrap} testID="roadmap-references">
      <Text style={styles.label}>Nguồn tham khảo</Text>
      {!list.length ? <Text style={styles.note}>AI dùng kiến thức chung, chưa có tài liệu nội bộ cho trường hợp này.</Text> : null}
      {list.map((item, index) => {
        const kind = kindOf(item);
        return (
          <Pressable key={`${item.kind}-${item.title}-${index}`} onPress={() => setPreviewing(item)} accessibilityRole="button" accessibilityHint="Mở xem trước nguồn tham khảo" style={styles.row}>
            <Ionicons name={kind.icon} size={14} color={kind.color} style={styles.icon} />
            <View style={styles.textCol}>
              <Text style={[styles.title, styles.link]} numberOfLines={compact ? 1 : 2}>{item.title}</Text>
              <View style={styles.metaRow}>
                <Text style={[styles.badge, { color: kind.color, backgroundColor: kind.bg }]}>{kind.label}</Text>
                {item.organization ? <Text style={styles.meta} numberOfLines={1}>{item.organization}</Text> : null}
              </View>
            </View>
            <Ionicons name="eye-outline" size={15} color={palette.textMuted} style={styles.icon} />
          </Pressable>
        );
      })}
      {list.length && !hasInternal ? <Text style={styles.note}>Nguồn ngoài do AI dẫn, chưa được bác sĩ xác nhận.</Text> : null}
      <AppModal visible={previewing != null} transparent animationType="fade" onRequestClose={() => setPreviewing(null)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPreviewing(null)} accessibilityLabel="Đóng xem trước" />
          {previewing ? <ReferencePreviewCard item={previewing} onClose={() => setPreviewing(null)} /> : null}
        </View>
      </AppModal>
    </View>
  );
}

function ReferencePreviewCard({ item, onClose }: { item: RoadmapReference; onClose: () => void }) {
  const kind = kindOf(item);
  const internal = hasInternalPreview(item);
  const query = useQuery({
    queryKey: ['knowledge', 'reference', item.documentId ?? null, item.diseaseCode ?? null],
    queryFn: () => knowledgeService.reference(item),
    enabled: internal,
    staleTime: 5 * 60 * 1000,
  });
  const data = query.data;
  const url = data?.url ?? item.url ?? null;
  return (
    <View style={styles.card} testID="reference-preview">
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: kind.bg }]}><Ionicons name={kind.icon} size={18} color={kind.color} /></View>
        <View style={styles.textCol}>
          <Text style={[styles.badge, styles.badgeInline, { color: kind.color, backgroundColor: kind.bg }]}>{kind.label}</Text>
          <Text style={styles.cardTitle}>{data?.title ?? item.title}</Text>
          {data?.organization ?? item.organization ? <Text style={styles.meta}>{data?.organization ?? item.organization}</Text> : null}
        </View>
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Đóng" style={styles.close}>
          <Ionicons name="close" size={20} color={palette.textPrimary} />
        </Pressable>
      </View>

      <ScrollView style={styles.cardBody} contentContainerStyle={styles.cardBodyContent}>
        {internal && query.isLoading ? <ActivityIndicator style={styles.loading} color={palette.primary} /> : null}
        {internal && query.error ? <Text style={styles.error}>{query.error instanceof Error ? query.error.message : 'Không tải được nội dung.'}</Text> : null}
        {data?.description ? <Text style={styles.previewDesc}>{data.description}</Text> : null}
        {data?.content ? <Text style={styles.previewText} selectable>{data.content}</Text> : null}
        {data && !data.content ? <Text style={styles.note}>Tài liệu chưa có nội dung văn bản để xem trước.</Text> : null}
        {data?.truncated ? <Text style={styles.note}>Chỉ hiển thị phần đầu tài liệu.</Text> : null}
        {!internal && item.kind === 'EXTERNAL' ? <Text style={styles.previewText}>Đây là trang công khai do AI dẫn, chưa được bác sĩ xác nhận. Mở trang nguồn để đọc nội dung đầy đủ.</Text> : null}
        {!internal && item.kind !== 'EXTERNAL' ? <Text style={styles.previewText}>Phương án này được tạo trước khi có tính năng xem trước. Hãy tạo lại lộ trình để xem nội dung tài liệu.</Text> : null}
        {url ? <Text style={styles.url} selectable numberOfLines={2}>{url}</Text> : null}
      </ScrollView>

      <View style={styles.cardFooter}>
        {url ? (
          <Pressable onPress={() => { void Linking.openURL(url); }} accessibilityRole="link" style={styles.primaryButton}>
            <Ionicons name="open-outline" size={16} color="#FFFFFF" />
            <Text style={styles.primaryText}>Mở trang nguồn</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onClose} accessibilityRole="button" style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Đóng</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6, marginTop: 8 },
  label: { color: palette.textPrimary, fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
  icon: { marginTop: 2 },
  textCol: { flex: 1, minWidth: 0, gap: 3 },
  title: { color: palette.textPrimary, fontSize: 12, lineHeight: 17 },
  link: { color: palette.primary, textDecorationLine: 'underline' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  badgeInline: { alignSelf: 'flex-start' },
  meta: { color: palette.textMuted, fontSize: 11, flexShrink: 1 },
  note: { color: palette.textMuted, fontSize: 11, lineHeight: 16, fontStyle: 'italic' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', justifyContent: 'center', padding: 16 },
  card: { maxHeight: '86%', width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: palette.surface, borderRadius: 18, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border },
  cardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: palette.textPrimary, fontSize: 16, fontWeight: '800', lineHeight: 22 },
  close: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceRaised },
  cardBody: { flexGrow: 0 },
  cardBodyContent: { padding: 16, gap: 10 },
  loading: { marginVertical: 24 },
  error: { color: palette.error, fontSize: 13, lineHeight: 19 },
  previewDesc: { color: palette.textPrimary, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  previewText: { color: palette.textSecondary, fontSize: 13, lineHeight: 20 },
  url: { color: palette.textMuted, fontSize: 11 },
  cardFooter: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border },
  primaryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: palette.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  secondaryButton: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: palette.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: palette.textPrimary, fontSize: 14, fontWeight: '700' },
});
