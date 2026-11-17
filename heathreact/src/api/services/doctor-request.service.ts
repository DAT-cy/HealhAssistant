import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import type { DoctorReviewRequest } from './doctor.service';

export const doctorRequestService = {
  mine: () => apiClient.request<DoctorReviewRequest[]>(`${apiVersion}/doctor-requests`),
  get: (id: number) => apiClient.request<DoctorReviewRequest>(`${apiVersion}/doctor-requests/${id}`),
};
