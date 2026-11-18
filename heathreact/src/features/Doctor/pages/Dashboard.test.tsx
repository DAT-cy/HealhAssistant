import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ApiError } from '@/api/client';
import { doctorService, type Disease, type DoctorReviewRequest } from '@/api/services/doctor.service';
import { renderScreen } from '@/test-utils/render';
import DoctorDashboard, { AUTO_REFRESH_MS } from './Dashboard';

jest.mock('@/api/services/doctor.service', () => ({
  doctorService: { dashboard: jest.fn(), diseases: jest.fn(), reviews: jest.fn(), heartbeat: jest.fn(), decide: jest.fn(), start: jest.fn(), updatePolicy: jest.fn() },
}));

const mocked = doctorService as jest.Mocked<typeof doctorService>;

const disease: Disease = {
  id: 1, code: 'HYPERTENSION', name: 'Tăng huyết áp', specialty: 'Tim mạch', description: null, severity: 'HIGH',
  doctorRequired: true, roadmapConfirmationRequired: true, aiAllowed: false, priority: 1, specialInstructions: null, active: true, updatedAt: '2026-11-18T00:00:00Z',
};
const review = (patch: Partial<DoctorReviewRequest> = {}): DoctorReviewRequest => ({
  id: 42, userId: 7, roadmapId: 3, assignedDoctorId: 1, decision: 'DOCTOR_REQUIRED', status: 'IN_REVIEW', priority: 'HIGH',
  reason: 'Có bệnh tăng huyết áp', diseaseCodes: 'HYPERTENSION, ASTHMA', riskSummary: 'Huyết áp 160/100, chưa dùng thuốc', fullText: 'Tuần 1: chạy bộ 30 phút mỗi ngày',
  policyVersion: 'v1', createdAt: '2026-11-18T00:00:00Z', assignedAt: null, completedAt: null, ...patch,
});

beforeEach(() => {
  mocked.dashboard.mockResolvedValue({ managedDiseases: 8, diseasesRequiringReview: 3, pending: 4, inReview: 1, needMoreInfo: 0, completed: 11, rejected: 2, assignedPatients: 5, online: true });
  mocked.diseases.mockResolvedValue([disease]);
  mocked.reviews.mockResolvedValue([review()]);
  mocked.heartbeat.mockResolvedValue(true);
  mocked.decide.mockResolvedValue(review({ status: 'COMPLETED' }));
});

async function openReview() {
  await renderScreen(<DoctorDashboard />);
  await fireEvent.press(screen.getByText('Yêu cầu'));
  await fireEvent.press(await screen.findByLabelText('Mở yêu cầu 42'));
}

describe('Doctor Dashboard', () => {
  it('tab Tổng quan: số liệu + trạng thái online, gửi heartbeat khi mở', async () => {
    await renderScreen(<DoctorDashboard />);
    expect(await screen.findByText('8')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('Đang online · heartbeat đang hoạt động')).toBeTruthy();
    expect(mocked.heartbeat).toHaveBeenCalled();
  });

  it('tab Bệnh lý: chỉ gọi API khi mở tab, hiển thị mức độ và chính sách', async () => {
    await renderScreen(<DoctorDashboard />);
    await screen.findByText('8');
    expect(mocked.diseases).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Bệnh lý'));
    expect(await screen.findByText('Tăng huyết áp')).toBeTruthy();
    expect(screen.getByText('HYPERTENSION · Tim mạch')).toBeTruthy();
    expect(screen.getByText('Cao')).toBeTruthy();
    expect(screen.getByText('Bắt buộc bác sĩ kiểm tra')).toBeTruthy();
  });

  it('tìm bệnh truyền từ khoá xuống API', async () => {
    await renderScreen(<DoctorDashboard />);
    await fireEvent.press(screen.getByText('Bệnh lý'));
    await screen.findByText('Tăng huyết áp');
    await fireEvent.changeText(screen.getByPlaceholderText('Tìm mã hoặc tên bệnh'), 'tim');
    await waitFor(() => expect(mocked.diseases).toHaveBeenLastCalledWith('tim'));
  });
});

