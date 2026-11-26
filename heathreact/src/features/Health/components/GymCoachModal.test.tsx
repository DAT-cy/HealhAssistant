import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { gymWorkoutService } from '@/api/services/gym-workout.service';
import type { RoadmapPlanSlot } from '@/api/services/coach.service';
import { renderScreen } from '@/test-utils/render';
import GymCoachModal from './GymCoachModal';

jest.mock('expo-camera', () => ({ CameraView: () => null, useCameraPermissions: () => [{ granted: false }, jest.fn()] }));
jest.mock('@/api/services/gym-workout.service', () => ({
  gymWorkoutService: { exerciseOptions: jest.fn(), premiumAccess: jest.fn(), history: jest.fn(), start: jest.fn() },
}));

const service = jest.mocked(gymWorkoutService);
const slot = { id: 5, activityType: 'GYM', status: 'UPCOMING', title: 'Tập gym' } as unknown as RoadmapPlanSlot;

beforeEach(() => {
  service.premiumAccess.mockResolvedValue({ enabled: false } as never);
  service.history.mockResolvedValue([] as never);
  service.exerciseOptions.mockResolvedValue({
    exercises: [{ id: 1, code: 'CHAIR_SQUAT', name: 'Squat với ghế', muscleGroup: 'Đùi', difficulty: 'BEGINNER', equipment: null,
      instructions: 'Ngồi xuống ghế rồi đứng lên.', safetyNotes: null, sets: 3, reps: '10-12', restSeconds: 60, commonMistakes: 'Gối đổ vào trong' }],
    hidden: [{ code: 'JUMP_SQUAT', name: 'Squat bật nhảy', diseases: ['Thoái hoá khớp gối'] }],
    userDiseases: ['Thoái hoá khớp gối'],
  });
});

describe('GymCoachModal – lọc bài theo bệnh lý', () => {
  it('chỉ hiện bài phù hợp và giải thích bài bị ẩn', async () => {
    await renderScreen(<GymCoachModal visible roadmapId={1} slot={slot} onClose={jest.fn()} onSaved={jest.fn()} />);
    expect(await screen.findByText('Squat với ghế')).toBeTruthy();
    expect(screen.queryByText('Squat bật nhảy')).toBeNull();
    expect(screen.getByTestId('gym-hidden-notice')).toBeTruthy();
    expect(screen.getByText(/Đã ẩn 1 bài không phù hợp với Thoái hoá khớp gối: Squat bật nhảy/)).toBeTruthy();
  });

  it('chọn bài thì hiện số hiệp, tư thế và lỗi thường gặp từ thư viện', async () => {
    await renderScreen(<GymCoachModal visible roadmapId={1} slot={slot} onClose={jest.fn()} onSaved={jest.fn()} />);
    await fireEvent.press(await screen.findByText('Squat với ghế'));
    expect(await screen.findByText('3 hiệp · 10-12 lần · nghỉ 60s')).toBeTruthy();
    expect(screen.getByText('Lỗi thường gặp: Gối đổ vào trong')).toBeTruthy();
  });
});
