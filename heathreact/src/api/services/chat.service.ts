import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface CoachSource { title: string; organization: string | null; url: string | null; chunk: number; excerpt: string }
export interface CoachChatResponse { message: string; source: string; safetyEscalation: boolean; references: CoachSource[] }
export const chatService = { send: (message: string) => apiClient.request<CoachChatResponse>(`${apiVersion}/coach/chat`, { method: 'POST', body: JSON.stringify({ message }) }) };
