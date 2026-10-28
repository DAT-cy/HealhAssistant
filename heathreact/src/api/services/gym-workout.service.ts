import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { Platform } from 'react-native';

export interface ExerciseGuide {
  id: number;
  code: string;
  name: string;
  muscleGroup: string;
  difficulty: string;
  equipment: string | null;
  instructions: string;
  safetyNotes: string | null;
}
export interface GymWorkoutSession {
  id: number;
  planSlotId: number | null;
  exerciseCode: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  repetitions: number;
  repetitionSource: string;
  userRating: number | null;
  notes: string | null;
  aiAnalysisCount: number;
}
export interface GymPoseFeedback {
  sessionId: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  visibleBody: boolean;
  safetyConcern: boolean;
  feedback: string;
  corrections: string[];
  nextStep: string;
  repetitionsObserved: number | null;
  measurementMode: 'SINGLE_PHOTO_NO_REP_MEASUREMENT';
  analyzedAt: string;
  analysesRemaining: number;
}
export interface FeatureAccess { featureCode: string; enabled: boolean }
export interface CameraPhotoAsset { uri: string; mimeType?: string | null; fileName?: string | null; file?: File | null }

export const gymWorkoutService = {
  exercises: () => apiClient.request<ExerciseGuide[]>(`${apiVersion}/workout/gym/exercises`),
  premiumAccess: () => apiClient.request<FeatureAccess>(`${apiVersion}/features/access?featureCode=AI_GYM_CAMERA`),
  start: (roadmapId: number, planSlotId: number, exerciseCode: string) =>
    apiClient.request<GymWorkoutSession>(`${apiVersion}/workout/gym/sessions`, { method: 'POST', body: JSON.stringify({ roadmapId, planSlotId, exerciseCode }) }),
  analyzePhoto: async (sessionId: number, asset: CameraPhotoAsset, facing: 'front' | 'back') => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const file = asset.file ?? await (await fetch(asset.uri)).blob();
      form.append('file', file, asset.fileName ?? 'pose.jpg');
    } else {
      form.append('file', { uri: asset.uri, name: asset.fileName ?? 'pose.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    }
    form.append('cameraFacing', facing);
    return apiClient.request<GymPoseFeedback>(`${apiVersion}/workout/gym/sessions/${sessionId}/analyze-photo`, { method: 'POST', body: form, ai: true, timeoutMs: 120000 });
  },
  finish: (sessionId: number, input: { repetitions?: number; userRating?: number; notes?: string; reportedPain: boolean }) =>
    apiClient.request<GymWorkoutSession>(`${apiVersion}/workout/gym/sessions/${sessionId}/finish`, { method: 'POST', body: JSON.stringify(input) }),
  history: (planSlotId: number) => apiClient.request<GymWorkoutSession[]>(`${apiVersion}/workout/gym/sessions/history?planSlotId=${planSlotId}`),
};
