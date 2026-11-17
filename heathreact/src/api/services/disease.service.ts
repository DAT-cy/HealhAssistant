import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import type { Disease } from './doctor.service';

export const diseaseService = {
  list: (query = '') => apiClient.request<Disease[]>(`${apiVersion}/health/diseases?q=${encodeURIComponent(query)}`),
};
