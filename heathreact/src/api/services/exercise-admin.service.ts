import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export type ExerciseDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** Bài tập trong thư viện (backend: ExerciseCatalogResponse). */
export interface ExerciseItem {
  id: number;
  code: string;
  name: string;
  muscleGroup: string;
  difficulty: ExerciseDifficulty;
  equipment: string | null;
  instructions: string;
  safetyNotes: string | null;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  commonMistakes: string | null;
  contraindications: string | null;
  active: boolean;
  /** Mã bệnh không được tập bài này. */
  contraindicatedDiseaseCodes: string[];
}

export interface ExerciseInput {
  code: string;
  name: string;
  muscleGroup: string;
  difficulty: ExerciseDifficulty;
  equipment?: string | null;
  instructions: string;
  safetyNotes?: string | null;
  sets?: number | null;
  reps?: string | null;
  restSeconds?: number | null;
  commonMistakes?: string | null;
  contraindications?: string | null;
  active?: boolean;
  /** Danh sách mã bệnh, nối bằng dấu phẩy; rỗng = bỏ hết. */
  contraindicatedDiseaseCodes?: string;
}

const path = `${apiVersion}/admin/exercises`;

export const exerciseAdminService = {
  list: () => apiClient.request<ExerciseItem[]>(path),
  create: (input: ExerciseInput) => apiClient.request<ExerciseItem>(path, { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: ExerciseInput) => apiClient.request<ExerciseItem>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deactivate: (id: number) => apiClient.request<boolean>(`${path}/${id}`, { method: 'DELETE' }),
};
