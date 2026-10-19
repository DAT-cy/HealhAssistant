import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { ProfileGender } from '@/components/ui/Avatar';

export interface ProfileRequest {
  goal: string;
  activityLevel: string;
  gender?: ProfileGender | null;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  restrictions?: string;
  painAreas?: string;
  consent: boolean;
}

export interface ProfileResponse extends ProfileRequest {
  id: number;
  userId: number;
  avatarUrl: string | null;
}

export const profileService = {
  getMine: () => apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me`),
  save: (body: ProfileRequest) => apiClient.request<ProfileResponse>(`${apiVersion}/profiles`, { method: 'POST', body: JSON.stringify(body) }),
  uploadAvatar: async (asset: ImagePickerAsset) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const image = asset.file ?? await (await fetch(asset.uri)).blob();
      form.append('file', image, asset.fileName ?? 'avatar.jpg');
    } else {
      form.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    return apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me/avatar`, { method: 'POST', body: form });
  },
};
