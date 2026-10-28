import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

export type KnowledgeStatus = 'REVIEW' | 'APPROVED' | 'REJECTED';
export interface KnowledgeCategory { id: number; code: string; name: string }
export interface KnowledgeStats { total: number; awaitingReview: number; approved: number; rejected: number }
export interface KnowledgeDocument {
  id: number;
  title: string;
  description: string | null;
  categoryCode: string;
  categoryName: string;
  documentType: string;
  sourceOrganization: string | null;
  sourceUrl: string | null;
  licenseName: string | null;
  rightsConfirmed: boolean;
  status: KnowledgeStatus;
  originalFilename: string;
  detectedMime: string;
  fileSizeBytes: number;
  fileSha256: string;
  chunkCount: number;
  extractionWarning: string | null;
  extractedText?: string | null;
  createdBy: number;
  reviewedBy: number | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
}
export interface KnowledgeAudit { id: number; actorId: number; action: string; details: string | null; createdAt: string }
export interface KnowledgeUpload {
  file: { uri: string; name: string; mimeType?: string | null; size?: number | null; file?: Blob | null };
  title: string;
  categoryCode: string;
  description: string;
  documentType: string;
  sourceOrganization: string;
  sourceUrl: string;
  licenseName: string;
}

const path = `${apiVersion}/admin/knowledge`;

export const knowledgeAdminService = {
  categories: () => apiClient.request<KnowledgeCategory[]>(`${path}/categories`),
  stats: () => apiClient.request<KnowledgeStats>(`${path}/stats`),
  list: (status: string, query: string) => apiClient.request<KnowledgeDocument[]>(`${path}?status=${encodeURIComponent(status)}&q=${encodeURIComponent(query)}`),
  get: (id: number) => apiClient.request<KnowledgeDocument>(`${path}/${id}`),
  audit: (id: number) => apiClient.request<KnowledgeAudit[]>(`${path}/${id}/audit`),
  upload: async (input: KnowledgeUpload) => {
    const form = new FormData();
    const mimeType = input.file.mimeType || 'application/octet-stream';
    form.append('file', { uri: input.file.uri, name: input.file.name, type: mimeType } as unknown as Blob);
    form.append('title', input.title);
    form.append('categoryCode', input.categoryCode);
    form.append('description', input.description);
    form.append('documentType', input.documentType);
    form.append('sourceOrganization', input.sourceOrganization);
    form.append('sourceUrl', input.sourceUrl);
    form.append('licenseName', input.licenseName);
    form.append('rightsConfirmed', 'true');
    return apiClient.request<KnowledgeDocument>(path, { method: 'POST', body: form, timeoutMs: 120000 });
  },
  importWhoGuideline: () => apiClient.request<KnowledgeDocument>(`${path}/import/who-physical-activity`, { method: 'POST', timeoutMs: 120000 }),
  review: (id: number, action: 'APPROVE' | 'REJECT', note: string) => {
    const form = new FormData();
    form.append('action', action);
    form.append('note', note);
    return apiClient.request<KnowledgeDocument>(`${path}/${id}/review`, { method: 'POST', body: form });
  },
  archive: (id: number) => apiClient.request<boolean>(`${path}/${id}`, { method: 'DELETE' }),
};
