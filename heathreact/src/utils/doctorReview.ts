import type { DoctorReviewRequest, RiskSeverity } from '@/api/services/doctor.service';
import { palette } from '@/theme/tokens';

/** Thao tác bác sĩ gửi lên `POST /doctor/reviews/{id}/decision`. */
export type ReviewAction = 'APPROVE' | 'NEED_MORE_INFO' | 'REQUEST_REVISION' | 'REJECT';

export const REVIEW_ACTIONS: Record<ReviewAction, { label: string; description: string; noteRequired: boolean; color: string; icon: string }> = {
  APPROVE: { label: 'Duyệt lộ trình', description: 'Lộ trình phù hợp, người dùng có thể bắt đầu.', noteRequired: false, color: palette.success, icon: 'checkmark-circle-outline' },
  REQUEST_REVISION: { label: 'Yêu cầu sửa', description: 'Ghi rõ cần điều chỉnh gì để AI tính lại lộ trình.', noteRequired: true, color: palette.primary, icon: 'create-outline' },
  NEED_MORE_INFO: { label: 'Cần bổ sung thông tin', description: 'Người dùng cần khai báo thêm trước khi duyệt.', noteRequired: true, color: palette.warning, icon: 'help-circle-outline' },
  REJECT: { label: 'Từ chối · khuyên đi khám', description: 'Không phù hợp tự tập luyện, khuyên người dùng đến cơ sở y tế.', noteRequired: true, color: palette.danger, icon: 'close-circle-outline' },
};

/** Trạng thái còn đang xử lý (chưa có kết luận cuối). */
export const OPEN_REVIEW_STATUSES = ['PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_REVIEW', 'NEED_MORE_INFO'] as const;

export function isOpenReview(status: string) {
  return (OPEN_REVIEW_STATUSES as readonly string[]).includes(status);
}

/** Bác sĩ chỉ quyết định được khi yêu cầu đã được giao và chưa có kết luận cuối. */
export function canDecide(request: Pick<DoctorReviewRequest, 'status'>) {
  return ['ASSIGNED', 'IN_REVIEW', 'NEED_MORE_INFO'].includes(request.status);
}

export function canStart(request: Pick<DoctorReviewRequest, 'status'>) {
  return ['ASSIGNED', 'PENDING_ASSIGNMENT'].includes(request.status);
}

/** Nhãn trạng thái cho bác sĩ. */
export function doctorStatusLabel(status: string) {
  switch (status) {
    case 'PENDING_ASSIGNMENT': return 'Chờ phân công';
    case 'ASSIGNED': return 'Đã giao cho bạn';
    case 'IN_REVIEW': return 'Đang kiểm tra';
    case 'NEED_MORE_INFO': return 'Chờ người dùng bổ sung';
    case 'REVISION_REQUESTED': return 'Đã yêu cầu sửa';
    case 'COMPLETED': return 'Đã duyệt';
    case 'REJECTED': return 'Đã từ chối';
    case 'REFERRED': return 'Chuyển cơ sở y tế';
    default: return status;
  }
}

/** Nội dung hiển thị cho người dùng theo trạng thái yêu cầu bác sĩ. */
export function userReviewView(status: string, appliedAt?: string | null, previousRequestId?: number | null): { title: string; message: string; tone: 'info' | 'warning' | 'success' | 'danger' } {
  // Phiên bản AI đã điều chỉnh theo góp ý, đang chờ bác sĩ xem lại.
  if (previousRequestId != null && ['PENDING_ASSIGNMENT', 'ASSIGNED', 'IN_REVIEW'].includes(status)) {
    return { title: 'Bác sĩ đang xem lại phương án đã điều chỉnh', message: `AI đã điều chỉnh theo góp ý của bác sĩ (từ yêu cầu #${previousRequestId}). Vui lòng chờ bác sĩ duyệt lại.`, tone: 'info' };
  }
  switch (status) {
    case 'PENDING_ASSIGNMENT': return { title: 'Đang chờ phân công bác sĩ', message: 'Lộ trình của bạn cần bác sĩ kiểm tra trước khi bắt đầu.', tone: 'info' };
    case 'ASSIGNED': return { title: 'Đã phân công bác sĩ', message: 'Bác sĩ sẽ sớm xem lộ trình của bạn.', tone: 'info' };
    case 'IN_REVIEW': return { title: 'Bác sĩ đang kiểm tra', message: 'Vui lòng chờ kết quả, chưa nên bắt đầu lộ trình.', tone: 'info' };
    case 'NEED_MORE_INFO': return { title: 'Bác sĩ cần thêm thông tin', message: 'Hãy trả lời bác sĩ ở ô bên dưới, yêu cầu sẽ quay lại cho bác sĩ xem tiếp.', tone: 'warning' };
    case 'REVISION_REQUESTED': return { title: 'Bác sĩ yêu cầu sửa lộ trình', message: 'AI đang tự điều chỉnh phương án theo góp ý của bác sĩ và gửi lại để bác sĩ duyệt. Bạn không cần làm gì thêm.', tone: 'warning' };
    case 'COMPLETED': return appliedAt
      ? { title: 'Bác sĩ đã duyệt lộ trình', message: 'Phương án đã duyệt đang được áp dụng.', tone: 'success' }
      : { title: 'Bác sĩ đã duyệt lộ trình', message: 'Chọn một trong các phương án bác sĩ đã duyệt để bắt đầu.', tone: 'success' };
    case 'REFERRED': return { title: 'Cần đến cơ sở y tế', message: 'Bệnh lý bạn khai báo cần được khám trực tiếp. Hãy liên hệ cơ sở y tế, hoặc gọi 115 nếu có dấu hiệu nguy hiểm.', tone: 'danger' };
    case 'REJECTED': return { title: 'Bác sĩ chưa duyệt lộ trình', message: 'Bác sĩ khuyên bạn nên đến cơ sở y tế để được khám trực tiếp trước khi tập luyện.', tone: 'danger' };
    default: return { title: status, message: '', tone: 'info' };
  }
}

