import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { Platform } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';
export interface MealAnalysisResult {
  fitStatus: 'FIT' | 'ADJUST' | 'INSUFFICIENT_DATA';
  identifiedFoods: { name: string; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; portionEstimate: string }[];
  summary: string;
  positiveAspects: string[];
  concerns: string[];
  suggestions: string[];
  nutritionEstimate: {
    available: boolean;
    caloriesMin: number | null;
    caloriesMax: number | null;
    proteinMinG: number | null;
    proteinMaxG: number | null;
    carbohydratesMinG: number | null;
    carbohydratesMaxG: number | null;
    fatMinG: number | null;
    fatMaxG: number | null;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    uncertainty: string;
  };
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  needsMoreInfo: boolean;
  knowledgeSources: { title: string; url: string | null }[];
  source: 'KNOWLEDGE_BASE' | 'GENERAL_AI' | 'INSUFFICIENT_DATA';
}
export interface MealRecommendation {
  mealDate: string;
  mealType: MealType;
  suggestedMeal: string;
  nutritionTargetAvailable: boolean;
  nutritionTarget: string;
  prioritizeFoods: string[];
  limitFoods: string[];
  reasons: string[];
  knowledgeSources: { title: string; url: string | null }[];
  source: 'KNOWLEDGE_BASE' | 'GENERAL_AI' | 'INSUFFICIENT_DATA';
  limitationNote: string;
}

export interface MealLogEntry {
  id: number;
  loggedAt: string;
  mealDate: string | null;
  reviewedAt: string | null;
  mealType: MealType;
  status: string;
  plannedMeal: string | null;
  dishName: string | null;
  portionNotes: string | null;
  ingredients: string | null;
  photoUrl: string | null;
  notes: string | null;
  analysis: MealAnalysisResult | null;
  recommendationSource: string | null;
  roadmapId: number | null;
  planDayIndex: number | null;
}

export interface MealAnalysisLog {
  meal: MealLogEntry;
  analysis: MealAnalysisResult;
}

export const nutritionService = {
  recordReview: (body: { mealType: MealLogEntry['mealType']; plannedMeal: string; analysisSummary: string; advice: string; source: string }) =>
    apiClient.request<MealLogEntry>(`${apiVersion}/nutrition/meals`, { method: 'POST', body: JSON.stringify(body) }),
  listMine: (date: string) => apiClient.request<MealLogEntry[]>(`${apiVersion}/nutrition/meals/me?date=${encodeURIComponent(date)}`),
  recommendation: (date: string, mealType: MealType, roadmapId?: number) => {
    const query = new URLSearchParams({ date, mealType });
    if (roadmapId) query.set('roadmapId', String(roadmapId));
    return apiClient.request<MealRecommendation>(`${apiVersion}/nutrition/meals/recommendation?${query.toString()}`, { ai: true, timeoutMs: 120000 });
  },
  analyze: async (asset: ImagePickerAsset, input: { mealType: MealType; mealDate: string; roadmapId: number; planDayIndex: number; plannedMeal?: string; dishName?: string; portionNotes?: string; ingredients?: string }) => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const image = asset.file ?? await (await fetch(asset.uri)).blob();
      form.append('file', image, asset.fileName ?? 'meal.jpg');
    } else {
      form.append('file', { uri: asset.uri, name: asset.fileName ?? 'meal.jpg', type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    }
    Object.entries(input).forEach(([key, value]) => { if (value !== undefined) form.append(key, String(value)); });
    return apiClient.request<MealAnalysisLog>(`${apiVersion}/nutrition/meals/analyze`, { method: 'POST', body: form, ai: true, timeoutMs: 120000 });
  },
  markReviewed: (id: number) => apiClient.request<MealLogEntry>(`${apiVersion}/nutrition/meals/${id}/review`, { method: 'POST' }),
  discard: (id: number) => apiClient.request<boolean>(`${apiVersion}/nutrition/meals/${id}`, { method: 'DELETE' }),
};
