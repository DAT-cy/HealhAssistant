import type { RoadmapSlotRequest, SessionPeriod } from '@/api/services/coach.service';

export const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
export const variants = ['Vận động nhẹ', 'Linh hoạt và phục hồi', 'Sức mạnh toàn thân'];
export const periods: { key: SessionPeriod; label: string; icon: 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' }[] = [
  { key: 'MORNING', label: 'Sáng', icon: 'sunny-outline' },
  { key: 'AFTERNOON', label: 'Chiều', icon: 'partly-sunny-outline' },
  { key: 'EVENING', label: 'Tối', icon: 'moon-outline' },
];
export const activityTypes = [
  { key: 'RUNNING' as const, label: 'Chạy bộ' },
  { key: 'GYM' as const, label: 'Gym' },
  { key: 'WALKING' as const, label: 'Đi bộ' },
  { key: 'STRENGTH' as const, label: 'Sức mạnh' },
  { key: 'MOBILITY' as const, label: 'Giãn cơ' },
  { key: 'OTHER' as const, label: 'Khác' },
];
export const activityPresets = ['Tập luyện', 'Khởi động', 'Đi bộ thư giãn', 'Giãn cơ'];

export function timeMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

export function scheduleError(slots: RoadmapSlotRequest[]) {
  if (!slots.length) return 'Chọn ít nhất một khung giờ tập trong tuần.';
  const byDay = new Map<number, RoadmapSlotRequest[]>();
  for (const slot of slots) {
    const start = timeMinutes(slot.startTime);
    const end = timeMinutes(slot.endTime);
    if (start === null || end === null || end <= start) return 'Nhập giờ hợp lệ và giờ kết thúc phải sau giờ bắt đầu.';
    if (end - start < 15 || end - start > 240) return 'Mỗi khung tập cần dài từ 15 đến 240 phút.';
    const periodValid = slot.sessionPeriod === 'MORNING' ? start < 720 && end <= 720
      : slot.sessionPeriod === 'AFTERNOON' ? start >= 720 && start <= 1080 && end > 720 && end <= 1080
        : start >= 1080 && end > 1080;
    if (!periodValid) return 'Giờ tập chưa nằm trong buổi đã chọn.';
    byDay.set(slot.dayOfWeek, [...(byDay.get(slot.dayOfWeek) ?? []), slot]);
  }
  for (const daySlots of byDay.values()) {
    const ordered = daySlots.slice().sort((a, b) => (timeMinutes(a.startTime) ?? 0) - (timeMinutes(b.startTime) ?? 0));
    for (let index = 1; index < ordered.length; index++) {
      if ((timeMinutes(ordered[index].startTime) ?? 0) < (timeMinutes(ordered[index - 1].endTime) ?? 0)) return 'Các khung giờ trong cùng ngày không được trùng nhau.';
    }
  }
  return '';
}

export function weeklyMinutes(slots: RoadmapSlotRequest[]) {
  return slots.reduce((total, slot) => total + Math.max(0, (timeMinutes(slot.endTime) ?? 0) - (timeMinutes(slot.startTime) ?? 0)), 0);
}

/**
 * Sau bước "Tạo phương án": quyết định wizard làm gì theo `routingDecision` của backend.
 * - OPTIONS: hiện các phương án để người dùng chọn (AI tự tạo).
 * - SENT_TO_DOCTOR: đã gửi bác sĩ kiểm tra -> đóng wizard, báo toast, màn Lộ trình hiện thẻ theo dõi.
 * - STAY: cần người dùng đọc kỹ (cấp cứu / cần bổ sung) -> giữ màn hình thông báo.
 */
export function previewOutcome(decision: string | null | undefined): 'OPTIONS' | 'SENT_TO_DOCTOR' | 'STAY' {
  if (!decision || decision === 'AUTO_ROADMAP') return 'OPTIONS';
  if (decision === 'DOCTOR_REVIEW_REQUIRED') return 'SENT_TO_DOCTOR';
  return 'STAY';
}

/**
 * Nội dung toast sau khi lộ trình được chuyển bác sĩ.
 * Backend dùng lại yêu cầu cũ nếu người dùng còn yêu cầu chưa xong -> phải báo đúng là "vẫn đang xử lý",
 * không được báo "đã gửi" như thể vừa tạo yêu cầu mới.
 */
export function doctorRoutingNotice(reviewRequestId: number | null | undefined, knownRequestIds: number[], reason?: string | null) {
  if (reviewRequestId != null && knownRequestIds.includes(reviewRequestId)) {
    return { kind: 'warning' as const, title: `Yêu cầu #${reviewRequestId} vẫn đang được xử lý`, description: 'Chưa tạo yêu cầu mới. Hãy chờ bác sĩ phản hồi yêu cầu hiện tại.' };
  }
  return {
    kind: 'info' as const,
    title: reviewRequestId != null ? `Đã gửi bác sĩ kiểm tra (yêu cầu #${reviewRequestId})` : 'Đã gửi bác sĩ kiểm tra',
    description: reason || 'Lộ trình sẽ được áp dụng sau khi bác sĩ duyệt.',
  };
}

/** Backend báo chưa đồng ý sử dụng dữ liệu hồ sơ → hiện nút đồng ý ngay tại màn lỗi. */
export function needsConsent(message: string | null | undefined) {
  return !!message && message.toLowerCase().includes('đồng ý sử dụng dữ liệu');
}
