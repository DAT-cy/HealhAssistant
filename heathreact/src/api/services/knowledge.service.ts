import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import type { KnowledgeReferencePreview } from '../types';

export const knowledgeService = {
  /** Xem trước nguồn tham khảo của lộ trình (tài liệu nội bộ hoặc hướng dẫn trong danh mục bệnh). */
  reference: (ref: { documentId?: number | null; diseaseCode?: string | null }) => {
    const query = ref.documentId != null ? `documentId=${ref.documentId}` : `diseaseCode=${encodeURIComponent(ref.diseaseCode ?? '')}`;
    return apiClient.request<KnowledgeReferencePreview>(`${apiVersion}/knowledge/reference?${query}`);
  },
};
