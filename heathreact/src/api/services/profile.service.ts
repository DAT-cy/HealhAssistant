import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface ProfileRequest {
  goal: string;
  activityLevel: string;
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
}

export const profileService = {
  getMine: () => apiClient.request<ProfileResponse>(`${apiVersion}/profiles/me`),
  save: (body: ProfileRequest) => apiClient.request<ProfileResponse>(`${apiVersion}/profiles`, { method: 'POST', body: JSON.stringify(body) }),
};
