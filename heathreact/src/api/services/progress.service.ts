import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface ProgressSummaryResponse { postureScans: number; roadmapsCreated: number; workoutSessions: number; source: string; message: string }
export const progressService = { summary: () => apiClient.request<ProgressSummaryResponse>(`${apiVersion}/progress/summary`) };
