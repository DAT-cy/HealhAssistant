import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { ProfileGender } from '@/components/ui/Avatar';

export interface ProfileRequest {
  goal?: string;
  activityLevel?: string;
  gender?: ProfileGender | null;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  restrictions?: string;
  painAreas?: string;
  consent?: boolean;
  diseaseCodes?: string | null;
  symptoms?: string | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
  allergies?: string | null;
  medications?: string | null;
  lifestyleNotes?: string | null;
  sleepHours?: number | null;
  healthMetrics?: string | null;
}

export interface ProfileResponse extends Omit<ProfileRequest, 'goal' | 'activityLevel' | 'consent' | 'restrictions' | 'painAreas'> {
  id: number;
  userId: number;
  goal: string;
  activityLevel: string;
  restrictions: string;
  painAreas: string;
  consent: boolean;
  avatarUrl: string | null;
  diseaseCodes?: string | null;
  symptoms?: string | null;
  medicalHistory?: string | null;
  familyHistory?: string | null;
  allergies?: string | null;
  medications?: string | null;
  lifestyleNotes?: string | null;
  sleepHours?: number | null;
  healthMetrics?: string | null;
}

export const profileService = {
  getMine: () => apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me`),
  /** Chỉ bật/tắt đồng ý sử dụng dữ liệu hồ sơ. */
  updateConsent: (consent: boolean) => apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me/consent`, { method: 'PATCH', body: JSON.stringify({ consent }) }),
  save: (body: ProfileRequest) => apiClient.request<ProfileResponse>(`${apiVersion}/profiles`, { method: 'POST', body: JSON.stringify(body) }),
  uploadAvatar: async (asset: ImagePickerAsset) => {
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? 'avatar.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    return apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me/avatar`, { method: 'POST', body: form });
  },
};