export const SEVERITY_LABELS: Record<RiskSeverity, string> = { LOW: 'Thấp', MODERATE: 'Trung bình', HIGH: 'Cao', CRITICAL: 'Khẩn cấp' };
export const SEVERITY_COLORS: Record<RiskSeverity, string> = { LOW: palette.success, MODERATE: palette.warning, HIGH: '#F97316', CRITICAL: palette.danger };

/** Chọn yêu cầu nên hiển thị cho người dùng: ưu tiên yêu cầu đang mở, nếu không thì yêu cầu mới nhất. */
export function pickUserRequest<T extends Pick<DoctorReviewRequest, 'status' | 'createdAt'>>(requests: T[] | undefined): T | null {
  if (!requests?.length) return null;
  const byNewest = [...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return byNewest.find((request) => isOpenReview(request.status)) ?? byNewest[0];
}

/**
 * Người dùng còn yêu cầu bác sĩ chưa xong thì chưa cho tạo lộ trình mới (backend sẽ chỉ trả lại yêu cầu cũ).
 * Trả về nội dung cảnh báo, hoặc null nếu được phép tạo.
 */
export function pendingRequestBlock<T extends Pick<DoctorReviewRequest, 'id' | 'status' | 'createdAt'>>(requests: T[] | undefined) {
  const open = (requests ?? []).filter((request) => isOpenReview(request.status)).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!open) return null;
  return {
    title: `Bạn đang có yêu cầu #${open.id} chờ bác sĩ`,
    description: open.status === 'NEED_MORE_INFO'
      ? 'Bác sĩ cần bạn bổ sung thông tin. Hãy trả lời bác sĩ trong thẻ "Theo dõi yêu cầu bác sĩ" rồi chờ kết quả.'
      : 'Hãy chờ bác sĩ có kết quả rồi mới tạo lộ trình mới.',
  };
}

/** Sau bao lâu kể từ khi bác sĩ yêu cầu sửa mà chưa có phiên bản mới thì cho người dùng bấm Thử lại. */
export const REVISION_STALE_MS = 2 * 60 * 1000;

/** AI chưa tạo được phiên bản điều chỉnh sau "Yêu cầu sửa" (quá thời gian chờ). */
export function revisionStalled(request: { status: string; completedAt: string | null } | null | undefined, now = Date.now()) {
  if (!request || request.status !== 'REVISION_REQUESTED' || !request.completedAt) return false;
  const finished = Date.parse(request.completedAt);
  return Number.isFinite(finished) && now - finished >= REVISION_STALE_MS;
}

/** Mức ưu tiên hiển thị tiếng Việt. */
export function priorityLabel(priority: string | null | undefined) {
  return priority === 'HIGH' ? 'Cao' : priority === 'NORMAL' ? 'Bình thường' : priority === 'LOW' ? 'Thấp' : priority || '—';
}

/** Quyết định định tuyến của hệ thống hiển thị tiếng Việt. */
export function decisionLabel(decision: string | null | undefined) {
  switch (decision) {
    case 'DOCTOR_REVIEW_REQUIRED': return 'Cần bác sĩ duyệt';
    case 'URGENT_MEDICAL_ATTENTION': return 'Cần đến cơ sở y tế';
    case 'NEED_MORE_INFORMATION': return 'Cần thêm thông tin';
    case 'AUTO_ROADMAP': return 'AI tự tạo lộ trình';
    default: return decision || '—';
  }
}

const SEVERITY_VI: Record<string, string> = { LOW: 'thấp', MODERATE: 'trung bình', HIGH: 'cao', CRITICAL: 'khẩn cấp' };
/** "mức HIGH" → "mức cao" trong tóm tắt rủi ro do backend tạo. */
export function viSeverityText(text: string) {
  return text.replace(/mức (LOW|MODERATE|HIGH|CRITICAL)\b/g, (_, level: string) => `mức ${SEVERITY_VI[level]}`);
}

/** "chiều cao cm: 160.0, cân nặng kg: 65.0" → "chiều cao: 160 cm, cân nặng: 65 kg"; bỏ "trình độ vận động: UNSPECIFIED". */
export function prettyProfileText(text: string) {
  const num = (value: string) => String(Number(value));
  return text
    .replace(/chiều cao cm:\s*([\d.]+)/gi, (_, v: string) => `chiều cao: ${num(v)} cm`)
    .replace(/cân nặng kg:\s*([\d.]+)/gi, (_, v: string) => `cân nặng: ${num(v)} kg`)
    .replace(/,?\s*trình độ vận động:\s*UNSPECIFIED/gi, '');
}

/** AI hay tự ghi "Tuần 1: …" trong nội dung → bỏ để không hiện "Tuần 1: Tuần 1: …". */
export function stripWeekPrefix(text: string) {
  return text.replace(/^\s*Tuần\s*\d+\s*[:.\-–]\s*/i, '');
}
