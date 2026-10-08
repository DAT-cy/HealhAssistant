import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface DailyPlanResponse { date: string; title: string; duration: string; activities: string[]; safetyNotes: string[]; source: string }
export const dailyPlanService = { today: () => apiClient.request<DailyPlanResponse>(`${apiVersion}/daily-plans/today`) };
