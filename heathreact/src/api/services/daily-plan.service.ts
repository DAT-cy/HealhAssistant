import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

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
}
export const dailyPlanService = {
  today: () => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/today`),
  generateToday: () => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/today/generate`, { method: 'POST' }),
  forDate: (date: string) => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/date/${encodeURIComponent(date)}`),
  generateDate: (date: string) => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/date/${encodeURIComponent(date)}/generate`, { method: 'POST' }),
};
