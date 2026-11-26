import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export interface DoctorDashboard { managedDiseases: number; diseasesRequiringReview: number; pending: number; inReview: number; needMoreInfo: number; completed: number; rejected: number; assignedPatients: number; online: boolean }
export interface Disease { id: number; code: string; name: string; specialty: string | null; description: string | null; severity: RiskSeverity; doctorRequired: boolean; roadmapConfirmationRequired: boolean; aiAllowed: boolean; priority: number; specialInstructions: string | null; active: boolean; updatedAt: string }
export interface DoctorReviewRequest { id: number; userId: number; roadmapId: number | null; assignedDoctorId: number | null; decision: string; status: string; priority: string; reason: string; diseaseCodes: string; riskSummary: string; fullText: string | null; policyVersion: string; createdAt: string; assignedAt: string | null; completedAt: string | null;
  /** Quyết định gần nhất của bác sĩ. */ doctorNote?: string | null; lastAction?: string | null; decidedAt?: string | null;
  /** 3 phương án AI đề xuất gửi kèm để bác sĩ duyệt. */ aiPlan?: AiPlanOption[] | null;
  userReply?: string | null; previousRequestId?: number | null; appliedAt?: string | null }
export interface AiPlanOption { title: string; overview: string; weeklyPlan: string[]; safetyNotes: string[]; references?: import('@/api/types').RoadmapReference[] | null }
const path = `${apiVersion}/doctor`;
export const doctorService = {
  dashboard: () => apiClient.request<DoctorDashboard>(`${path}/dashboard`),
  diseases: (q = '') => apiClient.request<Disease[]>(`${path}/diseases?q=${encodeURIComponent(q)}`),
  updatePolicy: (id: number, body: { severity: RiskSeverity; doctorRequired: boolean; roadmapConfirmationRequired: boolean; aiAllowed: boolean; priority: number; specialInstructions?: string; reason: string }) => apiClient.request<Disease>(`${path}/diseases/${id}/policy`, { method: 'PATCH', body: JSON.stringify(body) }),
  reviews: (status = '') => apiClient.request<DoctorReviewRequest[]>(`${path}/reviews?status=${encodeURIComponent(status)}`),
  decide: (id: number, action: string, note: string) => apiClient.request<DoctorReviewRequest>(`${path}/reviews/${id}/decision`, { method: 'POST', body: JSON.stringify({ action, note }) }),
  start: (id: number) => apiClient.request<DoctorReviewRequest>(`${path}/reviews/${id}/start`, { method: 'POST' }),
  heartbeat: () => apiClient.request<boolean>(`${path}/heartbeat`, { method: 'POST' }),
};
