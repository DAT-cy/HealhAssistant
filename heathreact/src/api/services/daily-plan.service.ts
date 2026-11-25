import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { appendFile } from '@/utils/formFile';

export interface DailyPlanResponse {
  date: string;
  title: string;
  duration: string;
  activities: string[];
  safetyNotes: string[];
  source: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  activityType: string | null;
  locationType: string | null;
  mealGuidance: string[];
  completed: boolean;
  completedAt: string | null;
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
      await appendFile(form, 'file', { uri: asset.uri, name: asset.fileName ?? 'meal.jpg', type: asset.mimeType ?? 'image/jpeg' });
    }
    form.append('meal', meal);
    form.append('plannedMeal', plannedMeal);
    return apiClient.request<MealAnalysisResponse>(`${apiVersion}/daily-plans/today/meals/analyze`, { method: 'POST', body: form, ai: true, timeoutMs: 120000 });
  },
  forDate: (date: string) => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/date/${encodeURIComponent(date)}`),
  generateDate: (date: string) => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/date/${encodeURIComponent(date)}/generate`, { method: 'POST' }),
  completeDate: (date: string) => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/date/${encodeURIComponent(date)}/complete`, { method: 'POST' }),
};
