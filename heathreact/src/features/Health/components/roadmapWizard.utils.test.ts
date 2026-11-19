import { toast } from 'sonner-native';
import { notify } from '@/utils/notify';
import { pendingRequestBlock } from '@/utils/doctorReview';
import { doctorRoutingNotice, previewOutcome } from './roadmapWizard.utils';

describe('previewOutcome: wizard làm gì sau khi tạo phương án', () => {
  it.each([
    [undefined, 'OPTIONS'],
    [null, 'OPTIONS'],
    ['AUTO_ROADMAP', 'OPTIONS'],
    ['DOCTOR_REVIEW_REQUIRED', 'SENT_TO_DOCTOR'],
    ['URGENT_MEDICAL_ATTENTION', 'STAY'],
    ['NEED_MORE_INFORMATION', 'STAY'],
  ])('%s -> %s', (decision, expected) => {
    expect(previewOutcome(decision)).toBe(expected);
  });
});

describe('notify (sonner-native)', () => {
  it('chuyển đúng loại toast và mô tả', () => {
    notify.success('Tạo lộ trình thành công', 'Giảm cân');
    notify.info('Đã gửi bác sĩ kiểm tra');
    expect(toast.success).toHaveBeenCalledWith('Tạo lộ trình thành công', { description: 'Giảm cân' });
    expect(toast.info).toHaveBeenCalledWith('Đã gửi bác sĩ kiểm tra', { description: undefined });
  });
});

describe('doctorRoutingNotice: báo đúng khi backend dùng lại yêu cầu cũ', () => {
  it('yêu cầu đã có từ trước -> cảnh báo "vẫn đang được xử lý"', () => {
    expect(doctorRoutingNotice(2, [1, 2], 'Yêu cầu trước đó vẫn đang được xử lý.')).toMatchObject({ kind: 'warning', title: 'Yêu cầu #2 vẫn đang được xử lý' });
  });
  it('yêu cầu mới -> "Đã gửi bác sĩ kiểm tra" kèm số yêu cầu và lý do', () => {
    expect(doctorRoutingNotice(3, [1, 2], 'Chính sách bệnh lý yêu cầu bác sĩ kiểm tra')).toEqual({
      kind: 'info', title: 'Đã gửi bác sĩ kiểm tra (yêu cầu #3)', description: 'Chính sách bệnh lý yêu cầu bác sĩ kiểm tra',
    });
  });
  it('backend không trả id -> vẫn báo đã gửi', () => {
    expect(doctorRoutingNotice(null, [1], null)).toMatchObject({ kind: 'info', title: 'Đã gửi bác sĩ kiểm tra' });
  });
});

describe('pendingRequestBlock: chặn tạo lộ trình khi còn yêu cầu chưa xong', () => {
  const r = (id: number, status: string, createdAt: string) => ({ id, status, createdAt });
  it('không có yêu cầu hoặc tất cả đã xong -> cho tạo', () => {
    expect(pendingRequestBlock(undefined)).toBeNull();
    expect(pendingRequestBlock([r(1, 'COMPLETED', '2026-11-18T00:00:00Z'), r(2, 'REJECTED', '2026-11-18T01:00:00Z')])).toBeNull();
  });
  it('còn yêu cầu chờ bổ sung -> chặn, nêu đúng số yêu cầu và hướng dẫn bổ sung', () => {
    const block = pendingRequestBlock([r(1, 'COMPLETED', '2026-11-18T00:00:00Z'), r(2, 'NEED_MORE_INFO', '2026-11-18T01:00:00Z')]);
    expect(block?.title).toBe('Bạn đang có yêu cầu #2 chờ bác sĩ');
    expect(block?.description).toContain('bổ sung');
  });
  it('nhiều yêu cầu đang mở -> nêu yêu cầu mới nhất', () => {
    expect(pendingRequestBlock([r(5, 'ASSIGNED', '2026-11-18T00:00:00Z'), r(6, 'IN_REVIEW', '2026-11-18T02:00:00Z')])?.title).toContain('#6');
  });
});

import { needsConsent } from './roadmapWizard.utils';

describe('needsConsent', () => {
  it('nhận ra lỗi chưa đồng ý dữ liệu', () => {
    expect(needsConsent('Cần đồng ý sử dụng dữ liệu hồ sơ trước.')).toBe(true);
    expect(needsConsent('Hệ thống AI đang bận.')).toBe(false);
    expect(needsConsent(null)).toBe(false);
  });
});
