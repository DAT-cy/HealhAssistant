import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export interface DailyPlanResponse {
  date: string;
  title: string;
  duration: string;
  activities: string[];
  safetyNotes: string[];
  source: string;
}
export interface MealAnalysisResponse {
  assessment: string;
  summary: string;
  advice: string[];
  knowledgeSources: string[];
  source: string;
}
export const dailyPlanService = {
  today: () => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/today`),
  generateToday: () => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/today/generate`, { method: 'POST' }),
  analyzeMeal: async (asset: ImagePickerAsset, meal: string, plannedMeal: string) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const image = asset.file ?? await (await fetch(asset.uri)).blob();
      form.append('file', image, asset.fileName ?? 'meal.jpg');
    } else {
      form.append('file', { uri: asset.uri, name: asset.fileName ?? 'meal.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    }
    form.append('meal', meal);
    form.append('plannedMeal', plannedMeal);
    return apiClient.request<MealAnalysisResponse>(`${apiVersion}/daily-plans/today/meals/analyze`, { method: 'POST', body: form, ai: true, timeoutMs: 120000 });
  },
};
