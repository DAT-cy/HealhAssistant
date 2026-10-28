import { apiClient } from '../client';
import { GeminiRoadmapResponse } from '../types';
import { apiVersion } from '@/config/api.config';

export type SessionPeriod = 'MORNING' | 'AFTERNOON' | 'EVENING';
export type PlannedActivityType = 'RUNNING' | 'GYM' | 'WALKING' | 'STRENGTH' | 'MOBILITY' | 'OTHER';
export interface RoadmapSlotRequest {
  dayOfWeek: number;
  sessionPeriod: SessionPeriod;
  startTime: string;
  endTime: string;
  activityType: PlannedActivityType;
  activity: string;
}
export interface RoadmapPlanSlot {
  id: number;
  dayIndex: number;
  date: string | null;
  sessionPeriod: SessionPeriod;
  startTime: string;
  endTime: string;
  activityType: PlannedActivityType;
  activity: string;
  durationMinutes: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  startedAt: string | null;
  completedAt: string | null;
  actualDurationMinutes: number | null;
  notes: string | null;
  skipReason: string | null;
}
export interface RoadmapDay {
  roadmapId: number;
  roadmapTitle: string;
  dayIndex: number;
  date: string;
  status: 'REST' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  totalSlots: number;
  completedSlots: number;
  expectedMinutes: number;
  actualMinutes: number;
  weeklyFocus: string;
  safetyNotes: string[];
  slots: RoadmapPlanSlot[];
}
export interface RoadmapProgress {
  roadmapId: number;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  durationDays: number;
  totalSlots: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  skipped: number;
  cancelled: number;
  completedDays: number;
  totalActiveDays: number;
  progressPercent: number;
}
export interface ActivitySession {
  id: number;
  roadmapId: number;
  planSlotId: number;
  activityType: 'RUNNING' | 'WALKING';
  status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  steps: number | null;
  paceSecondsPerKm: number | null;
  averageSpeedKmh: number | null;
  distanceSource: 'GPS' | 'MANUAL' | 'UNAVAILABLE';
  stepsSource: 'SENSOR' | 'MANUAL' | 'UNAVAILABLE';
  durationSource: 'TIMER' | 'MANUAL';
  gpsSampleCount: number;
  notes: string | null;
}
export interface ActivityReview {
  summary: string;
  observations: string[];
  suggestions: string[];
  progressionNote: string;
  enoughEvidence: boolean;
  source: 'GEMINI' | 'FALLBACK';
}
export interface RoadmapRequest { goal: string; weeks: number; postureSummary?: string; restrictions?: string; schedule?: RoadmapSlotRequest[] }
export type RoadmapPreviewRequest = RoadmapRequest & { schedule: RoadmapSlotRequest[] };
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
export interface DailyScheduleChange {
  slotId: number;
  action: 'MOVE' | 'REPLACE' | 'CANCEL';
  dayIndex: number;
  sessionPeriod: SessionPeriod;
  startTime: string;
  endTime: string;
  activityType: PlannedActivityType;
  activity: string;
  reason: string;
}
export interface DailyAiReview {
  id: number;
  reviewDate: string;
  roadmapId: number;
  status: 'AWAITING_CONFIRMATION' | 'NO_CHANGE' | 'ACCEPTED' | 'REJECTED';
  summary: string;
  achievedGoals: string[];
  incompleteActivities: string[];
  workloadAssessment: string[];
  missingData: string[];
  needsScheduleAdjustment: boolean;
  reasons: string[];
  suggestions: string[];
  recommendation: string;
  proposedChanges: { baseRoadmapId: number; baseVersionNumber: number | null; scheduleChanges: DailyScheduleChange[] } | null;
  confirmationRequired: boolean;
  source: 'GEMINI' | 'RULE_FALLBACK';
  createdAt: string;
  decidedAt: string | null;
  appliedRoadmapId: number | null;
}
export type RescheduleScope = 'SINGLE_SLOT' | 'DAY' | 'REMAINING_DAYS' | 'NEW_VERSION';
export interface PlanRescheduleRequest {
  roadmapId: number;
  scope: RescheduleScope;
  targetDate: string;
  targetSlotId?: number;
  goal?: string;
  naturalLanguageRequest?: string;
  availableWeekdays?: number[];
  preferredStartTime?: string;
  preferredEndTime?: string;
  preferredTimeWindows?: string;
  desiredActivityTypes?: string;
  durationMinutes?: number;
  unavailableActivities?: string;
  equipmentOrLocation?: string;
  healthLimits?: string;
  reason: string;
}
export interface PlanReschedulePreview {
  previewId: string;
  roadmapId: number;
  scope: RescheduleScope;
  targetDate: string;
  premium: boolean;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  summary: string;
  differences: string[];
  changes: DailyScheduleChange[];
  safetyNotes: string[];
  expiresAt: string;
  appliedRoadmapId: number | null;
}
export const coachService = {
  roadmap: (body: RoadmapRequest) => apiClient.request<GeminiRoadmapResponse>(`${apiVersion}/coach/roadmap`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  preview: (body: RoadmapPreviewRequest) => apiClient.request<RoadmapPreview>(`${apiVersion}/coach/roadmap/preview`, { method: 'POST', body: JSON.stringify(body), ai: true }),
  activate: (previewId: string, optionIndex: number) => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmap/activate`, { method: 'POST', body: JSON.stringify({ previewId, optionIndex }) }),
  active: () => apiClient.request<ActiveRoadmap>(`${apiVersion}/coach/roadmaps/active`),
  history: () => apiClient.request<RoadmapRecord[]>(`${apiVersion}/coach/roadmaps/me`),
  getRoadmap: (id: number) => apiClient.request<RoadmapRecord>(`${apiVersion}/coach/roadmaps/${id}`),
  evaluateAdjustment: () => apiClient.request<AdjustmentEvaluation>(`${apiVersion}/plan-adjustments/evaluate`, { method: 'POST' }),
  adjustmentHistory: () => apiClient.request<PlanAdjustment[]>(`${apiVersion}/plan-adjustments/me`),
  acceptAdjustment: (id: number) => apiClient.request<PlanAdjustmentDecision>(`${apiVersion}/plan-adjustments/${id}/accept`, { method: 'POST' }),
  rejectAdjustment: (id: number) => apiClient.request<PlanAdjustment>(`${apiVersion}/plan-adjustments/${id}/reject`, { method: 'POST' }),
  schedule: (roadmapId: number) => apiClient.request<RoadmapPlanSlot[]>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule`),
  scheduleDay: (roadmapId: number, date: string) => apiClient.request<RoadmapDay>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/day?date=${encodeURIComponent(date)}`),
  scheduleHistory: (roadmapId: number, from: string, to: string) => apiClient.request<RoadmapPlanSlot[]>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  progress: (roadmapId: number) => apiClient.request<RoadmapProgress>(`${apiVersion}/coach/roadmaps/${roadmapId}/progress`),
  startSlot: (roadmapId: number, slotId: number) => apiClient.request<RoadmapPlanSlot>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/${slotId}/start`, { method: 'POST' }),
  completeSlot: (roadmapId: number, slotId: number, body: { actualDurationMinutes?: number; notes?: string }) =>
    apiClient.request<RoadmapPlanSlot>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/${slotId}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  skipSlot: (roadmapId: number, slotId: number, reason?: string) =>
    apiClient.request<RoadmapPlanSlot>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/${slotId}/skip`, { method: 'POST', body: JSON.stringify({ reason }) }),
  cancelSlot: (roadmapId: number, slotId: number) => apiClient.request<RoadmapPlanSlot>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/${slotId}/cancel`, { method: 'POST' }),
  updateScheduleSlot: (roadmapId: number, slotId: number, status: RoadmapPlanSlot['status'], notes?: string) =>
    apiClient.request<RoadmapPlanSlot>(`${apiVersion}/coach/roadmaps/${roadmapId}/schedule/${slotId}`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  startActivity: (roadmapId: number, planSlotId: number) => apiClient.request<ActivitySession>(`${apiVersion}/activity-sessions`, { method: 'POST', body: JSON.stringify({ roadmapId, planSlotId }) }),
  pauseActivity: (sessionId: number) => apiClient.request<ActivitySession>(`${apiVersion}/activity-sessions/${sessionId}/pause`, { method: 'POST' }),
  resumeActivity: (sessionId: number) => apiClient.request<ActivitySession>(`${apiVersion}/activity-sessions/${sessionId}/resume`, { method: 'POST' }),
  finishActivity: (sessionId: number, body: { manualDurationSeconds?: number; manualDistanceMeters?: number; sensorSteps?: number; manualSteps?: number; gpsSamples: { timestampEpochMillis: number; latitude: number; longitude: number; accuracyMeters: number }[]; notes?: string }) =>
    apiClient.request<ActivitySession>(`${apiVersion}/activity-sessions/${sessionId}/finish`, { method: 'POST', body: JSON.stringify(body) }),
  cancelActivity: (sessionId: number) => apiClient.request<ActivitySession>(`${apiVersion}/activity-sessions/${sessionId}/cancel`, { method: 'POST' }),
  activityHistory: (roadmapId: number, planSlotId: number) => apiClient.request<ActivitySession[]>(`${apiVersion}/activity-sessions/history?roadmapId=${roadmapId}&planSlotId=${planSlotId}`),
  reviewActivity: (sessionId: number) => apiClient.request<ActivityReview>(`${apiVersion}/activity-sessions/${sessionId}/review`, { ai: true, timeoutMs: 120000 }),
  evaluateDay: (date: string) => apiClient.request<DailyAiReview>(`${apiVersion}/daily-ai-reviews/evaluate?date=${encodeURIComponent(date)}`, { method: 'POST', ai: true, timeoutMs: 120000 }),
  dailyReviewHistory: (roadmapId?: number) => apiClient.request<DailyAiReview[]>(`${apiVersion}/daily-ai-reviews/history${roadmapId ? `?roadmapId=${roadmapId}` : ''}`),
  acceptDailyReview: (id: number) => apiClient.request<DailyAiReview>(`${apiVersion}/daily-ai-reviews/${id}/accept`, { method: 'POST' }),
  rejectDailyReview: (id: number) => apiClient.request<DailyAiReview>(`${apiVersion}/daily-ai-reviews/${id}/reject`, { method: 'POST' }),
  planReschedulePreview: (body: PlanRescheduleRequest) => apiClient.request<PlanReschedulePreview>(`${apiVersion}/coach/reschedules/preview`, { method: 'POST', body: JSON.stringify(body), ai: true, timeoutMs: 120000 }),
  confirmReschedule: (previewId: string) => apiClient.request<PlanReschedulePreview>(`${apiVersion}/coach/reschedules/${encodeURIComponent(previewId)}/confirm`, { method: 'POST' }),
  rejectReschedule: (previewId: string) => apiClient.request<PlanReschedulePreview>(`${apiVersion}/coach/reschedules/${encodeURIComponent(previewId)}/reject`, { method: 'POST' }),
  rescheduleHistory: () => apiClient.request<PlanReschedulePreview[]>(`${apiVersion}/coach/reschedules/history`),
};
