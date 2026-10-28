import { Platform } from 'react-native';
import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface PersonalAssistantProfile {
  id: number | null; fitnessGoal: string | null; currentCondition: string | null; fitnessLevel: string | null;
  dietPreferences: string | null; dailyRoutine: string | null; availableTrainingTime: string | null;
  availableEquipment: string | null; healthLimits: string | null; personalRules: string | null;
  additionalGuidance: string | null; updatedAt: string | null;
}
export type PersonalProfileInput = Omit<PersonalAssistantProfile, 'id' | 'updatedAt'>;
export interface PersonalDocument {
  id: number; title: string; description: string | null; sourceType: 'PDF' | 'TEXT'; originalFilename: string | null;
  fileSizeBytes: number; status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingError: string | null; chunkCount: number; createdAt: string; updatedAt: string;
}
export interface PersonalSource { documentId: number; title: string; sourceType: string; sourceUrl: string | null; chunkIndex: number; excerpt: string }
export interface PersonalChatResponse {
  threadId: string; answer: string; source: string; safetyEscalation: boolean;
  sources: PersonalSource[]; usedPersonalInstructions: boolean; createdAt: string;
}
const path = `${apiVersion}/personal-assistant`;

export const personalAssistantService = {
  getProfile: () => apiClient.request<PersonalAssistantProfile>(`${path}/profile`),
  saveProfile: (input: PersonalProfileInput) => apiClient.request<PersonalAssistantProfile>(`${path}/profile`, { method: 'PUT', body: JSON.stringify(input) }),
  listDocuments: () => apiClient.request<PersonalDocument[]>(`${path}/documents`),
  uploadPdf: async (file: { uri: string; name: string; mimeType?: string | null; file?: Blob | null }, title: string, description = '') => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = file.file ?? await (await fetch(file.uri)).blob();
      form.append('file', blob, file.name);
    } else form.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/pdf' } as unknown as Blob);
    form.append('title', title); form.append('description', description);
    return apiClient.request<PersonalDocument>(`${path}/documents/pdf`, { method: 'POST', body: form, timeoutMs: 120000 });
  },
  createText: (title: string, content: string, description = '') => apiClient.request<PersonalDocument>(`${path}/documents/text`, { method: 'POST', body: JSON.stringify({ title, content, description }) }),
  getText: (id: number) => apiClient.request<string>(`${path}/documents/${id}/content`),
  updateText: (id: number, title: string, content: string, description = '') => apiClient.request<PersonalDocument>(`${path}/documents/${id}/content`, { method: 'PUT', body: JSON.stringify({ title, content, description }) }),
  updateMetadata: (id: number, title: string, description = '') => apiClient.request<PersonalDocument>(`${path}/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ title, description }) }),
  retry: (id: number) => apiClient.request<PersonalDocument>(`${path}/documents/${id}/retry`, { method: 'POST' }),
  removeDocument: (id: number) => apiClient.request<boolean>(`${path}/documents/${id}`, { method: 'DELETE' }),
  chat: (message: string, threadId?: string, allowGeneralKnowledge = true) => apiClient.request<PersonalChatResponse>(`${path}/chat`, { method: 'POST', body: JSON.stringify({ message, threadId, allowGeneralKnowledge }), ai: true }),
  history: (threadId: string) => apiClient.request<{ id: number; role: string; content: string; sources: PersonalSource[]; responseSource: string | null; createdAt: string }[]>(`${path}/threads/${threadId}`),
};
