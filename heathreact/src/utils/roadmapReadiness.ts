import type { ProfileResponse } from '@/api/services/profile.service';
import type { PersonalAssistantProfile } from '@/api/services/personal-assistant.service';

export type SetupKey = 'health' | 'personal';
export interface SetupItem { key: SetupKey; label: string; done: boolean; hint: string }

const positive = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/**
 * Điều kiện tạo lộ trình (thiết lập 1 lần):
 * - Hồ sơ sức khỏe: có chiều cao, cân nặng và đã đồng ý sử dụng dữ liệu.
 * - Cài đặt cá nhân: đã lưu ít nhất một lần.
 */
export function roadmapReadiness(profile: ProfileResponse | null | undefined, personal: PersonalAssistantProfile | null | undefined) {
  const healthDone = Boolean(profile && positive(profile.heightCm) && positive(profile.weightKg) && profile.consent === true);
  const personalDone = Boolean(personal?.id);
  const items: SetupItem[] = [
    {
      key: 'health', label: 'Hồ sơ sức khỏe', done: healthDone,
      hint: healthDone ? 'Đã có chỉ số cơ thể, bệnh lý và đồng ý dữ liệu.' : !profile ? 'Nhập chiều cao, cân nặng, bệnh lý và bật đồng ý dữ liệu.' : profile.consent !== true ? 'Bật "Đồng ý sử dụng dữ liệu hồ sơ".' : 'Nhập chiều cao và cân nặng.',
    },
    {
      key: 'personal', label: 'Cài đặt cá nhân', done: personalDone,
      hint: personalDone ? 'Đã có mục tiêu, thời gian và thói quen tập luyện.' : 'Chọn mục tiêu, mức độ tập, thời gian rảnh và lưu lại.',
    },
  ];
  return { ready: healthDone && personalDone, items, missing: items.filter((item) => !item.done) };
}
