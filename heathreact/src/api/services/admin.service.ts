import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';
import type { Disease, RiskSeverity } from './doctor.service';

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalDoctors: number;
  onlineDoctors: number;
  totalDiseases: number;
  totalDocuments: number;
  documentsProcessing: number;
  documentsFailed: number;
  totalRoadmaps: number;
  roadmapsAwaitingDoctor: number;
  roadmapsConfirmed: number;
}

export interface AdminUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
  role: 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_USER';
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string | null;
}

const path = `${apiVersion}/admin/users`;

export const adminService = {
  dashboard: () => apiClient.request<AdminDashboard>(`${path}/dashboard`),
  users: (query = '', enabled?: boolean) => apiClient.request<AdminUser[]>(`${path}?q=${encodeURIComponent(query)}${enabled === undefined ? '' : `&enabled=${enabled}`}`),
  setUserStatus: (id: number, enabled: boolean) => apiClient.request<AdminUser>(`${path}/${id}/status?enabled=${enabled}`, { method: 'PATCH' }),
  setUserRole: (id: number, role: AdminUser['role']) => apiClient.request<AdminUser>(`${path}/${id}/role?role=${role}`, { method: 'PATCH' }),
};

/** Body của `POST /admin/diseases` (khớp DiseaseCreateRequest ở backend). */
export interface DiseaseCreateInput {
  code: string;
  name: string;
  specialty: string | null;
  description: string | null;
  severity: RiskSeverity;
  doctorRequired: boolean;
  roadmapConfirmationRequired: boolean;
  aiAllowed: boolean;
  priority: number;
}

const diseasePath = `${apiVersion}/admin/diseases`;

export const adminDiseaseService = {
  /** Trả về tất cả bệnh, gồm cả bệnh đã ngưng dùng (active = false). */
  list: () => apiClient.request<Disease[]>(diseasePath),
  create: (input: DiseaseCreateInput) => apiClient.request<Disease>(diseasePath, { method: 'POST', body: JSON.stringify(input) }),
  /** Xoá mềm: backend đặt active = false. */
  deactivate: (id: number) => apiClient.request<boolean>(`${diseasePath}/${id}`, { method: 'DELETE' }),
};
