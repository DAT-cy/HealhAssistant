import type { ProfileResponse } from '@/api/services/profile.service';

export function isProfileComplete(profile: ProfileResponse | null | undefined, hasWeeklySchedule: boolean): boolean {
  const positive = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value > 0;
  return Boolean(
    profile?.consent === true &&
    profile.goal?.trim() &&
    profile.activityLevel?.trim() &&
    positive(profile.age) &&
    positive(profile.heightCm) &&
    positive(profile.weightKg) &&
    profile.restrictions?.trim() &&
    profile.painAreas?.trim() &&
    hasWeeklySchedule
  );
}
