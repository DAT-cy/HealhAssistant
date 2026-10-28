import { ApiError, apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export type HealthGoalType = 'WEIGHT_LOSS' | 'WEIGHT_MAINTENANCE' | 'MUSCLE_GAIN';
export type HealthGoalStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface HealthGoal {
  id: number;
  userId: number;
  goalType: HealthGoalType;
  startWeightKg: number | null;
  targetWeightKg: number | null;
  startDate: string;
  targetDate: string | null;
  status: HealthGoalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  activityType: 'WORKOUT' | 'WALKING' | 'MOBILITY' | 'OTHER';
  locationType: 'HOME' | 'GYM' | 'OUTDOOR' | 'ANYWHERE';
  equipmentNotes: string | null;
  active: boolean;
  createdAt: string;
}

export type AvailabilitySlotInput = Omit<AvailabilitySlot, 'id' | 'active' | 'createdAt'>;

export interface WeightLog {
  id: number;
  measuredOn: string;
  weightKg: number;
  note: string | null;
  createdAt: string;
}

export type CheckinMood = 'VERY_GOOD' | 'GOOD' | 'NEUTRAL' | 'LOW' | 'VERY_LOW';

export interface DailyCheckin {
  id: number;
  checkInDate: string;
  weightKg: number | null;
  energyLevel: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  fatigueLevel: number | null;
  mood: CheckinMood | null;
  activityNotes: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCheckinSummary {
  from: string;
  to: string;
  checkinCount: number;
  averageEnergyLevel: number | null;
  averageSleepHours: number | null;
  averageSleepQuality: number | null;
  averageFatigueLevel: number | null;
  firstWeightKg: number | null;
  latestWeightKg: number | null;
  weightChangeKg: number | null;
}

export type DailyCheckinInput = Omit<DailyCheckin, 'id' | 'checkInDate' | 'createdAt' | 'updatedAt'>;

const createAvailability = (body: AvailabilitySlotInput) =>
  apiClient.request<AvailabilitySlot>(`${apiVersion}/availability-slots`, { method: 'POST', body: JSON.stringify(body) });

const createAvailabilityBatch = async (body: AvailabilitySlotInput[]) => {
  try {
    return await apiClient.request<AvailabilitySlot[]>(`${apiVersion}/availability-slots/batch`, { method: 'POST', body: JSON.stringify(body) });
  } catch (error) {
    const batchEndpointUnavailable = error instanceof ApiError
      && ([404, 405].includes(error.status) || (error.status === 500 && error.message.includes("Request method 'POST' is not supported")));
    if (!batchEndpointUnavailable) throw error;

    const created: AvailabilitySlot[] = [];
    for (const slot of body) created.push(await createAvailability(slot));
    return created;
  }
};

export const healthTrackingService = {
  goals: () => apiClient.request<HealthGoal[]>(`${apiVersion}/health-goals/me`),
  createGoal: (body: { goalType: HealthGoalType; startWeightKg?: number; targetWeightKg?: number; startDate?: string; targetDate?: string; notes?: string }) =>
    apiClient.request<HealthGoal>(`${apiVersion}/health-goals`, { method: 'POST', body: JSON.stringify(body) }),
  updateGoalStatus: (id: number, status: HealthGoalStatus) =>
    apiClient.request<HealthGoal>(`${apiVersion}/health-goals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  availability: () => apiClient.request<AvailabilitySlot[]>(`${apiVersion}/availability-slots/me`),
  createAvailability,
  createAvailabilityBatch,
  deleteAvailability: (id: number) => apiClient.request<boolean>(`${apiVersion}/availability-slots/${id}`, { method: 'DELETE' }),
  weights: (from?: string, to?: string) => {
    const query = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : '';
    return apiClient.request<WeightLog[]>(`${apiVersion}/weight-logs/me${query}`);
  },
  saveWeight: (body: { measuredOn: string; weightKg: number; note?: string }) =>
    apiClient.request<WeightLog>(`${apiVersion}/weight-logs`, { method: 'POST', body: JSON.stringify(body) }),
  deleteWeight: (id: number) => apiClient.request<boolean>(`${apiVersion}/weight-logs/${id}`, { method: 'DELETE' }),
  checkins: (from?: string, to?: string) => {
    const query = from && to ? `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}` : '';
    return apiClient.request<DailyCheckin[]>(`${apiVersion}/daily-checkins/me${query}`);
  },
  checkinSummary: (from: string, to: string) =>
    apiClient.request<DailyCheckinSummary>(`${apiVersion}/daily-checkins/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  getCheckin: (date: string) => apiClient.request<DailyCheckin>(`${apiVersion}/daily-checkins/me/${date}`),
  saveCheckin: (date: string, body: DailyCheckinInput) =>
    apiClient.request<DailyCheckin>(`${apiVersion}/daily-checkins/me/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCheckin: (date: string) => apiClient.request<boolean>(`${apiVersion}/daily-checkins/me/${date}`, { method: 'DELETE' }),
};
