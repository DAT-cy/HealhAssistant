import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { doctorService, type Disease, type DoctorReviewRequest } from '@/api/services/doctor.service';
import { renderScreen } from '@/test-utils/render';
import DoctorDashboard from './Dashboard';

jest.mock('@/api/services/doctor.service', () => ({
  doctorService: { dashboard: jest.fn(), diseases: jest.fn(), reviews: jest.fn(), heartbeat: jest.fn(), decide: jest.fn(), start: jest.fn(), updatePolicy: jest.fn() },
}));

const mocked = doctorService as jest.Mocked<typeof doctorService>;

const disease: Disease = {
  id: 1, code: 'HYPERTENSION', name: 'Tăng huyết áp', specialty: 'Tim mạch', description: null, severity: 'HIGH',
  doctorRequired: true, roadmapConfirmationRequired: true, aiAllowed: false, priority: 1, specialInstructions: null, active: true, updatedAt: '2026-11-18T00:00:00Z',
};
const review: DoctorReviewRequest = {
  id: 42, userId: 7, roadmapId: 3, assignedDoctorId: 1, decision: 'DOCTOR_REQUIRED', status: 'ASSIGNED', priority: 'HIGH',
  reason: 'Có bệnh tăng huyết áp', diseaseCodes: 'HYPERTENSION', riskSummary: '', fullText: null, policyVersion: 'v1',
  createdAt: '2026-11-18T00:00:00Z', assignedAt: null, completedAt: null,
};

beforeEach(() => {
  mocked.dashboard.mockResolvedValue({ managedDiseases: 8, diseasesRequiringReview: 3, pending: 4, inReview: 1, needMoreInfo: 0, completed: 11, rejected: 2, assignedPatients: 5, online: true });
  mocked.diseases.mockResolvedValue([disease]);
  mocked.reviews.mockResolvedValue([review]);
  mocked.heartbeat.mockResolvedValue(true);
});

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

  it('tab Yêu cầu: hiển thị yêu cầu; bấm "Bắt đầu kiểm tra" gọi start đúng id', async () => {
    mocked.start.mockResolvedValue({ ...review, status: 'IN_REVIEW' });
    await renderScreen(<DoctorDashboard />);
    await fireEvent.press(screen.getByText('Yêu cầu'));
    expect(await screen.findByText('Yêu cầu #42')).toBeTruthy();
    expect(screen.getByText('Người dùng #7 · HIGH · HYPERTENSION')).toBeTruthy();
    await fireEvent.press(screen.getByText('Bắt đầu kiểm tra'));
    await waitFor(() => expect(mocked.start).toHaveBeenCalledWith(42));
  });
});