describe('Doctor: danh sách & chi tiết yêu cầu', () => {
  it('kéo xuống để tải lại: gọi lại API danh sách yêu cầu (thấy yêu cầu mới của người dùng)', async () => {
    await renderScreen(<DoctorDashboard />);
    await fireEvent.press(screen.getByText('Yêu cầu'));
    await screen.findByLabelText('Mở yêu cầu 42');
    mocked.reviews.mockResolvedValue([review(), review({ id: 43, status: 'ASSIGNED' })]);
    const { refreshControl } = screen.getByTestId('doctor-scroll').props;
    await refreshControl.props.onRefresh();
    expect(await screen.findByLabelText('Mở yêu cầu 43')).toBeTruthy();
  });

  it('tự tải lại định kỳ trong khoảng hợp lý', () => {
    expect(AUTO_REFRESH_MS).toBeGreaterThanOrEqual(10_000);
    expect(AUTO_REFRESH_MS).toBeLessThanOrEqual(60_000);
  });

  it('lọc theo trạng thái truyền status xuống API', async () => {
    await renderScreen(<DoctorDashboard />);
    await fireEvent.press(screen.getByText('Yêu cầu'));
    await screen.findByLabelText('Mở yêu cầu 42');
    await fireEvent.press(screen.getByText('Chờ bổ sung'));
    await waitFor(() => expect(mocked.reviews).toHaveBeenLastCalledWith('NEED_MORE_INFO'));
  });

  it('chi tiết hiện đủ hồ sơ, bệnh, rủi ro, nội dung lộ trình và 4 quyết định', async () => {
    await openReview();
    expect(screen.getByText('Yêu cầu #42')).toBeTruthy();
    expect(screen.getByText('#7')).toBeTruthy();
    expect(screen.getByText('HYPERTENSION')).toBeTruthy();
    expect(screen.getByText('ASTHMA')).toBeTruthy();
    expect(screen.getByText('Huyết áp 160/100, chưa dùng thuốc')).toBeTruthy();
    expect(screen.getByText('Tuần 1: chạy bộ 30 phút mỗi ngày')).toBeTruthy();
    for (const label of ['Duyệt lộ trình', 'Yêu cầu sửa', 'Cần bổ sung thông tin', 'Từ chối · khuyên đi khám']) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });

  it('tóm tắt rủi ro trùng lý do thì không lặp lại', async () => {
    mocked.reviews.mockResolvedValue([review({ riskSummary: 'Có bệnh tăng huyết áp' })]);
    await openReview();
    expect(screen.getAllByText('Có bệnh tăng huyết áp')).toHaveLength(1);
    expect(screen.queryByText('Tóm tắt rủi ro')).toBeNull();
  });

  it('yêu cầu ASSIGNED: có nút "Bắt đầu kiểm tra" gọi start đúng id', async () => {
    mocked.reviews.mockResolvedValue([review({ status: 'ASSIGNED' })]);
    mocked.start.mockResolvedValue(review({ status: 'IN_REVIEW' }));
    await openReview();
    await fireEvent.press(screen.getByText('Bắt đầu kiểm tra'));
    await waitFor(() => expect(mocked.start).toHaveBeenCalledWith(42));
  });

  it('yêu cầu đã COMPLETED: không còn nút quyết định', async () => {
    mocked.reviews.mockResolvedValue([review({ status: 'COMPLETED', completedAt: '2026-11-18T05:00:00Z' })]);
    await openReview();
    expect(screen.queryByLabelText('Duyệt lộ trình')).toBeNull();
  });

  it('Duyệt: nhận xét không bắt buộc, gửi APPROVE rồi quay về danh sách', async () => {
    await openReview();
    await fireEvent.press(screen.getByLabelText('Duyệt lộ trình'));
    await fireEvent.press(screen.getByLabelText('Xác nhận Duyệt lộ trình'));
    await waitFor(() => expect(mocked.decide).toHaveBeenCalledWith(42, 'APPROVE', ''));
    expect(await screen.findByText('Đã gửi quyết định cho yêu cầu #42.')).toBeTruthy();
  });

  it.each([
    ['Yêu cầu sửa', 'REQUEST_REVISION'],
    ['Cần bổ sung thông tin', 'NEED_MORE_INFO'],
    ['Từ chối · khuyên đi khám', 'REJECT'],
  ])('%s: bắt buộc nhận xét, gửi đúng action %s', async (label, action) => {
    await openReview();
    await fireEvent.press(screen.getByLabelText(label));
    await fireEvent.press(screen.getByLabelText(`Xác nhận ${label}`));
    expect(screen.getByText('Vui lòng nhập nhận xét cho thao tác này.')).toBeTruthy();
    expect(mocked.decide).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByTestId('review-note-input'), '  Giảm cường độ  ');
    await fireEvent.press(screen.getByLabelText(`Xác nhận ${label}`));
    await waitFor(() => expect(mocked.decide).toHaveBeenCalledWith(42, action, 'Giảm cường độ'));
  });

  it('server báo lỗi: modal vẫn mở và hiện thông báo', async () => {
    mocked.decide.mockRejectedValue(new ApiError(400, 'X', 'Yêu cầu chưa được phân công cho bác sĩ này.'));
    await openReview();
    await fireEvent.press(screen.getByLabelText('Duyệt lộ trình'));
    await fireEvent.press(screen.getByLabelText('Xác nhận Duyệt lộ trình'));
    expect(await screen.findByText('Yêu cầu chưa được phân công cho bác sĩ này.')).toBeTruthy();
    expect(screen.getByTestId('review-note-input')).toBeTruthy();
  });
});
