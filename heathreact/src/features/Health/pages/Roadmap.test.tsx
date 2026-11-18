import { fireEvent, screen } from '@testing-library/react-native';
import { toast } from 'sonner-native';
import React from 'react';
import { doctorRequestService } from '@/api/services/doctor-request.service';
import type { DoctorReviewRequest } from '@/api/services/doctor.service';
import { renderScreen } from '@/test-utils/render';
import RoadmapPage from './Roadmap';

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    // Chạy callback một lần khi màn hình "được focus".
    useFocusEffect: (callback: () => void) => ReactActual.useEffect(callback, [callback]),
  };
});
// Các modal/thẻ con dùng reanimated (native) và không liên quan tới test này -> thay bằng component rỗng.
jest.mock('@/features/Health/components/RoadmapWizardModal', () => () => null);
jest.mock('@/features/Health/components/ActivityTrackerModal', () => () => null);
jest.mock('@/features/Health/components/GymCoachModal', () => () => null);
jest.mock('@/features/Health/components/ReschedulePlanner', () => () => null);
jest.mock('@/features/Health/components/MealScheduleCard', () => () => null);
jest.mock('@/routes', () => ({ navigationService: { navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn() } }));
jest.mock('@/api/services/doctor-request.service', () => ({ doctorRequestService: { mine: jest.fn(), get: jest.fn(), reply: jest.fn() } }));
jest.mock('@/api/services/profile.service', () => ({ profileService: { getMine: jest.fn().mockResolvedValue(null) } }));
jest.mock('@/api/services/coach.service', () => ({
  // Người dùng chưa có lộ trình nào: mọi API danh sách trả rỗng, lộ trình đang chạy = null.
  coachService: new Proxy({}, {
    get: (_target, name) => (name === 'active' || name === 'progress' ? jest.fn().mockResolvedValue(null) : jest.fn().mockResolvedValue([])),
  }),
}));

const mocked = doctorRequestService as jest.Mocked<typeof doctorRequestService>;
const request = (patch: Partial<DoctorReviewRequest>): DoctorReviewRequest => ({
  id: 2, userId: 4, roadmapId: null, assignedDoctorId: 7, decision: 'DOCTOR_REVIEW_REQUIRED', status: 'NEED_MORE_INFO', priority: 'NORMAL',
  reason: 'Chính sách bệnh lý yêu cầu bác sĩ kiểm tra', diseaseCodes: 'HYPERTENSION', riskSummary: '', fullText: null, policyVersion: 'v1',
  createdAt: '2026-11-18T15:30:00Z', assignedAt: null, completedAt: '2026-11-18T15:35:00Z', ...patch,
});

describe('Màn Lộ trình: thẻ theo dõi yêu cầu bác sĩ', () => {
  it('hiện kết quả "Yêu cầu sửa" ngay cả khi người dùng CHƯA có lộ trình đang hoạt động', async () => {
    mocked.mine.mockResolvedValue([request({ status: 'REVISION_REQUESTED', doctorNote: 'Giảm cường độ tuần 1' })]);
    await renderScreen(<RoadmapPage />);
    expect(await screen.findByText('Bác sĩ yêu cầu sửa lộ trình')).toBeTruthy();
    expect(screen.getByText('Giảm cường độ tuần 1')).toBeTruthy();
  });

  it('"Yêu cầu sửa" không chặn tạo lộ trình mới (để AI lập lại theo góp ý)', async () => {
    mocked.mine.mockResolvedValue([request({ status: 'REVISION_REQUESTED', doctorNote: 'Giảm cường độ' })]);
    await renderScreen(<RoadmapPage />);
    await screen.findByText('Bác sĩ yêu cầu sửa lộ trình');
    await fireEvent.press(screen.getByLabelText('Tạo lộ trình mới'));
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it('bác sĩ cần thêm thông tin -> người dùng trả lời ngay trên thẻ', async () => {
    mocked.mine.mockResolvedValue([request({ doctorNote: 'Bạn đang dùng thuốc gì?' })]);
    mocked.reply.mockResolvedValue(request({ status: 'ASSIGNED' }));
    await renderScreen(<RoadmapPage />);
    await screen.findByText('Bác sĩ cần thêm thông tin');
    await fireEvent.changeText(screen.getByTestId('doctor-reply-input'), 'Amlodipine 5mg');
    await fireEvent.press(screen.getByTestId('doctor-reply-send'));
    expect(mocked.reply).toHaveBeenCalledWith(2, 'Amlodipine 5mg');
    expect(toast.success).toHaveBeenCalledWith('Đã gửi bác sĩ', expect.anything());
  });

  it('không có yêu cầu nào -> không hiện thẻ', async () => {
    mocked.mine.mockResolvedValue([]);
    await renderScreen(<RoadmapPage />);
    await screen.findAllByText('Lộ trình của bạn');
    expect(screen.queryByText('THEO DÕI YÊU CẦU BÁC SĨ')).toBeNull();
  });

  it('còn yêu cầu chưa xong -> bấm "Tạo lộ trình mới" chỉ hiện cảnh báo, không mở trình tạo', async () => {
    mocked.mine.mockResolvedValue([request({})]);
    await renderScreen(<RoadmapPage />);
    await screen.findByText('Bác sĩ cần thêm thông tin');
    await fireEvent.press(screen.getByLabelText('Tạo lộ trình mới'));
    expect(toast.warning).toHaveBeenCalledWith('Bạn đang có yêu cầu #2 chờ bác sĩ', expect.objectContaining({ description: expect.stringContaining('bổ sung') }));
  });

  it('các yêu cầu đều đã xong -> được mở trình tạo, không cảnh báo', async () => {
    mocked.mine.mockResolvedValue([request({ status: 'COMPLETED' })]);
    await renderScreen(<RoadmapPage />);
    await screen.findByText('Bác sĩ đã duyệt lộ trình');
    await fireEvent.press(screen.getByLabelText('Tạo lộ trình mới'));
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
