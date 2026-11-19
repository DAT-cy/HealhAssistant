import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import { canDecide, canStart, pickUserRequest } from '@/utils/doctorReview';
import DoctorRequestStatusCard from './DoctorRequestStatusCard';

const request = (patch: Partial<DoctorReviewRequest>): DoctorReviewRequest => ({
  id: 1, userId: 7, roadmapId: 3, assignedDoctorId: 1, decision: 'DOCTOR_REQUIRED', status: 'ASSIGNED', priority: 'HIGH',
  reason: 'Có bệnh tăng huyết áp', diseaseCodes: 'HYPERTENSION', riskSummary: '', fullText: null, policyVersion: 'v1',
  createdAt: '2026-11-17T00:00:00Z', assignedAt: null, completedAt: null, ...patch,
});

describe('doctorReview utils', () => {
  it('pickUserRequest: ưu tiên yêu cầu đang mở, nếu không có thì lấy mới nhất', () => {
    const done = request({ id: 2, status: 'COMPLETED', createdAt: '2026-11-18T00:00:00Z' });
    const open = request({ id: 1, status: 'IN_REVIEW', createdAt: '2026-11-10T00:00:00Z' });
    expect(pickUserRequest([done, open])?.id).toBe(1);
    expect(pickUserRequest([request({ id: 3, status: 'REJECTED', createdAt: '2026-11-01T00:00:00Z' }), done])?.id).toBe(2);
    expect(pickUserRequest([])).toBeNull();
    expect(pickUserRequest(undefined)).toBeNull();
  });

  it('canStart / canDecide theo trạng thái', () => {
    expect(canStart({ status: 'ASSIGNED' })).toBe(true);
    expect(canStart({ status: 'IN_REVIEW' })).toBe(false);
    expect(canDecide({ status: 'IN_REVIEW' })).toBe(true);
    expect(canDecide({ status: 'NEED_MORE_INFO' })).toBe(true);
    expect(canDecide({ status: 'COMPLETED' })).toBe(false);
    expect(canDecide({ status: 'PENDING_ASSIGNMENT' })).toBe(false);
    expect(canDecide({ status: 'REVISION_REQUESTED' })).toBe(false);
  });
});

