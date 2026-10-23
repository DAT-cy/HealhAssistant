import { apiClient } from '../client';
import { GeminiRoadmapResponse } from '../types';
import { apiVersion } from '@/config/api.config';

export interface RoadmapRequest { goal: string; weeks: number; postureSummary?: string; restrictions?: string }
export interface RoadmapPreview { previewId: string; options: GeminiRoadmapResponse[] }
export interface RoadmapRecord {
  id: number;
  title: string;
  overview: string;
  weeklyPlan: string;
  safetyNotes: string;
  source: string;
  status: string;
  startDate: string | null;
  durationWeeks: number | null;
  versionNumber: number | null;
  previousRoadmapId: number | null;
  changeReason: string | null;
  promptVersion: string | null;
  schemaVersion: string | null;
  createdAt: string;
}
export type ActiveRoadmap = RoadmapRecord & { startDate: string; durationWeeks: number };

export interface PlanAdjustmentChanges {
  schemaVersion: string;
  baseRoadmapId: number;
  baseVersionNumber: number | null;
  weekIndex: number;
  checkinDates: string[];
  currentWeeklyPlan: string[];
  proposedWeeklyPlan: string[];
}

export interface PlanAdjustment {
  id: number;
  roadmapId: number | null;
  triggerType: string;
  reason: string;
  proposedChanges: PlanAdjustmentChanges;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  decidedAt: string | null;
}

export interface AdjustmentEvaluation {
  proposalCreated: boolean;
  message: string;
  proposal: PlanAdjustment | null;
}

export interface PlanAdjustmentDecision {
  adjustment: PlanAdjustment;
  roadmap: RoadmapRecord;
}
export const coachService = {
  roadmap: (body: RoadmapRequest) => apiClient.request<GeminiRoadmapResponse>(`${apiVersion}/coach/roadmap`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  preview: (body: RoadmapRequest) => apiClient.request<RoadmapPreview>(`${apiVersion}/coach/roadmap/preview`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  activate: (previewId: string, optionIndex: number, title?: string) => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmap/activate`, { method: 'POST', body: JSON.stringify({ previewId, optionIndex, title }) }),
  active: () => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmaps/active`),
  history: () => apiClient.request<RoadmapRecord[]>(`${apiVersion}/coach/roadmaps/me`),
  getRoadmap: (id: number) => apiClient.request<RoadmapRecord>(`${apiVersion}/coach/roadmaps/${id}`),
  evaluateAdjustment: () => apiClient.request<AdjustmentEvaluation>(`${apiVersion}/plan-adjustments/evaluate`, { method: 'POST' }),
  adjustmentHistory: () => apiClient.request<PlanAdjustment[]>(`${apiVersion}/plan-adjustments/me`),
  acceptAdjustment: (id: number) => apiClient.request<PlanAdjustmentDecision>(`${apiVersion}/plan-adjustments/${id}/accept`, { method: 'POST' }),
  rejectAdjustment: (id: number) => apiClient.request<PlanAdjustment>(`${apiVersion}/plan-adjustments/${id}/reject`, { method: 'POST' }),
};
