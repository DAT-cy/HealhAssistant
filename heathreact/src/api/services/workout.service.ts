import { apiClient } from '../client';
import { WorkoutFeedback } from '../types';
import { apiVersion } from '@/config/api.config';

export const workoutService = {
  // Tham số nằm trên query string theo contract; chỉ exercise=squat được backend hỗ trợ.
  track: (exercise: string, jointAngle: number, visibility: number, sessionId?: string) => {
    const query = new URLSearchParams({ exercise, jointAngle: String(jointAngle), visibility: String(visibility) });
    if (sessionId) query.append('sessionId', sessionId);
    return apiClient.request<WorkoutFeedback>(`${apiVersion}/workout-engine/track?${query.toString()}`, { method: 'POST' });
  },
  end: (sessionId: string, exercise = 'squat') =>
    apiClient.request<{ id: number; reps: number }>(`${apiVersion}/workout-engine/end?sessionId=${encodeURIComponent(sessionId)}&exercise=${encodeURIComponent(exercise)}`, { method: 'POST' }),
};