describe('DoctorRequestStatusCard (màn Lộ trình của người dùng)', () => {
  it('không có yêu cầu -> không hiện gì', async () => {
    await render(<DoctorRequestStatusCard requests={[]} />);
    expect(screen.queryByText('THEO DÕI YÊU CẦU BÁC SĨ')).toBeNull();
  });

  it.each([
    ['PENDING_ASSIGNMENT', 'Đang chờ phân công bác sĩ'],
    ['IN_REVIEW', 'Bác sĩ đang kiểm tra'],
    ['NEED_MORE_INFO', 'Bác sĩ cần thêm thông tin'],
    ['REVISION_REQUESTED', 'Bác sĩ yêu cầu sửa lộ trình'],
    ['REFERRED', 'Cần đến cơ sở y tế'],
    ['COMPLETED', 'Bác sĩ đã duyệt lộ trình'],
    ['REJECTED', 'Bác sĩ chưa duyệt lộ trình'],
  ])('trạng thái %s -> "%s"', async (status, title) => {
    await render(<DoctorRequestStatusCard requests={[request({ status, completedAt: status === 'COMPLETED' || status === 'REJECTED' ? '2026-11-18T05:00:00Z' : null })]} />);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText('Lý do chuyển bác sĩ: Có bệnh tăng huyết áp')).toBeTruthy();
  });

  it('bị từ chối: khuyên đi khám và hiện thời điểm kết luận', async () => {
    await render(<DoctorRequestStatusCard requests={[request({ status: 'REJECTED', completedAt: '2026-11-18T05:00:00Z' })]} />);
    expect(screen.getByText(/đến cơ sở y tế/)).toBeTruthy();
    expect(screen.getByText(/^Kết luận lúc/)).toBeTruthy();
  });

  it('có nhiều yêu cầu -> ghi chú số yêu cầu trước đó', async () => {
    await render(<DoctorRequestStatusCard requests={[request({ id: 1 }), request({ id: 2, status: 'COMPLETED', completedAt: '2026-11-16T00:00:00Z' })]} />);
    expect(screen.getByText('Còn 1 yêu cầu trước đó.')).toBeTruthy();
  });

  it('hiện nhận xét của bác sĩ', async () => {
    await render(<DoctorRequestStatusCard requests={[request({ status: 'REJECTED', completedAt: '2026-11-18T05:00:00Z', doctorNote: 'Nên khám tim mạch trước' })]} />);
    expect(screen.getByText('Nhận xét của bác sĩ')).toBeTruthy();
    expect(screen.getByText('Nên khám tim mạch trước')).toBeTruthy();
  });

  it('đã duyệt: hướng dẫn chọn phương án, hoặc báo đang áp dụng nếu đã kích hoạt', async () => {
    const { rerender } = await render(<DoctorRequestStatusCard requests={[request({ status: 'COMPLETED', completedAt: '2026-11-18T05:00:00Z' })]} />);
    expect(screen.getByText(/Chọn một trong các phương án bác sĩ đã duyệt/)).toBeTruthy();
    await rerender(<DoctorRequestStatusCard requests={[request({ status: 'COMPLETED', completedAt: '2026-11-18T05:00:00Z', appliedAt: '2026-11-18T06:00:00Z' })]} />);
    expect(screen.getByText('Phương án đã duyệt đang được áp dụng.')).toBeTruthy();
  });

  it('cần thêm thông tin: chỉ hiện ô trả lời khi có onReply, không gửi nội dung trống', async () => {
    const onReply = jest.fn().mockResolvedValue(undefined);
    await render(<DoctorRequestStatusCard requests={[request({ status: 'NEED_MORE_INFO' })]} onReply={onReply} />);
    await fireEvent.press(screen.getByTestId('doctor-reply-send'));
    expect(onReply).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('doctor-reply-input'), '  Huyết áp 150/95  ');
    await fireEvent.press(screen.getByTestId('doctor-reply-send'));
    expect(onReply).toHaveBeenCalledWith(1, 'Huyết áp 150/95');
  });

  it('trạng thái khác -> không có ô trả lời', async () => {
    await render(<DoctorRequestStatusCard requests={[request({ status: 'IN_REVIEW' })]} onReply={jest.fn()} />);
    expect(screen.queryByTestId('doctor-reply-input')).toBeNull();
  });

  it('yêu cầu sửa: báo AI đang tự điều chỉnh, người dùng không phải làm gì', async () => {
    await render(<DoctorRequestStatusCard requests={[request({ status: 'REVISION_REQUESTED', completedAt: '2026-11-18T05:00:00Z', doctorNote: 'Giảm cường độ' })]} />);
    expect(screen.getByText(/Bạn không cần làm gì thêm/)).toBeTruthy();
  });

  it('phiên bản AI đã điều chỉnh đang chờ bác sĩ xem lại', async () => {
    await render(<DoctorRequestStatusCard requests={[
      request({ id: 1, status: 'REVISION_REQUESTED', createdAt: '2026-11-17T00:00:00Z', completedAt: '2026-11-17T01:00:00Z' }),
      request({ id: 2, status: 'ASSIGNED', previousRequestId: 1, createdAt: '2026-11-17T02:00:00Z' }),
    ]} />);
    expect(screen.getByText('Bác sĩ đang xem lại phương án đã điều chỉnh')).toBeTruthy();
    expect(screen.getByText(/từ yêu cầu #1/)).toBeTruthy();
  });

  it('đã duyệt + có phương án + chưa kích hoạt -> nút chọn phương án', async () => {
    const onOpenApproved = jest.fn();
    const plan = [{ title: 'A', overview: '', weeklyPlan: [], safetyNotes: [] }];
    const { rerender } = await render(<DoctorRequestStatusCard requests={[request({ id: 6, status: 'COMPLETED', completedAt: '2026-11-18T05:00:00Z', aiPlan: plan })]} onOpenApproved={onOpenApproved} />);
    await fireEvent.press(screen.getByTestId('open-approved-plan'));
    expect(onOpenApproved).toHaveBeenCalledWith(6);
    await rerender(<DoctorRequestStatusCard requests={[request({ id: 6, status: 'COMPLETED', completedAt: '2026-11-18T05:00:00Z', aiPlan: plan, appliedAt: '2026-11-18T06:00:00Z' })]} onOpenApproved={onOpenApproved} />);
    expect(screen.queryByTestId('open-approved-plan')).toBeNull();
  });
});
