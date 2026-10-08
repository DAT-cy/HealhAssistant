import { apiClient } from '../client';
import { GeminiRoadmapResponse } from '../types';
import { apiVersion } from '@/config/api.config';

export interface RoadmapRequest { goal: string; weeks: number; postureSummary?: string; restrictions?: string }
export const coachService = {
  roadmap: (body: RoadmapRequest) => apiClient.request<GeminiRoadmapResponse>(`${apiVersion}/coach/roadmap`, { method: 'POST', body: JSON.stringify(body), ai: true }),
};
