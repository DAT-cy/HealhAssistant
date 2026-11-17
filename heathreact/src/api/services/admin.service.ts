import { apiClient } from '../client';
import { apiVersion } from '@/config/api.config';

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
