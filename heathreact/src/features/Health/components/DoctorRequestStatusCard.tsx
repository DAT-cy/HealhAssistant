import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import Card from '@/components/ui/Card';
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
export default function DoctorRequestStatusCard({ requests }: { requests: DoctorReviewRequest[] | undefined }) {
  const request = pickUserRequest(requests);
  if (!request) return null;
  const view = userReviewView(request.status);
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
});
