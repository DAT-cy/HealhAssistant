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
    case 'NEED_MORE_INFO': return 'Chờ bổ sung / sửa';
    case 'COMPLETED': return 'Đã duyệt';
    case 'REJECTED': return 'Đã từ chối';
    default: return status;
  }
}

/** Nội dung hiển thị cho người dùng theo trạng thái yêu cầu bác sĩ. */
export function userReviewView(status: string): { title: string; message: string; tone: 'info' | 'warning' | 'success' | 'danger' } {
  switch (status) {
    case 'PENDING_ASSIGNMENT': return { title: 'Đang chờ phân công bác sĩ', message: 'Lộ trình của bạn cần bác sĩ kiểm tra trước khi bắt đầu.', tone: 'info' };
    case 'ASSIGNED': return { title: 'Đã phân công bác sĩ', message: 'Bác sĩ sẽ sớm xem lộ trình của bạn.', tone: 'info' };
    case 'IN_REVIEW': return { title: 'Bác sĩ đang kiểm tra', message: 'Vui lòng chờ kết quả, chưa nên bắt đầu lộ trình.', tone: 'info' };
    case 'NEED_MORE_INFO': return { title: 'Bác sĩ cần bổ sung / điều chỉnh', message: 'Hãy cập nhật hồ sơ sức khỏe hoặc tạo lại lộ trình theo góp ý của bác sĩ.', tone: 'warning' };
    case 'COMPLETED': return { title: 'Bác sĩ đã duyệt lộ trình', message: 'Bạn có thể bắt đầu thực hiện lộ trình.', tone: 'success' };
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
