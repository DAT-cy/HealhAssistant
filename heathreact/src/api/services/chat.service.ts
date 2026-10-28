import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import { PlanReschedulePreview, coachService } from './coach.service';
import { PersonalSource } from './personal-assistant.service';

export interface CoachChatResponse {
  threadId: string; message: string; source: string; safetyEscalation: boolean;
  sources: PersonalSource[]; scheduleProposal: PlanReschedulePreview | null; createdAt: string;
}
export interface CoachChatMessage { id: number; role: 'USER' | 'ASSISTANT'; message: string; source: string | null; sources: PersonalSource[]; createdAt: string }
export interface CoachChatThread { threadId: string; lastMessage: string; lastMessageAt: string }
export const chatService = {
  send: (message: string, threadId?: string) => apiClient.request<CoachChatResponse>(`${apiVersion}/coach/chat`, {
    method: 'POST', body: JSON.stringify({ message, threadId, allowPersonalKnowledge: true }), ai: true, timeoutMs: 120000,
  }),
  history: (threadId: string) => apiClient.request<CoachChatMessage[]>(`${apiVersion}/coach/chat/${encodeURIComponent(threadId)}`),
  threads: () => apiClient.request<CoachChatThread[]>(`${apiVersion}/coach/chat/threads`),
  deleteThread: (threadId: string) => apiClient.request<boolean>(`${apiVersion}/coach/chat/${encodeURIComponent(threadId)}`, { method: 'DELETE' }),
  confirmProposal: (previewId: string) => coachService.confirmReschedule(previewId),
  rejectProposal: (previewId: string) => coachService.rejectReschedule(previewId),
};
