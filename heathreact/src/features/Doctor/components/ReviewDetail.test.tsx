import { render, screen } from '@testing-library/react-native';
import React from 'react';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import ReviewDetail from './ReviewDetail';

const request = (patch: Partial<DoctorReviewRequest>): DoctorReviewRequest => ({
  id: 5, userId: 7, roadmapId: null, assignedDoctorId: 20, decision: 'DOCTOR_REVIEW_REQUIRED', status: 'IN_REVIEW', priority: 'NORMAL',
  reason: 'Chính sách yêu cầu bác sĩ', diseaseCodes: 'HTN', riskSummary: '', fullText: 'Tuổi: 40', policyVersion: 'v1',
  createdAt: '2026-11-18T00:00:00Z', assignedAt: null, completedAt: null, ...patch,
});

const renderDetail = (patch: Partial<DoctorReviewRequest>) =>
  render(<ReviewDetail request={request(patch)} starting={false} onBack={jest.fn()} onStart={jest.fn()} onDecide={jest.fn()} />);

describe('ReviewDetail', () => {
  it('hiện 3 phương án AI để bác sĩ duyệt', async () => {
    await renderDetail({
      aiPlan: [
        { title: 'Đi bộ nhẹ', overview: 'Tăng sức bền', weeklyPlan: ['Đi bộ 15 phút'], safetyNotes: ['Dừng khi chóng mặt'] },
        { title: 'Giãn cơ', overview: '', weeklyPlan: [], safetyNotes: [] },
      ],
    });
    expect(screen.getByText('Phương án 1: Đi bộ nhẹ')).toBeTruthy();
    expect(screen.getByText('Tuần 1: Đi bộ 15 phút')).toBeTruthy();
    expect(screen.getByText('Lưu ý an toàn: Dừng khi chóng mặt')).toBeTruthy();
    expect(screen.getByText('Phương án 2: Giãn cơ')).toBeTruthy();
  });

  it('yêu cầu cũ chưa có phương án -> báo rõ', async () => {
    await renderDetail({ aiPlan: null });
    expect(screen.getByText(/chưa kèm phương án AI/)).toBeTruthy();
  });

  it('hiện thông tin người dùng bổ sung và nhận xét lần trước', async () => {
    await renderDetail({ status: 'ASSIGNED', userReply: 'Đang uống Amlodipine', doctorNote: 'Bạn dùng thuốc gì?', lastAction: 'NEED_MORE_INFO', decidedAt: '2026-11-18T01:00:00Z' });
    expect(screen.getByText('Đang uống Amlodipine')).toBeTruthy();
    expect(screen.getByText('Bạn dùng thuốc gì?')).toBeTruthy();
    expect(screen.getByText(/^Cần bổ sung thông tin ·/)).toBeTruthy();
  });

  it('ghi rõ đây là bản AI điều chỉnh của yêu cầu trước', async () => {
    await renderDetail({ previousRequestId: 3 });
    expect(screen.getByText('Bản AI điều chỉnh theo nhận xét của yêu cầu #3')).toBeTruthy();
  });

  it('hiển thị tiếng Việt, không lặp "Tuần 1: Tuần 1"', async () => {
    await renderDetail({
      priority: 'NORMAL', riskSummary: 'Tăng huyết áp (HTN) – mức HIGH, chuyên khoa Tim mạch', fullText: 'Tuổi: 25, chiều cao cm: 160.0, cân nặng kg: 65.0',
      aiPlan: [{ title: 'A', overview: '', weeklyPlan: ['Tuần 1: Đi bộ nhẹ'], safetyNotes: [] }],
    });
    expect(screen.getByText('Bình thường')).toBeTruthy();
    expect(screen.getByText('Quyết định hệ thống: Cần bác sĩ duyệt')).toBeTruthy();
    expect(screen.getByText('Tăng huyết áp (HTN) – mức cao, chuyên khoa Tim mạch')).toBeTruthy();
    expect(screen.getByText('Tuổi: 25, chiều cao: 160 cm, cân nặng: 65 kg')).toBeTruthy();
    expect(screen.getByText('Tuần 1: Đi bộ nhẹ')).toBeTruthy();
  });
});
