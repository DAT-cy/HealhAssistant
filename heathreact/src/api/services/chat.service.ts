import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export interface CoachChatResponse { message: string; source: string; safetyEscalation: boolean }
export const chatService = { send: (message: string) => apiClient.request<CoachChatResponse>(`${apiVersion}/coach/chat`, { method: 'POST', body: JSON.stringify({ message }) }) };
