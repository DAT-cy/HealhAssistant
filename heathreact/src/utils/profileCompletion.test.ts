import type { ProfileResponse } from '@/api/services/profile.service';
import { isProfileComplete } from './profileCompletion';

const complete = {
  id: 1, userId: 1, consent: true, goal: 'LOSE_WEIGHT', activityLevel: 'MODERATE', age: 28, heightCm: 170, weightKg: 70,
  restrictions: 'Không', painAreas: 'Không', avatarUrl: null,
} as unknown as ProfileResponse;

describe('isProfileComplete', () => {
  it('đủ thông tin + có lịch rảnh -> hoàn thành', () => {
    expect(isProfileComplete(complete, true)).toBe(true);
  });

  it('chưa có lịch rảnh trong tuần -> chưa hoàn thành', () => {
    expect(isProfileComplete(complete, false)).toBe(false);
  });

  it('chưa có hồ sơ -> chưa hoàn thành', () => {
    expect(isProfileComplete(null, true)).toBe(false);
    expect(isProfileComplete(undefined, true)).toBe(false);
  });

  it.each([
    ['consent', false],
    ['goal', '   '],
    ['activityLevel', ''],
    ['age', 0],
    ['heightCm', Number.NaN],
    ['weightKg', -5],
    ['restrictions', ''],
    ['painAreas', ' '],
  ])('thiếu/sai %s -> chưa hoàn thành', (field, value) => {
    expect(isProfileComplete({ ...complete, [field]: value } as ProfileResponse, true)).toBe(false);
  });
});
