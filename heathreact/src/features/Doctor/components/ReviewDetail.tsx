import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import RoadmapReferences from '@/components/common/RoadmapReferences';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';
import { canDecide, canStart, decisionLabel, doctorStatusLabel, prettyProfileText, priorityLabel, REVIEW_ACTIONS, stripWeekPrefix, viSeverityText, type ReviewAction } from '@/utils/doctorReview';

interface Props {
  request: DoctorReviewRequest;
  starting: boolean;
  onBack: () => void;
  onStart: () => void;
  onDecide: (action: ReviewAction) => void;
}

const ACTION_ORDER: ReviewAction[] = ['APPROVE', 'REQUEST_REVISION', 'NEED_MORE_INFO', 'REJECT'];

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

/** Màn chi tiết một yêu cầu kiểm tra: đủ thông tin để bác sĩ quyết định. */
export default function ReviewDetail({ request, starting, onBack, onStart, onDecide }: Props) {
  const [showFull, setShowFull] = useState(false);
  const diseaseCodes = (request.diseaseCodes || '').split(',').map((code) => code.trim()).filter(Boolean);
  const fullText = request.fullText?.trim() ?? '';
  const longText = fullText.length > 600;
  const riskSummary = request.riskSummary?.trim() ?? '';

  return (
    <View style={styles.container}>
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Quay lại danh sách">
        <Ionicons name="chevron-back" size={18} color={palette.primary} />
        <Text style={styles.backText}>Danh sách yêu cầu</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <Text style={styles.title}>Yêu cầu #{request.id}</Text>
        <View style={styles.statusPill}><Text style={styles.statusText}>{doctorStatusLabel(request.status)}</Text></View>
      </View>
      {request.previousRequestId ? <Text style={styles.muted}>Bản AI điều chỉnh theo nhận xét của yêu cầu #{request.previousRequestId}</Text> : null}

      <Section icon="person-outline" title="Người dùng">
        <Row label="Mã người dùng" value={`#${request.userId}`} />
        <Row label="Lộ trình" value={request.roadmapId ? `#${request.roadmapId}` : 'Chưa gắn lộ trình'} />
        <Row label="Mức ưu tiên" value={priorityLabel(request.priority)} />
        <Row label="Tạo lúc" value={formatDate(request.createdAt)} />
      </Section>

      <Section icon="medkit-outline" title="Bệnh lý khai báo">
        {diseaseCodes.length ? (
          <View style={styles.chips}>{diseaseCodes.map((code) => <View key={code} style={styles.chip}><Text style={styles.chipText}>{code.toUpperCase().startsWith('CUSTOM:') ? `${code.slice(7)} · ngoài danh mục` : code}</Text></View>)}</View>
        ) : <Text style={styles.muted}>Không có mã bệnh.</Text>}
      </Section>

      <Section icon="alert-circle-outline" title="Lý do chuyển bác sĩ">
        <Text style={styles.body}>{request.reason || '—'}</Text>
        <Text style={styles.muted}>Quyết định hệ thống: {decisionLabel(request.decision)}</Text>
      </Section>

      {/* Yêu cầu cũ có riskSummary trùng reason: chỉ hiện khi có nội dung riêng. */}
      {riskSummary && riskSummary !== (request.reason || '').trim() ? (
        <Section icon="pulse-outline" title="Tóm tắt rủi ro">
          <Text style={styles.body}>{viSeverityText(riskSummary)}</Text>
        </Section>
      ) : null}

      <Section icon="document-text-outline" title="Nội dung lộ trình / hồ sơ gửi kèm">
        {fullText ? (
          <>
            <Text style={styles.body} numberOfLines={showFull ? undefined : 12}>{prettyProfileText(fullText)}</Text>
            {longText ? (
              <Pressable onPress={() => setShowFull((value) => !value)} accessibilityRole="button">
                <Text style={styles.link}>{showFull ? 'Thu gọn' : 'Xem toàn bộ'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : <Text style={styles.muted}>Không có nội dung chi tiết.</Text>}
      </Section>

      {request.userReply ? (
        <Section icon="chatbubble-ellipses-outline" title="Người dùng bổ sung">
          <Text style={styles.body}>{request.userReply}</Text>
        </Section>
      ) : null}

      {request.doctorNote && request.lastAction ? (
        <Section icon="clipboard-outline" title="Nhận xét lần trước">
          <Text style={styles.muted}>{REVIEW_ACTIONS[request.lastAction as ReviewAction]?.label ?? request.lastAction} · {formatDate(request.decidedAt ?? null)}</Text>
          <Text style={styles.body}>{request.doctorNote}</Text>
        </Section>
      ) : null}

      <Section icon="sparkles-outline" title="Phương án AI đề xuất">
        {request.aiPlan?.length ? request.aiPlan.map((option, index) => (
          <View key={`${option.title}-${index}`} style={styles.option} testID={`ai-plan-${index}`}>
            <Text style={styles.optionTitle}>Phương án {index + 1}: {option.title}</Text>
            {option.overview ? <Text style={styles.body}>{option.overview}</Text> : null}
            {(option.weeklyPlan ?? []).map((week, weekIndex) => <Text key={weekIndex} style={styles.muted}>Tuần {weekIndex + 1}: {stripWeekPrefix(week)}</Text>)}
            {option.safetyNotes?.length ? <Text style={styles.muted}>Lưu ý an toàn: {option.safetyNotes.join(' · ')}</Text> : null}
            <RoadmapReferences references={option.references} />
          </View>
        )) : <Text style={styles.muted}>Yêu cầu này chưa kèm phương án AI (tạo trước bản cập nhật). Duyệt xong, người dùng sẽ được AI lập phương án mới.</Text>}
      </Section>

      {canStart(request) ? (
        <Pressable onPress={onStart} disabled={starting} style={[styles.startButton, starting && styles.dim]} accessibilityRole="button">
          {starting ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="play-circle-outline" size={18} color="#FFFFFF" /><Text style={styles.startText}>Bắt đầu kiểm tra</Text></>}
        </Pressable>
      ) : null}

      {canDecide(request) ? (
        <View style={styles.decisions}>
          <Text style={styles.sectionTitle}>Quyết định chuyên môn</Text>
          {ACTION_ORDER.map((action) => {
            const config = REVIEW_ACTIONS[action];
            return (
              <Pressable key={action} onPress={() => onDecide(action)} style={[styles.decision, { borderColor: config.color }]} accessibilityRole="button" accessibilityLabel={config.label}>
                <Ionicons name={config.icon as never} size={20} color={config.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.decisionTitle, { color: config.color }]}>{config.label}</Text>
                  <Text style={styles.muted}>{config.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.closedNote}>
          {request.completedAt ? `Đã kết luận lúc ${formatDate(request.completedAt)}.` : 'Yêu cầu chưa được giao cho bạn.'}
        </Text>
      )}
    </View>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Ionicons name={icon as never} size={16} color={palette.primary} /><Text style={styles.sectionTitle}>{title}</Text></View>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.muted}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 36 },
  backText: { color: palette.primary, fontWeight: '700', fontSize: 13 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: palette.text, fontSize: 22, fontWeight: '800' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, backgroundColor: palette.primarySoft },
  statusText: { color: palette.primary, fontSize: 11, fontWeight: '800' },
  option: { gap: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: palette.border },
  optionTitle: { color: palette.text, fontSize: 13, fontWeight: '800' },
  section: { gap: 8, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { color: palette.text, fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowValue: { color: palette.text, fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, backgroundColor: palette.warningSoft },
  chipText: { color: '#B45309', fontSize: 11, fontWeight: '800' },
  body: { color: palette.text, fontSize: 13, lineHeight: 20 },
  muted: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  link: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  startButton: { minHeight: 46, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: palette.primary },
  startText: { color: '#FFFFFF', fontWeight: '800' },
  dim: { opacity: 0.6 },
  decisions: { gap: 8 },
  decision: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5, backgroundColor: palette.surface },
  decisionTitle: { fontSize: 14, fontWeight: '800' },
  closedNote: { color: palette.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
