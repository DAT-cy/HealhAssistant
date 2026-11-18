import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import Card from '@/components/ui/Card';
import { Pressable } from '@/components/ui/Pressable';
import { palette } from '@/theme/tokens';
import { isOpenReview, pickUserRequest, userReviewView } from '@/utils/doctorReview';

const TONES = {
  info: { color: palette.primary, bg: palette.primarySoft, icon: 'time-outline' },
  warning: { color: '#B45309', bg: palette.warningSoft, icon: 'alert-circle-outline' },
  success: { color: palette.success, bg: palette.successSoft, icon: 'checkmark-circle-outline' },
  danger: { color: palette.danger, bg: palette.dangerLight, icon: 'medkit-outline' },
} as const;

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString('vi-VN');
}

/**
 * Thẻ trạng thái yêu cầu bác sĩ cho người dùng. Hiện cả khi đang chờ lẫn khi đã có kết quả
 * (đã duyệt / cần bổ sung / bị từ chối), ưu tiên yêu cầu đang mở.
 */
interface Props {
  requests: DoctorReviewRequest[] | undefined;
  /** Gửi thông tin bổ sung khi bác sĩ chọn "Cần thêm thông tin". */
  onReply?: (requestId: number, message: string) => Promise<unknown> | void;
  replying?: boolean;
}

export default function DoctorRequestStatusCard({ requests, onReply, replying = false }: Props) {
  const [reply, setReply] = useState('');
  const request = pickUserRequest(requests);
  if (!request) return null;
  const view = userReviewView(request.status, request.appliedAt);
  const canReply = request.status === 'NEED_MORE_INFO' && !!onReply;
  const submitReply = async () => {
    const message = reply.trim();
    if (!message || !onReply) return;
    try { await onReply(request.id, message); setReply(''); } catch { /* lỗi đã được báo ở nơi gọi */ }
  };
  const tone = TONES[view.tone];
  const finishedAt = isOpenReview(request.status) ? null : formatDate(request.completedAt);
  const history = (requests?.length ?? 0) - 1;

  return (
    <Card style={{ ...styles.card, borderColor: tone.color }}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: tone.bg }]}><Ionicons name={tone.icon} size={18} color={tone.color} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: tone.color }]}>THEO DÕI YÊU CẦU BÁC SĨ</Text>
          <Text style={styles.title}>{view.title}</Text>
        </View>
      </View>
      {view.message ? <Text style={styles.message}>{view.message}</Text> : null}
      {request.doctorNote ? (
        <View style={styles.note}>
          <Text style={styles.noteLabel}>Nhận xét của bác sĩ</Text>
          <Text style={styles.noteText}>{request.doctorNote}</Text>
        </View>
      ) : null}
      {request.userReply ? <Text style={styles.meta}>Bạn đã bổ sung: {request.userReply.replace(/^\[[^\]]*\]\s*/gm, '')}</Text> : null}
      {canReply ? (
        <View style={styles.replyBox}>
          <TextInput
            testID="doctor-reply-input"
            value={reply}
            onChangeText={setReply}
            placeholder="Trả lời bác sĩ (thuốc đang dùng, triệu chứng, chỉ số…)"
            placeholderTextColor={palette.textMuted}
            multiline
            maxLength={3000}
            style={styles.replyInput}
          />
          <Pressable testID="doctor-reply-send" onPress={submitReply} disabled={replying || !reply.trim()} accessibilityRole="button"
            style={[styles.replyButton, (replying || !reply.trim()) && styles.dim]}>
            {replying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.replyButtonText}>Gửi bác sĩ</Text>}
          </Pressable>
        </View>
      ) : null}
      {request.reason ? <Text style={styles.meta}>Lý do chuyển bác sĩ: {request.reason}</Text> : null}
      {finishedAt ? <Text style={styles.meta}>Kết luận lúc {finishedAt}</Text> : null}
      {history > 0 ? <Text style={styles.meta}>Còn {history} yêu cầu trước đó.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, borderWidth: 1.5 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  title: { marginTop: 3, color: palette.text, fontSize: 15, fontWeight: '800' },
  message: { color: palette.text, fontSize: 12, lineHeight: 18 },
  meta: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
  note: { gap: 3, padding: 10, borderRadius: 10, backgroundColor: palette.surfaceRaised },
  noteLabel: { color: palette.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  noteText: { color: palette.text, fontSize: 13, lineHeight: 19 },
  replyBox: { gap: 8 },
  replyInput: { minHeight: 70, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: palette.border, color: palette.text, fontSize: 13, textAlignVertical: 'top' },
  replyButton: { alignItems: 'center', justifyContent: 'center', height: 40, borderRadius: 10, backgroundColor: palette.primary },
  replyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  dim: { opacity: 0.5 },
});
