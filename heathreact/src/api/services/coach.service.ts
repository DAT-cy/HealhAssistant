import { apiClient } from '../client';
import { GeminiRoadmapResponse } from '../types';
import { apiVersion } from '@/config/api.config';

export interface RoadmapRequest { goal: string; weeks: number; postureSummary?: string; restrictions?: string }
export interface ActiveRoadmap { id: number; title: string; overview: string; weeklyPlan: string; safetyNotes: string; source: string; status: string; startDate: string; durationWeeks: number }
export const coachService = {
  roadmap: (body: RoadmapRequest) => apiClient.request<GeminiRoadmapResponse>(`${apiVersion}/coach/roadmap`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  preview: (body: RoadmapRequest) => apiClient.request<GeminiRoadmapResponse[]>(`${apiVersion}/coach/roadmap/preview`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  activate: (plan: GeminiRoadmapResponse, weeks: number) => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmap/activate`, { method: 'POST', body: JSON.stringify({ ...plan, weeks }) }),
  active: () => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmaps/active`),
};
